import {createModularBus,createModularEquipment,modularHardpoints} from './modularBus.js';
import {createSolarWing} from './solarWing.js';
import {createLaunchVehicle} from './launchVehicle.js';
import {applyHDMaterials} from './hdMaterials.js';
import { disposeObject as disposeTree } from './sceneKit.js';
// 3D Model loading, caching, normalization, and fallback system (Step 14)
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPrimitiveFallback } from './modelFallbacks.js';

let manifestData = null;
let manifestPromise = null;
const dracoLoader=new DRACOLoader();
dracoLoader.setDecoderPath(new URL('../../vendor/three/draco/',import.meta.url).href);
dracoLoader.setWorkerLimit(2);
const gltfLoader = new GLTFLoader().setDRACOLoader(dracoLoader);

// Cache maps
const pendingFiles = new Map();
const fileCache = new Map(); // file url -> parsed THREE.Group
const templateCache = new Map(); // id -> normalized THREE.Group
const warnedMissingFiles = new Set();

export async function loadManifest() {
  if (manifestData) return manifestData;
  if (!manifestPromise) {
    manifestPromise = (async () => {
      const candidates = [
        new URL('../../models/manifest.json', import.meta.url).href,
        '/models/manifest.json',
        '../models/manifest.json',
        'models/manifest.json'
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json') || url.endsWith('.json')) {
              const data = await res.json();
              manifestData = data;
              return data;
            }
          }
        } catch (err) {
          // Try next candidate
        }
      }
      console.warn('[3D Models] Failed to load models/manifest.json from candidate paths');
      manifestData = {};
      return manifestData;
    })();
  }
  return manifestPromise;
}

async function loadGltfFile(url) {
  if (fileCache.has(url)) {
    return fileCache.get(url).clone(true);
  }
  if(pendingFiles.has(url))return (await pendingFiles.get(url)).clone(true);
  const pending=new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const root = gltf.scene || gltf.scenes[0];
        fileCache.set(url, root);
        resolve(root);
      },
      undefined,
      (err) => reject(err)
    );
  });
  pendingFiles.set(url,pending);
  try{return (await pending).clone(true);}finally{pendingFiles.delete(url);}
}

export async function getModel(id) {
  if (templateCache.has(id)) {
    return cloneModel(templateCache.get(id),id);
  }

  const manifest = await loadManifest();
  const entry = manifest[id] || {
    file: null,
    targetHeight: 1.0,
    rotation: [0, 0, 0],
    offset: [0, 0, 0],
    credit: ''
  };

  let rawModel = null;

  const modular=id.startsWith('bus_')||id.startsWith('comms_')||['magnetometer','thermal_imager','weather_imager','optical_camera','radar_imager','spectrometer','laser_altimeter','neutron_detector','transponder_s','transponder_m','transponder_l'].includes(id);
  if(id.startsWith('bus_'))rawModel=createModularBus(id);
  else if(modular)rawModel=createModularEquipment(id);
  else if(['kestrel','condor','roc','albatross','falcon_upper','atlas_upper'].includes(id)){rawModel=createLaunchVehicle(id,{upperOnly:id.endsWith('_upper')});}
  else if(id.startsWith('solar_wing_')){rawModel=createSolarWing(id);}
  else if(entry.components){
    rawModel=new THREE.Group();let width=null;
    for(const component of entry.components){const part=await getModel(component.id);const size=new THREE.Box3().setFromObject(part).getSize(new THREE.Vector3());if(component.matchWidth&&width){part.scale.x*=width/size.x;part.scale.z*=width/size.z;}else width=Math.max(size.x,size.z);part.position.fromArray(component.pos);part.name=component.name;rawModel.add(part);}
  } else if (entry.file) {
    try {
      const fileUrl = new URL('../../' + entry.file, import.meta.url).href;
      rawModel = await loadGltfFile(fileUrl);
    } catch (err) {
      const warnKey = entry.file;
      if (!warnedMissingFiles.has(warnKey)) {
        warnedMissingFiles.add(warnKey);
        console.warn(`[3D Models] Failed to load "${entry.file}" for "${id}": ${err.message}. Using primitive fallback.`);
      }
    }
  } else {
    const warnKey = `null_${id}`;
    if (!warnedMissingFiles.has(warnKey)) {
      warnedMissingFiles.add(warnKey);
      console.warn(`[3D Models] No file specified for model id "${id}". Using primitive fallback.`);
    }
  }

  if (!rawModel) {
    rawModel = createPrimitiveFallback(id);
  }

  if(!modular&&entry.nodes?.length){
    rawModel.updateMatrixWorld(true);const extracted=new THREE.Group();
    rawModel.traverse(node=>{if(entry.nodes.includes(node.name)){const copy=node.clone(true);const excluded=[];copy.traverse(child=>{if(entry.excludeNodes?.includes(child.name))excluded.push(child);});excluded.forEach(child=>child.removeFromParent());node.matrixWorld.decompose(copy.position,copy.quaternion,copy.scale);extracted.add(copy);}});
    if(extracted.children.length)rawModel=extracted;
  }
  if(!modular&&entry.preRotation){const oriented=new THREE.Group();oriented.rotation.set(...entry.preRotation.map(THREE.MathUtils.degToRad));oriented.add(rawModel);rawModel=oriented;}
  // Normalize: scale to targetHeight, center horizontally (x=0, z=0), base at y=0
  const normalizedModel = (modular||id.startsWith('solar_wing_'))?rawModel:normalizeModel(rawModel, entry);
  templateCache.set(id, normalizedModel);

  return cloneModel(normalizedModel,id);
}

function normalizeModel(model, entry) {
  const targetH = Number(entry.targetHeight) > 0 ? Number(entry.targetHeight) : 1.0;

  // 1. Measure raw bounds
  let box = new THREE.Box3().setFromObject(model);
  let size = box.getSize(new THREE.Vector3());
  let curH = size.y > 0.0001 ? size.y : 1.0;

  // 2. Scale uniformly
  const scale = targetH / curH;
  model.scale.set(scale, scale, scale);

  // 3. Re-measure and align base at y=0, centered on X and Z
  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;

  // 4. Wrap inside parent group to apply user rotation and offset
  const wrapper = new THREE.Group();
  wrapper.name = `model_${entry.file || 'primitive'}`;
  wrapper.add(model);

  if (Array.isArray(entry.rotation)) {
    wrapper.rotation.set(
      THREE.MathUtils.degToRad(entry.rotation[0] || 0),
      THREE.MathUtils.degToRad(entry.rotation[1] || 0),
      THREE.MathUtils.degToRad(entry.rotation[2] || 0)
    );
  }

  if (Array.isArray(entry.offset)) {
    wrapper.position.set(entry.offset[0] || 0, entry.offset[1] || 0, entry.offset[2] || 0);
  }

  return wrapper;
}

export async function preloadModels(ids, onProgress) {
  const manifest = await loadManifest();
  const targetIds = Array.isArray(ids) && ids.length > 0 ? ids : Object.keys(manifest).filter(id=>!manifest[id].defer);
  const total = targetIds.length;
  let loaded = 0;

  if (typeof onProgress === 'function') {
    onProgress(0, total);
  }

  await Promise.all(
    targetIds.map(async (id) => {
      try {
        await getModel(id);
      } catch (err) {
        console.warn(`[3D Models] Preload failed for id "${id}":`, err);
      } finally {
        loaded++;
        if (typeof onProgress === 'function') {
          onProgress(loaded, total);
        }
      }
    })
  );
}

export function disposeModelCache() {
  fileCache.forEach(root=>disposeTree(root));fileCache.clear();
  templateCache.forEach(root=>disposeTree(root));templateCache.clear();
  warnedMissingFiles.clear();dracoLoader.dispose();
}

function cloneModel(root,id) {
 const clone=root.clone(true),materials=new Map(),textures=new Map(),geometries=new Map();
 const copyMaterial=m=>{if(materials.has(m))return materials.get(m);const c=m.clone();for(const [k,v] of Object.entries(c))if(v?.isTexture){if(!textures.has(v))textures.set(v,v.clone());c[k]=textures.get(v);}materials.set(m,c);return c;};
 clone.traverse(o=>{if(o.geometry){if(!geometries.has(o.geometry))geometries.set(o.geometry,o.geometry.clone());o.geometry=geometries.get(o.geometry);}if(o.material)o.material=Array.isArray(o.material)?o.material.map(copyMaterial):copyMaterial(o.material);});
 if(/^(bus_|solar_wing_|comms_|battery_|fuel_|computer_|pointing_)|camera|imager|spectrometer|detector|magnetometer|altimeter|transponder/.test(id))applyHDMaterials(clone,{solar:id.startsWith('solar_wing_')});
 return clone;
}
export async function getHardpoints(busId) {
 if(busId.startsWith('bus_'))return modularHardpoints(busId);
 const manifest=await loadManifest();if(manifest[busId]?.hardpoints)return structuredClone(manifest[busId].hardpoints);
 const bus=templateCache.get(busId);const size=bus?new THREE.Box3().setFromObject(bus).getSize(new THREE.Vector3()):new THREE.Vector3(1,1,1);
 return {panelPairs:[{pos:[size.x/2,size.y*.65,-size.z*.3],dir:[1,0,0]},{pos:[size.x/2,size.y*.3,size.z*.3],dir:[1,0,0]}],comms:{pos:[0,size.y,0],dir:[0,1,0]},instruments:[],fuel:[],batteries:[]};
}
