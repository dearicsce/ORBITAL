import {createEarthBody} from './earthMaterial.js';
import * as THREE from 'three';
import {createScene,addStars} from './sceneKit.js';
import {ATLAS_TEXTURES,EARTH_ATLAS_LAYERS,atlasTexture} from '../content/atlasTextures.js';

export function mountAtlasGlobe(container,id,layer='clouds'){
 const spec=id==='earth'?{...ATLAS_TEXTURES.earth,...EARTH_ATLAS_LAYERS[layer]}:ATLAS_TEXTURES[id];
 if(!spec)return ()=>{};
 const kit=createScene(container,{position:[.1,1.7,spec.rings?5.3:4],controls:false,shadows:false,space:true});
 if(!kit.renderer){kit.destroy();return ()=>{};}
 kit.scene.background.set(0x030812);
 kit.sun.position.set(8,3,5);
 addStars(kit.scene);
 const pole=new THREE.Group();pole.rotation.z=THREE.MathUtils.degToRad(-spec.tiltDeg);kit.scene.add(pole);
 const solar=id==='sun';
 const material=solar?new THREE.MeshStandardMaterial({color:0x160803,emissive:spec.color,emissiveIntensity:1.05,toneMapped:false}):spec.unlit?new THREE.MeshBasicMaterial({color:0x17304d,toneMapped:false}):new THREE.MeshStandardMaterial({color:spec.color,roughness:1,metalness:0,envMapIntensity:0});
 const earthLayers=id==='earth'&&layer!=='night';
 const globe=earthLayers?createEarthBody(1,{sunDirection:[8,3,5],clouds:layer==='clouds'}):new THREE.Mesh(new THREE.SphereGeometry(1,64,36),material);
 if(earthLayers)material.dispose();
 globe.scale.y=spec.flatten||1;
 pole.add(globe);
 if(spec.file&&!earthLayers){
  const texture=new THREE.TextureLoader().load(atlasTexture(spec.file),asset=>{
   if(kit.dead){asset.dispose();return;}
   asset.colorSpace=THREE.SRGBColorSpace;
   if(solar){material.emissive.setHex(0xffffff);material.emissiveMap=asset;}
   else{material.color.setHex(0xffffff);material.map=asset;}
   material.needsUpdate=true;
  },undefined,()=>{});
  globe.userData.pendingTexture=texture;
 }
 if(spec.rings){
  const bands=id==='saturn'?[[1.28,1.49,0x9b8262],[1.5,1.87,0xd7c49d],[1.93,2.19,0xa39379]]:[[1.48,1.51,0x5e767f],[1.72,1.75,0x798f96]];
  for(const [inner,outer,color] of bands){
   const ring=new THREE.Mesh(new THREE.RingGeometry(inner,outer,96),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,opacity:.67,transparent:true}));
   ring.rotation.x=Math.PI/2;pole.add(ring);
  }
 }
 if(solar){
  const corona=new THREE.Mesh(new THREE.PlaneGeometry(3.1,3.1),new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
   uniforms:{},vertexShader:'varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'varying vec2 v; void main(){float r=length(v-.5)*3.1;float edge=smoothstep(.97,1.02,r);float decay=exp(-11.*max(0.,r-1.));gl_FragColor=vec4(1.,.31,.04,edge*decay*.34);}'
  }));
  corona.position.z=-.08;corona.quaternion.copy(kit.camera.quaternion);kit.scene.add(corona);
 }
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let elapsed=0;
 kit.draw=dt=>{if(!reduced)elapsed+=dt*900;globe.rotation.y=(elapsed/(spec.rotationHours*3600))*Math.PI*2-.35;};
 return ()=>{globe.userData.stopTexture?.();globe.userData.pendingTexture?.dispose();kit.destroy();};
}
