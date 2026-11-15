import * as THREE from 'three';
import {createModularBus,createModularEquipment} from './modularBus.js';
import {loadThermalModel} from './thermalModels.js';
import {createSolarWing} from './solarWing.js';
import {disposeObject} from './sceneKit.js';
import {catalog} from '../workshop/blueprint.js';
import {mountPosition,surfaces,metadata,propulsionPort} from '../workshop/structure.js';
// Structural placement (outer group), deployment (child pivot), and whole-craft attitude
// (the caller's parent) are deliberately independent transforms.
export function createWorkshopAssembly(group){
 const instances=new Map();let busId=null,interior=false;
 function update(design,data){
  const a=design.assembly;if(!a)return Promise.resolve();
  const entries=[{instanceId:'bus',catalogId:a.busId},...a.components].filter(e=>e.catalogId);
  const wanted=new Map(entries.map(e=>[e.instanceId,e]));
  for(const [id,m]of instances)if(!wanted.has(id)||wanted.get(id).catalogId!==m.userData.id){m.removeFromParent();disposeObject(m);instances.delete(id);}
  for(const c of entries){
   let root=instances.get(c.instanceId);const p=catalog(data,c.catalogId)||{id:c.catalogId,type:'unknown',name:'Unresolved '+c.catalogId};
   if(!root){root=new THREE.Group();root.name=c.instanceId;root.userData={id:c.catalogId,instanceId:c.instanceId,internal:metadata(p).internal,propulsion:p.type==='fuel'};
    if(c.instanceId==='bus'){if(data.parts.some(p=>p.id===c.catalogId&&p.type==='bus'))root.add(createModularBus(c.catalogId));else{const placeholder=new THREE.Mesh(new THREE.BoxGeometry(.8,1,.7),new THREE.MeshBasicMaterial({color:0xe2b970,wireframe:true}));placeholder.position.y=.5;root.add(placeholder);}}
    else if(p.type==='panel'){
     const stand=metadata(p).wingLength*.19+.08;
     const mount=new THREE.Mesh(new THREE.BoxGeometry(stand,.10,.10),new THREE.MeshStandardMaterial({color:0x9ba9b5,metalness:.7,roughness:.4}));mount.position.x=stand/2;root.add(mount);
     const hinge=new THREE.Group();hinge.name='deployment_hinge';hinge.position.x=stand;hinge.add(createSolarWing(p.visualId||c.catalogId.replace('panel_','solar_wing_'),metadata(p).wingLength));root.add(hinge);root.userData.hinge=hinge;
    }else if(p.type==='thermal'){
     loadThermalModel(p.id).then(model=>{
      if(instances.get(c.instanceId)!==root){disposeObject(model);return;}
      root.add(model);
     }).catch(error=>console.error('Thermal hardware could not load:',error));
    }else if(metadata(p).internal){
     const size=p.type==='fuel'?[.18,.1,.18]:[.24,.08,.18];for(let unit=0;unit<metadata(p).bayUnits;unit++){const mesh=new THREE.Mesh(p.type==='fuel'?new THREE.CylinderGeometry(.085,.085,.1,16):new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color:p.type==='battery'?0x5a8598:p.type==='fuel'?0xb4a482:0x60756a,metalness:.45,roughness:.5}));mesh.userData.internalVolume=true;root.add(mesh);}
     if(p.type==='fuel'){const nozzle=new THREE.Group();nozzle.userData.thrusterPort=true;const bell=new THREE.Mesh(new THREE.CylinderGeometry(.055,.022,.18,20,1,true),new THREE.MeshStandardMaterial({color:0x7d929f,metalness:.75,roughness:.35,side:THREE.DoubleSide}));bell.position.y=.09;nozzle.add(bell);root.add(nozzle);}
    }else if(p.type==='unknown')root.add(new THREE.Mesh(new THREE.BoxGeometry(.22,.22,.22),new THREE.MeshBasicMaterial({color:0xe2b970,wireframe:true})));else root.add(createModularEquipment(p.visualId||c.catalogId));
    instances.set(c.instanceId,root);group.add(root);
   }
   if(c.instanceId!=='bus'){
    root.position.fromArray(mountPosition(a.busId,c));root.quaternion.identity();
    if(metadata(p).internal)root.children.filter(child=>child.userData.internalVolume).forEach((child,i)=>{const point=mountPosition(a.busId,{...c,bayId:'bay-'+(Number(c.bayId?.split('-')[1]||0)+i)});child.position.set(...point.map((n,j)=>n-root.position.getComponent(j)));});
    if(p.type==='fuel'){const port=propulsionPort(a.busId,c.configuration.propulsionPort||0),nozzle=root.children.find(child=>child.userData.thrusterPort);nozzle.position.fromArray(port.position).sub(root.position);nozzle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...port.normal));}
    if(!metadata(p).internal){
     const s=surfaces(a.busId)[c.attachmentSurfaceId];if(s){
      // Wings extend +X from the hinge; other equipment extends +Y from its base.
      const normal=new THREE.Vector3(...s.normal),u=new THREE.Vector3(...s.u),v=new THREE.Vector3(...s.v);
      const basis=p.type==='panel'?new THREE.Matrix4().makeBasis(normal,v,u.clone().negate()):new THREE.Matrix4().makeBasis(u,normal,v.clone().negate());
      root.quaternion.setFromRotationMatrix(basis);
      root.rotateOnAxis(new THREE.Vector3(p.type==='panel'?1:0,p.type==='panel'?0:1,0),THREE.MathUtils.degToRad(c.localRotation[1]));
     }
    }
    root.visible=!root.userData.internal||root.userData.propulsion||interior;
   }
  }
  busId=a.busId;setInterior(interior);return Promise.resolve();
 }
 function setInterior(value){interior=value;for(const [id,m]of instances){if(id==='bus')m.traverse(o=>{if(o.userData.busSkin)o.visible=!value;});else if(m.userData.propulsion){m.visible=true;m.children.forEach(child=>{if(child.userData.internalVolume)child.visible=value;});}else if(m.userData.internal)m.visible=value;}}
 function animate(fold=0){for(const m of instances.values())if(m.userData.hinge)m.userData.hinge.rotation.z=THREE.MathUtils.clamp(fold,0,1)*Math.PI/2;}
 return {update,animate,instances,setInterior,destroy(){for(const m of instances.values()){m.removeFromParent();disposeObject(m);}instances.clear();}};
}
