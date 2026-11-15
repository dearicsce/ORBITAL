// ORBITAL - Catch the Next Dip: Mission Configuration & Design Rules
// Ported from Catch the Next Dip src/model/config.ts

export const ANCHOR = 132.645758508; // BKJD of anchor eclipse
export const PERIOD = 2.470613377; // Base transit period in days (H1)
export const DURATION_HOURS = 1.74319; // Transit duration in hours

export const WINDOWS = [
  {
    id: "A",
    center: 135.116371885,
    label: "Candidate A",
    archiveDate: "May 17, 2009",
    relativeHours: "+59.3 h",
    description: "Predictions differ between H1 and H2",
  },
  {
    id: "B",
    center: 142.528212016,
    label: "Candidate B",
    archiveDate: "May 25, 2009",
    relativeHours: "+237.2 h",
    description: "Both hypotheses predict a dip",
  },
  {
    id: "C",
    center: 136.0,
    label: "Candidate C",
    archiveDate: "May 18, 2009",
    relativeHours: "+80.5 h",
    description: "Both hypotheses predict flat baseline",
  },
];

export const BATTERIES = {
  compact: { label: "Compact", wh: 4, mass: 1, credits: 1 },
  reserve: { label: "Reserve", wh: 6.5, mass: 2, credits: 2 },
};

export const STORES = {
  compact: { label: "Compact", slots: 6, mass: 0.5, credits: 1 },
  extended: { label: "Extended", slots: 14, mass: 1, credits: 2 },
};

export const PROCESSORS = {
  native: { label: "Native-only", mass: 0, credits: 0 },
  aggregation: { label: "Aggregation-capable", mass: 0.5, credits: 1 },
};

export const PROFILES = {
  snapshot: { label: "Snapshot", massLimit: 4, credits: 1, span: 8 },
  long: { label: "Long-look", massLimit: 6, credits: 2, span: 16 },
};

export const CASES = {
  nominal: {
    id: "nominal",
    label: "Nominal",
    offsetHours: 0,
    capacity: 6,
    description: "Planned recipe center · 6 science packets at contact.",
  },
  timing: {
    id: "timing",
    label: "Timing sensitivity",
    offsetHours: 1,
    capacity: 6,
    description: "Recipe center +1 hour · 6 packets. Historical data and ephemerides stay fixed.",
  },
  short: {
    id: "short",
    label: "Short contact",
    offsetHours: 0,
    capacity: 4,
    description: "Planned recipe center · only the first 4 packets can reach ground.",
  },
};

export const COSTS = {
  setup: 0.5,
  acquire: 0.3,
  aggregate: 0.6,
  downlink: 1.0,
};

export const COMPACT = {
  battery: "compact",
  store: "compact",
  processor: "native",
  profile: "snapshot",
};

export const WIDE = {
  battery: "reserve",
  store: "extended",
  processor: "aggregation",
  profile: "long",
};

export function designStats(d) {
  const b = BATTERIES[d.battery];
  const s = STORES[d.store];
  const p = PROCESSORS[d.processor];
  const l = PROFILES[d.profile];

  const mass = 2 + b.mass + s.mass + p.mass;
  const credits = 2 + b.credits + s.credits + p.credits + l.credits;
  const issues = [];

  if (mass > l.massLimit) {
    issues.push(
      `Payload ${mass.toFixed(1)} kg exceeds ${l.label}'s ${l.massLimit.toFixed(1)} kg limit. Choose Long-look or lighter hardware.`
    );
  }
  if (credits > 9) {
    issues.push(
      `Cost ${credits} exceeds the 9-credit budget. Reduce hardware or access cost.`
    );
  }

  return {
    mass,
    credits,
    energy: b.wh,
    slots: s.slots,
    span: l.span,
    massLimit: l.massLimit,
    issues,
  };
}
