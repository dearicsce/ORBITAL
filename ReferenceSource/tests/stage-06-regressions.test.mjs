import {fitPayloadToFairing} from '../js/three/payloadFit.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';

// Setup fake DOM for loaders
const context = new Proxy({}, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => (o[k] = v, true) });
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context, append() {}, remove() {}, setAttribute() {}, style: {} }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(v) {} })
};
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, ...args) => {
  if (String(url).startsWith('file:')) return new Response(await fs.readFile(new URL(url)), { headers: { 'Content-Type': 'application/json' } });
  return nativeFetch(url, ...args);
};

const { getModel } = await import('../js/three/models.js');
const { createAssembly } = await import('../js/three/spacecraftParts.js');
const { createOrbitOps } = await import('../js/three/orbitOps.js');
const { createLaunchSpace } = await import('../js/three/launchSpace.js');
const { createOperations, stepOperations, chooseMode, MINUTES_PER_TICK } = await import('../js/engine/operations.js');
const { enrichCampaign, starterDesign } = await import('../js/campaign.js');
const { operationPoint } = await import('../js/three/orbitPresentation.js');
const { presetOrbit } = await import('../js/engine/orbitalGeometry.js');

let assertions = 0;
const check = (ok, msg) => { assert.ok(ok, msg); assertions++; };

const data = enrichCampaign(JSON.parse(await fs.readFile(new URL('../data/world1.json', import.meta.url))));
const m1 = data.missions.find(m => m.id === 'm1');
const design = starterDesign(m1, data);

// -------------------------------------------------------------
// D01 & A02: Launch fit across all 4 launchers & buses
// -------------------------------------------------------------
console.log('Testing D01 & A02: normalized launch mounts and usable fairings...');
for (const launcherId of ['kestrel', 'condor', 'roc', 'albatross']) {
  const rocket = await getModel(launcherId);
  rocket.updateMatrixWorld(true);
  const adapter = rocket.getObjectByName('payload_adapter');
  check(Boolean(adapter), `${launcherId} has payload_adapter`);

  const adapterBox = new THREE.Box3().setFromObject(adapter);
  const tank = rocket.getObjectByName('upper_stage_tank');
  const tankBox = new THREE.Box3().setFromObject(tank);
  const fairing = rocket.getObjectByName('fairing_left');
  const fairingBox = new THREE.Box3().setFromObject(fairing);

  // Derive adapter top in local coordinates
  const worldBox = new THREE.Box3().setFromObject(adapter);
  const localTop = rocket.worldToLocal(new THREE.Vector3(0, worldBox.max.y, 0));
  const adapterY = localTop.y;

  check(adapterY > tankBox.max.y - 0.05, `${launcherId} adapter top (${adapterY.toFixed(3)}) is above upper tank max (${tankBox.max.y.toFixed(3)})`);

  // Specifically verify Roc (D01 defect fix)
  if (launcherId === 'roc') {
    check(adapterY > 13.8, `Roc adapter top (${adapterY.toFixed(3)}) is at ~13.9, not the defective fixed 11.5`);
    check(11.5 < tankBox.max.y && 11.5 > tankBox.min.y, `Confirms 11.5 was inside Roc tank [${tankBox.min.y.toFixed(3)}, ${tankBox.max.y.toFixed(3)}]`);
  }

  // Mount payload at adapter top
  const params = tank.geometry.parameters;
  for (const busId of ['bus_micro', 'bus_small', 'bus_medium', 'bus_large']) {
    for (const panelIds of [['panel_m'], ['panel_m', 'panel_m'], ['panel_l', 'panel_l']]) {
      const payload = new THREE.Group();
      payload.scale.setScalar(0.26);
      payload.position.set(0, adapterY, 0);
      const a = createAssembly(payload);
      await a.update({ ...design, busId, panelIds, instrumentIds: ['optical_camera'] }, data);
      for (const m of a.instances.values()) m.userData.born = -1000;
      a.animate(1); // folded for ascent
      fitPayloadToFairing(payload,rocket);
      payload.updateMatrixWorld(true);

      const pBox = new THREE.Box3().setFromObject(payload);
      check(pBox.min.y >= worldBox.max.y - 0.01, `${launcherId} + ${busId} (${panelIds.length} panels): payload min Y clears adapter top`);
      check(pBox.max.y <= fairingBox.max.y, `${launcherId} + ${busId}: payload enclosed within fairing height`);

      let verticesInTank = 0;
      payload.traverse(m => {
        if (!m.isMesh) return;
        const pos = m.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const world = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
          const pt = tank.worldToLocal(world.clone());
          if (Math.abs(pt.y) < params.height / 2 && Math.hypot(pt.x, pt.z) < Math.min(params.radiusTop, params.radiusBottom)) {
            verticesInTank++;
          }
        }
      });
      check(verticesInTank === 0, `${launcherId} + ${busId} (${panelIds.length} panels): zero vertices inside upper stage tank`);

      const atlas = ['condor', 'roc', 'atlas_upper'].includes(launcherId);
      const ares = launcherId === 'albatross';
      const rad = atlas ? .55 : ares ? .37 : .43;
      const profile = [[0, rad * 1.27], [.2, rad * 1.35], [1.8, rad * 1.35], [2.4, rad * 1.15], [3.1, rad * .62], [3.45, 0]];
      let outsideFairing = 0;
      payload.traverse(m => {
        if (!m.isMesh) return;
        const pos = m.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const q = fairing.worldToLocal(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
          let allowed = -1;
          for (let j = 1; j < profile.length; j++) {
            if (q.y >= profile[j - 1][0] && q.y <= profile[j][0]) {
              const t = (q.y - profile[j - 1][0]) / (profile[j][0] - profile[j - 1][0]);
              allowed = THREE.MathUtils.lerp(profile[j - 1][1], profile[j][1], t);
              break;
            }
          }
          const excess = Math.hypot(q.x, q.z) - allowed;
          if (allowed < 0 || excess > 1e-5) outsideFairing++;
        }
      });
      check(outsideFairing === 0, `${launcherId} + ${busId} (${panelIds.length} panels): zero vertices outside tapered fairing`);

      a.destroy();
    }
  }
}

// -------------------------------------------------------------
// R08: Array mounting independence from edit history
// -------------------------------------------------------------
console.log('Testing R08: array mounting independence from edit history...');
const testGroup = new THREE.Group(), aHist = createAssembly(testGroup);
const getHinges = asm => asm.instances.get('panel0').children.map(p => p.position.toArray());
await aHist.update({ ...design, panelIds: ['panel_m'] }, data);
const singleHinges = getHinges(aHist);

// Add second pair incrementally
await aHist.update({ ...design, panelIds: ['panel_m', 'panel_m'] }, data);
const incrementalDoubleHinges = getHinges(aHist);

// Compare with fresh double construction
const freshGroup = new THREE.Group(), freshDoubleAsm = createAssembly(freshGroup);
await freshDoubleAsm.update({ ...design, panelIds: ['panel_m', 'panel_m'] }, data);
const freshDoubleHinges = getHinges(freshDoubleAsm);
check(JSON.stringify(incrementalDoubleHinges) === JSON.stringify(freshDoubleHinges), 'Adding second pair updates existing hinge positions to match fresh double assembly');

// Remove second pair back to single
await freshDoubleAsm.update({ ...design, panelIds: ['panel_m'] }, data);
const removedToSingleHinges = getHinges(freshDoubleAsm);
check(JSON.stringify(removedToSingleHinges) === JSON.stringify(singleHinges), 'Removing pair returns remaining hinges to single-pair position');
aHist.destroy();
freshDoubleAsm.destroy();

// Verify valid normal campaign mapping design on Albatross passes all 10 launch gates
const { checkLaunchGate } = await import('../js/engine.js');
const mappingMission = data.missions.find(m => m.id === 'mapping');
const validMappingLargeAlbatross = {
  ...starterDesign(mappingMission, data, 'normal'),
  launcherId: 'albatross',
  busId: 'bus_large',
  panelIds: ['panel_l', 'panel_l'],
  batteryIds: ['battery_l', 'battery_l']
};
const gates = checkLaunchGate(validMappingLargeAlbatross, data);
check(gates.every(g => g.ok), 'Valid normal mapping Albatross + bus_large passes all 10 campaign launch gates');

// -------------------------------------------------------------
// D02 & A03: Shared epoch & pause freeze
// -------------------------------------------------------------
console.log('Testing D02 & A03: shared epoch and frozen pause...');
const fakeCanvas = document.createElement('div');
const opsView = createOrbitOps(fakeCanvas, {
  orbitId: 'sso',
  design,
  data,
  initialProgress: 0.5, // Resumed at tick 60 / 120
  initialPaused: true
});

// Standalone draw at dt=0.016: verify drawn craft starts at exactly tick 60 (16200 s) without catch-up lag
opsView.draw(0.016, 0);
const initialCraftPos = opsView.craft.position;
const ptExpected = operationPoint('sso', 16200, design.orbitElements);
const initialPosError = initialCraftPos.distanceTo(ptExpected);
check(initialPosError < 1e-4, `Resumed tick 60 first-frame drawn craft position matches engine orbit point (error: ${initialPosError.toFixed(6)})`);
check(Number.isFinite(ptExpected.x) && Number.isFinite(ptExpected.y) && Number.isFinite(ptExpected.z), 'Operation point coordinates are finite numbers');
check(Math.hypot(ptExpected.x, ptExpected.y, ptExpected.z) > 4.0, 'Operation point is strictly outside Earth body radius');

// Advance to tick 61 and pause: assert drawn craft position
opsView.setProgress(61 / 120, { immediate: false, paused: false });
opsView.draw(0.016, 0.016);
opsView.setProgress(61 / 120, { immediate: false, paused: true });
opsView.draw(0.016, 0.032);
const pauseError = opsView.craft.position.distanceTo(operationPoint('sso', 61 * 270, design.orbitElements));
check(pauseError < 1e-4, `Live pause snaps drawn craft position to exact tick 61 epoch (error: ${pauseError.toFixed(6)})`);

// Completed tick 120 paused: assert drawn craft position
opsView.setProgress(1, { immediate: false, paused: true });
opsView.draw(0.016, 0.048);
const finalError = opsView.craft.position.distanceTo(operationPoint('sso', 32400, design.orbitElements));
check(finalError < 1e-4, `Completed tick 120 snaps drawn craft position to exact final epoch (error: ${finalError.toFixed(6)})`);
opsView.destroy();

// -------------------------------------------------------------
// D03 & A04: Resource & contact truth
// -------------------------------------------------------------
console.log('Testing D03 & A04: truthful telemetry in Safe and Downlink modes...');
const { evaluateDesign } = await import('../js/engine.js');
const evaluation = evaluateDesign(design, data);
const opsState = createOperations(design, data, evaluation);
check(opsState.storageGb === 0, 'Initial storage is 0');
check(opsState.deliveredGb === 0, 'Initial delivered is 0');

// Put into safe mode
chooseMode(opsState, 'safe');
check(opsState.mode === 'safe', 'Mode set to safe');

// Step 3 ticks in Safe mode
for (let t = 0; t < 3; t++) {
  stepOperations(opsState);
  // Even if geometric contact happens, safe mode disables downlink
  check(opsState.deliveredGb === 0, `Safe mode tick ${t}: no data delivered without transmission command`);
  check(!opsState.transmitting, `Safe mode tick ${t}: transmitting flag is false`);
}

// Battery conservation test: verify battery delta = (generation - load) * minutes / 60 (within bounds)
const initialBattery = opsState.batteryWh;
const gen = opsState.generationW;
const load = opsState.loadW;
stepOperations(opsState);
const expectedBattery = Math.min(opsState.batteryCapacityWh, Math.max(0, initialBattery + (gen - load) * MINUTES_PER_TICK / 60));
check(Math.abs(opsState.batteryWh - expectedBattery) < 1e-4, 'Battery delta matches (generation - load) * dt exactly');

// -------------------------------------------------------------
// D05 & A09: Directional sunlight convention
// -------------------------------------------------------------
console.log('Testing D05: orbital sun direction matches +X convention...');
const opsContainer = document.createElement('div');
const kitMock = createOrbitOps(opsContainer, { orbitId: 'sso', design, data });
const capturedSunPos = kitMock.sun ? kitMock.sun.position.clone() : null;
check(capturedSunPos !== null, 'Kit mock includes directional sun light');
check(capturedSunPos.x > 0 && capturedSunPos.y === 0 && capturedSunPos.z === 0, `Sun directional vector follows +X convention (${capturedSunPos.x}, ${capturedSunPos.y}, ${capturedSunPos.z})`);
kitMock.destroy();

console.log(`PASS: All ${assertions} Stage 06 regression assertions passed!`);
