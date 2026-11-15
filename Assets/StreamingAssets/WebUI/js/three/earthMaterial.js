import * as THREE from 'three';
import {loadLocalTexture} from './localTexture.js';

// Shared, locally sourced Earth treatment. Lighting follows world-space +X in
// flight, matching geometryAt() rather than the camera or the rotating globe.
export function createEarthBody(radius=2,{sunDirection=[1,0,0],clouds=true,night=true}={}){
 const light=new THREE.Vector3(...sunDirection).normalize();
 const material=new THREE.MeshPhongMaterial({color:0x17486a,shininess:24,specular:0x254254});
 const globe=new THREE.Mesh(new THREE.SphereGeometry(radius,radius>100000?384:96,radius>100000?192:64),material);
 globe.name='Earth_NASA_Eyes';
 let alive=true;
 const textures=[];
 const load=(file,apply)=>{
  const texture=loadLocalTexture(new URL('../../textures/eyes/'+file,import.meta.url).href,t=>{
   if(!alive){t.dispose();return;}
   t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;apply(t);
  });
  textures.push(texture);return texture;
 };
 load('earth-color.jpg',t=>{material.map=t;material.color.setHex(0xffffff);material.needsUpdate=true;});
 load('earth-specular.jpg',t=>{t.colorSpace=THREE.NoColorSpace;material.specularMap=t;material.needsUpdate=true;});
 if(clouds){
  const cloudMaterial=new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,depthWrite:false,opacity:.8,shininess:0});
  const cloudLayer=new THREE.Mesh(new THREE.SphereGeometry(radius*1.0016,96,64),cloudMaterial);
  cloudLayer.name='NASA_Eyes_cloud_layer';globe.add(cloudLayer);
  load('earth-cloud.png',t=>{cloudMaterial.map=t;cloudMaterial.needsUpdate=true;});
 }
 if(night){
  material.onBeforeCompile=shader=>{
   shader.uniforms.earthSun={value:light};
   shader.vertexShader='varying vec3 earthNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nearthNormal=inverseTransformDirection(transformedNormal,viewMatrix);');
   shader.fragmentShader='varying vec3 earthNormal; uniform vec3 earthSun;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 1.0-smoothstep(-0.16,0.12,dot(normalize(earthNormal),earthSun));');
  };
  material.customProgramCacheKey=()=> 'orbital-eyes-earth-night-v2';
  load('earth-night.jpg',t=>{material.emissiveMap=t;material.emissive.setHex(0xffffff);material.emissiveIntensity=.48;material.needsUpdate=true;});
 }
 const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*1.018,radius>100000?192:64,radius>100000?96:40),new THREE.ShaderMaterial({
  uniforms:{sunDirection:{value:light}},transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
  vertexShader:'#include <common>\nvarying vec3 n;varying vec3 v;varying vec3 worldN;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);worldN=inverseTransformDirection(n,viewMatrix);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
  fragmentShader:'uniform vec3 sunDirection;varying vec3 n;varying vec3 v;varying vec3 worldN;void main(){float facing=abs(dot(normalize(n),normalize(v)));float rim=pow(1.-facing,4.);float sun=dot(normalize(worldN),sunDirection);float day=smoothstep(-.24,.35,sun);vec3 tint=mix(vec3(.85,.26,.08),vec3(.16,.48,1.),smoothstep(-.1,.3,sun));gl_FragColor=vec4(tint,rim*day*.38);}'
 }));
 globe.add(atmosphere);
 globe.userData.credit='NASA/JPL-Caltech Eyes on the Solar System surface, cloud, specular and night maps. Static maps; ORBITAL atmospheric approximation.';
 globe.userData.stopTexture=()=>{alive=false;textures.forEach(t=>t.dispose());};
 return globe;
}
