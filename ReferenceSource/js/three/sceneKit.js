import {createEarthBody} from './earthMaterial.js';
import {RoomEnvironment} from 'three/addons/RoomEnvironment.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export function disposeObject(root) {
  const seen = new Set();
  root.traverse(o => {
    if(o.geometry && !seen.has(o.geometry)){ seen.add(o.geometry); o.geometry.dispose(); }
    for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)) {
      if(seen.has(m)) continue; seen.add(m);
      for(const v of Object.values(m)) if(v?.isTexture && !seen.has(v)){ seen.add(v); v.dispose(); }
      m.dispose();
    }
  });
}
export function createScene(container,{position=[8,6,12],target=[0,0,0],controls=true,shadows=true,space=false,far=2000,logDepth=false}={}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#07121d');
  const camera = new THREE.PerspectiveCamera(45,1,.05,far); camera.position.fromArray(position);
  camera.lookAt(...target);
  scene.add(new THREE.HemisphereLight(0xb6d8ed,0x112739,space?.055:.7));
  const sun=new THREE.DirectionalLight(0xfff4e5,space?3.1:3.5); sun.position.set(10,15,8);sun.castShadow=shadows;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.camera.far=150;sun.shadow.normalBias=.04; scene.add(sun);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:logDepth}); }
  catch { container.innerHTML='<p class="webgl-note">3D is unavailable. You can still use the controls to continue.</p>'; return {scene,camera,sun,dead:false,draw:null,metrics:{averageFrameMs:0,frames:0},destroy(){this.dead=true;disposeObject(scene);}}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75)); container.appendChild(renderer.domElement);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);scene.environment=space?null:environment.texture;room.dispose();pmrem.dispose();
  const orbit = controls ? new OrbitControls(camera,renderer.domElement) : null;
  if(orbit){ orbit.target.fromArray(target); orbit.enableDamping=true; orbit.minDistance=2; orbit.maxDistance=60; }
  const api={scene,camera,renderer,controls:orbit,sun,dead:false,draw:null,metrics:{averageFrameMs:16.7,frames:0}};
  const resize = new ResizeObserver(() => { const w=container.clientWidth,h=container.clientHeight; if(w&&h){camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);} }); resize.observe(container);
  let frame,previous=performance.now(),lost=false,lastQualityChange=0;
  const tick=now=>{ if(api.dead)return; frame=requestAnimationFrame(tick); const interval=Math.max(0,now-previous);const dt=Math.min(interval/1000,.05);api.metrics.averageFrameMs+=(Math.min(200,interval)-api.metrics.averageFrameMs)*.05;api.metrics.frames++;
    if(api.metrics.frames>120&&now-lastQualityChange>2500&&api.metrics.averageFrameMs>25&&renderer.getPixelRatio()>.8){renderer.setPixelRatio(Math.max(.8,renderer.getPixelRatio()*.85));lastQualityChange=now;}
    // Shadow maps dominate software/low-end launch rendering. Adapt visual quality
    // independently of fixed-step engineering and saved spacecraft transforms.
    if(document.visibilityState!=='hidden'&&api.metrics.frames>30&&api.metrics.averageFrameMs>50&&renderer.shadowMap.enabled){renderer.shadowMap.enabled=false;sun.castShadow=false;renderer.shadowMap.needsUpdate=false;}
    previous=now;if(lost)return;api.draw?.(dt,now/1000);if(api.dead)return;if(orbit?.enabled)orbit.update();renderer.render(scene,camera); }; frame=requestAnimationFrame(tick);
  const onLost=e=>{e.preventDefault();lost=true;}; const onRestored=()=>{lost=false;};
  renderer.domElement.addEventListener('webglcontextlost',onLost); renderer.domElement.addEventListener('webglcontextrestored',onRestored);
  api.destroy=()=>{ if(api.dead)return;api.dead=true;cancelAnimationFrame(frame);resize.disconnect();orbit?.dispose();disposeObject(scene);environment.dispose();renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.domElement.removeEventListener('webglcontextrestored',onRestored);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove(); };
  return api;
}
export function roundPointsMaterial(options={}){
 const material=new THREE.PointsMaterial({...options,transparent:true,depthWrite:false});
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec4 diffuseColor = vec4( diffuse, opacity ); float pointRadius=length(gl_PointCoord-vec2(0.5)); if(pointRadius>0.5) discard; diffuseColor.a*=1.0-smoothstep(0.2,0.5,pointRadius);');};return material;
}
export function addStars(scene) {
 // Seeded isotropic decorative field, not a navigational star catalogue.
 let seed=7429;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const positions=[],colors=[];
 for(let i=0;i<1100;i++){
  const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z),distance=140;
  positions.push(r*Math.cos(a)*distance,z*distance,r*Math.sin(a)*distance);
  const brightness=.25+random()**4*.75,warm=random()>.78;
  colors.push(brightness,brightness*(warm?.85:.94),brightness*(warm?.68:1));
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const stars=new THREE.Points(geometry,roundPointsMaterial({vertexColors:true,size:.16,opacity:.8,toneMapped:false}));stars.name='Illustrative_star_field';scene.add(stars);return stars;
}
export function addEarth(scene,radius=2) {const earth=createEarthBody(radius);scene.add(earth);return earth;}
