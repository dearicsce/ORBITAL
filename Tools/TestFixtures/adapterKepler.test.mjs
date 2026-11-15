// ORBITAL - Catch the Next Dip: Live Adapter Kepler Integration Tests

import assert from "node:assert/strict";
import { createLiveAdapter } from "../EmbeddedUI/liveAdapter.js";
import { makeBlueprint } from "../EmbeddedUI/workshop/blueprint.js";

function closeTo(actual, expected, precision = 4) {
  const diff = Math.abs(actual - expected);
  const tolerance = Math.pow(10, -precision);
  assert.ok(
    diff <= tolerance,
    `Expected ${actual} to be close to ${expected} (tol ${tolerance}, diff ${diff})`
  );
}

console.log("Running Live Adapter Kepler Integration Tests...\n");

const adapter = createLiveAdapter({
  missionId: "dip",
  data: {
    missions: [{ id: "dip", name: "Catch the Next Dip" }],
    parts: [
      { id: "bus_micro", type: "bus", slots: 1, mass: 40, cost: 4 },
      { id: "panel_s", type: "panel", mass: 8, powerGen: 60, cost: 1.5 },
      { id: "battery_s", type: "battery", mass: 5, capacityWh: 100, cost: 1 },
      { id: "computer_basic", type: "computer", mass: 2, powerDraw: 5, cost: 1 },
    ],
    difficulty: { normal: { budgetMultiplier: 1.0 } },
  },
});

// 1. Initial State exposes Kepler schema
console.log("  1. State exposes Kepler manifest, windows, hypotheses, and preview");
const s0 = adapter.getState();
assert.equal(s0.kepler.manifestId, "kepler-q1-v1");
assert.equal(s0.kepler.datasetChecksum, "10bfca91bdd928deda2e638de7a27cdc940b879452408a96b5be6146944639e9");
assert.equal(s0.kepler.windows.length, 3);
assert.equal(s0.kepler.windows[0].id, "A");
assert.equal(s0.kepler.windows[1].id, "B");
assert.equal(s0.kepler.windows[2].id, "C");
assert.ok(s0.kepler.narrative.includes("Two teams expect this star to dim"));
assert.equal(s0.kepler.preview.energy, 3.3);
assert.equal(s0.kepler.preview.rawCount, 6);
assert.equal(s0.kepler.preview.issues.length, 0);
console.log("    ✓ State contains full Kepler narrative, candidate windows, and preview");

// 2. Setting Plan and Prediction
console.log("  2. Dispatches kepler/setPlan and updates preview");
await adapter.dispatch({
  type: "kepler/setPlan",
  payload: { window: "A", recipe: "native", policy: "bracket", caseId: "nominal", prediction: "H1" },
});
const s1 = adapter.getState();
assert.equal(s1.kepler.plan.prediction, "H1");
assert.equal(s1.kepler.plan.window, "A");
console.log("    ✓ kepler/setPlan updated window to A and recorded prediction H1");

// 3. Step-by-step operations advance
console.log("  3. Step-by-step operations advance (pointing -> capture -> filter -> aggregate -> prepare -> downlink)");
await adapter.dispatch({ type: "kepler/commit" });
let snap = adapter.getState();
assert.equal(snap.kepler.attempt.stage, "pointing");
assert.equal(snap.kepler.attempt.energy, 4.0);

// Advance pointing -> capture (costs 0.5 Wh)
await adapter.dispatch({ type: "kepler/advance" });
snap = adapter.getState();
assert.equal(snap.kepler.attempt.stage, "capture");
assert.equal(snap.kepler.attempt.energy, 3.5);

// Advance capture -> filter (costs 6 * 0.3 = 1.8 Wh)
await adapter.dispatch({ type: "kepler/advance" });
snap = adapter.getState();
assert.equal(snap.kepler.attempt.stage, "filter");
assert.equal(snap.kepler.attempt.storedCount, 6);
closeTo(snap.kepler.attempt.energy, 1.7);

// Advance filter -> aggregate
await adapter.dispatch({ type: "kepler/advance" });
snap = adapter.getState();
assert.equal(snap.kepler.attempt.stage, "aggregate");

// Advance aggregate -> prepare
await adapter.dispatch({ type: "kepler/advance" });
snap = adapter.getState();
assert.equal(snap.kepler.attempt.stage, "prepare");

// Advance prepare -> downlink (bracket-four prepares 4 packets)
await adapter.dispatch({ type: "kepler/advance" });
snap = adapter.getState();
assert.equal(snap.kepler.attempt.stage, "downlink");
assert.equal(snap.kepler.attempt.queueCount, 4);

// Advance downlink -> complete (costs 1.0 Wh)
await adapter.dispatch({ type: "kepler/advance" });
snap = adapter.getState();
assert.equal(snap.kepler.attempt.stage, "complete");
assert.equal(snap.kepler.attempt.ground.length, 4);
closeTo(snap.kepler.attempt.energy, 0.7);

// Evidence evaluated from Earth receipts
assert.equal(snap.kepler.evidence.adequate, true);
assert.equal(snap.kepler.evidence.discriminates, true);
assert.equal(snap.kepler.evidence.contradicted, "H2");
assert.deepEqual(
  snap.kepler.attempt.ground.flatMap((p) => p.members.map((m) => m.id)),
  [174, 176, 177, 179]
);
console.log("    ✓ All 6 stages advanced with atomic energy debits; receipts evaluate to 'H2 disfavored'");

// 4. One-change retry without reload
console.log("  4. One-change retry preserves modified choice with reset resources");
await adapter.dispatch({
  type: "kepler/setPlan",
  payload: { window: "B" }, // Switch to Window B to see shared dip
});
await adapter.dispatch({ type: "kepler/retry" });
const sRetry = adapter.getState();
assert.equal(sRetry.kepler.attempt.stage, "pointing");
assert.equal(sRetry.kepler.attempt.energy, 4.0); // Reset to 4.0 Wh
assert.equal(sRetry.kepler.attempt.ground.length, 0); // No ground packets yet
assert.equal(sRetry.kepler.plan.window, "B"); // Preserved user's window change!

// Fast-forward finish on Window B
await adapter.dispatch({ type: "kepler/finish" });
const sFinishedB = adapter.getState();
assert.equal(sFinishedB.kepler.attempt.stage, "complete");
assert.equal(sFinishedB.kepler.evidence.adequate, true);
assert.equal(sFinishedB.kepler.evidence.discriminates, false); // Shared dip cannot discriminate
console.log("    ✓ Retry preserved window B, reset energy to 4.0 Wh, and finished as inconclusive");

console.log("\nALL LIVE ADAPTER KEPLER TESTS PASSED!");
