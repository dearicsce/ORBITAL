import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const { enrichCampaign, starterDesign } = await import('../js/campaign.js');
const { evaluateDesign, rateDesign } = await import('../js/engine.js');
const { createOperations, stepOperations, chooseMode, resolveIncident, operationSummary, operationObjectives, MINUTES_PER_TICK } = await import('../js/engine/operations.js');
const { validateOrbit, presetOrbit } = await import('../js/engine/orbitalGeometry.js');
const { migrateDesign, validateProgress, validateFlightRecord } = await import('../js/contracts/validate.js');
const { canCompleteFlight } = await import('../js/flightCompletion.js');
const { configureStateContracts, resetState, completeMission, saveProgress, loadProgress, getState } = await import('../js/state.js');
const { rateFlight } = await import('../js/flightOutcome.js');
const { getUnlocked } = await import('../js/engine/unlocks.js');

let assertions = 0;
const check = (ok, msg) => { assert.ok(ok, msg); assertions++; };

const data = enrichCampaign(JSON.parse(await fs.readFile(new URL('../data/world1.json', import.meta.url))));

function stepWithIncidents(ops) {
  if (ops.pendingIncident) {
    const incId = ops.pendingIncident.id;
    const choice = incId === 'contact' ? 'buffer' : incId === 'battery' ? 'continue' : incId === 'thermal' ? 'cool' : 'continue';
    resolveIncident(ops, choice);
  }
  stepOperations(ops);
}

// -------------------------------------------------------------
// A05: Earth Success Flow (m1 starter through full operations & report)
// -------------------------------------------------------------
console.log('Testing A05: Earth Success Flow (m1)...');
const m1 = data.missions.find(m => m.id === 'm1');
const designM1 = starterDesign(m1, data, 'normal');
check(migrateDesign(designM1, data), 'm1 starter design validates');

const evalM1 = evaluateDesign(designM1, data);
check(evalM1.launchMass > 0, 'm1 design has positive launch mass');
check(evalM1.batteryUsableWh > 0, 'm1 battery usable > 0');
check(evalM1.panelPower > 0, 'm1 panel power > 0');

const rateM1 = rateDesign(designM1, data);
check(typeof rateM1.total === 'number' && rateM1.total > 0, 'm1 design rated with advisory review');

// Operations simulation: full 120 ticks
const opsM1 = createOperations(designM1, data, evalM1);
check(opsM1.tick === 0, 'Operations begins at tick 0');

while (opsM1.tick < 120 && !opsM1.finished) {
  stepWithIncidents(opsM1);
}

check(opsM1.tick === 120, 'Reached tick 120');
check(opsM1.finished, 'Operations marked finished');

const summaryM1 = operationSummary(opsM1);
check(summaryM1.windowCompleted, 'Operational window completed');
check(summaryM1.passed, 'Mission objectives passed');
check(summaryM1.objectives.length === 3, 'Three objectives evaluated');
check(summaryM1.objectives.every(o => o.passed), 'All 3 objectives passed');

// Completion records & reward idempotence using real progression contracts & state APIs
configureStateContracts(data);
resetState();

const ratingM1 = rateFlight(designM1, data, evalM1, { success: true }, [], summaryM1);
check(typeof ratingM1.total === 'number' && ratingM1.total >= 3, 'Real rateFlight returns passing stars (>= 3)');

const flightM1 = {
  schemaVersion: 2,
  scoringVersion: 'orbital-v03',
  missionId: 'm1',
  launchResult: { success: true },
  operationsSummary: summaryM1
};
const firstCanComplete = canCompleteFlight('m1', ratingM1, 3, flightM1);
check(firstCanComplete === true, 'Successful full journey satisfies canCompleteFlight progression contract');

const firstAward = completeMission('m1', ratingM1, 3, flightM1);
check(firstAward === true, 'First report visit awards completion via real completeMission API');
check(getState().completedMissions.m1.stars === ratingM1.total, 'Real state contains recorded mission stars');

// Progression unlocks test
const unlockedAfterM1 = getUnlocked(data, Object.keys(getState().completedMissions));
check(unlockedAfterM1.launchers.includes('condor'), 'Unlocks after m1 includes condor launcher');

// Idempotent report visit
const secondAward = completeMission('m1', ratingM1, 3, flightM1);
check(secondAward === true, 'Second report visit call is accepted idempotently');
check(getState().completedMissions.m1.stars === ratingM1.total, 'State stars unchanged on second report visit');

// In-memory persistence round-trip test
const mockStore = new Map();
const storageAdapter = { setItem: (k, v) => mockStore.set(k, v), getItem: k => mockStore.get(k) };
check(saveProgress(storageAdapter) === true, 'saveProgress succeeds with mock storage');
resetState();
check(Object.keys(getState().completedMissions).length === 0, 'State successfully cleared by resetState');
check(loadProgress(storageAdapter) === true, 'loadProgress successfully restores state');
check(getState().completedMissions.m1.stars === ratingM1.total, 'Restored state has m1 completion stars');

// -------------------------------------------------------------
// A06: Intentional Failure Flows
// -------------------------------------------------------------
console.log('Testing A06: Intentional Failure Flows...');

// Case 1: Early End on Wildfire (incomplete window)
const wildfire = data.missions.find(m => m.id === 'wildfire');
const designWf = starterDesign(wildfire, data, 'normal');
const evalWf = evaluateDesign(designWf, data);
const opsWf = createOperations(designWf, data, evalWf);
chooseMode(opsWf, 'safe');

// Run only 20 ticks then simulate Early End
for (let t = 0; t < 20; t++) stepWithIncidents(opsWf);
opsWf.finished = true; // Early manual end

const summaryWfEarly = operationSummary(opsWf);
check(summaryWfEarly.windowCompleted === false, 'Early end: windowCompleted is false');
check(summaryWfEarly.passed === false, 'Early end: mission cannot pass');
const flightWfEarly = { schemaVersion: 2, scoringVersion: 'orbital-v03', missionId: 'wildfire', launchResult: { success: true }, operationsSummary: summaryWfEarly };
const ratingWfEarly = rateFlight(designWf, data, evalWf, { success: true }, [], summaryWfEarly);
const earlyCanComplete = canCompleteFlight('wildfire', ratingWfEarly, 3, flightWfEarly);
check(earlyCanComplete === false, 'Early end rejected by canCompleteFlight contract');
const earlyAward = completeMission('wildfire', ratingWfEarly, 3, flightWfEarly);
check(earlyAward === false, 'Early end rejected by real completeMission API');
check(!getState().completedMissions.wildfire, 'Early end: wildfire not marked completed in state');

// Case 2: Full 120 ticks in Safe mode (no science collected)
const opsWfSafe = createOperations(designWf, data, evalWf);
chooseMode(opsWfSafe, 'safe');
while (opsWfSafe.tick < 120 && !opsWfSafe.finished) {
  stepWithIncidents(opsWfSafe);
}

const summaryWfSafe = operationSummary(opsWfSafe);
check(summaryWfSafe.windowCompleted === true, '120 ticks completed in safe mode');
check(summaryWfSafe.passed === false, '120 ticks safe mode failed objectives (no science collected)');
const flightWfSafe = { schemaVersion: 2, scoringVersion: 'orbital-v03', missionId: 'wildfire', launchResult: { success: true }, operationsSummary: summaryWfSafe };
const ratingWfSafe = rateFlight(designWf, data, evalWf, { success: true }, [], summaryWfSafe);
const safeCanComplete = canCompleteFlight('wildfire', ratingWfSafe, 3, flightWfSafe);
check(safeCanComplete === false, 'Safe mode 0-science run rejected by canCompleteFlight contract');
const safeAward = completeMission('wildfire', ratingWfSafe, 3, flightWfSafe);
check(safeAward === false, 'Failed objectives rejected by real completeMission API');
check(!getState().completedMissions.wildfire, 'Failed objectives: wildfire not marked completed in state');

// Case 3: Failed launch fixture
const failedLaunchFlight = {
  schemaVersion: 2,
  scoringVersion: 'orbital-v03',
  missionId: 'm1',
  launchResult: { success: false, reason: 'Engine anomaly at T+12s' },
  operationsSummary: summaryM1
};
const ratingLaunchFailed = rateFlight(designM1, data, evalM1, { success: false }, [], summaryM1);
const launchFailedCanComplete = canCompleteFlight('m1', ratingLaunchFailed, 3, failedLaunchFlight);
check(launchFailedCanComplete === false, 'Failed launch rejected by canCompleteFlight contract');
const launchFailedAward = completeMission('m1', ratingLaunchFailed, 3, failedLaunchFlight);
check(launchFailedAward === false, 'Failed launch rejected by completeMission (when below pass stars)');

// -------------------------------------------------------------
// A07: Saves round-trip and adversarial validation
// -------------------------------------------------------------
console.log('Testing A07: Saves round-trip and adversarial validation...');

// Save paused state at tick 60
const saveState = createOperations(designM1, data, evalM1);
while (saveState.tick < 60) {
  stepWithIncidents(saveState);
}
saveState.paused = true;

// Round-trip through JSON
const jsonState = JSON.stringify(saveState);
const restoredState = JSON.parse(jsonState);

check(restoredState.tick === 60, 'Restored tick is exactly 60');
check(restoredState.batteryWh === saveState.batteryWh, 'Restored battery matches reference');
check(restoredState.storageGb === saveState.storageGb, 'Restored storage matches reference');
check(restoredState.deliveredGb === saveState.deliveredGb, 'Restored delivered data matches reference');
check(restoredState.paused === true, 'Restored state is paused');

// Step the restored state from tick 60 to 120 and compare with uninterrupted reference
const refState = createOperations(designM1, data, evalM1);
while (refState.tick < 120 && !refState.finished) {
  stepWithIncidents(refState);
}

restoredState.paused = false;
while (restoredState.tick < 120 && !restoredState.finished) {
  stepWithIncidents(restoredState);
}

check(Math.abs(restoredState.deliveredGb - refState.deliveredGb) < 1e-6, 'Resumed flight matches uninterrupted reference delivery');
check(Math.abs(restoredState.batteryWh - refState.batteryWh) < 1e-4, 'Resumed flight matches uninterrupted reference battery');

// Adversarial 1: Reject non-finite and surface-intersecting orbits
const baseOrbit = presetOrbit('sso');
assert.throws(() => validateOrbit({ ...baseOrbit, semiMajorAxisM: 5000000 }), /periapsis/i);
assert.throws(() => validateOrbit({ ...baseOrbit, semiMajorAxisM: NaN }), /finite/i);
assert.throws(() => validateOrbit({ ...baseOrbit, eccentricity: 1.2 }), /elliptic/i);
assertions += 3;

// Adversarial 2: Atomic rejection of unaffordable propellant incident choice
saveState.fuelKg = 1.0; // Needs 3.0 kg
saveState.pendingIncident = { id: 'debris', tick: 60 };
const rejectChoice = resolveIncident(saveState, 'burn');
check(rejectChoice === false, 'Insufficient fuel choice rejected atomically');
check(saveState.fuelKg === 1.0, 'Fuel balance unchanged after rejection');
check(saveState.pendingIncident !== null, 'Pending incident preserved after rejection');

console.log(`PASS: All ${assertions} mission flow acceptance assertions passed!`);
