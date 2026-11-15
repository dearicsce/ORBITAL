import * as THREE from 'three';
import { getModel } from './models.js';
import { createScene, disposeObject, addStars } from './sceneKit.js';
export function createRocketCarousel(container,{launcherIds,onSelect,lockedIds=[]}) {
  const kit=createScene(container,{position:[9,8,16],target:[0,5,0]});addStars(kit.scene);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(22,23,.4,64),new THREE.MeshStandardMaterial({color:0x152836,metalness:.6,roughness:.4}));pad.receiveShadow=true;kit.scene.add(pad);
  const models=new Map();let selected=launcherIds[0];
  for(const [i,id] of launcherIds.entries())getModel(id).then(m=>{if(kit.dead){disposeObject(m);return;}m.position.x=i*7;m.userData.launcher=id;if(lockedIds.includes(id))m.traverse(o=>{if(o.material?.color)o.material.color.set(0x45515b);});m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});models.set(id,m);kit.scene.add(m);});
  kit.draw=dt=>{for(const [id,m]of models){const x=(launcherIds.indexOf(id)-launcherIds.indexOf(selected))*7;m.position.x=THREE.MathUtils.lerp(m.position.x,x,1-Math.exp(-dt*6));m.rotation.y+=dt*.12;}};
  const select=id=>{if(!lockedIds.includes(id))selected=id;};
  const move=direction=>{const ids=launcherIds.filter(id=>!lockedIds.includes(id));const id=ids[(ids.indexOf(selected)+direction+ids.length)%ids.length];if(id){select(id);onSelect(id);}};
  const keys=e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}if(e.key==='ArrowRight'){e.preventDefault();move(1);}};
  container.tabIndex=0;container.setAttribute('aria-label','Rocket models. Use left and right arrows to choose.');container.addEventListener('keydown',keys);
  const click=e=>{if(!kit.renderer)return;const r=kit.renderer.domElement.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),kit.camera);let o=ray.intersectObjects([...models.values()],true)[0]?.object;while(o&&!o.userData.launcher)o=o.parent;if(o&&!lockedIds.includes(o.userData.launcher)){select(o.userData.launcher);onSelect(o.userData.launcher);}};
  container.addEventListener('click',click);
  return {select,destroy(){container.removeEventListener('keydown',keys);container.removeEventListener('click',click);kit.destroy();}};
}
