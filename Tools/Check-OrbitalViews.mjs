import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../Assets/StreamingAssets/WebUI/vendor/three/three.module.js';
import * as geometry from '../Assets/StreamingAssets/WebUI/js/engine/orbitalGeometry.js';
import * as clock from '../Assets/StreamingAssets/WebUI/js/engine/flightClock.js';
import * as presentation from '../Assets/StreamingAssets/WebUI/js/three/orbitPresentation.js';

// Real Three transforms and orbital propagation; stub only DOM, GPU and assets.
let wall=0,lastKit;
const element=()=>({style:{},dataset:{},classList:{add(){}},append(){},remove(){},addEventListener(){},removeEventListener(){}});
const context=vm.createContext({URL,performance:{now:()=>wall},matchMedia:()=>({matches:false}),
  ResizeObserver:class{observe(){}disconnect(){}},document:{createElement:element}});
const mesh=radius=>new THREE.Mesh(new THREE.SphereGeometry(radius),new THREE.MeshBasicMaterial());
const sceneKit={addStars(){},createScene(){
  const scene=new THREE.Scene();scene.background=new THREE.Color();
  const camera=new THREE.PerspectiveCamera(45,16/9,.05,2000),sun=new THREE.DirectionalLight();scene.add(sun);
  lastKit={scene,camera,sun,renderer:{domElement:element()},controls:{target:new THREE.Vector3(),update(){},addEventListener(){},removeEventListener(){}},destroy(){}};return lastKit;
}};
const modules={'three':THREE,'../engine/flightClock.js':clock,'./orbitPresentation.js':presentation,
  './localTexture.js':{loadLocalTexture:()=>new THREE.Texture()},'./earthMaterial.js':{createEarthBody:mesh},
  './starfield.js':{attachStarBackground:()=>()=>{}},'./sceneKit.js':sceneKit,
  '../content/atlasTextures.js':{ATLAS_TEXTURES:{mars:{file:'mars.jpg',color:0xff5500}},atlasTexture:x=>x},
  './spacecraftParts.js':{createAssembly:group=>({async update(){group.add(new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshBasicMaterial()));},destroy(){}})}};
async function source(name){
  const m=new vm.SourceTextModule(fs.readFileSync(`Tools/EmbeddedUI/${name}.js`,'utf8'),{context,initializeImportMeta:meta=>{meta.url='file:///test/'+name+'.js';}});
  await m.link(spec=>{assert.ok(modules[spec],spec);const values=modules[spec];return new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{context});});
  await m.evaluate();return m.namespace;
}
const {createFlightFrame,labelOccluded}=await source('flightFrame');
assert.ok(labelOccluded(new THREE.Vector3(0,0,10),new THREE.Vector3(0,0,-10),[new THREE.Sphere(new THREE.Vector3(),4)]),'A planet behind Earth must not label Earth');
assert.ok(!labelOccluded(new THREE.Vector3(0,0,10),new THREE.Vector3(8,0,0),[new THREE.Sphere(new THREE.Vector3(),4)]),'Unobstructed labels remain visible');
const rows=[];
for(const id of ['leo','sso','geo','llo']){
  const orbit=geometry.presetOrbit(id),period=geometry.orbitalPeriod(orbit);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,16/9,.05,2000),craft=new THREE.Group(),globe=mesh(4);scene.add(craft,globe);
  const frame=createFlightFrame(scene,camera,craft,globe,id,orbit);
  frame.sample(0);const start=craft.userData.orbitAnchor.clone();
  frame.sample(period/2);const half=craft.userData.orbitAnchor.clone();assert.ok(start.distanceTo(half)>10,`${id}: half orbit moves to opposite side`);
  frame.sample(period);assert.ok(start.distanceTo(craft.userData.orbitAnchor)<1e-8,`${id}: full orbit closes`);
  frame.sample(period/4,orbit,true);const fixed=craft.userData.orbitAnchor.clone();
  const solar=scene.getObjectByName('ConnectedSolarSystem'),mars=solar.getObjectByName('mars');
  const marsPosition=mars.position.clone();wall+=20000;frame.sample(period/4,orbit,true);
  assert.ok(mars.position.distanceTo(marsPosition)<1e-12,'Paused system has no separate wall clock');
  for(const mode of ['solar','follow','fixed','inertial','earth-moon']){
    frame.setCamera(mode);frame.sample(period/4,orbit,true);scene.updateMatrixWorld(true);
    assert.ok(solar.visible,`${mode}: solar context retained`);
    assert.ok(craft.userData.orbitAnchor.clone().sub(frame.origin).distanceTo(fixed)<1e-8,`${mode}: camera preserves orbit phase`);
    assert.ok(camera.position.toArray().every(Number.isFinite));
    if(mode!=='solar'){
      assert.ok(!solar.getObjectByName('earth').visible&&!solar.getObjectByName('moon').visible,'No duplicate local globes');
      const primary=solar.getObjectByName(id==='llo'?'moon':'earth').getWorldPosition(new THREE.Vector3());
      assert.ok(primary.distanceTo(globe.position)<1e-8,'Overview and local origin coincide');
    }
  }
  rows.push({orbit:id,periodSec:period,halfOrbitDisplacement:start.distanceTo(half)});frame.destroy();
}
const solarModule=await source('solarSystemView');modules['./solarSystemView.js']=solarModule;
const {createEncounterView}=await source('encounterView');
for(const kind of ['orbit','flyby','rendezvous']){
  let paused=false;const container={...element(),clientWidth:960,clientHeight:540};
  const view=createEncounterView(container,{mission:{destination:'mars'},design:{},data:{},captured:kind==='orbit',arrivalKind:kind,isPaused:()=>paused});
  assert.ok(await view.ready);const kit=lastKit,craft=kit.scene.children.find(o=>o.isGroup&&o.children.some(c=>c.isGroup));
  assert.ok(kit.scene.getObjectByName('EncounterSolarSystem').visible,'Encounter keeps the Solar System');
  kit.draw(0);const start=craft.position.clone();kit.draw(18);const half=craft.position.clone();
  if(kind==='orbit'){
    assert.ok(start.distanceTo(half)>4,'Capture spacecraft travels around its planet');
    assert.ok(Math.abs(start.length()-half.length())<1e-9);
    kit.draw(18);assert.ok(start.distanceTo(craft.position)<1e-8,'Capture closes after 36 s');
    for(let i=0;i<36;i++){
      kit.draw(1);kit.camera.updateMatrixWorld();const p=craft.position.clone().project(kit.camera);
      assert.ok(Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&p.z<1,'Complete orbit stays in camera frame');
    }
  }else if(kind==='flyby'){
    kit.draw(60);assert.ok(craft.position.z>half.z&&half.z>start.z,'Flyby crosses once, never loops');
    assert.ok(!kit.scene.children.some(o=>o.isLineLoop),'Flyby has no capture ring');
  }else assert.ok(start.equals(half),'Rendezvous holds relative position');
  paused=true;const before=craft.position.clone();kit.draw(5);assert.ok(before.equals(craft.position),'Pause freezes preview');view.destroy();
}
const {mountSolarSystem}=solarModule;
const cleanup=mountSolarSystem({...element(),getBoundingClientRect:()=>({left:0,top:0,width:960,height:540})});
const kit=lastKit,earth=kit.scene.getObjectByName('earth'),sat=kit.scene.getObjectByName('Example Earth satellite');
kit.draw(0);const relative=sat.position.clone().sub(earth.position);kit.draw(6);
assert.ok(relative.distanceTo(sat.position.clone().sub(earth.position))>.5,'Atlas satellite orbits Earth rather than keeping a fixed offset');cleanup();
fs.mkdirSync('Verification/OrbitalViews-2026-11-15',{recursive:true});
fs.writeFileSync('Verification/OrbitalViews-2026-11-15/geometry-checks.json',JSON.stringify(rows,null,2));
console.log('PASS: four orbital presets, all camera modes, paused clock, shared origins, complete capture orbit, flyby, rendezvous, atlas satellite.');
