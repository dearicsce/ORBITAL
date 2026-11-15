import assert from 'node:assert/strict';
// Independent verified probe for Stage 06 R04: Shared gameplay launchSpace/operations transition & endpoint
import fs from 'node:fs/promises';
import * as THREE from 'three';

const root = new URL('../', import.meta.url);
const load = p => import(new URL(p, root));

const context = new Proxy({}, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => (o[k] = v, true) });
const node = { textContent: '', style: { width: '100%', height: '620px' }, options: [{ value: 'kestrel' }], value: 'kestrel' };
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context, append() {}, remove() {}, setAttribute() {}, style: {} }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(v) {} }),
  querySelector: () => node
};
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, ...args) =>
  String(url).startsWith('file:')
    ? new Response(await fs.readFile(new URL(url)), { headers: { 'Content-Type': 'application/json' } })
    : nativeFetch(url, ...args);

const { enrichCampaign, starterDesign } = await load('js/campaign.js');
const { getModel } = await load('js/three/models.js');
const { createAssembly } = await load('js/three/spacecraftParts.js');
const { createLaunchSite } = await load('js/three/launchSite.js');
const { sampleAscent } = await load('js/three/launchTimeline.js');
const { addEarth, disposeObject } = await load('js/three/sceneKit.js');
const { operationPoint, operationCamera } = await load('js/three/orbitPresentation.js');

const data = enrichCampaign(JSON.parse(await fs.readFile(new URL('data/world1.json', root))));
const design = starterDesign(data.missions.find(m => m.id === 'm1'), data, 'easy');

const html = await fs.readFile(new URL('tests/scene-repairs.test.html', root), 'utf8');
const chunk = html.slice(html.indexOf(' let launchTrajectory = null;'), html.indexOf(' // --- Interactive Named Bookmarks ---'));
const clearSource = html.slice(html.indexOf('function clear(){'), html.indexOf('\ntry{'));

const sceneRoot = new THREE.Group();
const kit = {
  controls: { enabled: true, target: new THREE.Vector3(), update() {} },
  camera: new THREE.PerspectiveCamera(),
  launchTrajectory: null
};
const updateTelemetry = () => {};

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const factory = new AsyncFunction(
  'THREE', 'kit', 'root', 'clear', 'createLaunchSite', 'getModel', 'createAssembly',
  'design', 'data', 'loadOrbiterTexture', 'addEarth', 'sampleAscent', 'updateTelemetry', 'disposeObject',
  'let playing=false,animFrame=null,previewAssembly=null,cinematic=null,currentStage=null,currentPayload=null,currentHorizon=null;\n' +
  clearSource + '\ntry{\n' + chunk + '\nreturn getOrCreateLaunchTrajectory;\n}catch(error){throw error;}'
);

const controller = await factory(
  THREE, kit, sceneRoot, () => sceneRoot.clear(), createLaunchSite, getModel, createAssembly,
  design, data, () => new THREE.Texture(), addEarth, sampleAscent, updateTelemetry, disposeObject
);


const snapshot = trajectory => {
 sceneRoot.updateMatrixWorld(true);kit.camera.updateMatrixWorld(true);
 return [trajectory.rocket,trajectory.payload,trajectory.horizon,kit.camera].flatMap(o=>[...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray(),Number(o.visible)]);
};
let cases=0;
for(const launcher of ['kestrel','condor','roc','albatross'])for(const bus of ['bus_micro','bus_small','bus_medium','bus_large']){
 const t=await controller(launcher,bus);
 for(const p of [0,.28,.3416,.342,.4083,.409,.42,.5,.500001,.58,.7,.85,1]){
  t.seek(p);const direct=snapshot(t);
  for(const prior of [.5,1,0,.9,.42]){t.seek(prior);t.seek(p);const replay=snapshot(t);assert.ok(direct.every((v,i)=>Math.abs(v-replay[i])<1e-8),launcher+' '+bus+' history-independent at '+p);}
  if(p===.28)assert.equal(t.horizon.visible,true,'Gameplay horizon appears in ascent');
  if(p>.5){kit.camera.aspect=1440/900;kit.camera.updateProjectionMatrix();kit.camera.updateMatrixWorld(true);const ndc=t.payload.getWorldPosition(new THREE.Vector3()).project(kit.camera);assert.ok(Math.abs(ndc.x)<.95&&Math.abs(ndc.y)<.95&&ndc.z<1,'Deployment craft inside desktop frustum '+p);}
  cases++;
 }
 t.seek(.42);sceneRoot.updateMatrixWorld(true);
 const upper=t.rocket.getObjectByName('upper_engine').getWorldPosition(new THREE.Vector3());
 const fire=sceneRoot.children.find(o=>o.isPointLight);
 assert.ok(fire.position.distanceTo(upper)<1e-8,'Plume light originates at upper engine after separation');
}
assert.match(await fs.readFile(new URL('js/ui/missionControl.js',root),'utf8'),/LAST 270 s AVG/);
console.log('PASS: '+cases+' bus/launcher/time cases; forward/back/reset pose and camera, horizon, active nozzle, deployment frustum, interval label. Geometry only.');
