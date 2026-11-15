import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeBlueprint, instance, placementIssues, copy, validateAssembly, projectAssembly, panelItems } from '../EmbeddedUI/blueprint.js';
import { geometryIssues, stowedEnvelope, componentOBBs, testOBBOBB } from '../EmbeddedUI/collision.js';
import { structure, surfaces } from '../EmbeddedUI/structure.js';

const data = JSON.parse(fs.readFileSync(new URL('../../Docs/Prompt-Inputs/ReferenceSource/data/world1.json', import.meta.url)));

// Ensure launchers have fairing dimensions
const fairingDims = { kestrel: [1.5, 3.8], condor: [2.0, 5.5], albatross: [2.4, 6.5], roc: [3.0, 8.0] };
for (const l of data.launchers) {
  const d = fairingDims[l.id] || [2.0, 5.0];
  l.fairingRadiusM = d[0];
  l.fairingHeightM = d[1];
}

console.log('Running Workshop and Fairing Fit Regression Tests...');
let passedCount = 0;
function test(name, fn) {
  try {
    fn();
    passedCount++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    throw err;
  }
}

// 1. Valid single wing
test('1. Valid single wing on micro bus', () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data);
  const w1 = instance('panel_m', { surface: 'right', position: [0, 0, 0] });
  b.assembly.components.push(w1);
  const issues = placementIssues(b.assembly, data);
  assert.equal(issues.length, 0, 'Single centered medium wing must have no placement issues');
});

// 2. Two opposite-face installed wings whose true sweeps fit
test('2. Two opposite-face installed wings whose true sweeps fit', () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data);
  const w1 = instance('panel_m', { surface: 'left', position: [0, 0, 0] });
  const w2 = instance('panel_m', { surface: 'right', position: [0, 0, 0] });
  b.assembly.components.push(w1, w2);
  const issues = placementIssues(b.assembly, data);
  assert.equal(issues.length, 0, 'Opposite-face wings must have no clearance issues');
});

// 3. Valid widely spaced same-face or adjacent installations where the model allows them
test('3. Valid widely spaced same-face installations on bus_large', () => {
  const b = makeBlueprint({ busId: 'bus_large' }, data);
  const w1 = instance('panel_m', { surface: 'front', position: [-0.5, 0, 0] });
  const w2 = instance('panel_m', { surface: 'front', position: [0.5, 0, 0] });
  b.assembly.components.push(w1, w2);
  const issues = placementIssues(b.assembly, data);
  assert.equal(issues.length, 0, 'Widely spaced wings (1.0m horizontal separation) on large bus front face must pass');
});

// 4. Detached mount
test('4. Detached mount is blocked and provides repair action', () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data);
  const w1 = instance('panel_m', { surface: 'left', position: [0, 0, 0.02] }); // 20mm offset
  b.assembly.components.push(w1);
  const issues = placementIssues(b.assembly, data);
  assert.ok(issues.length > 0, 'Detached mount must produce an error');
  const detached = issues.find(i => i.code === 'disconnected_mount' || i.message.includes('disconnected'));
  assert.ok(detached, 'Must detect disconnected mount');
  assert.equal(detached.repair?.command, 'snapFlush', 'Must offer snapFlush repair');
  assert.equal(detached.measurement?.value, 0.02, 'Must record exact measured offset');
});

// 5. Off-face placement
test('5. Off-face placement extending beyond surface boundary is blocked', () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data);
  // bus_micro front size is [0.86, 1.1]. Half-width is 0.43. Panel span is 0.18 (half-span 0.09).
  // Position u = 0.40 -> 0.40 + 0.09 = 0.49 > 0.43 -> off-face!
  const w1 = instance('panel_m', { surface: 'front', position: [0.40, 0, 0] });
  b.assembly.components.push(w1);
  const issues = placementIssues(b.assembly, data);
  const offFace = issues.find(i => i.code === 'mount_off_face' || i.message.includes('extends beyond the surface'));
  assert.ok(offFace, 'Must block off-face mounting extending beyond boundary');
});

// 6. Overlapping mounts
test('6. Overlapping mounts on the same face are blocked', () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data);
  const w1 = instance('panel_m', { surface: 'left', position: [0, 0, 0] });
  const w2 = instance('panel_m', { surface: 'left', position: [0, 0.05, 0] }); // Only 5 cm separation
  b.assembly.components.push(w1, w2);
  const issues = placementIssues(b.assembly, data);
  assert.ok(issues.some(i => i.message.includes('overlaps another mounting') || i.message.includes('envelopes intersect')),
    'Overlapping mounts on same face must be rejected');
});

// 7. Wings clear at endpoints but crossing mid-sweep
test('7. Wings clear at endpoints but crossing mid-sweep are blocked', () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data);
  // w1 and w2 clear at fold=0 (deployed) and fold=1 (stowed), but cross during deployment sweep
  const w1 = instance('panel_m', { surface: 'front', position: [-0.2, -0.2, 0], rotation: [0, 45, 0] });
  const w2 = instance('panel_m', { surface: 'front', position: [0.2, 0, 0], rotation: [0, 180, 0] });
  b.assembly.components.push(w1, w2);
  const issues = geometryIssues(b.assembly, data);
  const crossing = issues.find(i => i.code === 'deployment_clearance' || i.message.includes('deployment sweep path'));
  assert.ok(crossing, 'Mid-sweep crossing collision must be detected');
});

// 8. Symmetric placement and rotation
test('8. Symmetric placement and rotation on opposite faces passes', () => {
  const b = makeBlueprint({ busId: 'bus_small' }, data);
  const w1 = instance('panel_m', { surface: 'left', position: [0, 0.1, 0], rotation: [0, 0, 0] });
  const w2 = instance('panel_m', { surface: 'right', position: [0, 0.1, 0], rotation: [0, 0, 0] });
  b.assembly.components.push(w1, w2);
  const issues = placementIssues(b.assembly, data);
  assert.equal(issues.length, 0, 'Symmetric opposite placement must pass cleanly');
});

// 9. Deployed spans wider than fairing with both folded wings fitting
test('9. Deployed span wider than fairing with folded wings fitting', () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data);
  const w1 = instance('panel_m', { surface: 'left', position: [0, 0, 0] });
  const w2 = instance('panel_m', { surface: 'right', position: [0, 0, 0] });
  b.assembly.components.push(w1, w2);

  // Kestrel fairing: radius 1.5m (diameter 3.0m), height 3.8m
  const kestrel = data.launchers.find(l => l.id === 'kestrel');
  const env = stowedEnvelope(b.assembly, data);
  assert.ok(env.radiusM <= kestrel.fairingRadiusM, `Stowed radius ${env.radiusM.toFixed(2)}m must fit in 1.5m fairing radius`);
  assert.ok(env.heightM <= kestrel.fairingHeightM, `Stowed height ${env.heightM.toFixed(2)}m must fit in 3.8m fairing height`);

  // Deployed span is bus width (0.86) + 2 * (stand 0.39 + wingLength 1.65) = 4.94m
  const deployedSpan = 0.86 + 2 * (1.65 * 0.19 + 0.08 + 1.65);
  assert.ok(deployedSpan > kestrel.fairingRadiusM * 2, 'Deployed span (4.94m) is wider than fairing diameter (3.0m)');

  const issues = geometryIssues(b.assembly, data, kestrel);
  assert.equal(issues.length, 0, 'Stowed payload must pass fairing check in Kestrel');
});

// 10. One wing physically too tall for a tight fairing
test('10. One wing physically too tall for a tight fairing is blocked with exact measurement', () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data);
  const w1 = instance('panel_m', { surface: 'left', position: [0, 0, 0] });
  b.assembly.components.push(w1);

  // Tight fairing: height 2.0m, radius 1.5m
  const tightFairing = { id: 'tight', fairingRadiusM: 1.5, fairingHeightM: 2.0 };
  const issues = geometryIssues(b.assembly, data, tightFairing);
  const heightIssue = issues.find(i => i.code === 'fairing_height');
  assert.ok(heightIssue, 'Must flag fairing_height error');
  assert.equal(heightIssue.measurement.value, 2.2, 'Measured stowed height must be 2.20 m');
  assert.equal(heightIssue.measurement.limit, 2.0, 'Limit must be 2.00 m');
});

// 11. Wider/taller fairing fixes the issue
test('11. Wider/taller fairing fixes the height issue', () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data);
  const w1 = instance('panel_m', { surface: 'left', position: [0, 0, 0] });
  b.assembly.components.push(w1);

  // Adequate fairing: height 3.8m, radius 1.5m
  const kestrel = data.launchers.find(l => l.id === 'kestrel');
  const issues = geometryIssues(b.assembly, data, kestrel);
  assert.equal(issues.length, 0, 'Kestrel 3.8m fairing must cleanly fit the 2.2m stowed craft');
});

// 12. Resource calculations: legacy paired panels vs individual wings
test('12. Expected resource values for individual wings vs paired panels', () => {
  const b = makeBlueprint({ busId: 'bus_micro' }, data);
  const w1 = instance('panel_m', { surface: 'left', position: [0, 0, 0] });
  const w2 = instance('panel_m', { surface: 'right', position: [0, 0, 0] });
  b.assembly.components.push(w1, w2);

  const design = { busId: 'bus_micro', assembly: b.assembly };
  const items = panelItems(design, data);
  assert.equal(items.length, 2, 'Two wings installed');
  const pDef = data.parts.find(p => p.id === 'panel_m');
  assert.equal(items[0].power, pDef.power / 2, 'Each individual wing provides half the legacy paired panel rating');
  assert.equal(items[0].mass, pDef.mass / 2, 'Each individual wing weighs half the legacy paired panel mass');
});

console.log(`ALL ${passedCount} WORKSHOP REGRESSION TESTS PASSED!`);
