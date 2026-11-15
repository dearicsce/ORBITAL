import * as THREE from 'three';

// Camera input changes presentation only; it never changes simulation time or attitude.
export function flightCameraInput(element){
 let yaw=0,pitch=0,zoom=1,drag=null;
 const down=e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};element.setPointerCapture(e.pointerId);};
 const move=e=>{if(!drag||drag.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.006,-1.1,1.1);drag.x=e.clientX;drag.y=e.clientY;};
 const up=e=>{if(drag?.id===e.pointerId)drag=null;};
 const wheel=e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(e.deltaY*.001),.55,4);};
 const events={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,lostpointercapture:up,wheel};
 if(element){element.style.touchAction='none';for(const [name,fn] of Object.entries(events))element.addEventListener(name,fn,{passive:false});}
 return {
  offset(value,up){const offset=value.clone().applyAxisAngle(up,yaw);const right=new THREE.Vector3().crossVectors(up,offset).normalize();return offset.applyAxisAngle(right,pitch).multiplyScalar(zoom);},
  reset(){yaw=pitch=0;zoom=1;},
  destroy(){if(element)for(const [name,fn] of Object.entries(events))element.removeEventListener(name,fn);}
 };
}
