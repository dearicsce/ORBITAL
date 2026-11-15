import * as THREE from 'three';
import {createScene,disposeObject} from './sceneKit.js';
import {createWorkshopHangar} from './workshopHangar.js';
import {customVehicle} from './customVehicle.js';

export function createRocketWorkshopView(container){
 const kit=createScene(container,{position:[21,22,44],target:[0,14,0]});
 if(!kit.renderer){kit.destroy();return null;}
 const bay=createWorkshopHangar(kit.scene,{launcher:true});
 kit.sun.position.set(18,37,22);
 kit.controls.maxDistance=82;
 kit.controls.minDistance=9;
 kit.controls.enablePan=false;
 let model=null,config=null;
 kit.draw=()=>bay.frame(kit.camera);
 return {
  update(blueprint){
   const key=JSON.stringify([blueprint.name,blueprint.parts]);
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
    if(node.name==='interstage')node.visible=Boolean(installed.separator);
    if(node.name==='payload_adapter')node.visible=Boolean(installed.adapter);
   });
   kit.scene.add(model);
   const bounds=new THREE.Box3().setFromObject(model);
   model.position.y=-bounds.min.y;
   bounds.translate(model.position);
   bay.fit(bounds);
  },
  destroy(){kit.destroy();}
 };
}
