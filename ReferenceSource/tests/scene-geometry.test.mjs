import {surfaces} from '../js/workshop/structure.js';
// Geometry-only test: fake DOM provides canvas/image allocations, not a renderer.
// It cannot establish visual quality or GPU performance.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context}),createElementNS:()=>({addEventListener(){},removeEventListener(){},set src(v){}})};
const nativeFetch=globalThis.fetch;globalThis.fetch=async(url,...args)=>{if(String(url).startsWith('file:'))return new Response(await fs.readFile(new URL(url)),{headers:{'Content-Type':'application/json'}});return nativeFetch(url,...args);};
const {getModel}=await import('../js/three/models.js'),{createAssembly}=await import('../js/three/spacecraftParts.js'),{createLaunchSpace,INSERTION_ANGLE}=await import('../js/three/launchSpace.js'),{orbitPoint}=await import('../js/three/orbitPresentation.js');
const {segmentBlocked,presetOrbit,orbitalPeriod}=await import('../js/engine/orbitalGeometry.js');
const {enrichCampaign,starterDesign}=await import('../js/campaign.js');
const {createLaunchSite}=await import('../js/three/launchSite.js');
const data=enrichCampaign(JSON.parse(await fs.readFile(new URL('../data/world1.json',import.meta.url)))),design=starterDesign(data.missions.find(m=>m.id==='m1'),data);
let n=0;const check=(ok,msg)=>{assert.ok(ok,msg);n++;};
for(const busId of ['bus_micro','bus_small','bus_medium','bus_large']){
 const g=new THREE.Group(),a=createAssembly(g);await a.update({...design,busId,panelIds:['panel_l','panel_l'],instrumentIds:['optical_camera','weather_imager','spectrometer','neutron_detector']},data);for(const m of a.instances.values())m.userData.born=-1000;a.animate();g.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(a.instances.get('bus'));check(!!g.getObjectByName('enclosed_bus'),busId+' enclosed shell');
 for(const key of ['panel0','panel1'])for(const hinge of a.instances.get(key).children){const p=hinge.getWorldPosition(new THREE.Vector3());check(Math.abs(Math.abs(p.x)-box.max.x)<.04,busId+' hinge contacts shell');check(p.y>box.min.y&&p.y<box.max.y,'Hinge inside mounting face');}
 for(let i=0;i<4;i++){const m=a.instances.get('instrumentIds'+i);check(Math.abs(m.position.z-surfaces(busId).front.origin[2])<.001,'Payload mounting flange on structural surface '+busId);check(m.position.y<box.max.y&&m.position.y>box.min.y,'Payload inside deck extent');}
 const upper=new THREE.Box3().setFromObject(a.instances.get('panel0')),lower=new THREE.Box3().setFromObject(a.instances.get('panel1'));check(lower.max.y<upper.min.y,'Largest paired wings do not overlap');
 check(!a.instances.has('batteryIds0')&&!a.instances.has('fuelIds0'),'Internal equipment stays inside shell');
 await a.update({...design,busId,panelIds:[],instrumentIds:[]},data);check(!a.instances.has('panel0')&&!a.instances.has('instrumentIds0'),'Removal clears owned geometry');a.destroy();
}
for(const id of ['leo','sso','geo','llo','lagrange'])for(const position of [[0,13.7,0],[48,112,0]]){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),craft=new THREE.Group();craft.position.fromArray(position);craft.scale.setScalar(.26);scene.add(craft);const a=createAssembly(craft);await a.update(design,data);for(const m of a.instances.values())m.userData.born=-1000;a.animate(1);
 const earth=new THREE.Mesh(new THREE.SphereGeometry(180),new THREE.MeshStandardMaterial());earth.position.y=-185;scene.add(earth);camera.position.set(position[0]+20,position[1]+4,30);const originalCamera=camera.position.clone(),originalCraft=craft.position.clone(),target=craft.position.clone();camera.lookAt(target);
 const view=createLaunchSpace({scene,camera},{...design,orbitId:id},data,{craft,assembly:a,horizon:earth,target});await Promise.resolve();
 for(let i=0;i<=1000;i++){
  view.update(i/1000);scene.updateMatrixWorld(true);const radius=180*earth.scale.x,relative=craft.position.clone().sub(earth.position),cam=camera.position.clone().sub(earth.position),bound=new THREE.Box3().setFromObject(craft).getBoundingSphere(new THREE.Sphere());
  check(relative.length()>radius+bound.radius,`${id} entire craft outside planet p=${i/1000}`);check(cam.length()>radius+.05,'Camera outside planet');check(!segmentBlocked(cam.toArray(),relative.toArray(),radius),`${id} unobstructed camera line of sight p=${i/1000}`);
  if(i===0){check(originalCamera.distanceTo(camera.position)<1e-8,'No initial camera snap');check(originalCraft.distanceTo(craft.position)<1e-8,'No initial craft snap');}
 }
 const final=craft.position.clone(),cam=camera.position.clone();view.updateOperations(0,.016,0);check(final.distanceTo(craft.position)<1e-8,'No deployment-to-operations snap');check(cam.distanceTo(camera.position)<1e-8,'No camera handover snap');view.destroy();
}
const {operationPoint,operationCamera}=await import('../js/three/orbitPresentation.js');for(const id of ['leo','sso','llo']){const o=presetOrbit(id,{semiMajorAxisM:(id==='llo'?1737400:6371008.4)*1.15,eccentricity:.12});for(let i=0;i<1000;i++)check(operationPoint(id,i/1000*orbitalPeriod(o),o).length()>5.5,'Engineering orbit retains illustrative hull clearance');check(Math.hypot(...operationCamera(id,o))>15,'Engineering camera fits orbital extent');}
const site=createLaunchSite();for(const feature of ['grass_meadow','coastal_water','retention_water','access_road','propellant_storage_tank','landscape_treeline','standby_launcher_1','standby_launcher_2'])check(site.userData.siteFeatures.includes(feature),'Site feature '+feature);
let meshes=0;site.traverse(o=>{if(o.isMesh)meshes++;});check(meshes<65,'Static batching bounds scene draw objects');
console.log(`PASS: ${n} geometry assertions; ${meshes} site mesh objects. GPU/rendered visual checks not performed.`);
