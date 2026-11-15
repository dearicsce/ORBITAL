import * as THREE from 'three';
import {OrbitControls} from './OrbitControls.js';
import {mount,send,on,meshSnapshotPending,sendMeshSnapshot} from './bridge.js';
export {disposeObject} from '../three/sceneKit.js';

// Keep the reference picking, fitting, gizmos and placement code. The DOM
// canvas owns input while Unity is the sole renderer for this scene.
export function createScene(container,{position=[4,2.8,5],target=[0,.6,0],far=2000}={}) {
  const viewport=mount(container,'spacecraft',false);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x07121d);
  const camera=new THREE.PerspectiveCamera(45,1,.05,far);
  camera.position.fromArray(position);camera.lookAt(...target);
  const controls=new OrbitControls(camera,viewport.canvas);
  controls.target.fromArray(target);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=60;
  let knownGeometry=new Map(),knownMaterials=new Map();
  const spriteGeometry=new THREE.PlaneGeometry(1,1);
  // Decomposition writes into these temporaries; node arrays remain independent.
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
  let lastSnapshot='',lastCamera='',lastFrame=0,frame,wasActive=false;
  const renderer={domElement:viewport.canvas,nativeThumbnail:null,render(){publish();}};
  const api={scene,camera,renderer,controls,dead:false,draw:null,metrics:{averageFrameMs:16.7,frames:0}};
  const unsubscribe=on('scene.thumbnail',payload=>{
    if(viewport.isActive())renderer.nativeThumbnail='data:image/png;base64,'+payload.png;
  });
  const resize=new ResizeObserver(()=>{
    const r=container.getBoundingClientRect();
    if(r.width&&r.height){camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}
  });resize.observe(container);
  function publish() {
    if(!viewport.isActive()){wasActive=false;return;}
    // Keep one resource-dependent snapshot in transit. The next snapshot is
    // composed from the latest live scene after Unity has applied this one.
    if(meshSnapshotPending())return;
    if(!wasActive){
      wasActive=true;knownGeometry.clear();knownMaterials.clear();lastSnapshot='';lastCamera='';
      send('spacecraft.reset');
    }
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const geometries=[],materials=[],nodes=[];
    const geometryInUse=new Map(),materialsInUse=new Map();
    // createWorkshopHangar is the first child. Unity supplies the environment.
    for(const child of scene.children.slice(1))child.traverse(mesh=>{
      if(!(mesh.isMesh||mesh.isLine||mesh.isSprite))return;
      const geometry=mesh.isSprite?spriteGeometry:mesh.geometry,material=mesh.material;
      if(!geometry?.attributes.position)return;
      const lines=Boolean(mesh.isLine);
      const geometryId=geometry.uuid+(lines?':lines':'');
      if(!geometryInUse.has(geometryId)){
        const attributes=[geometry.attributes.position,geometry.attributes.normal,geometry.attributes.uv,geometry.index];
        // Reuse the revision record on unchanged frames; keep observing buffer
        // identity and version so in-place edits and replacements still publish.
        const previous=knownGeometry.get(geometryId);
        const unchanged=previous&&attributes.every((attribute,index)=>
          previous[index*3]===attribute&&previous[index*3+1]===attribute?.array&&previous[index*3+2]===attribute?.version);
        const revision=unchanged?previous:attributes.flatMap(attribute=>[attribute,attribute?.array,attribute?.version]);
        geometryInUse.set(geometryId,revision);
        if(!unchanged){
          const [positions,normals,uv,indices]=attributes.map(attribute=>attribute?Array.from(attribute.array):[]);
          geometries.push({id:geometryId,positions,normals,uv,indices,lines});
        }
      }
      if(!materialsInUse.has(material.uuid)){
        const image=material.map?.image;
        const revision=[material.color.r,material.color.g,material.color.b,material.metalness,
          material.roughness,material.opacity,material.side,material.depthTest,
          material.map,material.map?.version,image];
        materialsInUse.set(material.uuid,revision);
        if(!sameRevision(revision,knownMaterials.get(material.uuid))){
          materials.push({id:material.uuid,color:material.color.clone().convertLinearToSRGB().toArray(),
            metallic:material.metalness||0,roughness:material.roughness??.5,
            unlit:!material.isMeshStandardMaterial,alpha:material.opacity??1,
            doubleSided:material.side===THREE.DoubleSide,depthTest:material.depthTest,
            texture:image?.toDataURL?image.toDataURL('image/png').split(',')[1]:null});
        }
      }
      mesh.matrixWorld.decompose(p,q,s);
      if(mesh.isSprite)q.copy(camera.quaternion);
      let visible=true;
      for(let a=mesh;a;a=a.parent)visible&&=a.visible;
      nodes.push({id:mesh.uuid,name:mesh.name,geometry:geometryId,material:material.uuid,
        position:p.toArray(),rotation:q.toArray(),scale:s.toArray(),visible});
    });
    const snapshot=JSON.stringify(nodes);
    if(snapshot!==lastSnapshot||geometries.length||materials.length){
      lastSnapshot=snapshot;
      sendMeshSnapshot({geometries,materials,nodes,center:[0,.5,0],radius:2});
      knownGeometry=geometryInUse;
      knownMaterials=materialsInUse;
      send('scene.thumbnail.request');
    }
    const cameraState={position:camera.position.toArray(),rotation:camera.quaternion.toArray(),fov:camera.fov};
    const identity=JSON.stringify(cameraState);
    if(identity!==lastCamera){lastCamera=identity;send('scene.camera',cameraState);send('scene.thumbnail.request');}
  }
  function tick(now){
    if(api.dead)return;
    frame=requestAnimationFrame(tick);
    if(now-lastFrame<1000/30)return;
    const elapsed=now-lastFrame;
    const dt=Math.min(elapsed/1000,.05);lastFrame=now;
    api.metrics.averageFrameMs+=(Math.min(elapsed,200)-api.metrics.averageFrameMs)*.05;
    api.draw?.(dt,now/1000);if(controls.enabled)controls.update();publish();api.metrics.frames++;
  }
  frame=requestAnimationFrame(tick);
  api.destroy=()=>{if(api.dead)return;api.dead=true;cancelAnimationFrame(frame);resize.disconnect();controls.dispose();unsubscribe();spriteGeometry.dispose();viewport.destroy();};
  return api;
}

function sameRevision(next,previous){
  return previous&&next.every((value,index)=>value===previous[index]);
}
