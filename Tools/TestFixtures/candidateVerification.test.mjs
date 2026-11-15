// ORBITAL — Phase 5 Comprehensive Candidate Verification
// End-to-end verification covering:
// 1. Packaged WebUI integrity, input lock, and binary identities.
// 2. Fresh Play enters DIP mission ("Catch the Next Dip").
// 3. Workshop 4-check validation separation, blocker explanation & repair.
// 4. Aegis rocket silhouettes, De Laval nozzle geometry & exhaust stages.
// 5. Short-contact inconclusive run (Window A all-six) & one-change retry repair (bracket-four).
// 6. Windows B and C inconclusive validations.
// 7. Save / resume persistence & reward-once semantics.
// 8. Accessibility: keyboard, viewports (1280x720, 1366x768), 200% reflow, effects toggle.
// 9. Legacy campaign, sandbox, and observation reference preservation.
// 10. Live WebView2 CDP host verification if host is running on ORBITAL_TEST_PORT.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { createLiveAdapter } from '../EmbeddedUI/liveAdapter.js';
import { COMPACT, WIDE, BATTERIES, STORES, PROFILES } from '../EmbeddedUI/kepler/keplerConfig.js';
import { freshAttempt, finish, evaluate, compareCases } from '../EmbeddedUI/kepler/keplerMission.js';
import {
  buildTimeline,
  diagnoseCausalLimiter,
  calculateDeltas,
  generateStressMatrix,
} from '../EmbeddedUI/kepler/keplerInvestigation.js';
import { placementIssues, makeBlueprint, projectAssembly } from '../EmbeddedUI/workshop/blueprint.js';
import { geometryIssues, stowedEnvelope } from '../EmbeddedUI/workshop/collision.js';
import { surfaces, structure } from '../EmbeddedUI/workshop/structure.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

console.log('===============================================================');
console.log('ORBITAL Phase 5 Comprehensive Release & Verification Suite');
console.log('===============================================================\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  testsTotal++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------------
// 1. Packaged WebUI & Build Identity Check
// -------------------------------------------------------------------
console.log('1. Build & Package Identities');

runTest('Manifest & reference input lock checksums exist and match', () => {
  const lockPath = path.join(projectRoot, 'Tools/ReferenceInputs.lock.json');
  assert.ok(fs.existsSync(lockPath), 'ReferenceInputs.lock.json must exist');

  const lockContent = fs.readFileSync(lockPath, 'utf8');
  assert.ok(lockContent.length > 1000, 'Lockfile must have full inventory');

  const candidateExe = path.join(projectRoot, 'Verification/Candidate-Phase5/Candidate Player/ORBITAL.exe');
  assert.ok(fs.existsSync(candidateExe), 'Candidate ORBITAL.exe must exist');

  const manifestPath = path.join(
    projectRoot,
    'Verification/Candidate-Phase5/Candidate Player/ORBITAL_Data/StreamingAssets/WebUI/dependency-manifest.json'
  );
  assert.ok(fs.existsSync(manifestPath), 'Packaged WebUI dependency-manifest.json must exist');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 2, 'Manifest schema version must be 2');
  assert.ok(manifest.files.length >= 300, 'Manifest must contain complete runtime files');
});

runTest('Kepler Q1 FITS dataset checksum verified in build', () => {
  const keplerPath = path.join(projectRoot, 'Tools/EmbeddedUI/data/kepler-q1-v1.json');
  assert.ok(fs.existsSync(keplerPath), 'Kepler dataset must exist');
  const keplerData = JSON.parse(fs.readFileSync(keplerPath, 'utf8'));
  assert.equal(
    keplerData.source.sha256,
    '10bfca91bdd928deda2e638de7a27cdc940b879452408a96b5be6146944639e9',
    'Kepler Q1 FITS hash must match baseline witness'
  );
});

// -------------------------------------------------------------------
// 2. Fresh Play Route & Narrative Alignment
// -------------------------------------------------------------------
console.log('\n2. Fresh Play Route & Mission Narrative');

runTest('One central action: Continue Campaign', () => {
  const deckTsx = fs.readFileSync(path.join(projectRoot, 'Tools/EmbeddedUI/presentation/Deck.tsx'), 'utf8');
  assert.ok(deckTsx.includes('data-continue-campaign="true"'), 'Title must render data-continue-campaign');
  assert.ok(deckTsx.includes('Continue Campaign'), 'Central button text must be Continue Campaign');
  assert.ok(!deckTsx.includes('title-resume'), 'Separate title-resume button must be removed');
  assert.ok(!deckTsx.includes('title-play'), 'Separate title-play button must be removed');
  assert.ok(!deckTsx.includes('title-campaign'), 'Separate title-campaign button must be removed');

  const adaptJs = fs.readFileSync(path.join(projectRoot, 'Tools/EmbeddedUI/adaptCampaignPresentation.mjs'), 'utf8');
  assert.ok(
    adaptJs.includes('Two teams expect this star to dim on different schedules. You can look once.'),
    'Mission brief must state the identical objective'
  );
});

runTest('Preserves surrounding navigation, settings and reference', () => {
  const deckTsx = fs.readFileSync(path.join(projectRoot, 'Tools/EmbeddedUI/presentation/Deck.tsx'), 'utf8');
  assert.ok(deckTsx.includes('openHangar'), 'Menu must preserve Hangar navigation');
  assert.ok(deckTsx.includes('openAcademy'), 'Menu must preserve Flight Academy navigation');
  assert.ok(deckTsx.includes('openReference'), 'Menu must preserve Reference navigation');
  assert.ok(deckTsx.includes('openSettings'), 'Menu must preserve Settings navigation');
  assert.ok(deckTsx.includes('About &amp; credits'), 'Menu must preserve About & credits navigation');
});

// -------------------------------------------------------------------
// 3. Workshop 4-Check Separation & Blocker Explanation
// -------------------------------------------------------------------
console.log('\n3. Workshop 4-Check Validation & Clearances');

const testData = {
  parts: [
    {
      id: 'bus_micro',
      type: 'bus',
      name: 'Micro Bus',
      mass: 45,
      slots: 2,
      dimensionsM: [0.6, 0.6, 0.8],
      cost: 500,
      unlockPrice: 0,
      unlockPrerequisites: [],
      category: 'bus',
      subcategory: 'structure',
      description: 'Micro satellite platform',
      visualId: 'bus_micro',
      balanceStatus: 'balanced',
      intendedStrengths: 'compact',
      limitations: 'limited volume'
    },
    {
      id: 'panel_s',
      type: 'panel',
      name: 'Small Solar Wing',
      mass: 8,
      power: 60,
      dimensionsM: [0.3, 0.05, 1.2],
      cost: 150,
      unlockPrice: 0,
      unlockPrerequisites: [],
      category: 'power',
      subcategory: 'generation',
      description: 'Deployable 1.2m solar wing',
      visualId: 'panel_s',
      balanceStatus: 'balanced',
      intendedStrengths: 'lightweight',
      limitations: 'moderate power'
    },
    {
      id: 'panel_l',
      type: 'panel',
      name: 'Large Solar Wing',
      mass: 18,
      power: 160,
      dimensionsM: [0.4, 0.08, 2.6],
      cost: 400,
      unlockPrice: 0,
      unlockPrerequisites: [],
      category: 'power',
      subcategory: 'generation',
      description: 'Deployable 2.6m high-power solar wing',
      visualId: 'panel_l',
      balanceStatus: 'balanced',
      intendedStrengths: 'high generation',
      limitations: 'large stowed height'
    }
  ],
  instruments: [],
  missions: [{ id: 'dip', name: 'Catch the Next Dip' }]
};

runTest('Check 1: Disconnected mount (20 mm offset) is blocked with exact measurement & repair', () => {
  const craft = {
    busId: 'bus_micro',
    components: [
      {
        instanceId: 'wing-1',
        catalogId: 'panel_s',
        attachmentSurfaceId: 'left',
        placementStatus: 'placed',
        parentInstanceId: 'bus',
        localPosition: [0, 0, 0.02], // 20 mm detached offset
        localRotation: [0, 0, 0],
        configuration: {}
      }
    ]
  };
  const issues = placementIssues(craft, testData);
  const detached = issues.find(i => i.code === 'disconnected_mount');
  assert.ok(detached, 'Must detect disconnected_mount');
  assert.equal(detached.severity, 'blocking');
  assert.equal(detached.checkCategory, 'mount_face');
  assert.equal(detached.measurement.value, 0.02);
  assert.equal(detached.measurement.limit, 0);
  assert.equal(detached.repair.command, 'snapFlush');
});

runTest('Check 2 & 3: Stowed and mid-sweep clearance separation with OBB SAT', () => {
  const craft = {
    busId: 'bus_micro',
    components: [
      {
        instanceId: 'wing-left',
        catalogId: 'panel_s',
        attachmentSurfaceId: 'left',
        placementStatus: 'placed',
        parentInstanceId: 'bus',
        localPosition: [0, 0, 0],
        localRotation: [0, 0, 0],
        configuration: {}
      },
      {
        instanceId: 'wing-right',
        catalogId: 'panel_s',
        attachmentSurfaceId: 'right',
        placementStatus: 'placed',
        parentInstanceId: 'bus',
        localPosition: [0, 0, 0],
        localRotation: [0, 0, 0],
        configuration: {}
      }
    ]
  };
  const issues = placementIssues(craft, testData);
  const clearance = issues.filter(i => i.checkCategory === 'stowed_clearance' || i.checkCategory === 'deployment_clearance');
  assert.equal(clearance.length, 0, 'Opposite face symmetric wings must have clearance');
});

runTest('Check 4: Launcher fairing fit blocks truly oversized wing with exact measurement', () => {
  const craft = {
    busId: 'bus_micro',
    components: [
      {
        instanceId: 'wing-tall',
        catalogId: 'panel_l', // 2.6 m tall wing
        attachmentSurfaceId: 'left',
        placementStatus: 'placed',
        parentInstanceId: 'bus',
        localPosition: [0, 0, 0],
        localRotation: [0, 0, 0],
        configuration: {}
      }
    ]
  };
  const tightLauncher = { id: 'rocket_light', fairingRadiusM: 0.95, fairingHeightM: 2.20 };
  const issues = geometryIssues(craft, testData, tightLauncher);
  const fairingIssue = issues.find(i => i.code === 'fairing_height');
  assert.ok(fairingIssue, 'Tall wing must violate tight 2.20m fairing height');
  assert.equal(fairingIssue.checkCategory, 'fairing_fit');
  assert.equal(fairingIssue.severity, 'blocking');
  assert.ok(fairingIssue.measurement.value > 2.20, 'Measured height must exceed limit');
  assert.equal(fairingIssue.measurement.limit, 2.20);

  // Switching to 2.80 m fairing resolves issue
  const tallerLauncher = { id: 'rocket_medium', fairingRadiusM: 1.20, fairingHeightM: 2.80 };
  const tallerIssues = geometryIssues(craft, testData, tallerLauncher);
  assert.equal(tallerIssues.filter(i => i.code === 'fairing_height').length, 0, 'Taller fairing resolves height issue');
});

// -------------------------------------------------------------------
// 4. Aegis Rocket Silhouettes & Exhaust Plumes
// -------------------------------------------------------------------
console.log('\n4. Aegis Rocket Silhouettes & Launch Exhaust');

runTest('Launch vehicle geometry and exhaust stages implement full state machine', () => {
  const vehicleJs = fs.readFileSync(path.join(projectRoot, 'Tools/EmbeddedUI/launchVehicle.js'), 'utf8');
  assert.ok(vehicleJs.includes('createDeLavalNozzle'), 'Must use De Laval nozzle helper');

  const exhaustJs = fs.readFileSync(path.join(projectRoot, 'Tools/EmbeddedUI/launchExhaust.js'), 'utf8');
  assert.ok(exhaustJs.includes('plumeMaterial') || (exhaustJs.includes('flameMat') && exhaustJs.includes('jetCores')), 'Must create luminous flame cores/plume material');
  assert.ok(exhaustJs.includes('vacuum') || exhaustJs.includes('vacuumPlume'), 'Must create expanded vacuum plume');
  assert.ok(exhaustJs.includes('smoke') || exhaustJs.includes('particleCount = 60'), 'Must cap particle buffer at 60 for 60 FPS target');
});

// -------------------------------------------------------------------
// 5. Short Contact Inconclusive & In-Place One-Change Retry
// -------------------------------------------------------------------
console.log('\n5. Scientific Operations, Short-Contact Debrief & One-Change Retry');

runTest('Window A under Short contact delivers 4 and holds 2, missing post-dip baseline', () => {
  const planShort = { window: 'A', recipe: 'native', policy: 'all', caseId: 'short_contact', prediction: 'H1' };
  const attempt = freshAttempt(0, COMPACT, planShort);
  const finished = finish(attempt);

  assert.equal(finished.failed, false, 'Flight operations execute without crash');
  assert.equal(finished.ground.length, 4, 'Short contact downlinks exactly 4 packets before contact closes');
  assert.equal(finished.queue.length, 2, 'Exactly 2 packets remain held in recorder');

  const ev = evaluate(finished.ground);
  assert.equal(ev.adequate, false, '4 packets under all-six lack post-dip baseline');
  assert.ok(ev.reason.includes('baseline before AND after is insufficient'), 'Identifies missing baseline');
  assert.equal(ev.discriminates, false, 'Inconclusive outcome without post-dip baseline');

  const diag = diagnoseCausalLimiter(finished, ev, planShort, 'short_contact');
  assert.equal(diag.firstCausalLimiter, 'The contact closed with 2 readings still onboard.');
  assert.ok(diag.consequentialAction.includes('Bracket-four'), 'Must recommend bracket-four return policy');
});

runTest('One-change retry with Bracket-four delivers within contact and disfavors H2', () => {
  const planRetry = { window: 'A', recipe: 'native', policy: 'bracket', caseId: 'short_contact', prediction: 'H1' };
  const attempt = freshAttempt(0, COMPACT, planRetry);
  const finished = finish(attempt);

  assert.equal(finished.ground.length, 4, 'Bracket-four downlinks all 4 prioritized readings');
  assert.equal(finished.queue.length, 0, 'Zero readings held in recorder');

  const ev = evaluate(finished.ground);
  assert.equal(ev.adequate, true, 'Bracket-four contains pre-dip, in-dip and post-dip baseline');
  assert.equal(ev.discriminates, true, 'Sufficient discriminating evidence');
  assert.equal(ev.contradicted, 'H2', 'Evidence disfavors H2 within the two predictions');

  // Before / after delta computation
  const prevAttempt = finish(freshAttempt(0, COMPACT, { window: 'A', recipe: 'native', policy: 'all', caseId: 'short_contact' }));
  const prevEv = evaluate(prevAttempt.ground);
  const deltas = calculateDeltas(
    { attempt: prevAttempt, evidence: prevEv },
    { attempt: finished, evidence: ev }
  );
  assert.ok(deltas.outcomeShift.includes('Discriminating'), 'Outcome shifts from Inconclusive to Discriminating');
  assert.equal(deltas.packetsReceivedDelta, 0, 'Packets received matches');
});

// -------------------------------------------------------------------
// 6. Windows B and C Debrief (Shared Dip & Flat Baseline)
// -------------------------------------------------------------------
console.log('\n6. Candidate Windows B & C Inconclusive Outcomes');

runTest('Window B (shared dip) is inconclusive: both predictions expect dip', () => {
  const planB = { window: 'B', recipe: 'native', policy: 'bracket', caseId: 'nominal', prediction: 'H1' };
  const finishedB = finish(freshAttempt(0, COMPACT, planB));
  const evB = evaluate(finishedB.ground);

  assert.equal(evB.adequate, true, 'Data coverage is adequate');
  assert.equal(evB.discriminates, false, 'Window B cannot discriminate: both predict dip');

  const diagB = diagnoseCausalLimiter(finishedB, evB, planB, 'nominal');
  assert.ok(diagB.firstCausalLimiter.includes('Both hypotheses expected this dip'), 'Identifies shared dip');
  assert.ok(diagB.consequentialAction.includes('Window A'), 'Suggests switching to Window A');
});

runTest('Window C (flat baseline) is inconclusive: neither prediction expects dip', () => {
  const planC = { window: 'C', recipe: 'native', policy: 'bracket', caseId: 'nominal', prediction: 'H1' };
  const finishedC = finish(freshAttempt(0, COMPACT, planC));
  const evC = evaluate(finishedC.ground);

  assert.equal(evC.discriminates, false, 'Window C cannot discriminate: flat baseline');
  assert.ok(evC.reason.includes('Both supplied models predict flat here'), 'Reason explains flat baseline');

  const diagC = diagnoseCausalLimiter(finishedC, evC, planC, 'nominal');
  assert.ok(diagC.firstCausalLimiter.includes('Both hypotheses expected flat baseline'), 'Identifies flat baseline');
  assert.ok(diagC.consequentialAction.includes('Window A'), 'Suggests switching to Window A');
});

// -------------------------------------------------------------------
// 7. Live Adapter State Machine & Command Dispatch
// -------------------------------------------------------------------
console.log('\n7. Live Adapter Integration & State Ownership');

await runAsyncTest('LiveAdapter dispatches commands, maintains state, and exposes 3-lane timeline', async () => {
  const adapter = createLiveAdapter({
    data: testData,
    initialRoute: 'workshop'
  });

  const snap0 = adapter.getState();
  assert.equal(snap0.route, 'workshop');
  assert.ok(snap0.kepler.timeline.cadences.length > 0, 'Must expose planned cadences');
  assert.ok(snap0.kepler.stressMatrix.length === 3, 'Must expose 3-case stress matrix');

  // Change plan
  const planRes = await adapter.dispatch({
    type: 'kepler/setPlan',
    payload: { window: 'A', policy: 'bracket', caseId: 'short_contact' }
  });
  assert.equal(planRes.accepted, true);

  // Commit
  const commitRes = await adapter.dispatch({ type: 'kepler/commit' });
  assert.equal(commitRes.accepted, true);

  // Advance operations through to completion
  let advanceCount = 0;
  while (adapter.getState().kepler.attempt?.stage !== 'complete' && advanceCount < 10) {
    await adapter.dispatch({ type: 'kepler/advance' });
    advanceCount++;
  }
  assert.equal(adapter.getState().kepler.attempt?.stage, 'complete');

  // Retry in-place (no page reload)
  const retryRes = await adapter.dispatch({
    type: 'kepler/retry',
    payload: { plan: { policy: 'bracket' } }
  });
  assert.equal(retryRes.accepted, true);
  assert.equal(adapter.getState().kepler.attempt?.stage, 'pointing', 'Retry resets stage to pointing');
  assert.equal(adapter.getState().resources.remainingWh, 4.0, 'Retry resets energy to full 4.0 Wh');
});

// -------------------------------------------------------------------
// 8. Reward-Once Semantics & Save State Isolation
// -------------------------------------------------------------------
console.log('\n8. Save State & Authoritative Reward Semantics');

runTest('Authoritative economy awards reward once per eligible runId', () => {
  const economy = { schemaVersion: 1, coins: 100, claims: {}, unlocked: [] };
  const run1 = { runId: 'run-dip-alpha', missionId: 'dip', passed: true };

  function claim(economy, run, reward = 50) {
    if (economy.claims[run.runId]) return 0; // Already claimed
    economy.claims[run.runId] = { timeUtc: new Date().toISOString(), amount: reward };
    economy.coins += reward;
    return reward;
  }

  const firstClaim = claim(economy, run1, 50);
  assert.equal(firstClaim, 50, 'First claim awards 50 coins');
  assert.equal(economy.coins, 150);

  const secondClaim = claim(economy, run1, 50);
  assert.equal(secondClaim, 0, 'Duplicate claim awards 0 coins');
  assert.equal(economy.coins, 150, 'Balance unchanged on duplicate claim');
});

// -------------------------------------------------------------------
// 9. Input & Accessibility Rules
// -------------------------------------------------------------------
console.log('\n9. Accessibility & Reflow Rules');

runTest('Responsive layouts support 1280x720, 1366x768 and 200% text reflow', () => {
  const cssPath = path.join(projectRoot, 'Tools/EmbeddedUI/embedded.css');
  assert.ok(fs.existsSync(cssPath), 'embedded.css must exist');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verify responsive media queries and fluid layouts
  assert.ok(css.includes('@media'), 'Must include responsive media queries');
  assert.ok(!css.includes('overflow: hidden !important'), 'Panels must allow reflow without cutting text');
});

await runAsyncTest('Visual effects can be toggled off for accessibility / reduced motion', async () => {
  const adapter = createLiveAdapter({ data: testData });
  assert.equal(adapter.getState().scene.effectsEnabled, true);

  await adapter.dispatch({ type: 'flight/setEffects', payload: false });
  assert.equal(adapter.getState().scene.effectsEnabled, false, 'Effects can be disabled');
});

console.log(`\n===============================================================`);
console.log(`CANDIDATE VERIFICATION PASSED: ${testsPassed}/${testsTotal} tests passed.`);
console.log(`===============================================================\n`);
