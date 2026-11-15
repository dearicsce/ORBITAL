import * as THREE from 'three';

export function loadLocalTexture(url,onLoad){
  const texture=new THREE.Texture();
  // Keep the detached image reachable while decoding. Otherwise a collection
  // during scene compilation can cancel the image request.
  texture.image=new THREE.ImageLoader().load(url,image=>{
    texture.image=image;
    texture.needsUpdate=true;
    onLoad(texture);
  });
  return texture;
}
