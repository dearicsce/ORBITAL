
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {createScene,disposeObject} from './sceneKit.js';

const REFERENCES = {
  'icesat-2': ['ICESat-2','NASA / Brian E. Kumanchik','ice-clouds-and-land-elevation-satellite-2-icesat-2-b'],
  lro: ['Lunar Reconnaissance Orbiter','NASA / Christopher R. Meaney','lunar-reconnaissance-orbiter-a'],
  cassini: ['Cassini','NASA / JPL / Solar System Simulator','cassini-assembly'],
};
const missions = {
  ice:'icesat-2', mapping:'lro', m3:'lro', 'lunar-pathfinder':'lro',
  'lunar-capture':'lro', 'saturn-scout':'cassini',
};
export function referenceForMission(id) {return missions[id] ?? null;}

export function mountReferenceCraft(host,id) {
  const [name,credit,page] = REFERENCES[id];
  host.classList.add('mission-model-reference');
  host.innerHTML = '<div class="mission-model-viewport"></div><p>Historical reference spacecraft · <strong>' +
    name + '</strong><br><a target="_blank" rel="noopener noreferrer" href="https://science.nasa.gov/3d-resources/' +
    page + '/">' + credit + '</a></p>';
  const viewport=host.firstElementChild;
  const kit=createScene(viewport,{position:[3,2,4.5],shadows:false});
  kit.scene.background=new THREE.Color('#171b20');
  const fill=new THREE.DirectionalLight(0xb0cddd,1.8);
  fill.position.set(-3,2,-4);
  kit.scene.add(fill);
  const modelPath=new URL('../../models/nasa/'+id+'.glb',import.meta.url).href;
  const draco=new DRACOLoader().setDecoderPath(new URL('../../vendor/three/draco/',import.meta.url).href).setWorkerLimit(1);
  new GLTFLoader().setDRACOLoader(draco).loadAsync(modelPath).then(({scene:model})=>{
    if(kit.dead){disposeObject(model);return;}
    const bounds=new THREE.Box3().setFromObject(model);
    const scale=3.25/Math.max(...bounds.getSize(new THREE.Vector3()).toArray());
    model.scale.multiplyScalar(scale);
    model.position.sub(bounds.getCenter(new THREE.Vector3()).multiplyScalar(scale));
    kit.scene.add(model);
    viewport.dataset.referenceModel=id;
    kit.draw=dt=>{model.rotation.y+=dt*.18;};
  }).catch(()=>{
    if(!kit.dead)viewport.textContent='3D reference unavailable.';
  }).finally(()=>draco.dispose());
  return ()=>kit.destroy();
}
