import {serviceMass,transferTrajectory} from '../transfer/planning.js';
import {launcherFor,customCapacity,requiredLaunchDv} from '../rocket/engineering.js';
import {projectAssembly,panelItems} from '../workshop/blueprint.js';
import {presetOrbit,geometryForecast,EARTH_STATIONS} from './orbitalGeometry.js';
function findItem(list, id) {
  if (!Array.isArray(list) || !id) return null;
  return list.find((item) => item.id === id) || null;
}

export function evaluateDesign(design, data) {
  design=projectAssembly(design,data);
  const mission = findItem(data.missions, design.missionId);
  const bus = findItem(data.parts, design.busId);
  const comms = findItem(data.parts, design.commsId);
  const computer = findItem(data.parts, design.computerId);
  const pointing = findItem(data.parts, design.pointingId);
  const launcher = launcherFor(design,data);
  const orbit = findItem(data.orbits, design.orbitId);

  const panels = panelItems(design,data);
  const batteries = (design.batteryIds || []).map((id) => findItem(data.parts, id)).filter(Boolean);
  const fuels = (design.fuelIds || []).map((id) => findItem(data.parts, id)).filter(Boolean);
  const instruments = (design.instrumentIds || []).map((id) => findItem(data.instruments, id)).filter(Boolean);

  // 1. Mass
  const busMass = bus ? (bus.mass || 0) : 0;
  const panelsMass = panels.reduce((sum, p) => sum + (p.mass || 0), 0);
  const batteriesMass = batteries.reduce((sum, b) => sum + (b.mass || 0), 0);
  const commsMass = comms ? (comms.mass || 0) : 0;
  const computerMass = computer ? (computer.mass || 0) : 0;
  const pointingMass = pointing ? (pointing.mass || 0) : 0;
  const fuelsMass = fuels.reduce((sum, f) => sum + (f.mass || 0), 0);
  const instrumentsMass = instruments.reduce((sum, inst) => sum + (inst.mass || 0), 0);

  const dryMass = busMass + panelsMass + batteriesMass + commsMass + computerMass + pointingMass + instrumentsMass;
  const spacecraftMass = dryMass + fuelsMass;
  const service=mission?.transfer&&design.flightPlan?serviceMass(design.flightPlan,spacecraftMass):{wetKg:0,cost:0};
  const launchMass=spacecraftMass+service.wetKg;

  // Launcher capacity to orbit
  let capacity = 0;
  if (launcher && orbit && launcher.capacity) {
    const lClass = (orbit.launcherClass || 'LEO').toLowerCase();
    const baseCap = launcher.capacity[lClass] || 0;
    const factor = orbit.capacityFactor !== undefined ? orbit.capacityFactor : 1.0;
    capacity = baseCap * factor;
  }

  if(mission?.transfer&&design.flightPlan&&design.rocketBlueprint&&orbit?.id==='leo'){
    const trajectory=transferTrajectory(mission,design,design.flightPlan);
    capacity=customCapacity(design.rocketBlueprint,requiredLaunchDv(orbit.id,orbit.launcherClass)+trajectory.departureDv);
  }

  // 2. Power
  const busLoad = bus ? (bus.baseLoad || 0) : 0;
  const commsLoad = comms ? (comms.power || 0) : 0;
  const computerLoad = computer ? (computer.power || 0) : 0;
  const pointingLoad = pointing ? (pointing.power || 0) : 0;
  const instrumentsLoad = instruments.reduce((sum, inst) => sum + (inst.power || 0), 0);
  const propulsionLoad=fuels.reduce((sum,p)=>sum+(p.power||0),0);
  const averageLoad = busLoad + commsLoad + computerLoad + pointingLoad + instrumentsLoad + propulsionLoad;

  const panelPower = panels.reduce((sum, p) => sum + (p.power || 0), 0);

  // 3. Eclipse & Battery
  const geometry=design.orbitElements||presetOrbit(design.orbitId);
  const orbitForecast=geometry?geometryForecast(geometry,EARTH_STATIONS.filter(s=>!design.stationIds||design.stationIds.includes(s.id))):null;
  const eclipseHours = orbitForecast?orbitForecast.longestEclipseSec/3600:orbit ? (orbit.eclipseHours || 0) : 0;
  const eclipseNeedWh = averageLoad * eclipseHours;

  const totalBatteryWh = batteries.reduce((sum, b) => sum + (b.capacityWh || 0), 0);
  const batteryFraction = data.settings?.batteryUsableFraction ?? 0.8;
  const batteryUsableWh = totalBatteryWh * batteryFraction;

  // 4. Data & Downlink
  const rawDataPerDay = instruments.reduce((sum, inst) => sum + (inst.dataPerDay || 0), 0);
  const maxOBCData = computer ? (computer.maxDataGbDay || 0) : 0;
  const dataPerDay = Math.min(rawDataPerDay, maxOBCData);

  const baseDownlink = comms ? (comms.baseDownlinkGbDay || 0) : 0;
  const distanceFactor = orbit ? (orbit.distanceFactor !== undefined ? orbit.distanceFactor : 1.0) : 1.0;
  const contactHours = orbitForecast?orbitForecast.contactFraction*24:orbit ? (orbit.contactHours || 0) : 0;
  const downlinkPerDay = baseDownlink * distanceFactor * (contactHours / 1.0);

  const deliveredFraction = dataPerDay > 0
    ? Math.min(1.0, downlinkPerDay / dataPerDay)
    : 1.0;

  // 5. Pointing Match
  const pointingRanks = { coarse: 1, fine: 2, precision: 3 };
  const satPointingRank = pointing ? (pointingRanks[pointing.quality] || 1) : 1;
  for (const inst of instruments) {
    const reqRank = pointingRanks[inst.pointing] || 1;
    if (satPointingRank < reqRank) {
      // Instrument cannot deliver useful data without required pointing
      // handled in gate checks or effectively yields 0 if evaluated strictly
    }
  }

  // 6. Fuel & Lifetime
  const fuelKg = fuels.reduce((sum, f) => sum + (f.fuelKg || 0), 0);
  const targetLifetime = mission ? (mission.targetLifetime || 1) : 1;
  const insertionFuel = orbit ? (orbit.insertionFuel || 0) : 0;
  const yearlyBurn = orbit ? (orbit.yearlyBurn || 0) : 0;
  const fuelNeeded = insertionFuel + yearlyBurn * targetLifetime;

  const fuelAfterInsertion = Math.max(0, fuelKg - insertionFuel);
  const lifetimeAchieved = yearlyBurn > 0
    ? fuelAfterInsertion / yearlyBurn
    : targetLifetime;
  const lifetimeFactor = Math.min(1.0, lifetimeAchieved / targetLifetime);

  // 7. Cost & Budget
  const allParts = [bus, comms, computer, pointing, ...panels, ...batteries, ...fuels, ...instruments].filter(Boolean);
  const partsCost = allParts.reduce((sum, p) => sum + (p.cost || 0), 0);

  const launcherBaseCost = launcher ? (launcher.cost || 0) : 0;
  const extraLaunchCost = orbit ? (orbit.extraLaunchCost || 0) : 0;
  const launchCost = launcherBaseCost + extraLaunchCost;

  const opsCostPerYear = orbit ? (orbit.opsCostPerYear ?? 2) : 2;
  const opsCost = targetLifetime * opsCostPerYear;

  const totalCost = partsCost + launchCost + opsCost + service.cost;

  // Difficulty adjustment for budget
  const diffSetting = design.difficulty && data.difficulty ? data.difficulty[design.difficulty] : null;
  const budgetMultiplier = diffSetting?.budgetMultiplier ?? 1.0;
  const effectiveBudget = mission ? mission.budget * budgetMultiplier : 50;
  const budgetUsedFraction = effectiveBudget > 0 ? totalCost / effectiveBudget : 1.0;

  // 8. Science points
  const orbitFit = (mission && orbit && mission.orbitFit && mission.orbitFit[orbit.id] !== undefined)
    ? mission.orbitFit[orbit.id]
    : 0;

  let sumInstValue = 0;
  for (const inst of instruments) {
    const rel = (mission && mission.relevance && (mission.relevance[inst.id] ?? mission.relevance[inst.roleId]) !== undefined)
      ? (mission.relevance[inst.id] ?? mission.relevance[inst.roleId])
      : 0;
    sumInstValue += (inst.value || 0) * rel;
  }
  const sciencePoints = sumInstValue * orbitFit * deliveredFraction * lifetimeFactor;

  // 9. Margins (formula: (limit - used) / limit)
  const powerMarginSetting = data.settings?.powerMargin ?? 1.1;
  const powerNeed = averageLoad * powerMarginSetting;

  const massMargin = capacity > 0 ? (capacity - launchMass) / capacity : (launchMass === 0 ? 0 : -1);
  const powerMargin = panelPower > 0 ? (panelPower - powerNeed) / panelPower : (powerNeed === 0 ? 0 : -1);
  const batteryMargin = batteryUsableWh > 0 ? (batteryUsableWh - eclipseNeedWh) / batteryUsableWh : (eclipseNeedWh === 0 ? 0 : -1);
  const downlinkMargin = downlinkPerDay > 0 ? (downlinkPerDay - dataPerDay) / downlinkPerDay : (dataPerDay === 0 ? 0 : -1);
  const fuelMargin = fuelKg > 0 ? (fuelKg - fuelNeeded) / fuelKg : (fuelNeeded === 0 ? 0 : -1);

  return {
    orbitForecast,eclipseHours,contactHours,instantDownlinkGbDay:baseDownlink*distanceFactor*24,
    launchMass,spacecraftMass,
    capacity,
    averageLoad,
    panelPower,
    eclipseNeedWh,
    batteryUsableWh,
    dataPerDay,
    downlinkPerDay,
    deliveredFraction,
    fuelKg,
    fuelNeeded,
    lifetimeAchieved,
    lifetimeFactor,
    partsCost,
    launchCost,
    opsCost,
    totalCost,
    budgetUsedFraction,
    sciencePoints,
    margins: {
      mass: massMargin,
      power: powerMargin,
      battery: batteryMargin,
      downlink: downlinkMargin,
      fuel: fuelMargin
    }
  };
}

