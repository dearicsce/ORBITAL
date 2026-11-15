import * as THREE from 'three';
import {roundPointsMaterial} from './sceneKit.js';
export function createOrbitalEventFX(parent,craft,camera){
 const root=new THREE.Group();parent.add(root);let started=-10,event='';
 const positions=new Float32Array(48*3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 const sparks=new THREE.Points(geometry,roundPointsMaterial({color:0xe4aa68,size:.045,blending:THREE.AdditiveBlending}));root.add(sparks);
 const circle=Array.from({length:65},(_,i)=>new THREE.Vector3(Math.cos(i/64*Math.PI*2)*.2,Math.sin(i/64*Math.PI*2)*.2,0));
 const signal=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle),new THREE.LineBasicMaterial({color:0xdc7d69,transparent:true}));root.add(signal);root.visible=false;
 return {flash(type){event=type;started=performance.now()/1000;},update(now){const age=now-started;root.visible=age>=0&&age<2;if(!root.visible)return;
  root.position.copy(craft.position);signal.quaternion.copy(camera.quaternion);signal.scale.setScalar(1+age*2);signal.material.opacity=(1-age/2)*.65;signal.visible=event==='antenna_fault'||event==='battery_fade';sparks.visible=event==='solar_flare'||event==='debris_warning';sparks.material.opacity=(1-age/2)*.6;
  for(let i=0;i<48;i++){positions[i*3]=event==='debris_warning'?3-age*3:Math.sin(i*9)*age*.6;positions[i*3+1]=Math.cos(i*13)*.4;positions[i*3+2]=Math.sin(i*17)*.4;}geometry.attributes.position.needsUpdate=true;
 }};
}
