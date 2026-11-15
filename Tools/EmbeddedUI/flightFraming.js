import * as THREE from 'three';

// Box3.setFromObject includes invisible descendants. Only attached, drawn meshes
// belong to the tracking subject; debris and exhaust live outside these roots.
export function visibleHardwareBounds(roots){
 const box=new THREE.Box3();
 for(const root of roots){
  root.updateWorldMatrix(true,true);
  root.traverseVisible(node=>{
   if(!node.isMesh||!node.geometry)return;
   const materials=Array.isArray(node.material)?node.material:[node.material];
   if(materials.every(m=>!m||m.visible===false||(m.transparent&&m.opacity===0)))return;
   if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();
   if(node.geometry.boundingBox)box.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
  });
 }
 return box;
}

export function flightFraming(container,camera){
 const screen=container.closest('.numerical-launch');
 let rect={left:0,right:1,top:0,bottom:1},center=null,distance=0;
 const refresh=()=>{
  const canvas=container.getBoundingClientRect();
  let left=canvas.left+24,right=canvas.right-24,top=canvas.top+24,bottom=canvas.bottom-24;
  for(const selector of ['.screen-top','.launch-instruments','.launch-timeline','.launch-caption']){
   const e=screen?.querySelector(selector);if(!e)continue;
   const b=e.getBoundingClientRect();
   if(b.bottom<=canvas.top||b.top>=canvas.bottom||b.right<=canvas.left||b.left>=canvas.right)continue;
   if(selector==='.launch-instruments')left=Math.max(left,b.right+24);
   else if(selector==='.screen-top')top=Math.max(top,b.bottom+18);
   else bottom=Math.min(bottom,b.top-18);
  }
  // Extremely narrow layouts put instruments below the canvas.
  if(right-left<80){left=canvas.left+16;right=canvas.right-16;}
  if(bottom-top<80){top=canvas.top+16;bottom=canvas.bottom-16;}
  rect={left:(left-canvas.left)/canvas.width,right:(right-canvas.left)/canvas.width,
   top:(top-canvas.top)/canvas.height,bottom:(bottom-canvas.top)/canvas.height};
 };
 const observer=new ResizeObserver(refresh);observer.observe(container);if(screen)observer.observe(screen);
 for(const e of screen?.querySelectorAll('.screen-top,.launch-instruments,.launch-caption')||[])observer.observe(e);
 refresh();
 return {
  fit(roots,baseOffset,up,dt,input){
   const box=visibleHardwareBounds(roots);if(box.isEmpty())return;
   const desired=box.getCenter(new THREE.Vector3()),radius=Math.max(.2,box.getSize(new THREE.Vector3()).length()/2);
   const blend=1-Math.exp(-Math.max(0,dt)*5);
   if(!center)center=desired.clone();else center.lerp(desired,blend);
   const vfov=camera.fov*Math.PI/180,tanY=Math.tan(vfov/2),tanX=tanY*camera.aspect;
   const halfY=(rect.bottom-rect.top)*tanY,halfX=(rect.right-rect.left)*tanX;
   // Sphere fit covers any attitude and uses both horizontal and vertical FOV.
   const required=(radius+center.distanceTo(desired))*1.08/Math.sin(Math.atan(Math.min(halfX,halfY)));
   distance=distance?Math.max(required,distance+(required-distance)*blend):required;
   const offset=input.offset(baseOffset.clone().normalize().multiplyScalar(distance),up);
   const forward=offset.clone().normalize().negate();
   const right=new THREE.Vector3().crossVectors(forward,up).normalize();
   const screenUp=new THREE.Vector3().crossVectors(right,forward).normalize();
   const aim=center.clone().addScaledVector(right,-(rect.left+rect.right-1)*offset.length()*tanX)
    .addScaledVector(screenUp,(rect.top+rect.bottom-1)*offset.length()*tanY);
   camera.position.copy(aim).add(offset);camera.up.copy(up);camera.lookAt(aim);
  },
  reset(){center=null;distance=0;refresh();},
  destroy(){observer.disconnect();}
 };
}
