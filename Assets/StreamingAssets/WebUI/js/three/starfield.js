import * as THREE from 'three';
import {loadLocalTexture} from './localTexture.js';

// Bundled NASA SVS Deep Star Maps (2012), 8192×4096; offline at runtime.
export function attachStarBackground(scene){
 const previous=scene.background;let alive=true;
 // Equirectangular backgrounds also allocate a GPU cube map. Match the sky to the display.
 const file = (globalThis.innerWidth || 0) * Math.min(globalThis.devicePixelRatio || 1, 1.75) > 2400 ? 'milkyway-8k.jpg' : 'milkyway-3k.jpg';
 const texture=loadLocalTexture(new URL('../../textures/eyes/' + file,import.meta.url).href,t=>{
  if(!alive){t.dispose();t.image=null;return;}
  t.colorSpace=THREE.SRGBColorSpace;t.mapping=THREE.EquirectangularReflectionMapping;
  scene.background=t;scene.backgroundIntensity=.45;scene.backgroundBlurriness=0;
  scene.backgroundRotation?.set(.12,.25,-.35);
  scene.userData.starBackground='NASA-SVS-Deep-Star-Maps-2012-8K';
 });
 return ()=>{alive=false;if(scene.background===texture)scene.background=previous;texture.dispose();texture.image=null;};
}
