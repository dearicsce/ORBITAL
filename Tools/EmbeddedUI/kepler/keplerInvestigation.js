// ORBITAL - Catch the Next Dip: Investigation, Timeline & Debrief Engine
// Phase 4: Aligned 3-lane timeline, causal limiter diagnosis, stress cases, and 1-change retry.

import {
  ANCHOR,
  PERIOD,
  WINDOWS,
  BATTERIES,
  STORES,
  CASES,
  COSTS,
} from "./keplerConfig.js";
import { rows, cleanRow, MEDIAN } from "./keplerSource.js";
import {
  preview,
  freshAttempt,
  finish,
  evaluate,
  advance,
} from "./keplerMission.js";

/**
 * Builds the 3-lane aligned timeline for an attempt.
 * Lanes:
 *  1. "Could see / planned"
 *  2. "Recorded onboard"
 *  3. "Received on Earth"
 *
 * Explicit statuses:
 *  - 'outside_recipe'
 *  - 'excluded_quality'
 *  - 'omitted_policy'
 *  - 'held_onboard'
 *  - 'received_earth'
 *
 * STRICT SPOILER BOUNDARY: Flux is strictly null for unrevealed/held records!
 */
export function buildTimeline(attempt, plan, caseId = "nominal") {
  const key = caseId === 'short_contact' ? 'short' : caseId === 'timing_sensitivity' ? 'timing' : (caseId || plan.caseId || 'nominal');
  const contract = CASES[key] || CASES.nominal;
  const windowDef = WINDOWS.find((w) => w.id === (plan.window || "A"));
  const center = windowDef.center + contract.offsetHours / 24;

  // Gather neighborhood cadences centered around this observation window
  // Range: +/- 0.16 BKJD (~ 8 cadences on each side)
  const neighborhood = rows.filter(
    (r) => r.time !== null && Math.abs(r.time - center) <= 0.16
  );

  const check = preview(attempt.design, { ...plan, caseId: contract.id });
  const rawFirst = check.first;
  const rawLast = check.last;

  const groundPackets = attempt.ground || [];
  const queuePackets = attempt.queue || [];
  const groundMemberIds = new Set(
    groundPackets.flatMap((p) => p.members.map((m) => m.id))
  );
  const queueMemberIds = new Set(
    queuePackets.flatMap((p) => p.members.map((m) => m.id))
  );
  const excludedMap = new Map((attempt.excluded || []).map((e) => [e.id, e]));

  // Build cadence entries
  const cadences = neighborhood.map((r) => {
    const isWithinRecipe = r.id >= rawFirst && r.id <= rawLast;
    const isExcluded = excludedMap.has(r.id);
    const isClean = cleanRow(r);
    const isReceived = groundMemberIds.has(r.id);
    const isHeld = queueMemberIds.has(r.id);

    // 1. Lane 1: Could see / planned
    const plannedLane = {
      status: isWithinRecipe ? "planned" : "outside_recipe",
      label: isWithinRecipe ? "Within Planned Span" : "Outside Recipe Center",
      supportMin: r.time - 0.0102,
      supportMax: r.time + 0.0102,
    };

    // 2. Lane 2: Recorded onboard
    let onboardStatus = "not_acquired";
    let onboardReason = "Cadence was not acquired by camera.";
    let packetId = null;

    if (isWithinRecipe) {
      if (isExcluded) {
        onboardStatus = "excluded_quality";
        const ex = excludedMap.get(r.id);
        onboardReason =
          ex.quality !== 0
            ? `Excluded by quality-zero curation policy (Flag ${ex.quality})`
            : "Nonfinite time or flux";
      } else if (isReceived || isHeld) {
        onboardStatus = "recorded_onboard";
        onboardReason = "Curated and packaged into 1 KiB science packet.";
        const pkt = [...groundPackets, ...queuePackets].find((p) =>
          p.members.some((m) => m.id === r.id)
        );
        packetId = pkt?.id || null;
      } else {
        onboardStatus = "omitted_policy";
        onboardReason =
          "Omitted by return policy (e.g. Bracket-four drops endpoints to conserve downlink).";
      }
    }

    const recordedLane = {
      status: onboardStatus,
      reason: onboardReason,
      packetId,
      quality: r.quality,
    };

    // 3. Lane 3: Received on Earth
    let earthStatus = "not_transmitted";
    let earthReason = "Record was not received on Earth.";
    let receivedFlux = null;
    let receivedError = null;
    let packetRef = null;

    if (isReceived) {
      earthStatus = "received_earth";
      earthReason = "Successfully downlinked and confirmed on Earth.";
      packetRef = groundPackets.find((p) =>
        p.members.some((m) => m.id === r.id)
      );
      // Measured brightness is ONLY visible for verified Earth receipts!
      receivedFlux = packetRef ? packetRef.flux : r.flux / MEDIAN;
      receivedError = packetRef ? packetRef.error : (r.error ? r.error / MEDIAN : null);
    } else if (isHeld) {
      earthStatus = "held_onboard";
      earthReason = `Contact capacity (${contract.capacity} packets) closed with reading still onboard.`;
      // STRICT SPOILER BOUNDARY: Never display measured flux for held packets!
      receivedFlux = null;
      receivedError = null;
    } else if (onboardStatus === "excluded_quality") {
      earthStatus = "dropped_curation";
      earthReason = recordedLane.reason;
    } else if (onboardStatus === "omitted_policy") {
      earthStatus = "omitted_policy";
      earthReason = recordedLane.reason;
    } else {
      earthStatus = "outside_recipe";
      earthReason = "Not in planned observation span.";
    }

    const receivedLane = {
      status: earthStatus,
      reason: earthReason,
      flux: receivedFlux,
      error: receivedError,
      packet: packetRef
        ? {
            id: packetRef.id,
            kind: packetRef.kind,
            time: packetRef.time,
            min: packetRef.min,
            max: packetRef.max,
            uncertainty: packetRef.uncertainty,
            memberIds: packetRef.members.map((m) => m.id),
          }
        : null,
    };

    return {
      id: r.id,
      time: r.time,
      planned: plannedLane,
      recorded: recordedLane,
      received: receivedLane,
    };
  });

  return {
    windowId: plan.window,
    caseId: contract.id,
    centerTimeBkjd: center,
    cadences,
    summary: {
      plannedCount: check.rawCount,
      cleanCount: attempt.stored.length + groundMemberIds.size + queueMemberIds.size,
      excludedCount: attempt.excluded.length,
      receivedCount: groundPackets.length,
      heldCount: queuePackets.length,
    },
  };
}

/**
 * Diagnoses the first causal limiter and its direct downstream consequence.
 */
export function diagnoseCausalLimiter(attempt, evidence, plan, caseId = "nominal") {
  const key = caseId === 'short_contact' ? 'short' : caseId === 'timing_sensitivity' ? 'timing' : (caseId || plan.caseId || 'nominal');
  const contract = CASES[key] || CASES.nominal;
  const issues = attempt.ledger.filter((l) => l.status === "failed");

  // 1. Engineering / stage failure
  if (attempt.failed || issues.length > 0 || (attempt.energy !== undefined && attempt.energy <= 0)) {
    const firstFail = issues.length > 0 ? issues[0] : null;
    if (firstFail?.stage === "pointing" || attempt.energy <= 0 || attempt.failureReason === "energy_depleted") {
      return {
        firstCausalLimiter: "Energy depleted or battery reserve insufficient for operations.",
        downstreamConsequence: "Spacecraft lost power before telemetry and observations could complete.",
        consequentialAction: "Install Reserve battery (6.5 Wh) before flight.",
        fixCommand: { type: "kepler/setDesign", payload: { battery: "reserve" } },
      };
    }
    if (firstFail?.stage === "capture") {
      const msg = String(firstFail.message || "");
      if (msg.toLowerCase().includes("span") || msg.toLowerCase().includes("long-look")) {
        return {
          firstCausalLimiter: "Capture cadence span exceeds profile allowance.",
          downstreamConsequence: "Snapshot profile permits up to 8 cadences; this recipe spans more cadences across the observation window.",
          consequentialAction: "Upgrade to Long-look profile (Albatross launcher) or select Native six recipe.",
          fixCommand: { type: "kepler/setDesign", payload: { profile: "long", launcherId: "albatross" } },
        };
      }
      return {
        firstCausalLimiter: "Raw cadence slot overflow before curation filtering.",
        downstreamConsequence: "Storage capacity exceeded; acquisition aborted atomically with no energy debited.",
        consequentialAction: "Install Extended storage (14 slots) or switch to Native six recipe.",
        fixCommand: { type: "kepler/setDesign", payload: { store: "extended" } },
      };
    }
    if (firstFail?.stage === "aggregate") {
      return {
        firstCausalLimiter: "Wide twelve aggregation processor missing.",
        downstreamConsequence: "Raw data cannot be grouped into 2/4/4/2 bins without aggregation processor.",
        consequentialAction: "Install Aggregation-capable processor.",
        fixCommand: { type: "kepler/setDesign", payload: { processor: "aggregation" } },
      };
    }
    if (firstFail) {
      return {
        firstCausalLimiter: `Stage failure at ${firstFail.stage}: ${firstFail.message || "Failed"}`,
        downstreamConsequence: "Mission could not complete data processing.",
        consequentialAction: "Review power and storage requirements.",
        fixCommand: null,
      };
    }
    return {
      firstCausalLimiter: "Spacecraft subsystems halted due to operational failure.",
      downstreamConsequence: "Mission aborted prior to complete downlink.",
      consequentialAction: "Install Reserve battery (6.5 Wh) before flight.",
      fixCommand: { type: "kepler/setDesign", payload: { battery: "reserve" } },
    };
  }

  // 2. Downlink queue held readings (Short contact or native all-six)
  if (attempt.queue.length > 0) {
    return {
      firstCausalLimiter: `The contact closed with ${attempt.queue.length} readings still onboard.`,
      downstreamConsequence: "The required post-dip baseline packet remained in the onboard queue and did not reach Earth.",
      consequentialAction: "Switch to Bracket-four return policy to drop unneeded endpoints and return baseline within contact.",
      fixCommand: { type: "kepler/setPlan", payload: { policy: "bracket" } },
    };
  }

  // 3. Timing sensitivity offset (+1 hour)
  if (contract.id === "timing" && !evidence.adequate) {
    return {
      firstCausalLimiter: "Recording started too late for a before-dip baseline reading.",
      downstreamConsequence: "Pre-dip baseline was shifted out of the narrow 6-cadence window.",
      consequentialAction: "Switch to Wide twelve recipe to capture 12 clean cadences across +1h shift.",
      fixCommand: { type: "kepler/setPlan", payload: { recipe: "wide", policy: "aggregate" } },
    };
  }

  // 4. Observation window choice (Shared dip or Flat baseline)
  if (plan.window === "B") {
    return {
      firstCausalLimiter: "Both hypotheses expected this dip at 142.53 BKJD.",
      downstreamConsequence: "Photometry accurately captured the dip, but both H1 and H2 predict it. Data cannot discriminate.",
      consequentialAction: "Choose Candidate Window A (135.12 BKJD) where H1 and H2 predictions differ.",
      fixCommand: { type: "kepler/setPlan", payload: { window: "A" } },
    };
  }
  if (plan.window === "C") {
    return {
      firstCausalLimiter: "Both hypotheses expected flat baseline at 136.00 BKJD.",
      downstreamConsequence: "Photometry confirmed baseline flux, but both H1 and H2 predict flat here. Both remain possible.",
      consequentialAction: "Choose Candidate Window A (135.12 BKJD) where H1 and H2 predictions differ.",
      fixCommand: { type: "kepler/setPlan", payload: { window: "A" } },
    };
  }

  // 5. Scientific success
  if (evidence.discriminates && evidence.contradicted === "H2") {
    return {
      firstCausalLimiter: "None. All requirements met.",
      downstreamConsequence: "Returned low interval (<0.997) is bracketed by baseline (>0.999), disfavoring H2.",
      consequentialAction: "Finish mission or test alternative design approaches for robustness.",
      fixCommand: null,
    };
  }

  return {
    firstCausalLimiter: "Returned interval lacked necessary baseline context.",
    downstreamConsequence: evidence.reason,
    consequentialAction: "Adjust observation window or return policy.",
    fixCommand: { type: "kepler/setPlan", payload: { policy: "bracket" } },
  };
}

/**
 * Calculates before/after deltas between two mission runs.
 */
export function calculateDeltas(previousRun, currentRun) {
  if (!previousRun || !currentRun) return null;

  const prevGround = previousRun.attempt?.ground?.length || 0;
  const currGround = currentRun.attempt?.ground?.length || 0;
  const prevEnergy = previousRun.attempt?.energy ?? 0;
  const currEnergy = currentRun.attempt?.energy ?? 0;

  const prevDiscrim = previousRun.evidence?.discriminates || false;
  const currDiscrim = currentRun.evidence?.discriminates || false;

  const prevContradicted = previousRun.evidence?.contradicted || null;
  const currContradicted = currentRun.evidence?.contradicted || null;

  let outcomeShift = "Unchanged";
  if (!prevDiscrim && currDiscrim) {
    outcomeShift = `Inconclusive → Discriminating (${currContradicted} Disfavored)`;
  } else if (prevDiscrim && !currDiscrim) {
    outcomeShift = "Discriminating → Inconclusive";
  }

  return {
    packetsReceivedDelta: currGround - prevGround,
    energyRemainingDelta: Number((currEnergy - prevEnergy).toFixed(2)),
    outcomeShift,
    evidenceChanged: prevDiscrim !== currDiscrim || prevContradicted !== currContradicted,
    previousVerdict: previousRun.evidence?.reason || "Inconclusive",
    currentVerdict: currentRun.evidence?.reason || "Inconclusive",
  };
}

/**
 * Generates the 3-case stress comparison matrix across nominal, timing, and short contact.
 */
export function generateStressMatrix(design, plan) {
  return (Object.keys(CASES)).map((caseId) => {
    const contract = CASES[caseId];
    const casePlan = { ...plan, caseId };
    const p = preview(design, casePlan);
    const a = finish(freshAttempt(0, design, casePlan));
    const ev = evaluate(a.ground, "intro");

    const b = BATTERIES[design.battery];
    const s = STORES[design.store];

    return {
      caseId,
      label: contract.label,
      description: contract.description,
      energyMarginWh: Number((b.wh - p.energy).toFixed(2)),
      storageMarginSlots: s.slots - p.rawCount,
      packetsAtGround: a.ground.length,
      packetsHeld: a.queue.length,
      isAdequate: ev.adequate,
      discriminates: ev.discriminates,
      contradicted: ev.contradicted,
      verdictText: ev.discriminates
        ? "Discriminates (H2 disfavored)"
        : ev.adequate
        ? "Inconclusive (both predict dip)"
        : "Inconclusive (baseline context missing)",
      reason: ev.reason,
    };
  });
}
