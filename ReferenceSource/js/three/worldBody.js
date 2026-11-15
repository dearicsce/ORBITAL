import * as THREE from 'three';
import {addEarth} from './sceneKit.js';
import {loadLocalTexture} from './localTexture.js';
export function addWorldBody(scene,orbitId,radius=4){
 if(orbitId!=='llo')return addEarth(scene,radius);
 const material=new THREE.MeshStandardMaterial({color:0x9a9995,roughness:1,metalness:0,envMapIntensity:0,bumpScale:radius*.008});
 const moon=new THREE.Mesh(new THREE.SphereGeometry(radius,128,96),material);moon.name='LRO_lunar_globe';scene.add(moon);
 let alive=true;const textures=[];
 for(const [file,key] of [['lroc_color_2k.jpg','map'],['ldem_3_8bit.jpg','bumpMap']]){
  const texture=loadLocalTexture(new URL('../../textures/moon/'+file,import.meta.url).href,t=>{if(!alive){t.dispose();return;}if(key==='map'){t.colorSpace=THREE.SRGBColorSpace;material.color.set(0xffffff);}material[key]=t;material.needsUpdate=true;});textures.push(texture);
 }
 moon.userData.credit="NASA's Scientific Visualization Studio / LRO LROC and LOLA, CGI Moon Kit";
 moon.userData.stopTexture=()=>{alive=false;textures.forEach(t=>t.dispose());};return moon;
}
