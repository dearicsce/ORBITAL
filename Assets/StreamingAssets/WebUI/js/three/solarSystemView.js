import * as THREE from 'three';
import {createScene,addStars} from './sceneKit.js';
import {createEarthBody} from './earthMaterial.js';
import {loadLocalTexture} from './localTexture.js';

// Authored overview: radii and orbital distances use separate compressed scales.
// These decorative angles are never supplied to navigation or mission scoring.
const PLANETS=[
 ['mercury',.387,.10,88,1.5],['venus',.723,.18,225,3.1],['earth',1,.19,365,4.1],
 ['mars',1.524,.14,687,2.3],['jupiter',5.203,.43,4333,.7],
 ['saturn',9.537,.36,10759,3.5],['uranus',19.19,.26,30687,5.5],['neptune',30.07,.25,60190,1.1],
];

// Local encounter cameras retain the same illustrative system when zooming
// out. Body radii and heliocentric distances remain separately compressed.
export function addEncounterSystem(scene,focusId,bodyRadius=2){
 const focus=PLANETS.find(p=>p[0]===(focusId==='moon'?'earth':focusId));
 if(!focus)return null;
 const group=new THREE.Group();group.name='EncounterSolarSystem';scene.add(group);
 const textures=[];let alive=true;
 const point=p=>{const distance=1.6+5*Math.log10(1+p[1]*2);return new THREE.Vector3(Math.cos(p[4])*distance,0,Math.sin(p[4])*distance);};
 const focusPoint=point(focus);
 if(focusId==='moon')focusPoint.add(new THREE.Vector3(.42,0,0));
 const scale=bodyRadius/(focusId==='moon'?.06:focus[2]);
 group.scale.setScalar(scale);group.position.copy(focusPoint).multiplyScalar(-scale);
 function body(id,radius,position,basic=false){
  const material=basic?new THREE.MeshBasicMaterial({color:0xffe3a1}):new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,32,20),material);mesh.position.copy(position);mesh.name='Context_'+id;group.add(mesh);
  textures.push(loadLocalTexture(new URL('../../textures/eyes/'+id+'-color.jpg',import.meta.url).href,t=>{if(!alive){t.dispose();return;}t.colorSpace=THREE.SRGBColorSpace;material.map=t;material.needsUpdate=true;}));
  if(id==='saturn'){
   const rings=new THREE.Mesh(new THREE.RingGeometry(radius*1.24,radius*2.3,64),new THREE.MeshBasicMaterial({color:0xb6a685,side:THREE.DoubleSide,transparent:true,opacity:.65}));rings.rotation.x=Math.PI/2;mesh.add(rings);
  }
 }
 body('sun',.62,new THREE.Vector3(),true);
 for(const p of PLANETS){
  if(p[0]!==focusId)body(p[0],p[2],point(p));
  const distance=point(p).length(),points=Array.from({length:181},(_,i)=>new THREE.Vector3(Math.cos(i/180*Math.PI*2)*distance,0,Math.sin(i/180*Math.PI*2)*distance));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x304452,transparent:true,opacity:.12})));
 }
 if(focusId!=='moon')body('moon',.06,point(PLANETS.find(p=>p[0]==='earth')).add(new THREE.Vector3(.42,0,0)));
 return {extent:(focusPoint.length()+11)*scale,destroy(){alive=false;for(const t of textures)t.dispose();group.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});group.removeFromParent();}};
}

export function mountSolarSystem(container,onInspect=()=>{}){
 const kit=createScene(container,{position:[0,13,18],target:[0,0,0],controls:true,shadows:false,space:true,far:1000});
 if(!kit.renderer)return ()=>kit.destroy();
 kit.scene.background.set(0x030811);kit.sun.intensity=0;
 kit.scene.add(new THREE.PointLight(0xfff5df,3,0,0));addStars(kit.scene);
 kit.controls.minDistance=2;kit.controls.maxDistance=45;kit.controls.enablePan=true;
 const textures=[],bodies=[],labels=[];
 const load=(file,apply)=>{
  const texture=loadLocalTexture(new URL('../../textures/eyes/'+file,import.meta.url).href,t=>{
   if(kit.dead){t.dispose();return;}t.colorSpace=THREE.SRGBColorSpace;apply(t);
  });textures.push(texture);
 };
 const sun=new THREE.Mesh(new THREE.SphereGeometry(.62,48,24),new THREE.MeshBasicMaterial({color:0xffe3a1}));
 sun.name='Sun';kit.scene.add(sun);
 load('sun-color.jpg',t=>{sun.material.map=t;sun.material.color.set(0xffffff);sun.material.needsUpdate=true;});

 let earthBody = null;
 for(const [id,au,radius,period,phase] of PLANETS){
  const orbitRadius=1.6+5*Math.log10(1+au*2);
  const points=Array.from({length:181},(_,i)=>{const a=i/180*Math.PI*2;return new THREE.Vector3(Math.cos(a)*orbitRadius,0,Math.sin(a)*orbitRadius);});
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:id==='earth'?0x36767c:0x273645,transparent:true,opacity:.8}));kit.scene.add(line);
  const body=id==='earth'?createEarthBody(radius):new THREE.Mesh(new THREE.SphereGeometry(radius,48,28),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));
  body.name=id;body.userData.planetId=id;kit.scene.add(body);
  if(id==='earth') earthBody = body;
  if(id!=='earth')load(id+'-color.jpg',t=>{body.material.map=t;body.material.needsUpdate=true;});
  if(id==='saturn'){
   const ring=new THREE.Mesh(new THREE.RingGeometry(radius*1.24,radius*2.3,96),new THREE.MeshBasicMaterial({color:0xb6a685,side:THREE.DoubleSide,transparent:true,opacity:.65}));
   ring.rotation.x=Math.PI/2;ring.rotation.y=.45;body.add(ring);
  }
  const label=document.createElement('button');label.type='button';label.className='solar-body-label';
  label.textContent=id[0].toUpperCase()+id.slice(1);label.onclick=()=>onInspect(id);
  container.append(label);labels.push(label);
  bodies.push({id,body,orbitRadius,period,phase,label});
 }

 // Earth's Moon
 const moon=new THREE.Mesh(new THREE.SphereGeometry(.06,24,16),new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));
 moon.name='moon';moon.userData.planetId='moon';kit.scene.add(moon);
 load('moon-color.jpg',t=>{moon.material.map=t;moon.material.needsUpdate=true;});

 // Illustrative satellite orbit, separate from the player's active mission.
 const craftMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.08,0),new THREE.MeshBasicMaterial({color:0x8ef8e0}));
 craftMarker.name='Example Earth satellite';craftMarker.userData.planetId='earth';kit.scene.add(craftMarker);

 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
 const pointerDown=e=>{down={x:e.clientX,y:e.clientY};};
 const pointerUp=e=>{
  if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;
  const rect=container.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
  raycaster.setFromCamera(pointer,kit.camera);
  const hit=raycaster.intersectObjects([...bodies.map(p=>p.body),moon,craftMarker],false)[0];
  if(hit)onInspect(hit.object.userData.planetId);
 };
 kit.renderer.domElement.addEventListener('pointerdown',pointerDown);kit.renderer.domElement.addEventListener('pointerup',pointerUp);
 let elapsed=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 kit.draw=dt=>{
  if(!reduced)elapsed+=dt;
  for(const p of bodies){
   const angle=p.phase+elapsed*40/p.period;
   p.body.position.set(Math.cos(angle)*p.orbitRadius,0,Math.sin(angle)*p.orbitRadius);
   p.body.rotation.y=elapsed*.04;
   const point=p.body.position.clone().project(kit.camera);
   p.label.hidden=point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;
   p.label.style.left=((point.x+1)*50)+'%';p.label.style.top=((1-point.y)*50)+'%';
  }
  if(earthBody){
   const moonAngle=elapsed*0.6;
   moon.position.set(earthBody.position.x+Math.cos(moonAngle)*.42, 0, earthBody.position.z+Math.sin(moonAngle)*.42);
   const craftAngle=elapsed*Math.PI*2/12;
   craftMarker.position.set(earthBody.position.x+Math.cos(craftAngle)*.29, Math.sin(craftAngle)*.15, earthBody.position.z+Math.sin(craftAngle)*.25);
  }
 };
 return ()=>{kit.renderer.domElement.removeEventListener('pointerdown',pointerDown);kit.renderer.domElement.removeEventListener('pointerup',pointerUp);
  moon.geometry.dispose();moon.material.dispose();craftMarker.geometry.dispose();craftMarker.material.dispose();
  for(const p of bodies)p.body.userData.stopTexture?.();for(const t of textures)t.dispose();for(const l of labels)l.remove();kit.destroy();};
}
