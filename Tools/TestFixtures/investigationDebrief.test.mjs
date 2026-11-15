// ORBITAL - Catch the Next Dip: Investigation, Timeline & Debrief Tests
// Validates Phase 4: 3-lane aligned timeline, causal limiter, stress matrix, and deltas

import assert from "node:assert/strict";
import { COMPACT, WIDE } from "../EmbeddedUI/kepler/keplerConfig.js";
import { freshAttempt, finish, evaluate } from "../EmbeddedUI/kepler/keplerMission.js";
import {
  buildTimeline,
  diagnoseCausalLimiter,
  calculateDeltas,
  generateStressMatrix,
} from "../EmbeddedUI/kepler/keplerInvestigation.js";

console.log("Running Investigation, Timeline & Debrief Tests...\n");

// --- 1. ALIGNED 3-LANE TIMELINE & STATUSES ---
console.log("  1. 3-lane aligned timeline with explicit statuses and spoiler boundary");
const nativePlan = {
  window: "A",
  recipe: "native",
  policy: "bracket",
  caseId: "nominal",
};
const aCompact = finish(freshAttempt(1, COMPACT, nativePlan));
const timelineCompact = buildTimeline(aCompact, nativePlan, "nominal");

assert.equal(timelineCompact.windowId, "A");
assert.equal(timelineCompact.summary.receivedCount, 4);

// Check bracket-four omitted endpoints
const cadence175 = timelineCompact.cadences.find((c) => c.id === 175);
assert.ok(cadence175);
assert.equal(cadence175.planned.status, "planned");
assert.equal(cadence175.recorded.status, "omitted_policy");
assert.equal(cadence175.received.status, "omitted_policy");
assert.equal(cadence175.received.flux, null);

// Check received cadences
const cadence174 = timelineCompact.cadences.find((c) => c.id === 174);
assert.ok(cadence174);
assert.equal(cadence174.planned.status, "planned");
assert.equal(cadence174.recorded.status, "recorded_onboard");
assert.equal(cadence174.received.status, "received_earth");
assert.ok(cadence174.received.flux !== null);
assert.ok(Math.abs(cadence174.received.flux - 1.0) < 0.05);

// Check wide twelve excluded cadence 173 (flag 128)
const widePlan = { ...nativePlan, recipe: "wide", policy: "aggregate" };
const aWide = finish(freshAttempt(2, WIDE, widePlan));
const timelineWide = buildTimeline(aWide, widePlan, "nominal");
const cadence173 = timelineWide.cadences.find((c) => c.id === 173);
assert.ok(cadence173);
assert.equal(cadence173.planned.status, "planned");
assert.equal(cadence173.recorded.status, "excluded_quality");
assert.ok(cadence173.recorded.reason.includes("Flag 128"));
assert.equal(cadence173.received.status, "dropped_curation");
assert.equal(cadence173.received.flux, null); // Never revealed

// Check short contact held readings & strict spoiler boundary
const shortPlan = { ...nativePlan, policy: "all", caseId: "short" };
const aShort = finish(freshAttempt(3, COMPACT, shortPlan));
const timelineShort = buildTimeline(aShort, shortPlan, "short");
assert.equal(timelineShort.summary.receivedCount, 4);
assert.equal(timelineShort.summary.heldCount, 2);

const heldCadences = timelineShort.cadences.filter(
  (c) => c.received.status === "held_onboard"
);
assert.equal(heldCadences.length, 2);
heldCadences.forEach((c) => {
  assert.equal(c.received.flux, null); // STRICT SPOILER BOUNDARY: flux is null
  assert.ok(c.received.reason.includes("closed with reading still onboard"));
});
console.log("    ✓ 3-lane timeline, omitted_policy, flag 128 exclusion, and held spoiler boundaries verified");

// --- 2. CAUSAL LIMITER DIAGNOSIS ---
console.log("  2. First causal limiter and downstream consequence diagnoses");
// A. Short contact all-six held readings
const diagShort = diagnoseCausalLimiter(
  aShort,
  evaluate(aShort.ground),
  shortPlan,
  "short"
);
assert.ok(diagShort.firstCausalLimiter.includes("closed with 2 readings still onboard"));
assert.ok(diagShort.downstreamConsequence.includes("post-dip baseline packet remained"));
assert.ok(diagShort.consequentialAction.includes("Bracket-four"));

// B. Window B shared dip
const aB = finish(freshAttempt(4, COMPACT, { ...nativePlan, window: "B" }));
const diagB = diagnoseCausalLimiter(aB, evaluate(aB.ground), { ...nativePlan, window: "B" });
assert.ok(diagB.firstCausalLimiter.includes("Both hypotheses expected this dip"));
assert.ok(diagB.downstreamConsequence.includes("both H1 and H2 predict it"));
assert.ok(diagB.consequentialAction.includes("Candidate Window A"));

// C. Timing sensitivity (+1h) compact native
const aTimingCompact = finish(freshAttempt(5, COMPACT, { ...nativePlan, caseId: "timing" }));
const diagTiming = diagnoseCausalLimiter(
  aTimingCompact,
  evaluate(aTimingCompact.ground),
  { ...nativePlan, caseId: "timing" },
  "timing"
);
assert.ok(diagTiming.firstCausalLimiter.includes("Recording started too late"));
assert.ok(diagTiming.consequentialAction.includes("Wide twelve"));

// D. Nominal A bracket-four (success)
const diagSuccess = diagnoseCausalLimiter(
  aCompact,
  evaluate(aCompact.ground),
  nativePlan,
  "nominal"
);
assert.ok(diagSuccess.firstCausalLimiter.includes("None"));
assert.ok(diagSuccess.downstreamConsequence.includes("H2"));
console.log("    ✓ Causal limiters accurately diagnose short contact, shared dip, timing offset, and success");

// --- 3. BEFORE / AFTER DELTAS ---
console.log("  3. Before / after deltas between mission attempts");
const runBefore = {
  attempt: aShort,
  evidence: evaluate(aShort.ground),
};
const aShortBracket = finish(freshAttempt(6, COMPACT, { ...nativePlan, caseId: "short" }));
const runAfter = {
  attempt: aShortBracket,
  evidence: evaluate(aShortBracket.ground),
};

const deltas = calculateDeltas(runBefore, runAfter);
assert.equal(deltas.packetsReceivedDelta, 0); // Both received 4 packets
assert.equal(deltas.evidenceChanged, true);
assert.ok(deltas.outcomeShift.includes("Inconclusive → Discriminating (H2 Disfavored)"));
console.log("    ✓ Deltas accurately report outcome shift: 'Inconclusive → Discriminating (H2 Disfavored)'");

// --- 4. 3-CASE STRESS MATRIX ---
console.log("  4. 3-case stress comparison matrix across nominal, timing, short");
const matrixCompact = generateStressMatrix(COMPACT, nativePlan);
assert.equal(matrixCompact.length, 3);
assert.equal(matrixCompact[0].caseId, "nominal");
assert.equal(matrixCompact[0].discriminates, true);
assert.equal(matrixCompact[1].caseId, "timing");
assert.equal(matrixCompact[1].discriminates, false); // Fails timing context
assert.equal(matrixCompact[2].caseId, "short");
assert.equal(matrixCompact[2].discriminates, true); // Bracket-four survives short contact!

const matrixWide = generateStressMatrix(WIDE, widePlan);
assert.equal(matrixWide.length, 3);
assert.equal(matrixWide[0].discriminates, true);
assert.equal(matrixWide[1].discriminates, true); // Wide survives timing context!
assert.equal(matrixWide[2].discriminates, true); // Wide survives short contact!
console.log("    ✓ Compact succeeds nominally and in short contact; Wide survives all 3 cases");

console.log("\nALL INVESTIGATION & DEBRIEF TESTS PASSED!");
