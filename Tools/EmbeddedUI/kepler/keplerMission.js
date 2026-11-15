// ORBITAL - Catch the Next Dip: Mission Simulation Engine & Evaluator
// Ported from Catch the Next Dip src/model/mission.ts

import {
  BATTERIES,
  CASES,
  COSTS,
  designStats,
  WINDOWS,
} from "./keplerConfig.js";
import {
  cleanRow,
  MEDIAN,
  metadata,
  rows,
} from "./keplerSource.js";
import { disagreementOverlap } from "./keplerPredictions.js";

/**
 * Selects n finite quality-zero cadences closest to center, plus the inclusive raw span.
 * @param {number} center Center time in BKJD
 * @param {number} n Count of finite quality-zero cadences (6 or 12)
 * @param {Array} metas Metadata array (defaults to source metadata)
 */
export function selectSpan(center, n, metas = metadata) {
  const selected = metas
    .filter((m) => m.finitePair && m.quality === 0 && m.time !== null)
    .sort(
      (a, b) =>
        Math.abs(a.time - center) - Math.abs(b.time - center) || a.id - b.id
    )
    .slice(0, n)
    .sort((a, b) => a.time - b.time);

  if (selected.length !== n) {
    throw new Error("Insufficient finite quality-zero timestamps in source.");
  }

  const first = Math.min(...selected.map((m) => m.id));
  const last = Math.max(...selected.map((m) => m.id));
  const acquired = metas.filter((m) => m.id >= first && m.id <= last);

  return {
    selected,
    acquired,
    first,
    last,
    rawCount: acquired.length,
    min: selected[0].time,
    max: selected[selected.length - 1].time,
  };
}

/**
 * Calculates pre-launch engineering preview without revealing unseen photometry.
 * @param {object} d Design { battery, store, processor, profile }
 * @param {object} p Plan { window, recipe, policy, caseId }
 */
export function preview(d, p) {
  const caseKey = p?.caseId === 'short_contact' ? 'short' : p?.caseId === 'timing_sensitivity' ? 'timing' : (p?.caseId || 'nominal');
  const contract = CASES[caseKey] || CASES.nominal;
  const center = WINDOWS.find((w) => w.id === p.window).center;
  const span = selectSpan(
    center + contract.offsetHours / 24,
    p.recipe === "native" ? 6 : 12
  );
  const stats = designStats(d);
  const aggregation = p.recipe === "wide";

  const energy =
    COSTS.setup +
    span.rawCount * COSTS.acquire +
    (aggregation ? COSTS.aggregate : 0) +
    COSTS.downlink;

  const prepared = p.policy === 'three_slot' ? 3 : aggregation || p.policy === "bracket" ? 4 : 6;
  const expected = Math.min(prepared, contract.capacity);

  const issues = [...stats.issues];

  if (span.rawCount > stats.slots) {
    issues.push(
      `Capture needs ${span.rawCount} raw slots before filtering; this store has ${stats.slots}. Choose Extended storage or Native six. Filtering cannot refund acquisition capacity.`
    );
  }
  if (span.rawCount > stats.span) {
    issues.push(
      `Capture spans ${span.rawCount} source cadences; ${
        d.profile === "snapshot" ? "Snapshot" : "Long-look"
      } permits ${stats.span}. Choose Long-look or a narrower capture.`
    );
  }
  if (energy > stats.energy + 1e-9) {
    issues.push(
      `Full recipe needs ${energy.toFixed(1)} Wh; battery supplies ${stats.energy.toFixed(
        1
      )} Wh. Choose Reserve or Native six.`
    );
  }
  if (aggregation && d.processor !== "aggregation") {
    issues.push(
      "Wide twelve requires the Aggregation-capable processor. Install it before launch or choose Native six."
    );
  }
  if (
    (aggregation && p.policy !== "aggregate") ||
    (!aggregation && p.policy === "aggregate")
  ) {
    issues.push("Choose a return policy compatible with the capture recipe.");
  }

  // Returns timestamp/quality metadata; never hidden flux
  return {
    center,
    actualCenter: center + contract.offsetHours / 24,
    ...span,
    energy,
    prepared,
    expected,
    capacity: contract.capacity,
    issues,
  };
}

/**
 * Creates a fresh attempt state at stage 'pointing'.
 */
export function freshAttempt(id, d, p) {
  return {
    id,
    design: Object.freeze({ ...d }),
    plan: Object.freeze({ ...p }),
    stage: "pointing",
    energy: BATTERIES[d.battery].wh,
    stored: [],
    queue: [],
    ground: [],
    excluded: [],
    ledger: [],
    failed: false,
  };
}

/**
 * Constructs a single standardized science packet with member traceability.
 */
export function packetize(rs, id, mean = false) {
  if (!rs.length || rs.some((r) => !cleanRow(r))) {
    throw new Error("Cannot prepare uncurated records.");
  }
  const times = rs.map((r) => r.time);
  const errors = rs.map((r) => r.error);

  const packet = {
    id,
    manifest: "kepler-q1-v1",
    kind: mean ? "mean" : "native",
    members: rs.map((r) => ({ id: r.id, t: r.time, q: r.quality })),
    time: times.reduce((a, b) => a + b, 0) / rs.length,
    min: Math.min(...times),
    max: Math.max(...times),
    flux: rs.reduce((s, r) => s + r.flux, 0) / rs.length / MEDIAN,
    error: errors.every((e) => e !== null)
      ? Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0)) /
        rs.length /
        MEDIAN
      : null,
    uncertainty: mean ? "independent-formal-only" : "reported",
  };

  if (new TextEncoder().encode(JSON.stringify(packet)).length > 1024) {
    throw new Error("Packet metadata exceeds the 1 KiB teaching payload.");
  }
  return packet;
}

/**
 * Advances the mission attempt by one stage with atomic resource debits.
 */
export function advance(a) {
  if (a.stage === "complete") return a;

  const s = {
    ...a,
    stored: [...a.stored],
    queue: [...a.queue],
    ground: [...a.ground],
    excluded: [...a.excluded],
    ledger: [...a.ledger],
  };

  const report = (status, message, debit = 0) => {
    s.energy -= debit;
    s.ledger.push({ stage: a.stage, status, message, debit });
  };

  const fail = (message) => {
    report("failed", message);
    s.failed = true;
    s.stage = "complete";
    return s;
  };

  const check = preview(a.design, a.plan);

  switch (a.stage) {
    case "pointing": {
      const issues = designStats(a.design).issues;
      if (issues.length) return fail(issues.join(" "));
      if (s.energy < COSTS.setup) {
        return fail(
          "Pointing requires 0.5 Wh. Start a new mission with adequate battery."
        );
      }
      report(
        "ok",
        "Pointing complete. Hardware is locked for this attempt.",
        COSTS.setup
      );
      s.stage = "capture";
      break;
    }
    case "capture": {
      if (check.issues.length) return fail(check.issues.join(" "));
      const cost = check.rawCount * COSTS.acquire;
      if (s.energy + 1e-9 < cost) {
        return fail(
          `Acquisition needs ${cost.toFixed(1)} Wh now. No records acquired and no acquisition debit.`
        );
      }
      s.stored = rows.filter((r) => r.id >= check.first && r.id <= check.last);
      report(
        "ok",
        `Acquired all ${check.rawCount} raw cadences, rows ${check.first}–${check.last}. No flux is at ground.`,
        cost
      );
      s.stage = "filter";
      break;
    }
    case "filter": {
      s.excluded = s.stored
        .filter((r) => !cleanRow(r))
        .map((r) => ({
          id: r.id,
          quality: r.quality,
          reason:
            r.quality !== 0
              ? "Excluded by quality-zero curation policy"
              : "Nonfinite time or flux",
        }));
      s.stored = s.stored.filter(cleanRow).sort((a, b) => a.time - b.time);
      report(
        "ok",
        `${s.stored.length} clean records retained; ${s.excluded.length} excluded. Slots freed; energy and elapsed acquisition are not refunded.`
      );
      s.stage = "aggregate";
      break;
    }
    case "aggregate": {
      if (a.plan.recipe === "wide") {
        if (a.design.processor !== "aggregation" || s.stored.length !== 12) {
          return fail(
            "Aggregation requires the installed processor and twelve clean records."
          );
        }
        if (s.energy + 1e-9 < COSTS.aggregate) {
          return fail("Aggregation needs 0.6 Wh. No aggregation debit.");
        }
        s.queue = [
          [0, 2],
          [2, 6],
          [6, 10],
          [10, 12],
        ].map(([start, end], i) =>
          packetize(s.stored.slice(start, end), `bin-${i + 1}`, true)
        );
        s.stored = [];
        report(
          "ok",
          "Fixed 2/4/4/2 groups formed. All member IDs and support spans preserved.",
          COSTS.aggregate
        );
      } else {
        report(
          "skipped",
          "Native return selected. No aggregation or aggregation cost."
        );
      }
      s.stage = "prepare";
      break;
    }
    case "prepare": {
      if (a.plan.recipe === "native") {
        if (s.stored.length !== 6) {
          return fail("Native-six policy requires six clean records.");
        }
        const positions =
          a.plan.policy === "three_slot" ? (a.plan.timestamps || [0, 2, 5]) :
          a.plan.policy === "bracket" ? [0, 2, 3, 5] : [0, 1, 2, 3, 4, 5];
        s.queue = positions.map((i) =>
          packetize([s.stored[i]], `row-${s.stored[i].id}`)
        );
        s.stored = [];
      }
      report(
        "ok",
        `${s.queue.length} padded 1 KiB science packets prepared in declared time order. Photometry remains onboard.`
      );
      s.stage = "downlink";
      break;
    }
    case "downlink": {
      const caseKey = a.plan?.caseId === 'short_contact' ? 'short' : a.plan?.caseId === 'timing_sensitivity' ? 'timing' : (a.plan?.caseId || 'nominal');
      const capacity = (CASES[caseKey] || CASES.nominal).capacity;
      if (
        capacity < 1 ||
        s.energy + 1e-9 < COSTS.downlink ||
        s.queue.length === 0
      ) {
        report("skipped", "No usable contact, energy, or packets. No debit.");
      } else {
        s.ground = s.queue.slice(0, capacity);
        s.queue = s.queue.slice(capacity);
        report(
          "ok",
          `${s.ground.length} whole packets reached ground; ${s.queue.length} remain onboard.`,
          COSTS.downlink
        );
      }
      s.stage = "complete";
      break;
    }
  }

  return s;
}

/**
 * Runs attempt through all remaining stages until complete.
 */
export function finish(a) {
  let next = a;
  for (let i = 0; i < 6 && next.stage !== "complete"; i++) {
    next = advance(next);
  }
  return next;
}

/**
 * Evaluates scientific evidence from Earth receipts only.
 * @param {Array} ground Packets received on Earth
 * @param {'intro' | 'six-native'} contract Evaluation contract
 */
export function evaluate(ground, contract = "intro") {
  const valid = ground.filter(
    (p) =>
      Number.isFinite(p.flux) &&
      Number.isFinite(p.time) &&
      p.min <= p.time &&
      p.time <= p.max &&
      p.members.length > 0 &&
      p.members.every(
        (m) =>
          m.q === 0 && Number.isFinite(m.t) && m.t >= p.min && m.t <= p.max
      )
  );

  const bad = valid.length !== ground.length;
  const inconclusive = (reason) => ({
    adequate: false,
    discriminates: false,
    contradicted: null,
    reason,
    dipIds: [],
  });

  if (bad) {
    return inconclusive(
      "A corrupted interval cannot support this evidence gate. Inspect packet provenance."
    );
  }
  if (!valid.length) {
    return inconclusive(
      "No photometry reached ground. Operational completion and scientific evidence are separate."
    );
  }
  if (
    contract === "six-native" &&
    (valid.length < 6 || valid.some((p) => p.kind !== "native"))
  ) {
    return inconclusive(
      "Developer objective requires six native records plus baseline; four bins or a four-packet contact cannot meet it."
    );
  }

  const low = valid.filter((p) => p.flux < 0.997);
  for (const dip of low) {
    const before = valid.find((p) => p.flux > 0.999 && p.max < dip.min);
    const after = valid.find((p) => p.flux > 0.999 && p.min > dip.max);
    if (before && after) {
      const discr = disagreementOverlap(dip.min, dip.max);
      return {
        adequate: true,
        discriminates: discr,
        contradicted: discr ? "H2" : null,
        dipIds: [dip.id],
        beforeId: before.id,
        afterId: after.id,
        reason: discr
          ? "A returned low interval has baseline before and after, where H1 predicts a dip and H2 predicts flat. This disfavors H2 within this supplied pair."
          : "The returned dip has baseline on both sides, but both supplied models predict it. Accurate data; this timing question remains unanswered.",
      };
    }
  }

  if (!low.length) {
    return inconclusive(
      "The returned interval is baseline. Both supplied models predict flat here; both remain possible."
    );
  }

  return {
    ...inconclusive(
      "A low point without returned baseline before AND after is insufficient. More battery alone cannot create missing baseline samples."
    ),
    dipIds: low.map((p) => p.id),
    beforeId: valid.find((p) => p.flux > 0.999 && p.max < low[0].min)?.id,
    afterId: valid.find((p) => p.flux > 0.999 && p.min > low[0].max)?.id,
  };
}

/**
 * Runs all three named cases (nominal, timing, short) across the same design and plan.
 */
export function compareCases(d, p, contract = "intro") {
  return Object.keys(CASES).map((caseId) => {
    const plan = { ...p, caseId };
    const check = preview(d, plan);
    const a = finish(freshAttempt(0, d, plan));
    return {
      caseId,
      preview: check,
      attempt: a,
      evidence: evaluate(a.ground, contract),
    };
  });
}
