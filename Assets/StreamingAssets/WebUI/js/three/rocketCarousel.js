
import * as THREE from 'three';
import {loadLauncherModel} from './launcherModels.js';
import {createScene, disposeObject} from './sceneKit.js';

export function createRocketCarousel(container,{launcherIds,onSelect,lockedIds=[]}) {
  const kit = createScene(container,{position:[9,9,21],target:[0,7,0],shadows:false});
  kit.scene.background = new THREE.Color('#141619');
  kit.sun.position.set(8,22,12);
  const fill = new THREE.DirectionalLight(0xa4c6db,1.8);
  fill.position.set(-9,5,-12);
  kit.scene.add(fill);
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(4,4.35,.25,72),
    new THREE.MeshStandardMaterial({color:0x424753,metalness:.45,roughness:.62}));
  stand.position.y = -.14;
  kit.scene.add(stand);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.63,.018,8,90),
    new THREE.MeshBasicMaterial({color:0xbb9f68}));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .002;
  kit.scene.add(ring);
  const floor = new THREE.GridHelper(75,75,0x454849,0x292d31);
  floor.position.y = -.29;
  kit.scene.add(floor);
  const mount = new THREE.Group();
  kit.scene.add(mount);
  const available = launcherIds.filter(id => !lockedIds.includes(id));
  let selected;
  let revision = 0;
  function select(id) {
    if (!available.includes(id) || id === selected) return;
    selected = id;
    const request = ++revision;
    loadLauncherModel(id).then(model => {
      if (kit.dead || request !== revision) {
        disposeObject(model);
        return;
      }
      for (const previous of [...mount.children]) {
        mount.remove(previous);
        disposeObject(previous);
      }
      const box = new THREE.Box3().setFromObject(model);
      model.position.y = -box.min.y;
      mount.add(model);
      const height = box.max.y - box.min.y;
      const target = new THREE.Vector3(0,height * .49,0);
      const offset = new THREE.Vector3(1,.10,2.9).normalize();
      const vertical = THREE.MathUtils.degToRad(kit.camera.fov / 2);
      kit.camera.position.copy(target).addScaledVector(offset,height * .71 / Math.tan(vertical));
      if (kit.controls) {
        kit.controls.target.copy(target);
        kit.controls.minDistance = Math.max(2,height * .6);
        kit.controls.update();
      } else kit.camera.lookAt(target);
      container.dataset.launcherModel = model.userData.launcherModel ?? 'procedural';
    });
  }
  const keys = event => {
    if (!['ArrowLeft','ArrowRight'].includes(event.key) || !available.length) return;
    event.preventDefault();
    const next = (available.indexOf(selected) + available.length + (event.key==='ArrowLeft'?-1:1)) % available.length;
    onSelect(available[next]);
  };
  container.tabIndex = 0;
  container.setAttribute('aria-label','Rocket model. Drag to orbit, scroll to zoom, or press the arrow keys to change rocket.');
  container.addEventListener('keydown',keys);
  kit.draw = dt => {mount.rotation.y += dt * .15;};
  return {select,destroy(){
    container.removeEventListener('keydown',keys);
    kit.destroy();
  }};
}
