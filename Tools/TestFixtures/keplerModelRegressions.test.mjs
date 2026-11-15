// ORBITAL - Catch the Next Dip: Model & Witness Regression Tests
// Validates the ported Kepler local model against Catch-the-Next-Dip tests/model.test.ts

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  ANCHOR,
  PERIOD,
  COMPACT,
  WIDE,
  WINDOWS,
  designStats,
} from "../EmbeddedUI/kepler/keplerConfig.js";
import {
  source,
  rows,
  MEDIAN,
  metadata,
  archivedNeighborhood,
} from "../EmbeddedUI/kepler/keplerSource.js";
import {
  predictsDip,
  predictionAt,
  disagreementOverlap,
} from "../EmbeddedUI/kepler/keplerPredictions.js";
import {
  selectSpan,
  preview,
  freshAttempt,
  packetize,
  advance,
  finish,
  evaluate,
  compareCases,
} from "../EmbeddedUI/kepler/keplerMission.js";
import { mapOrbitalToKepler } from "../EmbeddedUI/kepler/keplerMapping.js";

function closeTo(actual, expected, precision = 4) {
  const diff = Math.abs(actual - expected);
  const tolerance = Math.pow(10, -precision);
  assert.ok(
    diff <= tolerance,
    `Expected ${actual} to be close to ${expected} (tol ${tolerance}, diff ${diff})`
  );
}

console.log("Running Catch the Next Dip Local Model Regression Tests...\n");

const nativePlan = {
  window: "A",
  recipe: "native",
  policy: "bracket",
  caseId: "nominal",
};
const widePlan = { ...nativePlan, recipe: "wide", policy: "aggregate" };

// --- 1. ARCHIVE WITNESSES & FITS INTEGRITY ---
console.log("  1. Archive witnesses & FITS metadata integrity");
for (const center of [132.645758508, 137.586985262]) {
  assert.equal(predictionAt(center, "H1"), "dip");
  assert.equal(predictionAt(center, "H2"), "dip");
  const neighborhood = archivedNeighborhood(center);
  assert.ok(neighborhood.some((r) => r.flux / MEDIAN < 0.997));
  assert.ok(neighborhood.some((r) => r.time < center && r.flux / MEDIAN > 0.999));
  assert.ok(neighborhood.some((r) => r.time > center && r.flux / MEDIAN > 0.999));
}

// Dev FITS hash and metadata verification
const fitsPath = "Docs/Prompt-Inputs/Catch-the-Next-Dip/data/kplr011446443-2009166043257_llc.fits";
const rawFits = readFileSync(fitsPath);
assert.equal(rawFits.length, 192960);
assert.equal(
  createHash("sha256").update(rawFits).digest("hex"),
  "10bfca91bdd928deda2e638de7a27cdc940b879452408a96b5be6146944639e9"
);
assert.equal(rows.length, 1639);
assert.equal(rows.filter((r) => r.time !== null && r.flux !== null).length, 1624);
assert.equal(rows.filter((r) => r.quality !== 0).length, 229);
assert.equal(metadata.filter((r) => r.finitePair && r.quality === 0).length, 1410);
assert.equal(MEDIAN, 403696.25);
assert.ok(source.units.time.includes("TDB"));
console.log("    ✓ Archive witnesses and FITS checksum 10bfca91... match exactly");

// --- 2. COMPACT BRACKET-FOUR NOMINAL WITNESS ---
console.log("  2. Compact bracket-four nominal witness at 3.3 Wh");
const pCompact = preview(COMPACT, nativePlan);
assert.deepEqual(pCompact.selected.map((r) => r.id), [174, 175, 176, 177, 178, 179]);
assert.equal(pCompact.rawCount, 6);
closeTo(pCompact.energy, 3.3);

const aCompact = finish(freshAttempt(1, COMPACT, nativePlan));
assert.deepEqual(
  aCompact.ground.flatMap((p) => p.members.map((m) => m.id)),
  [174, 176, 177, 179]
);
[1.000032, 0.986116, 0.987209, 1.00001].forEach((f, i) =>
  closeTo(aCompact.ground[i].flux, f, 4)
);
closeTo(aCompact.energy, 0.7);
const evCompact = evaluate(aCompact.ground);
assert.equal(evCompact.contradicted, "H2");
assert.equal(evCompact.adequate, true);
assert.equal(evCompact.discriminates, true);
console.log("    ✓ Returned [174, 176, 177, 179], 3.3 Wh debit, disfavors H2");

// --- 3. WIDE STRATEGY & EXCLUDED CADENCE CHARGE ---
console.log("  3. Wide twelve with 2/4/4/2 bins and flag 128 charge");
const pWide = preview(WIDE, widePlan);
assert.deepEqual(
  pWide.selected.map((r) => r.id),
  [170, 171, 172, 174, 175, 176, 177, 178, 179, 180, 181, 182]
);
assert.equal(pWide.rawCount, 13);
closeTo(pWide.energy, 6.0);

const aWide = finish(freshAttempt(2, WIDE, widePlan));
assert.deepEqual(aWide.excluded, [
  {
    id: 173,
    quality: 128,
    reason: "Excluded by quality-zero curation policy",
  },
]);
assert.deepEqual(
  aWide.ground.map((p) => p.members.map((m) => m.id)),
  [
    [170, 171],
    [172, 174, 175, 176],
    [177, 178, 179, 180],
    [181, 182],
  ]
);
[1.000007, 0.995253, 0.996173, 0.999987].forEach((f, i) =>
  closeTo(aWide.ground[i].flux, f, 4)
);
closeTo(aWide.energy, 0.5);
assert.equal(evaluate(aWide.ground).discriminates, true);
aWide.ground.forEach((p) => {
  assert.ok(new TextEncoder().encode(JSON.stringify(p)).length <= 1024);
});
console.log("    ✓ Retains all members in 4 bins, charged row 173 flag 128, size <= 1024 B");

// --- 4. SEPARATE OPERATIONS & INCONCLUSIVE GATES ---
console.log("  4. Separate operations and scientific evidence gates");
// Window B (shared dip)
const aWindowB = finish(
  freshAttempt(1, COMPACT, { ...nativePlan, window: "B", policy: "all" })
);
assert.equal(aWindowB.failed, false);
const evB = evaluate(aWindowB.ground);
assert.equal(evB.adequate, true);
assert.equal(evB.discriminates, false);
assert.ok(evB.reason.includes("both"));

// Window C (baseline only)
const aWindowC = finish(freshAttempt(1, COMPACT, { ...nativePlan, window: "C" }));
assert.equal(aWindowC.failed, false);
const evC = evaluate(aWindowC.ground);
assert.equal(evC.contradicted, null);
assert.ok(evC.reason.includes("Both") || evC.reason.includes("both"));

// Missing baseline / corrupted intervals
assert.equal(evaluate(aCompact.ground.slice(1)).discriminates, false);
assert.equal(evaluate([aCompact.ground[1]]).adequate, false);
assert.equal(
  evaluate([
    { ...aCompact.ground[0], members: [{ id: 174, t: aCompact.ground[0].time, q: 128 }] },
    ...aCompact.ground.slice(1),
  ]).adequate,
  false
);
console.log("    ✓ Window B and C remain inconclusive; corrupted/missing baseline rejected");

// --- 5. NAMED STRESS CASES ---
console.log("  5. Named cases: nominal, timing sensitivity (+1h), short contact");
const compactCases = compareCases(COMPACT, nativePlan);
const wideCases = compareCases(WIDE, widePlan);
assert.deepEqual(
  compactCases.map((c) => c.evidence.discriminates),
  [true, false, true]
);
assert.equal(compactCases[1].attempt.failed, false);
assert.deepEqual(
  wideCases.map((c) => c.evidence.discriminates),
  [true, true, true]
);
assert.equal(wideCases[1].preview.rawCount, 14);
closeTo(wideCases[1].preview.energy, 6.3);

// Minus hour spans seven records overflowing 6 slots
const sMinus = selectSpan(135.116371885 - 1 / 24, 6);
assert.equal(sMinus.rawCount, 7);
assert.ok(sMinus.acquired.some((r) => r.quality !== 0));
console.log("    ✓ Compact fails timing context; Wide survives all 3 cases");

// --- 6. ATOMIC OVERFLOW & DOWNLINK RETENTION ---
console.log("  6. Atomic stage failure & short contact downlink queue");
// Infeasible capture fails atomically
const aInfeasible = advance(freshAttempt(1, COMPACT, widePlan));
const bInfeasible = advance(aInfeasible);
assert.equal(bInfeasible.failed, true);
assert.deepEqual(bInfeasible.stored, []);
assert.equal(bInfeasible.energy, aInfeasible.energy);
assert.ok(bInfeasible.ledger[bInfeasible.ledger.length - 1].message.includes("13 raw slots"));

// Short contact holds 2 packets in queue
const planAll = { ...nativePlan, policy: "all" };
let nominalAtt = freshAttempt(1, COMPACT, planAll);
let shortAtt = freshAttempt(2, COMPACT, { ...planAll, caseId: "short" });
for (let i = 0; i < 5; i++) {
  nominalAtt = advance(nominalAtt);
  shortAtt = advance(shortAtt);
}
assert.deepEqual(nominalAtt.queue, shortAtt.queue);
assert.deepEqual(nominalAtt.ground, []);
assert.deepEqual(shortAtt.ground, []);

const aNominal = advance(nominalAtt);
const bShort = advance(shortAtt);
assert.equal(aNominal.ground.length, 6);
assert.equal(bShort.ground.length, 4);
assert.equal(bShort.queue.length, 2);
closeTo(bShort.energy, aNominal.energy);
assert.equal(evaluate(bShort.ground).discriminates, false);
console.log("    ✓ Infeasible fails atomically; Short contact delivers 4 and holds 2");

// --- 7. ACCIDENTAL SPOILER BOUNDARY ---
console.log("  7. Accidental spoiler boundary (no flux exposed in preview or state)");
assert.equal(predictionAt(135.116371885, "H1"), "dip");
assert.equal(predictionAt(135.116371885, "H2"), "flat");
const previewText = JSON.stringify(preview(COMPACT, nativePlan));
assert.ok(!/flux|error|normalized/i.test(previewText));
console.log("    ✓ Preview JSON contains zero flux/error data (no spoilers)");

// --- 8. ORBITAL HARDWARE MAPPING ---
console.log("  8. ORBITAL craft hardware mapping & separate simulation values");
const mockOrbitalCraft = {
  massKg: 185.5,
  costMillions: 28.5,
  batteryWh: 300,
  launcherId: "kestrel",
  parts: [
    { id: "bus_small" },
    { id: "battery_m" },
    { id: "computer_basic" },
    { id: "panel_s" },
  ],
};
const mapped = mapOrbitalToKepler(mockOrbitalCraft);
assert.equal(mapped.design.battery, "compact");
assert.equal(mapped.design.store, "compact");
assert.equal(mapped.design.processor, "native");
assert.equal(mapped.design.profile, "snapshot");
assert.equal(mapped.realValues.totalMassKg, 185.5);
assert.equal(mapped.realValues.budgetMillionsUSD, 28.5);
assert.equal(mapped.teachingValues.payloadMassKg, 3.5);
assert.equal(mapped.teachingValues.credits, 5);
assert.ok(mapped.accessProfile.documentation.includes("heliocentric drift"));
console.log("    ✓ Clean mapping between ORBITAL items and teaching kit; values kept separate");

console.log("\nALL 8 KEPLER LOCAL MODEL REGRESSION TESTS PASSED!");
