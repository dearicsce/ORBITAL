// ORBITAL - Catch the Next Dip: Hardware & Access Mapping
// Maps ORBITAL builder hardware and launch vehicles to the Catch the Next Dip teaching model.

import { COMPACT, WIDE, BATTERIES, STORES, PROCESSORS, PROFILES } from "./keplerConfig.js";

/**
 * Fictional access profile documentation.
 */
export const FICTIONAL_ACCESS_PROFILE_DOC = 
  "ORBITAL launch insertion delivers the deep-space astronomy payload to a heliocentric drift access profile. " +
  "The historical Kepler Q1 observation cadences are accessed via this dedicated profile; " +
  "launch verifies flight credibility and fairing envelope rather than creating Kepler's historical orbit directly.";

/**
 * Maps an ORBITAL spacecraft design to the Catch the Next Dip teaching design.
 * Preserves strict separation between real simulation values (kg, $M, Wh) and authored teaching limits.
 *
 * @param {object} orbitalDesign ORBITAL spacecraft design object
 * @param {object} [catalogData] Optional catalog definitions
 * @returns {object} { design, realValues, teachingValues, accessProfile }
 */
export function mapOrbitalToKepler(orbitalDesign, catalogData = {}) {
  // If an explicit teaching kit is supplied in the design, respect it
  if (orbitalDesign?.keplerKit) {
    const k = orbitalDesign.keplerKit;
    const design = {
      battery: k.battery in BATTERIES ? k.battery : "compact",
      store: k.store in STORES ? k.store : "compact",
      processor: k.processor in PROCESSORS ? k.processor : "native",
      profile: k.profile in PROFILES ? k.profile : "snapshot",
    };
    return deriveMappedSummary(orbitalDesign, design);
  }

  // Otherwise, inspect placed components
  const parts = orbitalDesign?.assembly?.components?.map(component => component.catalogId) ??
    orbitalDesign?.parts ?? [
      ...(orbitalDesign?.batteryIds || []),
      ...(orbitalDesign?.instrumentIds || []),
      orbitalDesign?.computerId,
    ].filter(Boolean);
  const partIds = parts.map((p) => (typeof p === "string" ? p : p.id || p.partId));

  // 1. Battery mapping:
  // Large battery (battery_l, capacity >= 500 Wh) -> reserve (6.5 Wh)
  // Smaller batteries (battery_s, battery_m) -> compact (4.0 Wh)
  const hasLargeBattery = partIds.some((id) => id === "battery_l" || id === "battery_large");
  const battery = hasLargeBattery ? "reserve" : "compact";

  // 2. Storage mapping:
  // Advanced / rad-hard computer (recorder >= 12 GB) -> extended (14 slots)
  // Basic computer -> compact (6 slots)
  const hasExtendedStore = partIds.some(
    (id) => id === "computer_advanced" || id === "computer_rad_hard" || id === "store_extended"
  );
  const store = hasExtendedStore ? "extended" : "compact";

  // 3. Processor mapping:
  // Advanced science processor / spectrometer / rad processor -> aggregation
  // Standard computer / native -> native
  const hasAggregation = partIds.some(
    (id) =>
      id === "spectrometer" ||
      id === "rad_processor" ||
      id === "processor_aggregation" ||
      id === "observatory"
  );
  const processor = hasAggregation ? "aggregation" : "native";

  // 4. Access profile & Launcher mapping:
  // Heavy / Super-Heavy launcher (albatross, roc) or long profile -> long (span 16, limit 6 kg)
  // Light / Medium launcher (kestrel, condor) -> snapshot (span 8, limit 4 kg)
  const launcherId = orbitalDesign?.launcherId || "kestrel";
  const isHeavyLauncher = launcherId === "albatross" || launcherId === "roc" || launcherId === "super_heavy";
  const profile = isHeavyLauncher ? "long" : "snapshot";

  const design = { battery, store, processor, profile };
  return deriveMappedSummary(orbitalDesign, design);
}

/**
 * Builds the summary structure separating real simulation stats from authored teaching limits.
 */
function deriveMappedSummary(orbitalDesign, design) {
  // Real ORBITAL simulation values (from the craft builder)
  const realValues = {
    totalMassKg: Number(orbitalDesign?.massKg || orbitalDesign?.mass || 150),
    budgetMillionsUSD: Number(orbitalDesign?.costMillions || orbitalDesign?.cost || 15),
    hardwareWh: Number(orbitalDesign?.batteryWh || orbitalDesign?.capacityWh || 100),
    launcherId: orbitalDesign?.launcherId || "kestrel",
    fairingCleared: Boolean(orbitalDesign?.fairingCleared ?? true),
  };

  // Authored teaching model limits (Catch the Next Dip rules)
  const b = BATTERIES[design.battery];
  const s = STORES[design.store];
  const p = PROCESSORS[design.processor];
  const l = PROFILES[design.profile];

  const teachingValues = {
    payloadMassKg: 2 + b.mass + s.mass + p.mass,
    massLimitKg: l.massLimit,
    credits: 2 + b.credits + s.credits + p.credits + l.credits,
    creditBudget: 9,
    usableEnergyWh: b.wh,
    recorderSlots: s.slots,
    allowedCadenceSpan: l.span,
    hardwareLocked: true,
  };

  return {
    design,
    realValues,
    teachingValues,
    accessProfile: {
      type: design.profile,
      label: l.label,
      span: l.span,
      massLimit: l.massLimit,
      documentation: FICTIONAL_ACCESS_PROFILE_DOC,
    },
  };
}
