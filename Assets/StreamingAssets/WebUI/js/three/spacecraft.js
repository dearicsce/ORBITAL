import * as THREE from 'three';
import { createScene } from './sceneKit.js';
import {createWorkshopHangar} from './workshopHangar.js';
import { createAssembly } from './spacecraftParts.js';
import { bindSpacecraftInteraction } from './spacecraftInteract.js';
export function createSpacecraftView(container,{onRemove=null,data={parts:[],instruments:[]}}={}) {
 const kit=createScene(container,{position:[5,3,7],target:[0,.5,0]});
 const hangar=createWorkshopHangar(kit.scene);
 const group=new THREE.Group();kit.scene.add(group);const assembly=createAssembly(group);
 const message=document.createElement('p');message.className='empty-craft';message.textContent='Choose a bus to begin';container.append(message);
 let fitTimer=null,revision=0,hasFramed=false;
 function fit(force=false){
  group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group);if(box.isEmpty())return;
  hangar.fit(box);
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  const halfFov=THREE.MathUtils.degToRad(kit.camera.fov/2),aspect=Math.max(.2,kit.camera.aspect);
  const distance=Math.max(size.y,size.x/aspect,size.z)*.65/Math.tan(halfFov)+size.z*.5;
  const target=kit.controls?.target||center,direction=kit.camera.position.clone().sub(target).normalize();
  const current=kit.camera.position.distanceTo(target);kit.camera.position.copy(center).addScaledVector(direction,force?distance:Math.max(current,distance));
  kit.controls?.target.copy(center);kit.camera.lookAt(center);kit.controls?.update();
 }
 const unbind=onRemove?bindSpacecraftInteraction(container,kit,group,onRemove,data):()=>{};
 kit.draw=()=>{assembly.animate();hangar.frame(kit.camera);};
 const preset=name=>{const positions={Front:[0,1,8],Top:[0,8,.01],Side:[8,1,0],Free:[5,3,7],Reset:[5,3,7]};kit.camera.position.fromArray(positions[name]||positions.Free);if(kit.controls){kit.controls.target.set(0,.5,0);kit.controls.enableRotate=name==='Free'||name==='Reset';kit.controls.update();}fit(true);};
 return {preset,update(design,world){message.hidden=!!design.busId;const token=++revision;return assembly.update(design,world).then(()=>{if(kit.dead||token!==revision)return;clearTimeout(fitTimer);fitTimer=setTimeout(()=>{if(!kit.dead){assembly.animate();fit(!hasFramed);hasFramed=true;}},350);});},destroy(){revision++;clearTimeout(fitTimer);unbind();assembly.destroy();message.remove();kit.destroy();}};
}
