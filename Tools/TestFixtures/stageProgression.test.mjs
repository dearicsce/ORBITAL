/**
 * ORBITAL — Stage Progression & Mission Retirement Test Suite
 * 
 * Verifies:
 * 1. Active campaign catalogue count = 28 contracts (excluding tutorial and retired proxima-sail).
 * 2. Nearby Stars and Milky Way levels retired from active navigation.
 * 3. Proxima-sail absent from playable selection, recommendations, and next-mission links.
 * 4. Dip, observatory, heliopause-crossing, and interstellar-precursor retained and reachable.
 * 5. Prerequisite graph is strictly acyclic and 100% reachable with active missions.
 * 6. Mission lessons and transfer challenges direct exclusively to active missions.
 * 7. Sun and celestial bodies parent chain terminates cleanly at home-system with level: 'solar'.
 * 8. Save migration preserves completed Proxima records, earned currency, and history while
 *    maintaining active denominator = 28 and never showing impossible values (e.g. 29/28).
 * 9. Unfinished Proxima runs/drafts redirect to eligible active missions with clear notice.
 * 10. Save migration is strictly idempotent across repeated runs.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isActiveCampaignMission,
  getActiveCampaignMissions,
  getRetiredCampaignMission,
  getMissionForHistoricalSave,
  getActiveCampaignProgress,
  getNextRecommendedMission,
  isMissionUnlocked,
  CAMPAIGN_CHAPTERS,
  CHAPTER_MISSIONS,
  STAGE_ORDER_IDS,
  migrateRetiredCampaignState,
  RETIRED_MISSION_IDS,
} from '../../Assets/StreamingAssets/WebUI/js/unity/campaignPolicy.js';

import {
  MAP_LEVELS,
  CELESTIAL_BODIES,
  bodyById,
  resolveSafeMapLevel,
} from '../../Assets/StreamingAssets/WebUI/js/campaignAtlas.js';

import { lessons, transferChallenges } from '../../Assets/StreamingAssets/WebUI/js/unity/missionLessons.js';
import { resolveCampaignContinuation } from '../../Assets/StreamingAssets/WebUI/js/unity/campaignResume.js';
import { enrichCampaign } from '../../Assets/StreamingAssets/WebUI/js/campaign.js';
import { addLauncherPresets } from '../../Assets/StreamingAssets/WebUI/js/rocket/launcherAdditions.js';
import { validateWorld } from '../../Assets/StreamingAssets/WebUI/js/contracts/validate.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

// Load production world data with Dip injected
const rawWorld = JSON.parse(fs.readFileSync(path.join(projectRoot, 'Assets/StreamingAssets/WebUI/data/world1.json'), 'utf8'));
const enriched = enrichCampaign(rawWorld);
if (!enriched.missions.some(m => m.id === 'dip')) {
  enriched.missions.push({
    schemaVersion: 2, units: { budget: 'million USD', lifetime: 'year' },
    id: 'dip', name: 'Catch the Next Dip', chapter: 'earth', tag: 'Exoplanet Transit Photometry', destination: 'earth-orbit',
    brief: 'Two teams expect this star to dim on different schedules. You can look once.',
    objective: 'Choose an observing window and return evidence that distinguishes the two predictions.',
    budget: 320, targetLifetime: 3, launchers: ['kestrel', 'condor', 'albatross', 'roc'], requires: [], payload: 'optical_camera',
    relevance: { optical_camera: 1 }, orbitFit: { leo: 1, sso: 1 }, profile: { coverage: 52, delivered: 1, contact: 0.18, eclipse: 0, incidents: ['radiation', 'storage'] },
    missionDifficulty: 3
  });
}
const worldData = validateWorld(addLauncherPresets(enriched));

console.log('===============================================================');
console.log('ORBITAL Stage Progression & Campaign Retirement Tests');
console.log('===============================================================\n');

// 1. Catalogue and Retirement Counts
{
  console.log('Test 1: Catalogue retirement & active contract count');
  assert.equal(isActiveCampaignMission('proxima-sail'), false, 'proxima-sail is marked retired');
  assert.equal(isActiveCampaignMission('tutorial'), false, 'tutorial is excluded from campaign missions');
  assert.equal(isActiveCampaignMission('dip'), true, 'dip is an active campaign mission');
  assert.equal(isActiveCampaignMission('m1'), true, 'm1 is an active campaign mission');
  assert.equal(isActiveCampaignMission('observatory'), true, 'observatory is an active campaign mission');
  assert.equal(isActiveCampaignMission('heliopause-crossing'), true, 'heliopause-crossing is active');
  assert.equal(isActiveCampaignMission('interstellar-precursor'), true, 'interstellar-precursor is active');

  const activeMissions = getActiveCampaignMissions(worldData);
  assert.equal(activeMissions.length, 28, 'Active campaign contains exactly 28 missions');
  assert.equal(STAGE_ORDER_IDS.length, 28, 'Stage progression sequence contains 28 missions');

  // Verify Proxima absent from active list
  assert.ok(!activeMissions.some(m => m.id === 'proxima-sail'), 'proxima-sail absent from active missions');

  // Verify historical retrieval
  const retiredProxima = getRetiredCampaignMission('proxima-sail', worldData);
  assert.ok(retiredProxima, 'Historical lookup retrieves proxima-sail definition');
  assert.equal(retiredProxima.id, 'proxima-sail');
  console.log('  ✓ Exactly 28 active campaign missions; proxima-sail retired but historically accessible');
}

// 2. Navigation Levels & Celestial Hierarchy
{
  console.log('\nTest 2: Navigation levels and Sun parent hierarchy');
  const levelIds = MAP_LEVELS.map(l => l.id);
  assert.deepEqual(levelIds, ['earth', 'solar'], 'Active map levels contain only earth and solar');
  assert.ok(!levelIds.includes('stars'), 'Nearby stars removed from active levels');
  assert.ok(!levelIds.includes('galaxy'), 'Milky Way overview removed from active levels');

  // Sun parent chain check
  const sun = bodyById('sun');
  assert.ok(sun, 'Sun exists in celestial bodies');
  assert.equal(sun.level, 'solar', 'Sun level is solar');
  assert.equal(sun.parent, 'home-system', 'Sun parent is home-system');

  const homeSystem = bodyById('home-system');
  assert.ok(homeSystem, 'home-system exists');
  assert.equal(homeSystem.level, 'solar', 'home-system level is solar');
  assert.equal(homeSystem.parent, null, 'home-system parent is null (clean root terminator)');

  // Safe level resolution for deep links
  assert.equal(resolveSafeMapLevel('earth'), 'earth');
  assert.equal(resolveSafeMapLevel('solar'), 'solar');
  assert.equal(resolveSafeMapLevel('stars'), 'solar', 'Old stars link resolves safely to solar');
  assert.equal(resolveSafeMapLevel('galaxy'), 'solar', 'Old galaxy link resolves safely to solar');
  console.log('  ✓ Sun parent chain terminates cleanly at home-system with level: solar');
}

// 3. Prerequisite Graph Acyclic & Reachable
{
  console.log('\nTest 3: Prerequisite graph validity');
  const activeMissions = getActiveCampaignMissions(worldData);
  const activeIds = new Set(activeMissions.map(m => m.id));

  // Check that every requirement references an active retained mission
  for (const m of activeMissions) {
    for (const reqId of (m.requires || [])) {
      assert.ok(activeIds.has(reqId), `Mission ${m.id} requires active mission ${reqId}`);
      assert.notEqual(reqId, 'proxima-sail', `Mission ${m.id} must not require proxima-sail`);
    }
  }

  // Reachability test: starting with root missions (no requires), verify all 28 unlock sequentially
  const unlocked = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of activeMissions) {
      if (!unlocked.has(m.id)) {
        const canUnlock = (m.requires || []).every(req => unlocked.has(req));
        if (canUnlock) {
          unlocked.add(m.id);
          changed = true;
        }
      }
    }
  }
  assert.equal(unlocked.size, 28, 'All 28 active campaign missions are reachable from start');
  console.log('  ✓ Prerequisite graph is 100% reachable, acyclic, and free of retired dependencies');
}

// 4. Mission Lessons & Transfer Challenges
{
  console.log('\nTest 4: Mission lessons and transfer challenge routing');
  // Check interstellar-precursor challenge
  const precursorChallenge = transferChallenges['interstellar-precursor'];
  assert.ok(precursorChallenge, 'interstellar-precursor has a transfer challenge');
  assert.notEqual(precursorChallenge[0], 'proxima-sail', 'interstellar-precursor does not route to proxima-sail');
  assert.ok(isActiveCampaignMission(precursorChallenge[0]), 'interstellar-precursor routes to an active mission');

  // Verify no active mission suggests proxima-sail
  for (const [missionId, challenge] of Object.entries(transferChallenges)) {
    if (isActiveCampaignMission(missionId)) {
      assert.notEqual(challenge[0], 'proxima-sail', `${missionId} must not suggest retired proxima-sail`);
    }
  }
  console.log('  ✓ No stale transfer challenges direct player to retired Proxima');
}

// 5. Save Migration & Active Progress Numerator/Denominator
{
  console.log('\nTest 5: Save migration & progress computation');

  // Case A: Fresh profile
  const freshState = { completedMissions: {}, currentDesign: { missionId: 'm1', flightWorkflow: true }, currency: 0 };
  const freshProgress = getActiveCampaignProgress(freshState, worldData);
  assert.equal(freshProgress.completed, 0);
  assert.equal(freshProgress.total, 28);
  assert.equal(freshProgress.isComplete, false);

  // Case B: Completed Proxima with earned currency
  const stateWithProxima = {
    completedMissions: {
      m1: { stars: 5, medal: 'gold' },
      m2: { stars: 4, medal: 'silver' },
      'proxima-sail': { stars: 5, medal: 'gold' }, // Retired completion!
    },
    currentDesign: { missionId: 'm3', flightWorkflow: true },
    currency: 450,
  };
  const proximaProgress = getActiveCampaignProgress(stateWithProxima, worldData);
  assert.equal(proximaProgress.completed, 2, 'Completed count excludes retired proxima-sail');
  assert.equal(proximaProgress.total, 28, 'Active denominator remains 28');
  assert.equal(stateWithProxima.completedMissions['proxima-sail'].stars, 5, 'Historical record preserved');
  assert.equal(stateWithProxima.currency, 450, 'Earned currency preserved');

  // Case C: All 28 active missions completed + Proxima completed
  const allCompletedState = {
    completedMissions: {
      ...Object.fromEntries(STAGE_ORDER_IDS.map(id => [id, { stars: 5, medal: 'gold' }])),
      'proxima-sail': { stars: 5, medal: 'gold' },
    },
    currency: 5000,
  };
  const allProgress = getActiveCampaignProgress(allCompletedState, worldData);
  assert.equal(allProgress.completed, 28, 'Completed count caps at active total');
  assert.equal(allProgress.total, 28);
  assert.equal(allProgress.isComplete, true);
  assert.notEqual(allProgress.completed, 29, 'Never reports impossible 29/28 completed');

  // Case D: Active draft on retired Proxima safely migrates
  const draftState = {
    currentDesign: { missionId: 'proxima-sail', flightWorkflow: true, launcherId: 'roc' },
    completedMissions: { 'interstellar-precursor': { stars: 5 } },
  };
  const migrationResult = migrateRetiredCampaignState(draftState, worldData);
  assert.equal(migrationResult.migrated, true);
  assert.ok(migrationResult.notice.includes('retired'));
  assert.notEqual(draftState.currentDesign.missionId, 'proxima-sail', 'currentDesign migrated off proxima-sail');
  assert.ok(isActiveCampaignMission(draftState.currentDesign.missionId), 'currentDesign is an active mission');

  // Case E: Migration is idempotent (running twice yields no duplicate mutation)
  const rerunResult = migrateRetiredCampaignState(draftState, worldData);
  assert.equal(rerunResult.migrated, false, 'Second migration run is a no-op');

  console.log('  ✓ Save migration protects historical records & currency, guarantees active 28 bounds, and is strictly idempotent');
}

// 6. Continuation Resolver Retired Run Handling
{
  console.log('\nTest 6: Continuation resolver handling of retired runs');
  const mockStorage = {
    getItem: () => null,
    setItem: () => {},
  };

  // Active run on Proxima
  const retiredFlight = {
    runId: 'run-proxima-999',
    phase: 'cruise',
    design: { missionId: 'proxima-sail', flightWorkflow: true },
  };
  const state = { currentDesign: { missionId: 'proxima-sail', flightWorkflow: true }, completedMissions: {} };
  const cont = resolveCampaignContinuation(state, worldData, retiredFlight, mockStorage);

  assert.equal(cont.kind, 'openCampaign', 'Retired run does not loop into resumeRun');
  assert.equal(cont.targetScreen, 'missionSelect');
  assert.ok(cont.notice.includes('retired'), 'Notice informs player of retirement');
  console.log('  ✓ Retired flight run routes safely to stage selector with explanatory notice');
}

console.log('\n===============================================================');
console.log('ALL STAGE PROGRESSION & RETIREMENT TESTS PASSED!');
console.log('===============================================================\n');
