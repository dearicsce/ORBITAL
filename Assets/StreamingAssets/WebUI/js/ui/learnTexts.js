// Engineering Learn explanations keyed by topic (Step 13a)
// Generates 2-3 simple sentences using current simulation numbers.

export const LEARN_TOPICS = {
  polar_launch: {
    topic: 'polar_launch',
    badge: 'ORBIT MECHANICS: POLAR LAUNCH',
    title: 'Why Polar Launches Lift Less Mass',
    generate(ctx) {
      const cap = ctx.capacity;
      const mass = ctx.launchMass;
      const marginPct = (ctx.marginMass * 100).toFixed(1);
      return `Polar launches (SSO) do not gain free velocity from Earth's eastward spin, which reduces your rocket's payload capacity to ${cap} kg. Your spacecraft currently weighs ${mass} kg (${marginPct}% lift margin). Trimming payload mass or selecting a heavier launcher prevents structural launch failure.`;
    }
  },
  geo_radiation: {
    topic: 'geo_radiation',
    badge: 'SPACE ENVIRONMENT: RADIATION',
    title: 'Why GEO & Deep Space Require Radiation Hardening',
    generate(ctx) {
      const computerName = ctx.computerName || 'Basic computer';
      const orbitName = ctx.orbitName || 'GEO';
      return `Beyond low Earth orbit in ${orbitName}, Earth's magnetic field no longer shields satellites from solar cosmic rays. Your spacecraft equips a ${computerName}, which lacks radiation shielding and risks bit-flip crashes during solar flares. Upgrading to a radiation-hardened computer safeguards collected science data.`;
    }
  },
  radar_power: {
    topic: 'radar_power',
    badge: 'PAYLOAD TRADEOFF: RADAR POWER',
    title: 'Why Synthetic Aperture Radar Needs Heavy Power',
    generate(ctx) {
      const gen = ctx.panelPower;
      const req = ctx.powerNeed.toFixed(0);
      const marginPct = (ctx.marginPower * 100).toFixed(1);
      return `Synthetic Aperture Radar (SAR) transmits high-frequency microwave pulses through darkness and cloud cover, creating a heavy electrical draw. Your spacecraft demands ${req} W, while solar arrays provide ${gen} W (${marginPct}% power margin). Adding larger solar panels ensures enough surplus wattage to recharge batteries for uninterrupted scans.`;
    }
  },
  launch_mass: {
    topic: 'launch_mass',
    badge: 'ROCKET MECHANICS: LIFT CAPACITY',
    title: 'Why Launch Mass Limits Rocket Selection',
    generate(ctx) {
      const mass = ctx.launchMass;
      const cap = ctx.capacity;
      const launcherName = ctx.launcherName || 'Launcher';
      const marginPct = (ctx.marginMass * 100).toFixed(1);
      return `A rocket's thrust must overcome gravity to deliver payloads into orbit, creating a strict ${cap} kg lift limit on the ${launcherName}. Your spacecraft currently weighs ${mass} kg (${marginPct}% mass margin). Staying under capacity prevents booster failure and leaves margin for maneuvering propellant.`;
    }
  },
  power_margin: {
    topic: 'power_margin',
    badge: 'POWER SYSTEMS: LOAD BALANCE',
    title: 'Why Solar Generation Must Exceed Subsystem Load',
    generate(ctx) {
      const gen = ctx.panelPower;
      const req = ctx.powerNeed.toFixed(0);
      const marginPct = (ctx.marginPower * 100).toFixed(1);
      return `Solar panels must generate at least 1.1x average electrical load (${req} W) to run subsystems and recharge batteries simultaneously. Your panels produce ${gen} W (${marginPct}% power margin). Maintaining positive power generation avoids brownouts when instruments activate.`;
    }
  },
  eclipse_battery: {
    topic: 'eclipse_battery',
    badge: 'ORBITAL ECLIPSE: BATTERY STORAGE',
    title: 'Why Night Passes Require Dedicated Battery Capacity',
    generate(ctx) {
      const eclipseH = ctx.eclipseHours;
      const needWh = ctx.eclipseNeedWh.toFixed(0);
      const batteryWh = ctx.batteryUsableWh.toFixed(0);
      const marginPct = (ctx.marginBattery * 100).toFixed(1);
      return `Satellites experience ${eclipseH} hours of total darkness during each eclipse pass and must run entirely on battery reserves. Your spacecraft requires ${needWh} Wh in darkness and carries ${batteryWh} Wh usable energy (${marginPct}% battery margin). Sizing batteries with adequate buffer protects delicate electronics until sunrise.`;
    }
  },
  downlink_throughput: {
    topic: 'downlink_throughput',
    badge: 'TELEMETRY: DOWNLINK CAPACITY',
    title: 'Why Distance and Bandwidth Constrain Science Return',
    generate(ctx) {
      const genData = ctx.dataPerDay.toFixed(1);
      const downData = ctx.downlinkPerDay.toFixed(1);
      const marginPct = (ctx.marginDownlink * 100).toFixed(1);
      return `Onboard sensors generate ${genData} GB of data daily, while radio transmitters can beam down ${downData} GB per day (${marginPct}% downlink margin). Increasing distance weakens signals, making high-bandwidth X-band or Ka-band dishes essential for multi-sensor missions.`;
    }
  },
  insertion_fuel: {
    topic: 'insertion_fuel',
    badge: 'PROPULSION: ORBIT INSERTION',
    title: 'Why Orbit Changes Consume Heavy Fuel',
    generate(ctx) {
      const reqFuel = ctx.insertionFuel;
      const carryFuel = ctx.fuelKg;
      const orbitName = ctx.orbitName || 'Target orbit';
      const marginPct = (ctx.marginFuel * 100).toFixed(1);
      return `Entering ${orbitName} requires a high-thrust braking burn of ${reqFuel} kg propellant, plus yearly station-keeping. Your tanks carry ${carryFuel} kg fuel (${marginPct}% fuel margin). Running out of propellant leaves the spacecraft stranded in a useless transfer trajectory.`;
    }
  },
  budget_ceiling: {
    topic: 'budget_ceiling',
    badge: 'FISCAL DISCIPLINE: BUDGET BUFFER',
    title: 'Why Cost Reserves Protect Mission Success',
    generate(ctx) {
      const cost = ctx.totalCost.toFixed(1);
      const ceiling = ctx.effectiveBudget.toFixed(1);
      const usedPct = (ctx.budgetUsedFraction * 100).toFixed(0);
      return `Spacecraft hardware, launch vehicle procurement, and flight operations total $${cost}M against your $${ceiling}M ceiling (${usedPct}% used). Keeping expenses under 80% buffers against unexpected mission cuts and earns top marks from the mission accountant.`;
    }
  },
  pointing_precision: {
    topic: 'pointing_precision',
    badge: 'ATTITUDE CONTROL: POINTING MATCH',
    title: 'Why Sensitive Telescopes Require Precise Orientation',
    generate(ctx) {
      const pointingName = ctx.pointingName || 'Pointing system';
      return `High-resolution cameras and spectrometers require stable aim to avoid image blur. Your spacecraft uses ${pointingName}. Magnetorquers only work in low orbits using Earth's magnetic field, while deep space missions require spinning reaction wheels and star trackers.`;
    }
  },
  nominal_success: {
    topic: 'nominal_success',
    badge: 'SYSTEM INTEGRATION: BALANCED DESIGN',
    title: 'Why Balanced Subsystem Margins Guarantee Success',
    generate(ctx) {
      const weakest = ctx.weakestName;
      const marginPct = (ctx.weakestMargin * 100).toFixed(1);
      return `Your spacecraft balances mass, solar power, battery storage, and budget allocation with positive buffers across the board. Your narrowest subsystem margin is ${weakest} at ${marginPct}%, comfortably exceeding launch requirements. Balanced engineering maximizes scientific return while minimizing operational failure risks.`;
    }
  }
};

export function getLearnExplanation(design, evalResult, gateChecks = [], data = {}) {
  const orbit = (data.orbits || []).find((o) => o.id === design.orbitId);
  const launcher = (data.launchers || []).find((l) => l.id === design.launcherId);
  const computer = (data.parts || []).find((p) => p.id === design.computerId);
  const pointing = (data.parts || []).find((p) => p.id === design.pointingId);
  const mission = (data.missions || []).find((m) => m.id === design.missionId);

  const diffSetting = data.difficulty?.[design.difficulty || 'normal'] || { budgetMultiplier: 1.0 };
  const effectiveBudget = (mission?.budget || 50) * (diffSetting.budgetMultiplier ?? 1.0);

  const powerNeed = evalResult.averageLoad * (data.settings?.powerMargin ?? 1.1);
  const m = evalResult.margins || { mass: 0, power: 0, battery: 0, downlink: 0, fuel: 0 };

  const marginMap = [
    { name: 'Mass', key: 'mass', val: m.mass },
    { name: 'Power', key: 'power', val: m.power },
    { name: 'Battery', key: 'battery', val: m.battery },
    { name: 'Downlink', key: 'downlink', val: m.downlink },
    { name: 'Fuel', key: 'fuel', val: m.fuel }
  ].sort((a, b) => a.val - b.val);

  const weakestMargin = marginMap[0];

  const ctx = {
    launchMass: evalResult.launchMass,
    capacity: evalResult.capacity,
    marginMass: m.mass,
    panelPower: evalResult.panelPower,
    powerNeed,
    marginPower: m.power,
    eclipseHours: evalResult.eclipseHours ?? orbit?.eclipseHours ?? 0.6,
    eclipseNeedWh: evalResult.eclipseNeedWh,
    batteryUsableWh: evalResult.batteryUsableWh,
    marginBattery: m.battery,
    dataPerDay: evalResult.dataPerDay,
    downlinkPerDay: evalResult.downlinkPerDay,
    marginDownlink: m.downlink,
    fuelKg: evalResult.fuelKg,
    insertionFuel: orbit?.insertionFuel ?? 0,
    yearlyBurn: orbit?.yearlyBurn ?? 3,
    marginFuel: m.fuel,
    totalCost: evalResult.totalCost,
    effectiveBudget,
    budgetUsedFraction: evalResult.budgetUsedFraction,
    orbitName: orbit?.name ? orbit.name.split('(')[0].trim() : 'Orbit',
    launcherName: launcher?.name || 'Launcher',
    computerName: computer?.name || 'Computer',
    pointingName: pointing?.name || 'Pointing',
    weakestName: weakestMargin.name,
    weakestMargin: weakestMargin.val
  };

  const failedChecks = (gateChecks || []).filter((c) => !c.ok);

  // 1. Check for specific failed launch checks first
  if (failedChecks.length > 0) {
    const failedId = failedChecks[0].id;
    if (failedId === 'launch_mass' || failedId === 'reach') {
      const topicKey = design.orbitId === 'sso' ? 'polar_launch' : 'launch_mass';
      const def = LEARN_TOPICS[topicKey];
      return { topic: topicKey, badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
    if (failedId === 'power') {
      const hasRadar = (design.instrumentIds || []).includes('radar_imager');
      const topicKey = hasRadar ? 'radar_power' : 'power_margin';
      const def = LEARN_TOPICS[topicKey];
      return { topic: topicKey, badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
    if (failedId === 'eclipse') {
      const def = LEARN_TOPICS.eclipse_battery;
      return { topic: 'eclipse_battery', badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
    if (failedId === 'budget') {
      const def = LEARN_TOPICS.budget_ceiling;
      return { topic: 'budget_ceiling', badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
    if (failedId === 'fuel') {
      const def = LEARN_TOPICS.insertion_fuel;
      return { topic: 'insertion_fuel', badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
    if (failedId === 'pointing') {
      const def = LEARN_TOPICS.pointing_precision;
      return { topic: 'pointing_precision', badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
  }

  // 2. Check for high-radiation vulnerability in deep/GEO orbits
  const beyondLEO = orbit && orbit.id !== 'leo' && orbit.id !== 'sso';
  const hasRadComputer = Boolean(computer?.radTolerant);
  if (beyondLEO && !hasRadComputer) {
    const def = LEARN_TOPICS.geo_radiation;
    return { topic: 'geo_radiation', badge: def.badge, title: def.title, text: def.generate(ctx) };
  }

  // 3. Check for active radar power draw
  const hasRadar = (design.instrumentIds || []).includes('radar_imager');
  if (hasRadar && m.power < 0.20) {
    const def = LEARN_TOPICS.radar_power;
    return { topic: 'radar_power', badge: def.badge, title: def.title, text: def.generate(ctx) };
  }

  // 4. Fallback to weakest margin
  if (weakestMargin.val < 0.25) {
    if (weakestMargin.key === 'mass') {
      const topicKey = design.orbitId === 'sso' ? 'polar_launch' : 'launch_mass';
      const def = LEARN_TOPICS[topicKey];
      return { topic: topicKey, badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
    if (weakestMargin.key === 'power') {
      const def = LEARN_TOPICS.power_margin;
      return { topic: 'power_margin', badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
    if (weakestMargin.key === 'battery') {
      const def = LEARN_TOPICS.eclipse_battery;
      return { topic: 'eclipse_battery', badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
    if (weakestMargin.key === 'downlink') {
      const def = LEARN_TOPICS.downlink_throughput;
      return { topic: 'downlink_throughput', badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
    if (weakestMargin.key === 'fuel') {
      const def = LEARN_TOPICS.insertion_fuel;
      return { topic: 'insertion_fuel', badge: def.badge, title: def.title, text: def.generate(ctx) };
    }
  }

  // 5. Nominal balanced design
  const def = LEARN_TOPICS.nominal_success;
  return { topic: 'nominal_success', badge: def.badge, title: def.title, text: def.generate(ctx) };
}
