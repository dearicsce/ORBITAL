// Run: node --experimental-vm-modules Tools/Check-NativeSceneAdapter.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../Assets/StreamingAssets/WebUI/vendor/three/three.module.js';

const messages=[];
let active=true, awaitingMesh=false, disposed=0, cancelled=0;
const context=vm.createContext({
  ResizeObserver:class {observe(){} disconnect(){}},
  requestAnimationFrame(){return 1;}, cancelAnimationFrame(){cancelled++;}
});
const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){
  for(const [name,value] of Object.entries(exports))this.setExport(name,value);
},{context});
const dependencies={
  three:synthetic(THREE),
  './OrbitControls.js':synthetic({OrbitControls:class {
    target=new THREE.Vector3(); enabled=true; update(){} dispose(){}
  }}),
  './bridge.js':synthetic({
    mount:()=>({canvas:{},isActive:()=>active,destroy(){disposed++;}}),
    send:(type,payload)=>messages.push(structuredClone({type,payload})),on:()=>()=>{},
    meshSnapshotPending:()=>awaitingMesh,
    sendMeshSnapshot:payload=>messages.push(structuredClone({type:'spacecraft.meshes',payload}))
  }),
  '../three/sceneKit.js':synthetic({disposeObject(){}})
};
const module=new vm.SourceTextModule(fs.readFileSync(new URL('./EmbeddedUI/nativeSceneKit.js',import.meta.url),'utf8'),{context});
await module.link(name=>{assert.ok(dependencies[name],name);return dependencies[name];});
await module.evaluate();
const kit=module.namespace.createScene({getBoundingClientRect:()=>({width:800,height:600})});
kit.scene.add(new THREE.Group()); // Reserved native hangar.
const a=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:0x4488ff}));
const b=new THREE.Mesh(a.geometry,a.material);
a.position.set(1,2,3);b.position.set(-4,5,6);b.scale.set(2,3,4);
kit.scene.add(a,b);
kit.renderer.render();
let meshMessages=()=>messages.filter(m=>m.type==='spacecraft.meshes');
const first=meshMessages()[0].payload;
assert.equal(first.geometries.length,1);assert.equal(first.materials.length,1);
assert.deepEqual(first.nodes[0].position,[1,2,3]);assert.deepEqual(first.nodes[1].position,[-4,5,6]);
assert.deepEqual(first.nodes[1].scale,[2,3,4]);
kit.renderer.render();assert.equal(meshMessages().length,1,'idle frame must not retransmit');
awaitingMesh=true;a.position.x=6;kit.renderer.render();
assert.equal(meshMessages().length,1,'keep only one snapshot in transit');
awaitingMesh=false;
a.position.x=7;kit.renderer.render();
assert.deepEqual(meshMessages()[1].payload.nodes[0].position,[7,2,3]);
assert.deepEqual(first.nodes[0].position,[1,2,3],'temporaries must not alias earlier messages');
assert.equal(meshMessages()[1].payload.geometries.length,0);
kit.camera.position.x+=1;kit.renderer.render();assert.equal(meshMessages().length,2);
active=false;a.position.y=8;kit.renderer.render();assert.equal(meshMessages().length,2);
active=true;kit.renderer.render();assert.equal(meshMessages()[2].payload.geometries.length,1);
kit.scene.remove(b);kit.renderer.render();assert.equal(meshMessages().at(-1).payload.nodes.length,1);
a.material.color.set(0xff8844);a.material.opacity=.4;kit.renderer.render();
let changed=meshMessages().at(-1).payload;
assert.equal(changed.materials[0].id,a.material.uuid);
assert.equal(changed.materials[0].alpha,.4);
assert.equal(changed.geometries.length,0);
const position=a.geometry.attributes.position;
position.setX(0,9);position.needsUpdate=true;kit.renderer.render();
changed=meshMessages().at(-1).payload;
assert.equal(changed.geometries[0].id,a.geometry.uuid);
assert.equal(changed.geometries[0].positions[0],9);
a.geometry=new THREE.SphereGeometry();a.material=new THREE.MeshStandardMaterial();
kit.renderer.render();
changed=meshMessages().at(-1).payload;
assert.equal(changed.nodes[0].id,a.uuid);
assert.equal(changed.nodes[0].geometry,a.geometry.uuid);
assert.equal(changed.nodes[0].material,a.material.uuid);
kit.scene.add(b);kit.renderer.render();
changed=meshMessages().at(-1).payload;
assert.equal(changed.geometries[0].id,b.geometry.uuid,'readded mesh republishes released geometry');
assert.equal(changed.materials[0].id,b.material.uuid,'readded mesh republishes released material');
kit.destroy();kit.destroy();assert.equal(disposed,1);assert.equal(cancelled,1);
console.log('PASS: transforms, idle suppression, revisions, resource replacement and reuse, camera, modal restoration, remove/readd and cleanup.');
