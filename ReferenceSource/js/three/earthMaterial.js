import * as THREE from 'three';
import {loadLocalTexture} from './localTexture.js';

// Shared, locally sourced Earth treatment. Lighting follows world-space +X in
// flight, matching geometryAt() rather than the camera or the rotating globe.
export function createEarthBody(radius=2,{sunDirection=[1,0,0],clouds=true,night=true}={}){
 const light=new THREE.Vector3(...sunDirection).normalize();
 const material=new THREE.MeshStandardMaterial({color:0x17486a,roughness:.85,metalness:0,envMapIntensity:0});
 const globe=new THREE.Mesh(new THREE.SphereGeometry(radius,96,64),material);
 globe.name='Earth_BlueMarble';
 let alive=true;
 const textures=[];
 const load=(file,apply)=>{
  const texture=loadLocalTexture(new URL('../../textures/atlas/'+file,import.meta.url).href,t=>{
   if(!alive){t.dispose();return;}
   t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;apply(t);
  });
  textures.push(texture);return texture;
 };
 load(clouds?'earth-clouds.jpg':'earth-surface.jpg',t=>{material.map=t;material.color.setHex(0xffffff);material.needsUpdate=true;});
 if(night){
  material.onBeforeCompile=shader=>{
   shader.uniforms.earthSun={value:light};
   shader.vertexShader='varying vec3 earthNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nearthNormal=inverseTransformDirection(transformedNormal,viewMatrix);');
   shader.fragmentShader='varying vec3 earthNormal; uniform vec3 earthSun;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 1.0-smoothstep(-0.16,0.12,dot(normalize(earthNormal),earthSun));');
  };
  material.customProgramCacheKey=()=> 'orbital-earth-night-v1';
  load('earth-night.jpg',t=>{material.emissiveMap=t;material.emissive.setHex(0xffffff);material.emissiveIntensity=.48;material.needsUpdate=true;});
 }
 const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(radius*1.018,64,40),new THREE.ShaderMaterial({
  uniforms:{sunDirection:{value:light}},transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
  vertexShader:'#include <common>\nvarying vec3 n;varying vec3 v;varying vec3 worldN;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);worldN=inverseTransformDirection(n,viewMatrix);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
  fragmentShader:'uniform vec3 sunDirection;varying vec3 n;varying vec3 v;varying vec3 worldN;void main(){float facing=abs(dot(normalize(n),normalize(v)));float rim=pow(1.-facing,4.);float sun=dot(normalize(worldN),sunDirection);float day=smoothstep(-.24,.35,sun);vec3 tint=mix(vec3(.85,.26,.08),vec3(.16,.48,1.),smoothstep(-.1,.3,sun));gl_FragColor=vec4(tint,rim*day*.38);}'
 }));
 globe.add(atmosphere);
 globe.userData.credit='NASA Goddard SVS / Blue Marble and NOAA cloud composite; historical DMSP night lights. Artistic atmospheric scattering approximation.';
 globe.userData.stopTexture=()=>{alive=false;textures.forEach(t=>t.dispose());};
 return globe;
}
