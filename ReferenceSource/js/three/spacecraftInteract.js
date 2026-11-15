import * as THREE from 'three';
export function bindSpacecraftInteraction(container,kit,group,onRemove,data) {
  const label=document.createElement('div');label.className='part-tooltip glass';label.hidden=true;container.append(label);
  const button=document.createElement('button');button.className='btn part-remove';button.textContent='Remove selected part';button.hidden=true;container.append(button);
  let selected=null,hovered=null,down=null;
  const glow=(obj,value)=>obj?.traverse(o=>{if(o.material?.emissive)o.material.emissive.setHex(value);});
  const pick=e=>{if(!kit.renderer)return null;const rect=kit.renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),kit.camera);let o=ray.intersectObject(group,true)[0]?.object;while(o&&o.parent!==group)o=o.parent;return o;};
  const move=e=>{const o=pick(e);if(hovered!==selected)glow(hovered,0);hovered=o;if(o){glow(o,0x164954);label.textContent=[...data.parts,...data.instruments].find(p=>p.id===o.userData.id)?.name||'Spacecraft';label.hidden=false;}else label.hidden=true;};
  const start=e=>{down=[e.clientX,e.clientY];};
  const end=e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;glow(selected,0);selected=pick(e);glow(selected,0x166878);button.hidden=!selected||selected.userData.field==='busId';};
  button.onclick=()=>{if(selected)onRemove(selected.userData);selected=null;button.hidden=true;};
  kit.renderer?.domElement.addEventListener('pointermove',move);kit.renderer?.domElement.addEventListener('pointerdown',start);kit.renderer?.domElement.addEventListener('pointerup',end);
  return ()=>{kit.renderer?.domElement.removeEventListener('pointermove',move);kit.renderer?.domElement.removeEventListener('pointerdown',start);kit.renderer?.domElement.removeEventListener('pointerup',end);label.remove();button.remove();};
}
