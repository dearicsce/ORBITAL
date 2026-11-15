import {createEarthBody} from './earthMaterial.js';
import {createOrbitPath} from './orbitPresentation.js';
import { disposeObject,roundPointsMaterial } from './sceneKit.js';
let earthGeneration=0;
import * as THREE from 'three';
import {bodyAngle} from '../engine/flightClock.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let animationId = null;
let earthMesh = null;
let earthTexture = null;
let resizeObserver = null;

export function startEarth(container) {
  stopEarth();
  const generation=earthGeneration;
  if (!container) return;

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030712);

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 3.8);

  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.6;

  // Starfield background
  const starGeo = new THREE.BufferGeometry();
  const starCoords = [];
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 50;
    const y = (Math.random() - 0.5) * 50;
    const z = (Math.random() - 0.5) * 50;
    starCoords.push(x, y, z);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
  const starMat = roundPointsMaterial({ color: 0xb5ccd5, size: 0.035, opacity:0.7 });
  const starPoints = new THREE.Points(starGeo, starMat);
  scene.add(starPoints);

  // Natural side lighting
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
  sunLight.position.set(5, 2, 4);
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x1e3a8a, 0.06);
  fillLight.position.set(-5, -2, -3);
  scene.add(fillLight);

  scene.add(new THREE.AmbientLight(0xffffff, 0.025));

  earthMesh=createEarthBody(1.35,{sunDirection:[5,2,4]});
  scene.add(earthMesh);
  for(const id of ['leo','sso']){const ring=createOrbitPath(id,{bodyRadius:1.35,exaggerated:false});ring.material.opacity=.15;scene.add(ring);}

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    }
  });
  resizeObserver.observe(container);

  let previousFrame=performance.now(),previewSeconds=0;
  function animate(now=performance.now()) {
    const dt=Math.min(.1,Math.max(0,(now-previousFrame)/1000));previousFrame=now;
    animationId = requestAnimationFrame(animate);
    if (earthMesh) {
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)previewSeconds+=dt*300;
      earthMesh.rotation.y=-Math.PI*.42+bodyAngle('earth',previewSeconds);
    }
    if (controls) {
      controls.update();
    }
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }
  animate();
}

export function stopEarth() {
  earthGeneration++;
  earthMesh?.userData.stopTexture?.();
  if(scene)disposeObject(scene);
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (controls) {
    controls.dispose();
    controls = null;
  }
  if (earthTexture) {
    earthTexture.dispose();
    earthTexture = null;
  }
  if (earthMesh) {
    if (earthMesh.geometry) earthMesh.geometry.dispose();
    if (earthMesh.material) earthMesh.material.dispose();
    earthMesh = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer = null;
  }
  scene = null;
  camera = null;
}
