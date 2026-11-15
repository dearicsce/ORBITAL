import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../Assets/StreamingAssets/WebUI/vendor/three/three.module.js';
const context=vm.createContext({ResizeObserver:class{observe(){}disconnect(){}}});
const three=new vm.SyntheticModule(Object.keys(THREE),function(){for(const [k,v] of Object.entries(THREE))this.setExport(k,v);},{context});
const module=new vm.SourceTextModule(fs.readFileSync('Tools/EmbeddedUI/flightFraming.js','utf8'),{context});
await module.link(()=>three);await module.evaluate();
const {visibleHardwareBounds,flightFraming}=module.namespace;
const root=new THREE.Group(),core=new THREE.Mesh(new THREE.BoxGeometry(1,10,1),new THREE.MeshBasicMaterial());
core.position.y=5;root.add(core);
const upper=new THREE.Mesh(new THREE.BoxGeometry(1,4,1),core.material);upper.position.y=12;root.add(upper);
const hidden=new THREE.Group();hidden.visible=false;
hidden.add(new THREE.Mesh(new THREE.BoxGeometry(1000,1000,1000),core.material));root.add(hidden);
assert.equal(visibleHardwareBounds([root]).getSize(new THREE.Vector3()).y,14);
core.visible=false;assert.equal(visibleHardwareBounds([root]).getSize(new THREE.Vector3()).y,4);core.visible=true;
const rows=[];
for(const [width,height,dpr] of [[1366,768,1],[1920,1080,1],[768,1024,1],[500,900,1],[1280,720,1.5]]){
 const narrow=width<=660;
 const canvas={left:0,right:width,top:narrow?140:0,bottom:narrow?450:height,width,height:narrow?310:height};
 const screen={querySelector:selector=>({getBoundingClientRect:()=>selector==='.screen-top'?{left:20,right:width-20,top:20,bottom:120}:selector==='.launch-instruments'?{left:20,right:narrow?width-20:330,top:narrow?470:130,bottom:narrow?height:height-50}:{left:0,right:width,top:height-50,bottom:height}}),querySelectorAll:()=>[]};
 const container={closest:()=>screen,getBoundingClientRect:()=>canvas};
 const camera=new THREE.PerspectiveCamera(45,canvas.width/canvas.height,.1,1e8);
 const framing=flightFraming(container,camera);
 for(const staged of [false,true]){
  core.visible=!staged;root.rotation.z=staged?1.5:.2;
  framing.reset();framing.fit([root],new THREE.Vector3(-.3,.18,1),new THREE.Vector3(0,1,0),.016,{offset:v=>v});camera.updateMatrixWorld();
  const box=visibleHardwareBounds([root]);const pixels=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const p=new THREE.Vector3(x,y,z).project(camera),px=(p.x+1)*canvas.width/2,py=canvas.top+(1-p.y)*canvas.height/2;
   assert.ok(px>0&&px<width&&py>canvas.top&&py<canvas.bottom,'Subject stays inside canvas');
   if(!narrow)assert.ok(px>330&&py>120&&py<height-50,'Subject avoids telemetry/header/footer');
   pixels.push([px,py]);
  }
  rows.push({width,height,dpr,staged,pixels});
 }
 framing.destroy();
}
fs.writeFileSync('Verification/Sol61-2026-11-10/framing.json',JSON.stringify(rows,null,2));
console.log('PASS: attached visible hardware, hidden-node exclusion, stage bounds and viewport-safe projection at five layouts.');
