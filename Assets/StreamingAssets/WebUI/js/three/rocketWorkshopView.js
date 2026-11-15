import * as THREE from 'three';
import {createScene,disposeObject} from './sceneKit.js';
import {createWorkshopHangar} from './workshopHangar.js';
import {visibleHardwareBounds} from './flightFraming.js';
import {customVehicle} from './customVehicle.js';

export function createRocketWorkshopView(container){
 const kit=createScene(container,{position:[21,22,44],target:[0,14,0]});
 if(!kit.renderer){kit.destroy();return null;}
 const bay=createWorkshopHangar(kit.scene,{launcher:true});
 kit.sun.position.set(18,37,22);
 kit.controls.maxDistance=82;
 kit.controls.minDistance=9;
 kit.controls.enablePan=false;
 let model=null,config=null,bounds=null;
 function frameRocket(){
  if(!bounds||bounds.isEmpty()||!container.clientHeight)return;
  const center=bounds.getCenter(new THREE.Vector3());
  const radius=bounds.getSize(new THREE.Vector3()).length()/2;
  const vertical=Math.tan(THREE.MathUtils.degToRad(kit.camera.fov/2));
  const aspect=container.clientWidth/container.clientHeight;
  const angle=Math.atan(vertical*Math.min(1,aspect));
  const distance=1.13*radius/Math.sin(angle);
  const direction=kit.camera.position.clone().sub(kit.controls.target).normalize();
  kit.controls.target.copy(center);
  kit.controls.maxDistance=Math.max(82,distance*2.2);
  kit.camera.position.copy(center).addScaledVector(direction,distance);
  kit.controls.update();
 }
 const resize=new ResizeObserver(frameRocket);
 resize.observe(container);
 kit.draw=()=>bay.frame(kit.camera);
 return {
  update(blueprint){
   const key=JSON.stringify(blueprint.parts);
   if(key===config)return;
   if(model){model.removeFromParent();disposeObject(model);}
   config=key;
   model=customVehicle(blueprint);
   // Uniform conversion from schematic model units to metres. Tank diameters
   // use catalogue values; stage lengths are authored visual proportions.
   model.scale.setScalar(1/.58);
   const installed=blueprint.parts;
   model.traverse(node=>{
    if(node.isMesh)node.castShadow=node.receiveShadow=true;
    const id=node.userData.flightPartId;
    if(id==='core')node.visible=Boolean(installed.coreTank||installed.coreEngine);
    if(id==='upper')node.visible=Boolean(installed.upperTank||installed.upperEngine||installed.adapter);
    if(id?.startsWith('fairing'))node.visible=Boolean(installed.fairing);
    if(node.userData.flightEngineId==='core')node.visible=Boolean(installed.coreEngine);
    if(node.userData.flightEngineId==='upper')node.visible=Boolean(installed.upperEngine);
    if(node.name==='first_stage_tank'||node.name==='tank_join'||node.name==='orbital_wordmark_decal')node.visible=Boolean(installed.coreTank);
    if(node.name==='upper_stage_tank')node.visible=Boolean(installed.upperTank);
    if(node.name==='engine_skirt')node.visible=Boolean(installed.coreEngine);
    if(['interstage','interstage_transition'].includes(node.name))node.visible=Boolean(installed.separator);
    if(node.name==='payload_adapter')node.visible=Boolean(installed.adapter);
   });
   kit.scene.add(model);
   bounds=visibleHardwareBounds([model]);
   if(bounds.isEmpty())return;
   model.position.y=-bounds.min.y;
   bounds.translate(model.position);
   bay.fit(bounds);
   frameRocket();
  },
  destroy(){resize.disconnect();kit.destroy();}
 };
}
