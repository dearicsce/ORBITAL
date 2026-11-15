import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const templates=new Map();

export async function loadThermalModel(id) {
  if(!templates.has(id)){
    const url=new URL('../../models/thermal/'+id+'.glb',import.meta.url);
    templates.set(id,new GLTFLoader().loadAsync(url.href).then(({scene})=>{
      const model=scene.children.find(node=>node.userData.thermalModel===id);
      if(!model)throw Error('Incorrect thermal model '+id);
      return model;
    }).catch(error=>{templates.delete(id);throw error;}));
  }
  const instance=(await templates.get(id)).clone(true);
  instance.traverse(node=>{
    if(!node.isMesh)return;
    node.geometry=node.geometry.clone();
    node.material=node.material.clone();
    node.name=id+' / '+node.name;
  });
  return instance;
}
