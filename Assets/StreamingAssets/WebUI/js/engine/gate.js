import {planChecks,transferTrajectory,serviceMass} from '../transfer/planning.js';
import {launcherFor,rocketEngineering,requiredLaunchDv} from '../rocket/engineering.js';
import {geometryIssues} from '../workshop/collision.js';
import {projectAssembly,placementIssues} from '../workshop/blueprint.js';
import {orbitLocationIssue} from '../unity/missionRoute.js';
import { evaluateDesign } from './evaluate.js';
function findItem(list, id) {
  if (!Array.isArray(list) || !id) return null;
  return list.find((item) => item.id === id) || null;
}

export function checkLaunchGate(design, data, allowed=null,completed=null) {
  design=projectAssembly(design,data);
  const evalResult = evaluateDesign(design, data);
  const mission = findItem(data.missions, design.missionId);
  const bus = findItem(data.parts, design.busId);
  const comms = findItem(data.parts, design.commsId);
  const computer = findItem(data.parts, design.computerId);
  const pointing = findItem(data.parts, design.pointingId);
  const launcher = launcherFor(design,data);
  const orbit = findItem(data.orbits, design.orbitId);
  const instruments = (design.instrumentIds || []).map((id) => findItem(data.instruments, id)).filter(Boolean);

  const diffSetting = design.difficulty && data.difficulty ? data.difficulty[design.difficulty] : null;
  const budgetMultiplier = diffSetting?.budgetMultiplier ?? 1.0;
  const effectiveBudget = mission ? mission.budget * budgetMultiplier : 0;

  const checks = [];
  const locationIssue = orbitLocationIssue(mission, design, data.orbits);
  if (locationIssue) checks.push({id:'mission-orbit',ok:false,message:locationIssue});
  if(design.flightWorkflow&&!mission?.transfer&&!design.flightPlan)checks.push({id:'flight-plan',ok:false,message:'Confirm the flight plan before launch.'});
  if(design.rocketId&&!design.rocketBlueprint)checks.push({id:'launcher-blueprint',ok:false,message:'Select an available rocket blueprint.'});
  if(mission?.transfer)for(const [index,message] of planChecks(design.flightPlan,design,mission,data,evalResult,completed).entries())checks.push({id:'transfer-'+index,ok:false,message});
  const departureDv=mission?.transfer&&design.flightPlan&&!locationIssue?transferTrajectory(mission,design,design.flightPlan).departureDv:0;
  if(design.rocketBlueprint)for(const [index,message] of rocketEngineering(design.rocketBlueprint,evalResult.launchMass,{completed,requirement:requiredLaunchDv(orbit?.id,orbit?.launcherClass)+departureDv}).issues.entries())checks.push({id:'rocket-'+index,ok:false,message});

  // Check 1: Launch mass
  const massOk = evalResult.launchMass <= evalResult.capacity && evalResult.capacity > 0;
  checks.push({
    id: 'launch_mass',
    ok: massOk,
    value: evalResult.launchMass,
    limit: evalResult.capacity,
    message: massOk
      ? `Launch mass ${evalResult.launchMass} kg is within ${launcher ? launcher.name : 'launcher'} capacity of ${evalResult.capacity} kg.`
      : `Your spacecraft weighs ${evalResult.launchMass} kg but ${launcher ? launcher.name : 'the launcher'} can only lift ${evalResult.capacity} kg to this orbit. Remove mass or choose a bigger launcher.`
  });

  // Check 2: Budget
  const budgetOk = evalResult.totalCost <= effectiveBudget;
  checks.push({
    id: 'budget',
    ok: budgetOk,
    value: evalResult.totalCost,
    limit: effectiveBudget,
    message: budgetOk
      ? `Total mission cost $${evalResult.totalCost}M is within budget of $${effectiveBudget}M.`
      : `Total mission cost is $${evalResult.totalCost}M, which exceeds your $${effectiveBudget}M budget. Swap to cheaper parts or a lower cost launcher.`
  });

  // Check 3: Power
  const powerMarginSetting = data.settings?.powerMargin ?? 1.1;
  const requiredPanelPower = evalResult.averageLoad * powerMarginSetting;
  const powerOk = evalResult.panelPower >= requiredPanelPower;
  checks.push({
    id: 'power',
    ok: powerOk,
    value: evalResult.panelPower,
    limit: requiredPanelPower,
    message: powerOk
      ? `Solar panels generate ${evalResult.panelPower} W, exceeding the required ${requiredPanelPower.toFixed(1)} W (1.1x load).`
      : `Solar panels generate ${evalResult.panelPower} W, but need at least ${requiredPanelPower.toFixed(1)} W (1.1x average load of ${evalResult.averageLoad} W). Add larger or extra solar panels.`
  });

  // Check 4: Eclipse battery
  const eclipseOk = evalResult.batteryUsableWh >= evalResult.eclipseNeedWh;
  checks.push({
    id: 'eclipse',
    ok: eclipseOk,
    value: evalResult.batteryUsableWh,
    limit: evalResult.eclipseNeedWh,
    message: eclipseOk
      ? `Usable battery energy of ${evalResult.batteryUsableWh} Wh covers the ${evalResult.eclipseNeedWh.toFixed(1)} Wh eclipse load.`
      : `Battery usable capacity is ${evalResult.batteryUsableWh} Wh, which is less than the ${evalResult.eclipseNeedWh.toFixed(1)} Wh needed during eclipse. Add more batteries.`
  });

  // Check 5: Slots
  const availableSlots = bus ? bus.slots : 0;
  const slotsUsed = (design.instrumentIds || []).length;
  const slotsOk = slotsUsed <= availableSlots && bus !== null;
  checks.push({
    id: 'slots',
    ok: slotsOk,
    value: slotsUsed,
    limit: availableSlots,
    message: slotsOk
      ? `Payloads occupy ${slotsUsed} of ${availableSlots} available slots.`
      : `Your ${bus ? bus.name : 'bus'} only provides ${availableSlots} instrument slot(s), but you selected ${slotsUsed}. Remove instruments or select a larger bus.`
  });

  // Check 6: Computer
  const rawData = instruments.reduce((sum, inst) => sum + (inst.dataPerDay || 0), 0);
  const maxOBC = computer ? (computer.maxDataGbDay || 0) : 0;
  const obcOk = computer !== null && maxOBC >= rawData;
  checks.push({
    id: 'computer',
    ok: obcOk,
    value: rawData,
    limit: maxOBC,
    message: obcOk
      ? `Onboard computer handles ${rawData} GB/day payload data (capacity: ${maxOBC} GB/day).`
      : `Payloads produce ${rawData} GB/day, but ${computer ? computer.name : 'computer'} can only process ${maxOBC} GB/day. Upgrade the onboard computer.`
  });

  // Check 7: Pointing
  const pointingRanks = { coarse: 1, fine: 2, precision: 3 };
  const satRank = pointing ? (pointingRanks[pointing.quality] || 1) : 0;
  const isLowOrbit = orbit && (orbit.id === 'leo' || orbit.id === 'sso');
  let pointingOk = pointing !== null;
  let pointingMessage = pointing ? `Pointing system (${pointing.name}) meets attitude control requirements.` : 'No pointing system installed.';

  if (pointing) {
    if ((pointing.id === 'pointing_magnetorquers'||pointing.magneticOnly) && !isLowOrbit) {
      pointingOk = false;
      pointingMessage = 'Magnetorquers rely on Earth’s magnetic field and only work in LEO and SSO.';
    } else {
      for (const inst of instruments) {
        const reqRank = pointingRanks[inst.pointing] || 1;
        if (satRank < reqRank) {
          pointingOk = false;
          pointingMessage = `${inst.name} requires ${inst.pointing} pointing, but ${pointing.name} only provides ${pointing.quality}.`;
          break;
        }
      }
    }
  }

  checks.push({
    id: 'pointing',
    ok: pointingOk,
    value: pointing ? pointing.name : 'None',
    limit: 'Compatible',
    message: pointingMessage
  });

  if(comms?.requiredPointing&&(pointingRanks[comms.requiredPointing]||1)>satRank)checks.push({id:'radio_pointing',ok:false,message:comms.name+' requires '+comms.requiredPointing+' pointing.'});
  // Check 8: Orbit entry fuel
  const insertionFuel = orbit ? (orbit.insertionFuel || 0) : 0;
  const fuelOk = evalResult.fuelKg >= insertionFuel;
  checks.push({
    id: 'fuel',
    ok: fuelOk,
    value: evalResult.fuelKg,
    limit: insertionFuel,
    message: fuelOk
      ? `Carried fuel (${evalResult.fuelKg} kg) covers the required ${insertionFuel} kg insertion fuel.`
      : `Destination requires ${insertionFuel} kg insertion fuel, but you only carry ${evalResult.fuelKg} kg. Add fuel packs.`
  });

  // Check 9: Comms
  const commsOk = Boolean(comms);
  checks.push({
    id: 'comms',
    ok: commsOk,
    value: comms ? 1 : 0,
    limit: 1,
    message: commsOk
      ? `Communications unit (${comms.name}) installed.`
      : `Spacecraft has no communications unit installed. Equip a radio or dish.`
  });

  // Check 10: Reach
  const reachOk = evalResult.capacity > 0;
  checks.push({
    id: 'reach',
    ok: reachOk,
    value: evalResult.capacity,
    limit: 1,
    message: reachOk
      ? `${launcher ? launcher.name : 'Launcher'} can deliver payloads to ${orbit ? orbit.name : 'destination'}.`
      : `${launcher ? launcher.name : 'The selected launcher'} cannot reach ${orbit ? orbit.name : 'this orbit'} (capacity is 0 kg). Choose a more capable launcher.`
  });

  if(design.assembly&&mission&&!mission.transfer&&evalResult.lifetimeAchieved+1e-8<mission.targetLifetime)checks.push({id:'lifetime',ok:false,message:'Propellant supports '+evalResult.lifetimeAchieved.toFixed(2)+' years; this contract requires '+mission.targetLifetime+' years.'});
  if(design.assembly&&mission?.payload&&!instruments.some(p=>p.id===mission.payload||p.roleId===mission.payload))checks.push({id:'required_payload',ok:false,message:'Mission requires '+(findItem(data.instruments,mission.payload)?.name||mission.payload)+'.'});
  if(design.assembly)for(const [i,issue]of placementIssues(design.assembly,data,allowed).entries())checks.push({id:"placement-"+i,ok:false,message:issue.message});
  const service=mission?.transfer&&design.flightPlan?serviceMass(design.flightPlan,evalResult.spacecraftMass):null;
  const fairing=service?.wetKg&&launcher?{...launcher,fairingHeightM:launcher.fairingHeightM-Math.min(2,.35+service.wetKg/250)}:launcher;
  if(design.assembly)for(const issue of geometryIssues(design.assembly,data,fairing).filter(i=>i.instanceId==='bus'))checks.push({id:'fairing',ok:false,message:issue.message});
  return checks;
}

