import {createWorkshopAssembly} from './workshopAssembly.js';
import * as THREE from 'three';
import { getModel,getHardpoints } from './models.js';
import { disposeObject } from './sceneKit.js';
export function createAssembly(group) {
  const instances=new Map(),workshop=createWorkshopAssembly(group);let revision=0,dead=false,busId=null;
  async function update(design,data) {
    if(dead)return;
    if(design.assembly){revision++;for(const m of instances.values()){m.removeFromParent();disposeObject(m);}instances.clear();return workshop.update(design,data);}
    workshop.destroy();
    const token=++revision;
    if(busId!==design.busId){for(const m of instances.values()){group.remove(m);disposeObject(m);}instances.clear();busId=design.busId;}
    if(!design.busId)return;
    const hp=await getHardpoints(design.busId);if(dead||token!==revision)return;
    const entries=[{key:'bus',id:design.busId,pos:[0,0,0],field:'busId'}];
    const bus=data.parts.find(p=>p.id===design.busId);
    for(const [field,slots] of [['instrumentIds',hp.instruments]])
      (design[field]||[]).forEach((id,index)=>entries.push({key:field+index,id,field,index,dir:slots?.[index]?.dir,pos:slots?.[index]?.pos||[(index-((bus?.slots||1)-1)/2)*.3,.5,.6]}));
    if(design.commsId)entries.push({key:'comms',id:design.commsId,field:'commsId',pos:hp.comms.pos,dir:hp.comms.dir});
    // Computer and attitude electronics are installed inside the bus; do not draw generic exterior blocks.
    (design.panelIds||[]).forEach((id,index)=>entries.push({key:'panel'+index,id,field:'panelIds',index,pair:true,point:hp.panelPairs[index]}));
    const wanted=new Map(entries.map(e=>[e.key,e]));
    for(const [key,m]of instances)if(!wanted.has(key)||wanted.get(key).id!==m.userData.id){group.remove(m);disposeObject(m);instances.delete(key);}
    for(const e of entries){
      if(instances.has(e.key)){
        const m=instances.get(e.key);
        if(e.pair){
          group.updateMatrixWorld(true);
          const box=new THREE.Box3().setFromObject(instances.get('bus')).applyMatrix4(group.matrixWorld.clone().invert());
          const size=box.getSize(new THREE.Vector3());
          const pairCount=(design.panelIds||[]).length;
          const yFrac=pairCount>1?(design.busId==='bus_large'?(e.index===0?.65:.20):(e.index===0?.89:.11)):.5;
          const zOffset=pairCount>1?(design.busId==='bus_large'?(e.index===0?-.025:.025):(e.index===0?-.12:.12)*size.z):0;
          const inset=design.busId==='bus_large'?.038:.012;
          for(const pivot of m.children){
            const side=pivot.userData.wingSide;
            pivot.position.set(side*(size.x/2-inset),box.min.y+size.y*yFrac,zOffset);
          }
        } else {
          m.position.fromArray(e.pos);
          if(e.dir)m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...e.dir).normalize());
        }
        continue;
      }
      const m=new THREE.Group();
      if(e.pair){
        group.updateMatrixWorld(true);
        const box=new THREE.Box3().setFromObject(instances.get('bus')).applyMatrix4(group.matrixWorld.clone().invert());
        const size=box.getSize(new THREE.Vector3());
        for(const side of [-1,1]){
          const wing=await getModel(e.id.replace('panel_','solar_wing_')),pivot=new THREE.Group();
          const pairCount=(design.panelIds||[]).length;
          const yFrac=pairCount>1?(design.busId==='bus_large'?(e.index===0?.65:.20):(e.index===0?.89:.11)):.5;
          const zOffset=pairCount>1?(design.busId==='bus_large'?(e.index===0?-.025:.025):(e.index===0?-.12:.12)*size.z):0;
          const inset=design.busId==='bus_large'?.038:.012;
          pivot.position.set(side*(size.x/2-inset),box.min.y+size.y*yFrac,zOffset);
          wing.scale.x=side;pivot.add(wing);pivot.userData.wingSide=side;pivot.name=side<0?'solar_hinge_left':'solar_hinge_right';m.add(pivot);
        }
      }
      else {const part=await getModel(e.id);m.add(part);m.position.fromArray(e.pos);if(e.dir)m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...e.dir).normalize());}
      if(dead||token!==revision){disposeObject(m);return;}m.userData={...e,born:performance.now()};group.add(m);instances.set(e.key,m);
    }
  }
  function animate(fold=0){workshop.animate(fold);for(const m of instances.values()){const progress=THREE.MathUtils.smoothstep(Math.min(1,(performance.now()-m.userData.born)/400),0,1);m.scale.setScalar(m.userData.pair?1:Math.max(.01,progress));if(m.userData.pair)for(const wing of m.children)wing.rotation.z=(1-progress+fold)*wing.userData.wingSide*Math.PI/2;}}
  return {update,animate,instances,destroy(){workshop.destroy();dead=true;revision++;for(const m of instances.values()){group.remove(m);disposeObject(m);}instances.clear();}};
}
