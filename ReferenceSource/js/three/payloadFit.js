import * as THREE from 'three';

// Imported spacecraft and schematic launchers use different art scales. Fit the
// folded visual into the actual tapered shell; engineering capacity is checked
// separately by launcher preflight rules.
export function fitPayloadToFairing(payload,rocket){
 const fairing=rocket.getObjectByName('fairing_left');
 const profile=fairing?.geometry?.parameters?.points;
 if(!profile)return 1;
 rocket.updateMatrixWorld(true);payload.updateMatrixWorld(true);
 const mount=fairing.worldToLocal(payload.getWorldPosition(new THREE.Vector3()));
 const vertices=[];
 payload.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const positions=mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++)vertices.push(fairing.worldToLocal(new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld)).sub(mount));
 });
 const fits=scale=>vertices.every(v=>{
  const y=mount.y+v.y*scale;
  for(let i=1;i<profile.length;i++)if(y>=profile[i-1].y&&y<=profile[i].y){
   const t=(y-profile[i-1].y)/(profile[i].y-profile[i-1].y);
   const radius=THREE.MathUtils.lerp(profile[i-1].x,profile[i].x,t)*.97;
   return Math.hypot(mount.x+v.x*scale,mount.z+v.z*scale)<=radius;
  }
  return false;
 });
 if(fits(1))return 1;
 let low=0,high=1;
 for(let i=0;i<24;i++){const mid=(low+high)/2;if(fits(mid))low=mid;else high=mid;}
 payload.scale.multiplyScalar(low);payload.updateMatrixWorld(true);
 return low;
}
