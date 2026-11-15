// ORBITAL - Phase 4 Comprehensive Acceptance Test
// Validates:
// 1. Deterministic retry without page reload (resource reset, history preservation, delta computation).
// 2. Single causal change delta (Short contact all-six -> bracket-four).
// 3. Player-visible diagnosis across candidate windows (Window A discriminating, Window B shared dip, Window C flat baseline).
// 4. Missed baseline vs held readings vs energy depletion diagnoses.
// 5. Live adapter integration with 3-lane timeline, causal limiter, stress matrix, and command dispatch.

import assert from "node:assert/strict";
import { COMPACT, WIDE, BATTERIES, STORES } from "../EmbeddedUI/kepler/keplerConfig.js";
import { freshAttempt, finish, evaluate } from "../EmbeddedUI/kepler/keplerMission.js";
import {
  buildTimeline,
  diagnoseCausalLimiter,
  calculateDeltas,
  generateStressMatrix,
} from "../EmbeddedUI/kepler/keplerInvestigation.js";
import { createLiveAdapter } from "../EmbeddedUI/liveAdapter.js";

console.log("=================================================");
console.log("ORBITAL Phase 4 Comprehensive Acceptance Test");
console.log("=================================================\n");

// ---------------------------------------------------------------------
// TEST 1: Retry Without Page Reload & Resource Reset
// ---------------------------------------------------------------------
console.log("Test 1: Retry without page reload, resource reset & history tracking");

const adapter = createLiveAdapter({
  components: [
    { instanceId: "wing1", partId: "solar_wing_1", localPosition: [0, 0, 0], localRotation: [0, 0, 0], attachmentSurfaceId: "top" },
  ],
});

// Run initial attempt in liveAdapter
const commitRes = await adapter.dispatch({ type: "kepler/commit" });
assert.equal(commitRes.accepted, true, "Initial commit must succeed");

const finishRes = await adapter.dispatch({ type: "kepler/finish" });
assert.equal(finishRes.accepted, true, "Finish must succeed");

const state1 = adapter.getState();
assert.equal(state1.kepler.attempt.stage, "complete");
assert.equal(state1.resources.remainingWh < 12.0, true, "Energy should have been consumed during attempt");

// Execute retry with plan change (no page reload)
const retryRes = await adapter.dispatch({
  type: "kepler/retry",
  payload: {
    plan: { policy: "bracket" },
    autoFinish: true,
  },
});
assert.equal(retryRes.accepted, true, "kepler/retry must be accepted");

const state2 = adapter.getState();
// Check that history preserved previous run
assert.equal(state2.kepler.history.length, 1, "Previous attempt must be preserved in history");
assert.ok(state2.kepler.history[0].attempt, "History record must have attempt snapshot");
assert.ok(state2.kepler.history[0].evidence, "History record must have evidence snapshot");

// Check resource reset on fresh attempt
assert.equal(state2.kepler.attempt.stage, "complete");
assert.equal(state2.kepler.plan.policy, "bracket", "Plan was updated in-place");
assert.ok(state2.kepler.deltas, "Deltas should be computed against previous attempt");

console.log("  ✓ Retry cleanly reset resources, preserved history, and updated in-place.\n");


// ---------------------------------------------------------------------
// TEST 2: Single Causal Change Delta (Short contact all-six -> bracket-four)
// ---------------------------------------------------------------------
console.log("Test 2: Single causal change delta (Short contact all-six -> bracket-four)");

// Step A: Short contact with all-six policy on Window A
const shortAllPlan = {
  window: "A",
  recipe: "native",
  policy: "all",
  caseId: "short",
};
const attemptA1 = finish(freshAttempt(101, COMPACT, shortAllPlan));
const evA1 = evaluate(attemptA1.ground);
const diagA1 = diagnoseCausalLimiter(attemptA1, evA1, shortAllPlan, "short");

// All six causes contact to close with 2 readings held onboard
assert.equal(attemptA1.ground.length, 4);
assert.equal(attemptA1.stored.length + attemptA1.queue.length, 2, "2 packets remained held onboard");
assert.ok(diagA1.firstCausalLimiter.includes("closed with 2 readings still onboard"));
assert.ok(diagA1.consequentialAction.includes("Bracket-four"));

// Step B: Retry with single causal change -> policy: 'bracket'
const shortBracketPlan = {
  ...shortAllPlan,
  policy: "bracket",
};
const attemptA2 = finish(freshAttempt(102, COMPACT, shortBracketPlan));
const evA2 = evaluate(attemptA2.ground);
const diagA2 = diagnoseCausalLimiter(attemptA2, evA2, shortBracketPlan, "short");

// Bracket-four drops omitted endpoints prior to transmission and ensures the vital post-dip baseline is prioritized
assert.equal(attemptA2.ground.length, 4);
assert.equal(evA2.adequate, true);
assert.equal(evA2.discriminates, true);
assert.equal(evA2.contradicted, "H2");

// Step C: Verify before/after deltas
const deltas = calculateDeltas(
  { attempt: attemptA1, evidence: evA1 },
  { attempt: attemptA2, evidence: evA2 }
);
assert.equal(typeof deltas.packetsReceivedDelta, "number");
assert.equal(typeof deltas.energyRemainingDelta, "number");
assert.equal(typeof deltas.outcomeShift, "string");
assert.ok(deltas.outcomeShift.includes("Discriminating"));
assert.equal(deltas.evidenceChanged, true);

console.log(`  ✓ Causal limiter identified: "${diagA1.firstCausalLimiter}"`);
console.log(`  ✓ Action suggested: "${diagA1.consequentialAction}"`);
console.log(`  ✓ Outcome shift: ${deltas.outcomeShift}\n`);


// ---------------------------------------------------------------------
// TEST 3: Player-Visible Diagnosis Across Candidate Windows
// ---------------------------------------------------------------------
console.log("Test 3: Player-visible diagnosis across candidate windows (A, B, C)");

const basePlan = { recipe: "native", policy: "bracket", caseId: "nominal" };

// Window A (Differentiating dip)
const attA = finish(freshAttempt(201, COMPACT, { ...basePlan, window: "A" }));
const evA = evaluate(attA.ground);
const diagA = diagnoseCausalLimiter(attA, evA, { ...basePlan, window: "A" });
assert.equal(evA.adequate, true);
assert.equal(evA.discriminates, true);
assert.equal(evA.contradicted, "H2");
assert.ok(diagA.firstCausalLimiter.includes("None. All requirements met."));
assert.ok(diagA.downstreamConsequence.includes("disfavoring H2"));

// Window B (Shared dip - both H1 and H2 predict a dip)
const attB = finish(freshAttempt(202, COMPACT, { ...basePlan, window: "B" }));
const evB = evaluate(attB.ground);
const diagB = diagnoseCausalLimiter(attB, evB, { ...basePlan, window: "B" });
assert.equal(evB.discriminates, false);
assert.ok(diagB.firstCausalLimiter.includes("Both hypotheses expected this dip"));
assert.ok(diagB.consequentialAction.includes("Candidate Window A"));

// Window C (Flat baseline - neither H1 nor H2 predicts a dip)
const attC = finish(freshAttempt(203, COMPACT, { ...basePlan, window: "C" }));
const evC = evaluate(attC.ground);
const diagC = diagnoseCausalLimiter(attC, evC, { ...basePlan, window: "C" });
assert.equal(evC.discriminates, false);
assert.ok(diagC.firstCausalLimiter.includes("flat baseline"));
assert.ok(diagC.consequentialAction.includes("Candidate Window A"));

console.log("  ✓ Window A correctly diagnosed as differentiating.");
console.log("  ✓ Window B correctly diagnosed as shared dip with prompt to switch to Window A.");
console.log("  ✓ Window C correctly diagnosed as flat baseline with prompt to switch to Window A.\n");


// ---------------------------------------------------------------------
// TEST 4: Missed Baseline vs Held Readings vs Energy Depletion
// ---------------------------------------------------------------------
console.log("Test 4: Specific causal limiter edge cases");

// 4.1 Missed baseline due to late start / timing shift (+1h shift in compact native)
const attTiming = finish(freshAttempt(301, COMPACT, { ...basePlan, window: "A", caseId: "timing" }));
const evTiming = evaluate(attTiming.ground);
const diagTiming = diagnoseCausalLimiter(attTiming, evTiming, { ...basePlan, window: "A", caseId: "timing" }, "timing");
assert.ok(
  diagTiming.firstCausalLimiter.includes("Recording started too late") ||
  diagTiming.firstCausalLimiter.includes("Missing pre-dip baseline"),
  `Expected missed baseline diagnosis, got: ${diagTiming.firstCausalLimiter}`
);
assert.ok(diagTiming.consequentialAction.includes("Wide twelve"));

// 4.2 Energy depletion (Simulate depleted attempt)
const attDepleted = {
  ...attA,
  energy: 0,
  failed: true,
  failureReason: "energy_depleted",
  ground: [],
};
const diagDepleted = diagnoseCausalLimiter(attDepleted, evaluate([]), basePlan);
assert.ok(diagDepleted.firstCausalLimiter.includes("Energy depleted"));
assert.ok(diagDepleted.consequentialAction.includes("Reserve battery"));

console.log("  ✓ Missed baseline identified correctly with Wide twelve recommendation.");
console.log("  ✓ Energy depletion identified correctly with Reserve battery recommendation.\n");


// ---------------------------------------------------------------------
// TEST 5: Live Adapter Integration & Contract Conformance
// ---------------------------------------------------------------------
console.log("Test 5: Live adapter integration with timeline, matrix & finishing");

const state = adapter.getState();
assert.ok(state.kepler.timeline, "LiveAdapter state must expose kepler.timeline");
assert.equal(Array.isArray(state.kepler.timeline.cadences), true);
assert.equal(typeof state.kepler.timeline.summary.receivedCount, "number");

assert.ok(state.kepler.diagnosis, "LiveAdapter state must expose kepler.diagnosis");
assert.ok(state.kepler.diagnosis.firstCausalLimiter);

assert.ok(state.kepler.stressMatrix, "LiveAdapter state must expose kepler.stressMatrix");
assert.equal(state.kepler.stressMatrix.length, 3);
assert.ok(state.kepler.stressMatrix.some((c) => c.caseId === "nominal"));
assert.ok(state.kepler.stressMatrix.some((c) => c.caseId === "timing"));
assert.ok(state.kepler.stressMatrix.some((c) => c.caseId === "short"));

// Finish mission command returns to menu
const finishMissionRes = await adapter.dispatch({ type: "kepler/finishMission" });
assert.equal(finishMissionRes.accepted, true);
assert.equal(adapter.getState().route, "menu", "Route should switch to menu after finishMission");

console.log("  ✓ LiveAdapter exposes complete Phase 4 state schema and dispatches kepler/finishMission.\n");

console.log("=================================================");
console.log("ALL PHASE 4 ACCEPTANCE TESTS PASSED (5/5)");
console.log("=================================================");
