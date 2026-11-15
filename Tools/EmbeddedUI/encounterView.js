import * as THREE from 'three';
import {ATLAS_TEXTURES, atlasTexture} from '../content/atlasTextures.js';
import {createAssembly} from './spacecraftParts.js';
import {createScene, addStars} from './sceneKit.js';
import {attachStarBackground} from './starfield.js';
import {loadLocalTexture} from './localTexture.js';
import {addEncounterSystem} from './solarSystemView.js';

const MODEL_SCALE = .28;
const GLOBE_RADIUS = 2;
const RING_RADIUS = 3.6;

export function encounterFraming(bodyRadius, craftRadius, aspect, fovDegrees) {
  const clearance = bodyRadius * .34;
  const separation = bodyRadius + craftRadius + clearance;
  const focusX = (separation + craftRadius - bodyRadius) / 2;
  const extent = Math.max(bodyRadius, craftRadius);
  const halfWidth = focusX + bodyRadius;
  const verticalTan = Math.tan(THREE.MathUtils.degToRad(fovDegrees / 2));
  const distance = Math.max(4.25 * extent, extent + Math.max(
    extent / verticalTan,
    halfWidth / (verticalTan * aspect),
  ) / .80);
  return {separation, focusX, distance};
}

// The transfer engine supplies the destination and arrival result. This local
// view illustrates that result; the transfer map retains the numerical track.
export function createEncounterView(container, {mission, design, data, captured, arrivalKind=captured?'orbit':'flyby', isPaused=()=>false, attitude=()=>null}) {
  const spec = ATLAS_TEXTURES[mission.destination];
  if (!spec?.file) return null;

  const kit = createScene(container, {space: true, shadows: false, position: [0, 1.5, 9]});
  if (!kit.renderer) return {rendered: false, destroy: () => kit.destroy()};
  kit.sun.position.set(6, 4, 8);
  kit.scene.add(new THREE.HemisphereLight(0xaac5de, 0x222535, .5));
  addStars(kit.scene);
  const stopSky = attachStarBackground(kit.scene);
  const system=addEncounterSystem(kit.scene,mission.destination,GLOBE_RADIUS);
  if(system&&kit.controls){kit.controls.maxDistance=system.extent*3;kit.camera.far=Math.max(kit.camera.far,system.extent*5);kit.camera.updateProjectionMatrix();}

  const material = new THREE.MeshStandardMaterial({color: spec.color, roughness: .95});
  const globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 64, 40), material);
  globe.name = mission.destination;
  globe.scale.y = spec.flatten ?? 1;
  const body = new THREE.Group();
  body.rotation.z = (spec.tiltDeg ?? 0) * Math.PI / 180;
  body.add(globe);
  kit.scene.add(body);
  let alive = true;
  const texture = loadLocalTexture(atlasTexture(spec.file), map => {
    if (!alive) { map.dispose(); return; }
    map.colorSpace = THREE.SRGBColorSpace;
    material.map = map;
    material.color.set(0xffffff);
    material.needsUpdate = true;
  });
  if (spec.rings) {
    const rings = new THREE.Mesh(new THREE.RingGeometry(2.55, RING_RADIUS, 100), new THREE.MeshBasicMaterial({
      color: 0xc6bbaa, side: THREE.DoubleSide, transparent: true, opacity: .65,
    }));
    rings.rotation.x = -Math.PI / 2;
    body.add(rings);
  }

  const bodyRadius = spec.rings ? RING_RADIUS : GLOBE_RADIUS;
  const craft = new THREE.Group();
  const model = new THREE.Group();
  craft.visible = false;
  craft.add(model);
  kit.scene.add(craft);
  const assembly = createAssembly(model);
  let craftRadius = .65;
  let separation = 4, previewSeconds = 0;
  const previewPosition = new THREE.Vector3();
  function placeCraft() {
    const angle=previewSeconds*Math.PI*2/36;
    if(captured)previewPosition.set(Math.cos(angle)*separation,0,-Math.sin(angle)*separation);
    else if(arrivalKind==='rendezvous')previewPosition.set(separation,0,0);
    else previewPosition.set(separation,0,(Math.min(1,previewSeconds/36)*2-1)*separation*2);
    craft.position.copy(previewPosition);
    // Keep the assembly's centre on the preview trajectory, with a stable
    // body-pointing attitude during orbit and no fabricated orbit on flybys.
    const commanded=attitude();
    if(commanded)craft.quaternion.fromArray(commanded);
    else if(captured)craft.lookAt(0,0,0);
  }
  let cameraMoved = false;
  const cameraOffset = new THREE.Vector3(0, .18, 1).normalize();
  function frameScene() {
    const visible = container.clientWidth > 0 && container.clientHeight > 0;
    const aspect = visible ? container.clientWidth / container.clientHeight : 1;
    const framing = encounterFraming(bodyRadius, craftRadius, aspect, kit.camera.fov);
    separation=framing.separation;
    placeCraft();
    if (!visible || cameraMoved) return;
    const focus = new THREE.Vector3();
    const extent = (captured?separation:separation*2.3)+craftRadius;
    const distance=extent/Math.sin(THREE.MathUtils.degToRad(kit.camera.fov/2))*Math.max(1,1/aspect)*1.15;
    kit.camera.position.copy(focus).addScaledVector(cameraOffset, distance);
    kit.camera.lookAt(focus);
    kit.controls?.target.copy(focus);
    kit.controls?.update();
  }
  const recordCameraMove = () => { cameraMoved = true; };
  kit.controls?.addEventListener('start', recordCameraMove);
  const resize = new ResizeObserver(frameScene);
  resize.observe(container);
  frameScene();

  const ready = assembly.update(design, data).then(() => {
    if (!alive) return false;
    const bounds = new THREE.Box3().setFromObject(model, true);
    if (bounds.isEmpty()) return false;
    const envelope = bounds.getBoundingSphere(new THREE.Sphere());
    craftRadius = envelope.radius * MODEL_SCALE;
    model.position.copy(craft.worldToLocal(envelope.center)).negate();
    craft.scale.setScalar(MODEL_SCALE);
    cameraMoved = false;
    frameScene();
    craft.visible = true;
    if (captured) {
      const points = Array.from({length: 160}, (_, index) => {
        const angle = index / 160 * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(separation);
      });
      kit.scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({
        color: 0x90dddb, transparent: true, opacity: .52,
      })));
    }
    return true;
  });

  kit.draw=dt=>{
    if(craft.visible&&!isPaused())previewSeconds+=dt;
    placeCraft();
  };

  container.dataset.destinationBody = mission.destination;
  container.dataset.encounterMotion=captured?'orbit':arrivalKind;
  return {rendered: true, ready, destroy() {
    alive = false;
    resize.disconnect();
    kit.controls?.removeEventListener('start', recordCameraMove);
    texture.dispose();
    stopSky();
    system?.destroy();
    assembly.destroy();
    kit.destroy();
  }};
}
