import * as THREE from 'three';
import {createLaunchVehicle} from './launchVehicle.js';
import {rocketPart} from '../rocket/catalogue.js';

export function customVehicle(rocket){
 const core=rocketPart('coreTank',rocket.parts.coreTank),upper=rocketPart('upperTank',rocket.parts.upperTank);
 const fairing=rocketPart('fairing',rocket.parts.fairing),booster=rocketPart('boosters',rocket.parts.boosters);
 const root=createLaunchVehicle('orbital-custom',{custom:{core,upper,fairing,booster}});
 root.name='orbital_custom_vehicle';
 root.userData.decals=structuredClone(rocket.decals);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=180;
 const context=canvas.getContext('2d');
 if(context){
  context.textAlign='center';context.fillStyle='#112b35';context.font='800 85px system-ui';context.fillText('ORBITAL',256,89);
  if(rocket.name!=='Untitled launcher'){context.font='600 34px system-ui';context.fillText(rocket.name,256,144,465);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(.9,.32),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  label.name='orbital_wordmark_decal';label.rotation.z=Math.PI/2;label.position.set(0,6,(core?.diameterM||1.8)*.29+.012);
  root.getObjectByName('stage_lower')?.add(label);
 }
 return root;
}
