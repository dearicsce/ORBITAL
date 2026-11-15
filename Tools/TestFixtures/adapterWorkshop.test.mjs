import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLiveAdapter } from '../EmbeddedUI/liveAdapter.js';
import { createMockAdapter } from '../EmbeddedUI/presentation/mockAdapter.js';
import { makeBlueprint, instance } from '../EmbeddedUI/blueprint.js';
import { enrichCampaign } from '../../Docs/Prompt-Inputs/ReferenceSource/js/campaign.js';

const rawData = JSON.parse(fs.readFileSync(new URL('../../Docs/Prompt-Inputs/ReferenceSource/data/world1.json', import.meta.url)));
const data = enrichCampaign(rawData);

console.log('Running Adapter & Shared Workshop Contract Tests...\n');

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    throw err;
  }
}

// 1. LiveAdapter rejects craft with 20 mm mount offset and accepts snapFlush repair
await test('1. LiveAdapter: 20 mm mount offset is rejected and resolved by snapFlush', async () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data, 'Blocked Offset Craft');
  const wing = instance('panel_s', { surface: 'left', position: [0, 0, 0.02] }); // 20 mm offset on panel_s
  wing.instanceId = 'wing-left';
  b.assembly.components.push(wing);

  const adapter = createLiveAdapter({ data, blueprint: b, launcher: { id: 'rocket_light', fairingRadiusM: 0.95, fairingHeightM: 2.50 } });
  const state1 = adapter.getState();

  assert.equal(state1.route, 'workshop');
  assert.equal(state1.phase, 'mount-check');
  assert.equal(state1.actions.openLauncher.enabled, false, 'openLauncher must be disabled');
  assert.equal(state1.actions.saveDraft.enabled, true, 'Draft saving must remain available');
  assert.equal(state1.actions.snapFlush.enabled, true, 'snapFlush repair action must be enabled');

  const mountIssue = state1.issues.find(i => i.code === 'disconnected_mount' || i.code === 'invalid_mount');
  assert.ok(mountIssue, 'Must report disconnected_mount issue');
  assert.equal(mountIssue.measurement?.value, 0.02, 'Measurement must report 0.02 m value');
  assert.equal(mountIssue.repair?.command, 'snapFlush', 'Repair must specify snapFlush');

  // Attempting to proceed to launcher must be blocked
  const launchAttempt = await adapter.dispatch({ type: 'openLauncher' });
  assert.equal(launchAttempt.accepted, false, 'openLauncher must be rejected');
  assert.equal(launchAttempt.reasonCode, mountIssue.code);

  // Executing snapFlush repair
  const repairResult = await adapter.dispatch({ type: 'snapFlush' });
  assert.equal(repairResult.accepted, true, 'snapFlush must succeed');

  const state2 = adapter.getState();
  assert.equal(state2.issues.length, 0, 'Issues must be resolved after snapFlush');
  assert.equal(state2.actions.openLauncher.enabled, true, 'openLauncher must now be enabled');

  // Proceed to launcher succeeds
  const launchProceed = await adapter.dispatch({ type: 'openLauncher' });
  assert.equal(launchProceed.accepted, true, 'openLauncher must succeed on valid craft');
  assert.equal(adapter.getState().route, 'launcher');
});

// 2. LiveAdapter rejects craft exceeding fairing height and accepts taller fairing
await test('2. LiveAdapter: Wing physically too tall for fairing is blocked and fixed by taller launcher', async () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data, 'Tall Craft');
  const tallWing = instance('panel_l', { surface: 'left', position: [0, 0.20, 0] }); // 2.2m wing length
  tallWing.instanceId = 'wing-tall';
  b.assembly.components.push(tallWing);

  // Tight fairing: 2.0 m height limit
  const tightLauncher = { id: 'rocket_light', fairingRadiusM: 0.95, fairingHeightM: 2.00 };
  const adapter = createLiveAdapter({ data, blueprint: b, launcher: tightLauncher });

  const state1 = adapter.getState();
  assert.equal(state1.phase, 'stowed-fit');
  assert.equal(state1.actions.openLauncher.enabled, false);

  const fitIssue = state1.issues.find(i => i.code === 'fairing_height');
  assert.ok(fitIssue, 'Must report fairing_height issue');
  assert.ok(fitIssue.measurement?.value > 2.00, 'Measured height must exceed 2.00 m');
  assert.equal(fitIssue.measurement?.limit, 2.00, 'Limit must be 2.00 m');

  // Select wider and taller launcher (1.5 m fairing radius, 3.0 m fairing height)
  const tallerLauncher = { id: 'rocket_heavy', fairingRadiusM: 1.50, fairingHeightM: 3.00 };
  const changeLauncher = await adapter.dispatch({ type: 'setLauncher', payload: { launcher: tallerLauncher } });
  assert.equal(changeLauncher.accepted, true);

  const state2 = adapter.getState();
  assert.equal(state2.issues.filter(i => i.code === 'fairing_height').length, 0, 'Height issue resolved');
  assert.equal(state2.actions.openLauncher.enabled, true, 'openLauncher enabled with taller fairing');
});

// 3. MockAdapter: friend UI test contract
await test('3. MockAdapter: offline fixture progression from blockedMount to validCraft', async () => {
  const mock = createMockAdapter('blockedMount');
  const initial = mock.getState();

  assert.equal(initial.phase, 'mount-check');
  assert.equal(initial.actions.openLauncher.enabled, false);
  assert.equal(initial.actions.snapFlush.enabled, true);

  // Dispatch snapFlush
  const fixResult = await mock.dispatch({ type: 'snapFlush' });
  assert.equal(fixResult.accepted, true);

  const fixed = mock.getState();
  assert.equal(fixed.phase, 'ready');
  assert.equal(fixed.issues.length, 0);
  assert.equal(fixed.actions.openLauncher.enabled, true);

  // Dispatch openLauncher
  const openResult = await mock.dispatch({ type: 'openLauncher' });
  assert.equal(openResult.accepted, true);
  assert.equal(mock.getState().route, 'launcher');
});

console.log('\nALL ADAPTER TESTS PASSED!');
