import * as THREE from 'three';
import {createScene,disposeObject} from './sceneKit.js';
import {createWorkshopHangar} from './workshopHangar.js';
import {createWorkshopAssembly} from './workshopAssembly.js';
import {structure,surfaces,mountPosition} from '../workshop/structure.js';
import {copy,catalog} from '../workshop/blueprint.js';
const viewCameras=new WeakMap();
// Also used by interaction regression tests to project real scene points through
// the live camera, rather than duplicating the editor's camera fitting formulas.
export function projectWorkshopPoint(container,point){const entry=viewCameras.get(container);if(!entry?.canvas)return null;const r=entry.canvas.getBoundingClientRect();entry.camera.updateMatrixWorld(true);const p=new THREE.Vector3(...point).project(entry.camera);return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}
export function createWorkshopView(container,data,{onSelect,onMove,onPreview}={}){
 const kit=createScene(container,{position:[4,2.8,5],target:[0,.6,0]});
 const hangar=createWorkshopHangar(kit.scene);
 viewCameras.set(container,{camera:kit.camera,canvas:kit.renderer?.domElement});
 const craft=new THREE.Group(),overlays=new THREE.Group(),handles=new THREE.Group();kit.scene.add(craft,overlays,handles);
 const assembly=createWorkshopAssembly(craft),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();ray.params.Line.threshold=.025;
 let current=null,selected=null,outline=null,fold=0,interior=false,mode='move',drag=null,down=null,surfaceVisible=false,gridSnap=.025,angleSnap=15,surfaceSnap=true,lastPreview=0;
 const tooltip=document.createElement('div');tooltip.className='ws-tooltip';tooltip.hidden=true;container.append(tooltip);
 function setRay(e){kit.camera.updateMatrixWorld(true);craft.updateMatrixWorld(true);handles.updateMatrixWorld(true);const r=kit.renderer?.domElement.getBoundingClientRect();if(!r)return;pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,kit.camera);}
 function pick(e){setRay(e);let o=ray.intersectObject(craft,true).find(hit=>hit.object.visible&&hit.object.parent?.visible)?.object;while(o&&o.parent!==craft)o=o.parent;return o?.userData.instanceId||null;}
 function refreshSelection(){
  if(outline){outline.removeFromParent();disposeObject(outline);outline=null;}for(const c of [...handles.children]){c.removeFromParent();disposeObject(c);}
  const object=assembly.instances.get(selected);if(!object)return;
  outline=new THREE.BoxHelper(object,0x7de3ed);outline.material.depthTest=false;outline.renderOrder=1000;kit.scene.add(outline);
  const c=current?.components.find(c=>c.instanceId===selected);if(!onMove||!c||c.bayId)return;
  const s=surfaces(current.busId)[c.attachmentSurfaceId];if(!s)return;
  handles.position.fromArray(mountPosition(current.busId,c));handles.position.addScaledVector(new THREE.Vector3(...s.normal),.04);
  for(const [axis,color]of [[s.u,0xf4ba68],[s.v,0x79d9bc]]){
   const arrow=new THREE.ArrowHelper(new THREE.Vector3(...axis),new THREE.Vector3(),.4,color,.09,.055);arrow.userData.handle=true;arrow.traverse(o=>{if(o.geometry)o.geometry=o.geometry.clone();if(o.material)o.material.depthTest=false;o.renderOrder=1001;});handles.add(arrow);
  }
  if(mode==='rotate'){const ring=new THREE.Mesh(new THREE.TorusGeometry(.27,.012,8,48),new THREE.MeshBasicMaterial({color:0x7de3ed,depthTest:false}));ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...s.normal));handles.add(ring);}
 }
 function update(a){current=copy(a);assembly.update({assembly:a},data);assembly.setInterior(interior);assembly.animate(fold);refreshSelection();}
 function fit(direction=null){
  const r=container.getBoundingClientRect();if(r.width&&r.height){kit.camera.aspect=r.width/r.height;kit.camera.updateProjectionMatrix();}
  craft.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(craft);if(box.isEmpty())return;
  hangar.fit(box);
  const center=box.getCenter(new THREE.Vector3()),target=kit.controls?.target||center;
  const axis=direction?new THREE.Vector3(...direction):kit.camera.position.clone().sub(target);if(axis.lengthSq()<.001)axis.set(4,2.8,5);axis.normalize();
  const right=new THREE.Vector3().crossVectors(kit.camera.up,axis).normalize(),up=new THREE.Vector3().crossVectors(axis,right).normalize(),tangent=Math.tan(THREE.MathUtils.degToRad(kit.camera.fov/2));let required=0;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const offset=new THREE.Vector3(x,y,z).sub(center),depth=offset.dot(axis);required=Math.max(required,depth+Math.abs(offset.dot(right))/(tangent*kit.camera.aspect),depth+Math.abs(offset.dot(up))/tangent);}
  const distance=required*1.18;
  kit.camera.position.copy(center).addScaledVector(axis,Math.max(2,distance));kit.controls?.target.copy(center);kit.camera.lookAt(center);kit.controls?.update();
 }
 const resize=new ResizeObserver(()=>{if(current)fit();});resize.observe(container);
 function overlay(a){for(const c of [...overlays.children]){c.removeFromParent();disposeObject(c);}if(!data.parts.some(p=>p.id===a.busId&&p.type==='bus'))return;const spec=surfaces(a.busId);for(const [name,s]of Object.entries(spec)){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#092330';ctx.fillRect(0,0,256,64);ctx.fillStyle='#b8e8ec';ctx.font='28px sans-serif';ctx.textAlign='center';ctx.fillText(name.toUpperCase(),128,42);
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(...s.size),new THREE.MeshBasicMaterial({color:0x5ea5bb,transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false}));plane.position.fromArray(s.origin.map((n,i)=>n+s.normal[i]*.015));plane.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...s.u),new THREE.Vector3(...s.v),new THREE.Vector3(...s.normal)));overlays.add(plane);
  const material=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false}),label=new THREE.Sprite(material);label.position.fromArray(s.origin.map((n,i)=>n+s.normal[i]*.22));label.scale.set(.7,.175,1);overlays.add(label);
 }overlays.visible=surfaceVisible;}
 const start=e=>{
  if(e.button!==0)return;down=[e.clientX,e.clientY];setRay(e);
  const handle=ray.intersectObject(handles,true).length>0;
  const id=handle?selected:pick(e);onSelect?.(id);selected=id;refreshSelection();
  const c=current?.components.find(c=>c.instanceId===id);if(!onMove||!c||c.bayId||!handle)return;
  const surface=surfaces(current.busId)[c.attachmentSurfaceId],grab=ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(...surface.normal),new THREE.Vector3(...surface.origin)),new THREE.Vector3());const offset=grab?grab.sub(new THREE.Vector3(...surface.origin)):new THREE.Vector3();
  drag={start:copy(c),next:copy(c),point:[e.clientX,e.clientY],offset:[offset.dot(new THREE.Vector3(...surface.u))-c.localPosition[0],offset.dot(new THREE.Vector3(...surface.v))-c.localPosition[1]]};kit.controls&&(kit.controls.enabled=false);kit.renderer.domElement.setPointerCapture(e.pointerId);e.stopImmediatePropagation();
 };
 const move=e=>{
  if(!drag){const id=pick(e);tooltip.hidden=!id;tooltip.textContent=id==='bus'?'Bus inspector':catalog(data,current?.components.find(c=>c.instanceId===id)?.catalogId)?.name||'Unresolved catalogue entry';return;}
  const next=copy(drag.start);
  if(mode==='rotate'){next.localRotation[1]=angleSnap?Math.round((drag.start.localRotation[1]+(e.clientX-drag.point[0]))/angleSnap)*angleSnap:drag.start.localRotation[1]+e.clientX-drag.point[0];}
  else if(!surfaceSnap){
   setRay(e);const s=surfaces(current.busId)[next.attachmentSurfaceId],normal=kit.camera.getWorldDirection(new THREE.Vector3()),origin=new THREE.Vector3(...mountPosition(current.busId,drag.start));const point=ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal,origin),new THREE.Vector3());if(point){const delta=point.sub(new THREE.Vector3(...s.origin));next.localPosition=[delta.dot(new THREE.Vector3(...s.u)),delta.dot(new THREE.Vector3(...s.v)),delta.dot(new THREE.Vector3(...s.normal))];}
  }else{
   setRay(e);let best=null;
   for(const [name,s]of Object.entries(surfaces(current.busId))){if(name==='bottom')continue;const normal=new THREE.Vector3(...s.normal);if(ray.ray.direction.dot(normal)>=0)continue;
    const point=ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal,new THREE.Vector3(...s.origin)),new THREE.Vector3());
    if(!point)continue;const offset=point.clone().sub(new THREE.Vector3(...s.origin)),u=offset.dot(new THREE.Vector3(...s.u)),v=offset.dot(new THREE.Vector3(...s.v));
    if(Math.abs(u)<=s.size[0]/2&&Math.abs(v)<=s.size[1]/2&&(!best||ray.ray.origin.distanceTo(point)<best.distance))best={name,u,v,distance:ray.ray.origin.distanceTo(point)};
   }
   if(best){best.u-=drag.offset[0];best.v-=drag.offset[1];next.attachmentSurfaceId=best.name;next.localPosition=[gridSnap?Math.round(best.u/gridSnap)*gridSnap:best.u,gridSnap?Math.round(best.v/gridSnap)*gridSnap:best.v,0];}
  }
  drag.next=next;const preview=copy(current);preview.components=preview.components.map(c=>c.instanceId===next.instanceId?next:c);assembly.update({assembly:preview},data);assembly.animate(fold);outline?.update();handles.position.fromArray(mountPosition(current.busId,next));if(performance.now()-lastPreview>70){lastPreview=performance.now();onPreview?.(next);}
 };
 function finish(cancel=false){if(!drag)return;const value=cancel?drag.start:drag.next;drag=null;kit.controls&&(kit.controls.enabled=true);if(cancel){assembly.update({assembly:current},data);refreshSelection();}else onMove?.(value);}
 const end=()=>{finish();down=null;};const key=e=>{if(e.key==='Escape'&&drag){finish(true);onPreview?.(null);}};
 const canvas=kit.renderer?.domElement;canvas?.addEventListener('pointerdown',start,true);canvas?.addEventListener('pointermove',move);canvas?.addEventListener('pointerup',end);canvas?.addEventListener('lostpointercapture',end);window.addEventListener('pointerup',end);window.addEventListener('keydown',key);
 kit.draw=()=>{assembly.animate(fold);outline?.update();hangar.frame(kit.camera);};
 return {grid(value){gridSnap=value;},angle(value){angleSnap=value;},snap(value){surfaceSnap=value;},update(a){const busChanged=current?.busId!==a.busId,grew=a.components.length>(current?.components.length||0);update(a);if(busChanged)overlay(a);if(busChanged||grew)fit();},select(id){selected=id;refreshSelection();},mode(value){mode=value;refreshSelection();},interior(value){interior=value;assembly.setInterior(value);refreshSelection();},fold(value){fold=value;},surfaces(value){surfaceVisible=value;overlays.visible=value;},preset(name){fit({Front:[0,0,1],Back:[0,0,-1],Left:[-1,0,0],Right:[1,0,0],Top:[0,1,.001],Bottom:[0,-1,.001]}[name]||[4,2.8,5]);},thumbnail(){try{kit.renderer.render(kit.scene,kit.camera);const result=document.createElement('canvas');result.width=320;result.height=200;result.getContext('2d').drawImage(canvas,0,0,320,200);return result.toDataURL('image/webp',.65);}catch{return null;}},destroy(){finish(true);resize.disconnect();viewCameras.delete(container);canvas?.removeEventListener('pointerdown',start,true);canvas?.removeEventListener('pointermove',move);canvas?.removeEventListener('pointerup',end);canvas?.removeEventListener('lostpointercapture',end);window.removeEventListener('pointerup',end);window.removeEventListener('keydown',key);tooltip.remove();assembly.destroy();kit.destroy();}};
}
