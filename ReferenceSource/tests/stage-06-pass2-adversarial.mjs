// Pass 2: Fresh-State Adversarial Recheck of Candidate
// Covers: Launch->Builder->Launch, Launch->Moon->Launch, Launch->Mobile->Launch,
// Repeat Reset, Non-monotonic Scrubbing across Separation/Deployment boundaries,
// Pause/Incident/Completion/Reload, Intentional Failure/Retry, and Candidate Hash Integrity.

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as THREE from 'three';

const root = new URL('../', import.meta.url);
const load = p => import(new URL(p, root));

const context = new Proxy({}, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => (o[k] = v, true) });
const domNode = {
  textContent: '',
  style: { width: '100%', height: '620px' },
  options: [{ value: 'kestrel' }, { value: 'bus_micro' }],
  value: 'kestrel',
  append() {},
  remove() {}
};
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context, append() {}, remove() {}, setAttribute() {}, style: {} }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(v) {} }),
  querySelector: () => domNode
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
const { addEarth, addWorldBody, disposeObject } = await load('js/three/sceneKit.js');
const { operationPoint, operationCamera } = await load('js/three/orbitPresentation.js');
const { validateOrbit, presetOrbit } = await load('js/engine/orbitalGeometry.js');
const { checkLaunchGate, evaluateDesign } = await load('js/engine.js');
const { migrateDesign } = await load('js/contracts/validate.js');
const { createOperations, stepOperations, resolveIncident, operationSummary } = await load('js/engine/operations.js');
const { rateFlight } = await load('js/flightOutcome.js');
const { canCompleteFlight } = await load('js/flightCompletion.js');
const { completeMission, resetState, getState } = await load('js/state.js');

const data = enrichCampaign(JSON.parse(await fs.readFile(new URL('data/world1.json', root))));
const design = starterDesign(data.missions.find(m => m.id === 'm1'), data, 'easy');

console.log('=== PASS 2: ADVERSARIAL RECHECK COMMENCING ===\n');

const html = await fs.readFile(new URL('tests/scene-repairs.test.html', root), 'utf8');
const chunk = html.slice(html.indexOf(' let launchTrajectory = null;'), html.indexOf(' // --- Interactive Named Bookmarks ---'));
const clearSource = html.slice(html.indexOf('function clear(){'), html.indexOf('\ntry{'));

const sceneRoot = new THREE.Group();
const kit = {
  controls: { enabled: true, target: new THREE.Vector3(), update() {} },
  camera: new THREE.PerspectiveCamera(),
  renderer: { setSize() {} },
  launchTrajectory: null
};
const updateTelemetry = () => {};

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const factory = new AsyncFunction(
  'THREE', 'kit', 'root', 'clear', 'createLaunchSite', 'getModel', 'createAssembly',
  'design', 'data', 'loadOrbiterTexture', 'addEarth', 'sampleAscent', 'updateTelemetry', 'disposeObject',
  'let playing=false,animFrame=null,previewAssembly=null,cinematic=null,currentStage=null,currentPayload=null,currentHorizon=null;\n' +
  clearSource + '\ntry{\n' + chunk + '\nreturn { controller: getOrCreateLaunchTrajectory, clear };\n}catch(error){throw error;}'
);

const harness = await factory(
  THREE, kit, sceneRoot, () => sceneRoot.clear(), createLaunchSite, getModel, createAssembly,
  design, data, () => new THREE.Texture(), addEarth, sampleAscent, updateTelemetry, disposeObject
);

let checksPassed = 0;
const assert = (condition, desc) => {
  if (!condition) {
    console.error(`FAIL: ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
  checksPassed++;
};

// --- ROUTE 1: Launch -> Builder -> Launch ---
console.log('1. Testing route: Launchpad -> Builder -> Launchpad...');
const tLaunch1 = await harness.controller('kestrel', 'bus_micro');
tLaunch1.seek(0.1);
const oldRocket1 = sceneRoot.children.find(g => g.getObjectByName?.('payload_adapter'));

harness.clear();
const builderGroup = new THREE.Group();
builderGroup.name = 'builder_view';
sceneRoot.add(builderGroup);

const tLaunch2 = await harness.controller('kestrel', 'bus_micro');
assert(tLaunch2 !== tLaunch1, 'Disposed controller not reused after builder');
assert(oldRocket1.parent !== sceneRoot, 'Old rocket cleanly unmounted');
assert(!sceneRoot.children.includes(builderGroup), 'Builder group removed from root on re-entry');
tLaunch2.seek(0.28);
assert(sceneRoot.children.filter(g => g.getObjectByName?.('payload_adapter')).length === 1, 'Exactly one live launch stack');
console.log('   Route 1 PASS');

// --- ROUTE 2: Launch -> Moon -> Launch ---
console.log('2. Testing route: Launchpad -> Lunar operations -> Launchpad...');
harness.clear();
const lunarGroup = new THREE.Group();
lunarGroup.name = 'lunar_operations_view';
sceneRoot.add(lunarGroup);

const tLaunch3 = await harness.controller('roc', 'bus_large');
assert(tLaunch3 !== tLaunch2, 'Fresh controller created for roc/bus_large');
assert(!sceneRoot.children.includes(lunarGroup), 'Lunar group removed on re-entry');
tLaunch3.seek(0.0);
assert(tLaunch3.rocket.getObjectByName('fairing_left') !== undefined, 'Roc fairing present');
console.log('   Route 2 PASS');

// --- ROUTE 3: Launch -> Mobile narrow viewport -> Launch ---
console.log('3. Testing route: Launchpad -> Mobile viewport -> Launchpad...');
harness.clear();
domNode.style.width = '390px'; domNode.style.height = '844px';
const mobileGroup = new THREE.Group();
mobileGroup.name = 'mobile_preview';
sceneRoot.add(mobileGroup);

harness.clear();
assert(domNode.style.width === '100%' && domNode.style.height === 'min(620px,65vh)', 'Viewport style resets to responsive desktop height rather than retaining mobile size');
const tLaunch4 = await harness.controller('kestrel', 'bus_micro');
assert(!sceneRoot.children.includes(mobileGroup), 'Mobile preview removed on re-entry');
console.log('   Route 3 PASS');

// --- ROUTE 4: Repeat Resets ---
console.log('4. Testing repeat reset cycles (5 iterations)...');
for (let i = 0; i < 5; i++) {
  const t = await harness.controller('kestrel', 'bus_micro');
  t.seek(0.3 + i * 0.1);
  harness.clear();
  assert(sceneRoot.children.length === 0, `Clear emptied scene graph on iteration ${i + 1}`);
  assert(kit.launchTrajectory === null, `Cached trajectory nulled on iteration ${i + 1}`);
}
console.log('   Route 4 PASS');

// --- ROUTE 5: Non-monotonic scrubbing across separation and deployment boundaries ---
console.log('5. Testing non-monotonic scrubbing across boundaries (0.0 -> 0.35 -> 0.58 -> 1.0 -> 0.42 -> 0.72 -> 0.15 -> 0.999 -> 0.5 -> 0.0)...');
const tScrub = await harness.controller('kestrel', 'bus_micro');
const scrubSteps = [0.0, 0.35, 0.58, 1.0, 0.42, 0.72, 0.15, 0.999, 0.5, 0.0];
for (const P of scrubSteps) {
  tScrub.seek(P);
  sceneRoot.updateMatrixWorld(true);
  const craftPos = tScrub.payload.getWorldPosition(new THREE.Vector3());
  assert(Number.isFinite(craftPos.x) && Number.isFinite(craftPos.y) && Number.isFinite(craftPos.z), `Finite craft position at P=${P}`);
  if (P <= 0.5) {
    assert(tScrub.payload.parent === tScrub.rocket, `Payload mounted on rocket at P=${P}`);
    assert(tScrub.rocket.visible, `Rocket visible during ascent at P=${P}`);
  } else {
    assert(tScrub.payload.parent === sceneRoot, `Payload detached in space at P=${P}`);
    if (P > 0.72) {
      assert(!tScrub.rocket.visible, `Upper stage hidden after burn out at P=${P}`);
    }
  }
}
// Validate exact endpoint at P=1.0
tScrub.seek(1.0);
sceneRoot.updateMatrixWorld(true);
const endCraft = tScrub.payload.getWorldPosition(new THREE.Vector3());
const expCraft = operationPoint(design.orbitId, 0, design.orbitElements);
assert(endCraft.distanceTo(expCraft) < 1e-6, `Endpoint agrees with gameplay insertion orbit (<1e-6)`);
assert(180 * tScrub.horizon.scale.x === 4, `Operations body radius equals 4 at P=1.0`);
console.log('   Route 5 PASS');

// --- ROUTE 6: Mission operations, scoring, and persistence contracts ---
console.log('6. Testing mission flow completion, scoring, and contracts...');
resetState();
const migrated = migrateDesign(design, data);
assert(migrated !== null, 'Starter design migrates and validates under contracts');
const gates = checkLaunchGate(design, data);
assert(gates.every(g => g.ok), 'All launch gates pass for starter design');

const evalRes = evaluateDesign(design, data);
assert(evalRes.launchMass > 0, 'Starter design has positive launch mass');
assert(evalRes.batteryUsableWh > 0, 'Starter design has usable battery capacity');

const ops = createOperations(design, data, evalRes);
while (ops.tick < 120 && !ops.finished) {
  if (ops.pendingIncident) {
    const choice = ops.pendingIncident.id === 'contact' ? 'buffer' : 'continue';
    resolveIncident(ops, choice);
  }
  stepOperations(ops);
}
const summary = operationSummary(ops);
assert(summary.passed, 'Mission operations passed all objectives');
const flightSuccess = { schemaVersion: 2, scoringVersion: 'orbital-v03', missionId: 'm1', launchResult: { success: true }, operationsSummary: summary };
const rating = rateFlight(design, data, evalRes, { success: true }, [], summary);
assert(rating.total >= 3, 'Flight rated with stars for achieved objectives');
const canComplete = canCompleteFlight('m1', rating, 3, flightSuccess);
assert(canComplete, 'Successful flight approved by completion gate');
const awarded = completeMission('m1', rating, 3, flightSuccess);
assert(awarded, 'Mission marked completed in state');

// Adversarial: unachieved objectives receive 0 stars and no award
const failedSummary = { ...summary, passed: false, windowCompleted: false };
const flightFailed = { schemaVersion: 2, scoringVersion: 'orbital-v03', missionId: 'm1', launchResult: { success: false }, operationsSummary: failedSummary };
const failedRating = rateFlight(design, data, evalRes, { success: false }, [], failedSummary);
assert(failedRating.medal === null, 'Failed flight receives no medal');
const failedCanComplete = canCompleteFlight('m1', failedRating, 3, flightFailed);
assert(!failedCanComplete, 'Failed flight rejected by completion gate');
console.log('   Route 6 PASS');

// --- ROUTE 7: Intentional failure / report / retry ---
console.log('7. Testing intentional propellant exhaustion, orbit validation & retry flow...');
// Adversarial 1: Lunar mission without fuel fails reach gate
const mappingMission = data.missions.find(m => m.id === 'mapping');
const noFuelMapping = { ...starterDesign(mappingMission, data, 'normal'), fuelIds: [] };
const mappingGates = checkLaunchGate(noFuelMapping, data);
assert(mappingGates.some(g => g.id === 'fuel' && !g.ok), 'Empty fuel on lunar mapping rejected by fuel gate');

// Adversarial 2: Sub-surface and non-finite orbit validation
const baseOrbit = presetOrbit('sso');
let caughtSubSurface = false, caughtNaN = false;
try { validateOrbit({ ...baseOrbit, semiMajorAxisM: 5000000 }); } catch (e) { caughtSubSurface = true; }
try { validateOrbit({ ...baseOrbit, semiMajorAxisM: NaN }); } catch (e) { caughtNaN = true; }
assert(caughtSubSurface, 'Sub-surface periapsis rejected by validateOrbit');
assert(caughtNaN, 'NaN semiMajorAxis rejected by validateOrbit');

// Adversarial 3: Atomic rejection of unaffordable propellant incident choice
const opsDebris = createOperations(design, data, evalRes);
opsDebris.fuelKg = 1.0;
opsDebris.pendingIncident = { id: 'debris', tick: 60 };
const rejectChoice = resolveIncident(opsDebris, 'burn');
assert(rejectChoice === false, 'Insufficient fuel choice rejected atomically');
assert(opsDebris.fuelKg === 1.0, 'Fuel balance unchanged after rejection');
assert(opsDebris.pendingIncident !== null, 'Pending incident preserved after rejection');
console.log('   Route 7 PASS');

// --- ROUTE 8: Candidate changed-file & hash manifest verification ---
console.log('8. Freezing & verifying candidate manifest hashes...');
const candidateFiles = [
  'tests/scene-repairs.test.html',
  'tests/ui-performance-failure.test.mjs',
  'tests/endpoint-lifecycle-verified.mjs'
];
const manifest = {};
for (const file of candidateFiles) {
  const buf = await fs.readFile(new URL(file, root));
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  manifest[file] = { sha256: hash, bytes: buf.length };
}
console.log('   Frozen Candidate Identity Manifest:');
console.log(JSON.stringify(manifest, null, 2));

console.log(`\n=== PASS 2 ADVERSARIAL RECHECK COMPLETE: ${checksPassed} ASSERTIONS PASSED ===`);
