import * as THREE from 'three';
import {bodyAngle,centralBody} from '../engine/flightClock.js';
import {operationPoint,operationCamera} from './orbitPresentation.js';
import {loadLocalTexture} from './localTexture.js';
import {createEarthBody} from './earthMaterial.js';
import {attachStarBackground} from './starfield.js';

export const CAMERA_MODES={solar:'Solar System','earth-moon':'Earth–Moon',follow:'Spacecraft',inertial:'Orbit overview',fixed:'Earth-fixed'};
const PLANETS=[['mercury',.387,.12,88,1.5],['venus',.723,.20,225,3.1],['earth',1,.24,365.25,4.1],['mars',1.524,.16,687,2.3],['jupiter',5.203,.52,4333,.7],['saturn',9.537,.44,10759,3.5],['uranus',19.19,.30,30687,5.5],['neptune',30.07,.28,60190,1.1]];

export function labelOccluded(cameraPosition,point,occluders){
 const ray=new THREE.Ray(cameraPosition,point.clone().sub(cameraPosition).normalize()),hit=new THREE.Vector3();
 const distance=cameraPosition.distanceTo(point);
 return occluders.some(sphere=>ray.intersectSphere(sphere,hit)&&cameraPosition.distanceTo(hit)<distance-1e-5);
}

export function createFlightFrame(scene,camera,craft,globe,orbitId,orbit,input=null,container=null){
 const lunar=centralBody(orbitId,orbit)==='moon',north=new THREE.Vector3(0,1,0);
 const lagrange=orbitId==='lagrange'&&!orbit;
 const home=new THREE.Vector3(...operationCamera(orbitId,orbit));
 const radial=new THREE.Vector3(),tangent=new THREE.Vector3(),normal=new THREE.Vector3(),origin=new THREE.Vector3(),anchor=new THREE.Vector3(),attitude=new THREE.Matrix4();
 let busCenter=null;craft.userData.orbitAnchor=anchor;
 const solar=new THREE.Group(),context=new THREE.Group();solar.name='ConnectedSolarSystem';context.name='EarthMoonSystem';scene.add(solar,context);
 globe.userData.celestialBody=lunar?'moon':'earth';
 let skyScene=scene;while(skyScene.parent&&!skyScene.isScene)skyScene=skyScene.parent;
 const disposeSky=attachStarBackground(skyScene),textures=[];let alive=true;
 function load(file,apply){const t=loadLocalTexture(new URL('../../textures/eyes/'+file,import.meta.url).href,tex=>{if(!alive){tex.dispose();return;}tex.colorSpace=THREE.SRGBColorSpace;apply(tex);});textures.push(t);}
 function sphere(radius,id,group,basic=false){const m=new THREE.Mesh(new THREE.SphereGeometry(radius,48,28),basic?new THREE.MeshBasicMaterial({color:0xffffff}):new THREE.MeshStandardMaterial({color:0xffffff,roughness:1}));m.name=id;m.userData.celestialBody=id;group.add(m);load(id+'-color.jpg',t=>{m.material.map=t;m.material.needsUpdate=true;});return m;}
 function ring(radius,group,color=0x304452){const points=Array.from({length:181},(_,i)=>new THREE.Vector3(Math.cos(i/180*Math.PI*2)*radius,0,Math.sin(i/180*Math.PI*2)*radius));const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity:.65}));group.add(line);return line;}
 const sun=sphere(.72,'sun',solar,true);solar.add(new THREE.PointLight(0xfff5df,2.5,0,0));
 const planets=PLANETS.map(([id,au,radius,days,phase])=>{const distance=2.4+6.2*Math.log10(1+au*2),mesh=sphere(radius,id,solar);ring(distance,solar,id==='earth'?0x427f80:0x263d50);
  if(id==='saturn'){const r=new THREE.Mesh(new THREE.RingGeometry(radius*1.3,radius*2.3,80),new THREE.MeshBasicMaterial({color:0xb6a685,side:THREE.DoubleSide,transparent:true,opacity:.75}));r.rotation.x=Math.PI/2;r.rotation.y=.45;mesh.add(r);}
  // Illustrative starting phases, with period ratios on the mission clock.
  return {id,distance,phase,mesh,periodSec:days*86400};
 });
 const solarEarth=planets.find(p=>p.id==='earth').mesh,solarMoon=sphere(.24*1737400/6371000,'moon',solar);
 const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.045,0),new THREE.MeshBasicMaterial({color:0x8ef8e0,toneMapped:false}));marker.name='player-marker';marker.userData.celestialBody='craft';solar.add(marker);
 const secondary=lunar?createEarthBody(4*6371000/1737400):sphere(4*1737400/6371000,'moon',context);
 if(lunar)context.add(secondary);secondary.name=lunar?'ContextEarth':'ContextMoon';secondary.userData.celestialBody=lunar?'earth':'moon';
 const separation=lunar?26*6371000/1737400:26,contextRing=ring(separation,context,0x3d5469);
 const moonOffset=new THREE.Vector3();
 const lagrangeHeight=.31;
 const arrow=new THREE.ArrowHelper(north,new THREE.Vector3(),.85,0x88eade,.23,.14),pole=new THREE.ArrowHelper(north,new THREE.Vector3(0,4,0),1.1,0xf3c46d,.23,.15);
 const beacon=new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),new THREE.MeshBasicMaterial({color:0x8ef8e0,toneMapped:false}));scene.add(arrow,pole,beacon);
 const hardwareLight=new THREE.DirectionalLight(0xb2cadc,.8);hardwareLight.layers.set(1);hardwareLight.target=craft;camera.layers.enable(1);scene.add(hardwareLight);
 let mode='inertial',targetId=lunar?'moon':'earth',showNorth=false,onSelected=null;
 let previousWall=null,smoothPosition=null,smoothAim=null,smoothUp=null,lastBody=centralBody(orbitId,orbit);
 const host=container||scene.userData?.container||null,labels=new Map();
 const labelNames=[['sun','Sun'],...planets.map(p=>[p.id,p.id[0].toUpperCase()+p.id.slice(1)]),['moon','Moon'],['craft','ORBITAL Spacecraft']];
 let leaders=null;
 if(host&&typeof document!=='undefined'){
  leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');leaders.classList.add('orbit-label-leaders');leaders.setAttribute('aria-hidden','true');host.append(leaders);
  for(const [id,text]of labelNames){const el=document.createElement('button');el.type='button';el.className='solar-body-label'+(id==='craft'?' solar-craft-label':'');el.textContent=text;el.dataset.body=id;el.onclick=e=>{e.stopPropagation();focusTarget(id);onSelected?.(id,mode);};host.append(el);const line=document.createElementNS('http://www.w3.org/2000/svg','line');leaders.append(line);labels.set(id,{el,line});}
 }
 function focusTarget(id){targetId=id;if(id==='craft')mode='follow';else if(mode!=='solar')mode=['earth','moon'].includes(id)?'earth-moon':'solar';input?.reset();smoothPosition=smoothAim=smoothUp=null;}
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
 const pointerDown=e=>{if(e.target.closest?.('button,select,input'))return;down={x:e.clientX,y:e.clientY};};
 const pointerUp=e=>{const start=down;down=null;if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)return;const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);const active=[sun,...planets.map(p=>p.mesh),solarMoon,marker,globe,secondary].filter(node=>node.visible&&(node!==secondary||context.visible));const hits=raycaster.intersectObjects(active,true);let node=hits[0]?.object;while(node&&!node.userData.celestialBody)node=node.parent;if(node){focusTarget(node.userData.celestialBody);onSelected?.(node.userData.celestialBody,mode);}};
 host?.addEventListener('pointerdown',pointerDown);host?.addEventListener('pointerup',pointerUp);
 function updateLabels(earthPosition,moonPosition){
  if(!host)return;const placed=[],w=host.clientWidth,h=host.clientHeight;
  scene.updateMatrixWorld(true);
  const points={sun:sun.getWorldPosition(new THREE.Vector3()),earth:mode==='solar'?solarEarth.position:earthPosition,moon:mode==='solar'?solarMoon.position:moonPosition,craft:mode==='solar'?marker.position:anchor};
  for(const p of planets)if(!points[p.id])points[p.id]=p.mesh.getWorldPosition(new THREE.Vector3());
  const occluders=[sun,...planets.map(p=>p.mesh),solarMoon,globe,secondary].filter(node=>node.visible&&(node!==secondary||context.visible)).map(node=>{
   if(!node.geometry.boundingSphere)node.geometry.computeBoundingSphere();
   return {id:node.userData.celestialBody,sphere:node.geometry.boundingSphere.clone().applyMatrix4(node.matrixWorld)};
  });
  camera.updateMatrixWorld();
  for(const [id,{el,line}]of labels){const p=points[id].clone().project(camera);el.hidden=p.z>1||p.z<-1||Math.abs(p.x)>1.05||Math.abs(p.y)>1.05||labelOccluded(camera.position,points[id],occluders.filter(o=>o.id!==id).map(o=>o.sphere));line.style.display=el.hidden?'none':'';if(el.hidden)continue;
   const width=Math.max(46,el.textContent.length*6.3+16),anchorX=(p.x+1)*w/2,anchorY=(1-p.y)*h/2,x=Math.max(width/2+8,Math.min(w-width/2-8,anchorX)),baseY=Math.max(112,Math.min(h-36,anchorY+12));let y=baseY,room=false;
   for(const shift of [0,-28,28,-56,56,-84,84,-112,112]){y=Math.max(112,Math.min(h-36,baseY+shift));if(!placed.some(r=>Math.abs(r.x-x)<(r.width+width)/2+4&&Math.abs(r.y-y)<27)){room=true;break;}}
   if(!room){el.hidden=true;line.style.display='none';continue;}
   placed.push({x,y,width});el.style.left=x+'px';el.style.top=y+'px';el.style.transform='translate(-50%,0)';line.setAttribute('x1',anchorX);line.setAttribute('y1',anchorY);line.setAttribute('x2',x);line.setAttribute('y2',y);line.style.display=Math.abs(y-anchorY)>18?'':'none';
  }
 }
 return {
  origin,
  setCamera(id,northVisible){if(lagrange&&id==='fixed')id='inertial';if(Object.hasOwn(CAMERA_MODES,id)){if(id!==mode){input?.reset();smoothPosition=smoothAim=smoothUp=null;}mode=id;targetId=id==='solar'?'system':id==='follow'?'craft':lunar?'moon':'earth';}showNorth=Boolean(northVisible);},
  focusTarget,onTargetSelected(callback){onSelected=callback;},
  sample(elapsedSec,activeOrbit=orbit,paused=false){
   const now=performance.now()/1000,dt=previousWall===null?0:Math.max(0,Math.min(.1,now-previousWall));previousWall=now;
   const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
   const systemSeconds=elapsedSec+(activeOrbit?.epochS??0);
   const body=centralBody(orbitId,activeOrbit);lastBody=lagrange?'lagrange':body;
   const spin=bodyAngle(body,elapsedSec+(activeOrbit?.epochS??0));globe.rotation.y=spin;
   const moonAngle=1.2-systemSeconds*Math.PI*2/(27.321661*86400);
   moonOffset.set(Math.cos(moonAngle)*separation,0,Math.sin(moonAngle)*separation);
   // Earth–Moon overview uses an Earth-centred frame in BOTH mission types.
   // Local lunar follow/overview keeps the lunar origin at zero instead.
   origin.copy(lunar&&mode==='earth-moon'?moonOffset:new THREE.Vector3());
   globe.position.copy(origin);
   secondary.position.copy(lunar?(mode==='earth-moon'?new THREE.Vector3():moonOffset.clone().negate()):moonOffset);
   contextRing.position.copy(lunar?secondary.position:new THREE.Vector3());
   secondary.rotation.y=bodyAngle(lunar?'earth':'moon',elapsedSec);
   // The guided Lagrange preset has no propagated trajectory. Keep its marker
   // beyond the Moon in the rotating context and omit a spacecraft orbit path.
   const local=lagrange?moonOffset.clone().multiplyScalar(1.17).setY(lagrangeHeight):operationPoint(orbitId,elapsedSec,activeOrbit);
   craft.position.copy(local).add(origin);
   if(lagrange)tangent.crossVectors(north,local).normalize();
   else tangent.copy(operationPoint(orbitId,elapsedSec+1,activeOrbit)).sub(operationPoint(orbitId,elapsedSec-1,activeOrbit)).normalize();
   radial.copy(local).normalize();tangent.addScaledVector(radial,-tangent.dot(radial)).normalize();if(tangent.lengthSq()<1e-8)tangent.set(0,0,1);normal.crossVectors(radial,tangent).normalize();craft.quaternion.setFromRotationMatrix(attitude.makeBasis(tangent,normal,radial));
   // Workshop models use the launch-adapter base as their origin. In orbit,
   // place the BUS centre on the path; keep all mounted part coordinates intact.
   if(!busCenter){const bus=craft.getObjectByName('enclosed_bus');if(bus?.geometry){bus.geometry.computeBoundingBox();bus.updateWorldMatrix(true,false);busCenter=craft.worldToLocal(bus.localToWorld(bus.geometry.boundingBox.getCenter(new THREE.Vector3())));}}
   anchor.copy(local).add(origin);if(busCenter)craft.position.copy(anchor).sub(busCenter.clone().multiply(craft.scale).applyQuaternion(craft.quaternion));
   beacon.position.copy(anchor);beacon.visible=mode==='inertial'||mode==='fixed';arrow.visible=mode==='inertial'||mode==='fixed';arrow.position.copy(anchor).addScaledVector(radial,.25);arrow.setDirection(tangent);pole.visible=showNorth&&mode!=='solar';pole.position.copy(origin).addScaledVector(north,4);
   for(const p of planets){const angle=p.phase-systemSeconds*Math.PI*2/p.periodSec;p.mesh.position.set(Math.cos(angle)*p.distance,0,Math.sin(angle)*p.distance);}
   solarEarth.rotation.y=bodyAngle('earth',systemSeconds);
   solarMoon.position.copy(solarEarth.position).add(new THREE.Vector3(Math.cos(moonAngle)*1.56,0,Math.sin(moonAngle)*1.56));solarMoon.rotation.y=bodyAngle('moon',systemSeconds);
   if(lagrange)marker.position.copy(solarMoon.position).sub(solarEarth.position).multiplyScalar(.17).add(solarMoon.position);
   else marker.position.copy(lunar?solarMoon.position:solarEarth.position).addScaledVector(radial,(lunar?.065:.24)*local.length()/4);
   // Retain the surrounding system in every camera. Rebase and enlarge it
   // around the local body's origin; omit its duplicate overview meshes.
   const overview=mode==='solar',systemScale=overview?1:4/(lunar?.24*1737400/6371000:.24);
   solar.visible=true;solar.scale.setScalar(systemScale);
   solar.position.copy(overview?new THREE.Vector3():origin.clone().addScaledVector(lunar?solarMoon.position:solarEarth.position,-systemScale));
   solarEarth.visible=solarMoon.visible=marker.visible=overview;
   solar.children.filter(node=>node.isLight).forEach(light=>{light.visible=overview;});
   solar.children.filter(node=>node.isLine).forEach(line=>{line.material.opacity=overview?.65:.12;});
   context.visible=!overview;globe.visible=craft.visible=!overview;
   if(camera.far<4000){camera.far=4000;camera.updateProjectionMatrix();}
   const earthPosition=lunar?secondary.position:globe.position,moonPosition=lunar?globe.position:secondary.position;
   const aim=new THREE.Vector3(),ideal=new THREE.Vector3(),up=mode==='follow'?normal:north;
   if(mode==='solar'){
    const chosen=targetId==='sun'?sun.position:targetId==='moon'?solarMoon.position:targetId==='craft'?marker.position:planets.find(p=>p.id===targetId)?.mesh.position;
    if(chosen)aim.copy(chosen);
    if(!chosen||targetId==='sun'){const distance=Math.max(39,39/Math.max(.5,camera.aspect));ideal.copy(aim).add(new THREE.Vector3(0,distance*.6,distance*.8));}
    else {const selected=targetId==='moon'?solarMoon:planets.find(p=>p.id===targetId)?.mesh;const radius=(selected?.geometry.parameters.radius||.24)*(targetId==='saturn'?2.3:1);const distance=Math.max(.6,radius*2)/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))*Math.max(1,1/camera.aspect);ideal.copy(aim).add(new THREE.Vector3(.3,.45,.84).normalize().multiplyScalar(distance));}
   }else if(mode==='earth-moon'||(lagrange&&mode==='inertial')){
    aim.copy(earthPosition).add(moonPosition).multiplyScalar(.5);
    const distance=separation*1.7/Math.min(1,Math.max(.5,camera.aspect));ideal.copy(aim).add(new THREE.Vector3(.3,.45,.84).normalize().multiplyScalar(distance));
   }else if(mode==='follow'){aim.copy(anchor);ideal.copy(aim).addScaledVector(radial,3.7).addScaledVector(normal,1.2).addScaledVector(tangent,.8);}
   else{aim.copy(origin);ideal.copy(home);if(mode==='fixed')ideal.applyAxisAngle(north,spin);ideal.add(origin);}
   const offset=input?input.offset(ideal.clone().sub(aim),up):ideal.clone().sub(aim);ideal.copy(aim).add(offset);
   const blend=reduced?1:1-Math.exp(-dt*7);
   if(!smoothPosition){smoothPosition=ideal.clone();smoothAim=aim.clone();smoothUp=up.clone();}else{smoothPosition.lerp(ideal,blend);smoothAim.lerp(aim,blend);smoothUp.lerp(up,blend).normalize();}
   camera.position.copy(smoothPosition);camera.up.copy(smoothUp);camera.lookAt(smoothAim);camera.updateMatrixWorld();
   hardwareLight.position.copy(camera.position);craft.traverse(node=>{if(node.isMesh)node.layers.enable(1);});
   if(host){host.dataset.orbitCamera=mode;host.dataset.primaryBody=lastBody;host.dataset.systemMotion=paused?'paused':'playing';}
   updateLabels(earthPosition,moonPosition);
  },
  destroy(){alive=false;disposeSky();host?.removeEventListener('pointerdown',pointerDown);host?.removeEventListener('pointerup',pointerUp);for(const{el}of labels.values())el.remove();leaders?.remove();secondary.userData.stopTexture?.();for(const t of textures)t.dispose();const seen=new Set();for(const group of [solar,context,arrow,pole,beacon])group.traverse(o=>{if(o.geometry&&!seen.has(o.geometry)){seen.add(o.geometry);o.geometry.dispose();}for(const m of(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))if(!seen.has(m)){seen.add(m);m.dispose();}});scene.remove(solar,context,arrow,pole,beacon,hardwareLight);}
 };
}
