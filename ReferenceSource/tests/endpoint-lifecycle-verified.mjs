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

const trajectory = await controller('kestrel', 'bus_micro');

// 1. Check prelaunch baseline
trajectory.seek(0);
sceneRoot.updateMatrixWorld(true);
const prelaunchCraft = trajectory.payload.getWorldPosition(new THREE.Vector3());
const prelaunchFairing = trajectory.rocket.getObjectByName('fairing_left');
const preFairingBox = new THREE.Box3().setFromObject(prelaunchFairing);
const prePayloadBox = new THREE.Box3().setFromObject(trajectory.payload);
const prelaunchEnclosed = preFairingBox.min.y <= prePayloadBox.min.y && preFairingBox.max.y >= prePayloadBox.max.y;

// 2. Check midpoint continuity across P=0.5 -> 0.500001
trajectory.seek(0.5);
sceneRoot.updateMatrixWorld(true);
const midBeforeCraft = trajectory.payload.getWorldPosition(new THREE.Vector3());
const midBeforeCamera = kit.camera.position.clone();
trajectory.seek(0.500001);
sceneRoot.updateMatrixWorld(true);
const midAfterCraft = trajectory.payload.getWorldPosition(new THREE.Vector3());
const midAfterCamera = kit.camera.position.clone();
const payloadJump = midBeforeCraft.distanceTo(midAfterCraft);
const cameraJump = midBeforeCamera.distanceTo(midAfterCamera);

// 3. Check operational insertion endpoint at P=1.0
trajectory.seek(1.0);
sceneRoot.updateMatrixWorld(true);

const actualCraft = trajectory.payload.getWorldPosition(new THREE.Vector3());
const expectedCraft = operationPoint(design.orbitId, 0, design.orbitElements);
const sceneUnitsApart = actualCraft.distanceTo(expectedCraft);

const earthCenter = trajectory.horizon.position.toArray();
const earthRadius = 180 * trajectory.horizon.scale.x;
const craftStillChildOfStage = trajectory.payload.parent === trajectory.rocket;
const upperStageHidden = trajectory.rocket.visible === false;

const finalCamera = new THREE.Vector3(...operationCamera(design.orbitId, design.orbitElements));
const cameraDistanceToFinal = kit.camera.position.distanceTo(finalCamera);

// 4. Check backward scrubbing back to ascent & pad
trajectory.seek(0.42);
sceneRoot.updateMatrixWorld(true);
const scrubBackRocketVisible = trajectory.rocket.visible;
const scrubBackParentIsRocket = trajectory.payload.parent === trajectory.rocket;

trajectory.seek(0.0);
sceneRoot.updateMatrixWorld(true);
const scrubPadParentIsRocket = trajectory.payload.parent === trajectory.rocket;

const results = {
  case: 'shared-gameplay-operations-endpoint-verified',
  prelaunchEnclosed,
  payloadJumpAtBoundary: payloadJump,
  cameraJumpAtBoundary: cameraJump,
  actualCraft: actualCraft.toArray(),
  gameplayInsertionCraft: expectedCraft.toArray(),
  sceneUnitsApart,
  gameplayOperationsBodyRadius: earthRadius,
  earthCenter,
  craftStillChildOfStage,
  upperStageHidden,
  cameraDistanceToFinal,
  backwardScrubRestoresRocket: scrubBackRocketVisible && scrubBackParentIsRocket && scrubPadParentIsRocket,
  endpointVerified: sceneUnitsApart < 1e-6 && earthRadius === 4 && !craftStillChildOfStage
};

console.log(JSON.stringify(results, null, 2));

if (!results.endpointVerified) {
  console.error('FAIL: endpoint not verified');
  process.exit(1);
}
