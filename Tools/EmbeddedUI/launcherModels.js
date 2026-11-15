
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createLaunchVehicle} from './launchVehicle.js';

export const BLENDER_LAUNCHERS = ['kestrel','condor','albatross','roc','skylark','meridian','vanguard','sprint','asterion','leviathan'];
const templates = new Map();

export async function loadLauncherModel(id) {
  if (!BLENDER_LAUNCHERS.includes(id)) return createLaunchVehicle(id);
  if (!templates.has(id)) {
    const path = new URL('../../models/launchers/' + id + '.glb', import.meta.url);
    const template = new GLTFLoader().loadAsync(path.href).then(({scene}) => {
      const launcher = scene.children.find(child => child.userData.launcherModel === id);
      launcher?.traverse(node=>{if(node.userData.flightNode) node.name=node.userData.flightNode;});
      if (!launcher?.getObjectByName('payload_adapter') || !launcher.getObjectByName('stage_lower') ||
          !launcher.getObjectByName('fairing_left') || !launcher.getObjectByName('fairing_right')) {
        throw new Error('Missing staging nodes for ' + id);
      }
      return launcher;
    }).catch(error => {
      templates.delete(id);
      throw error;
    });
    templates.set(id, template);
  }
  try {
    const instance = (await templates.get(id)).clone(true);
    const geometries = new Map();
    const materials = new Map();
    const cloneMaterial = material => {
      if (!materials.has(material)) materials.set(material, material.clone());
      return materials.get(material);
    };
    instance.traverse(node => {
      if (!node.isMesh) return;
      if (!geometries.has(node.geometry)) geometries.set(node.geometry, node.geometry.clone());
      node.geometry = geometries.get(node.geometry);
      node.material = Array.isArray(node.material) ? node.material.map(cloneMaterial) : cloneMaterial(node.material);
      node.castShadow = true;
      node.receiveShadow = true;
    });
    return instance;
  } catch (error) {
    console.warn('Could not use the Blender launcher model for ' + id, error);
    return createLaunchVehicle(id);
  }
}
