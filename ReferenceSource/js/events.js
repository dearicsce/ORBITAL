import {launcherFor} from './rocket/engineering.js';
import { evaluateDesign } from './engine.js';

export function runEvents(design, data, rng = Math.random) {
  const diff = design.difficulty || 'normal';
  if (diff === 'easy' || design.missionId === 'tutorial' || data.missions.find(m=>m.id===design.missionId)?.transfer) {
    return [];
  }

  let eventIds = [];
  if (diff === 'normal') {
    const mission = (data.missions || []).find((m) => m.id === design.missionId);
    eventIds = [...(mission?.fixedEvents || [])];
  } else if (diff === 'hard') {
    const hardDiff = data.difficulty?.hard;
    const countRange = hardDiff?.eventCount || [2, 3];
    const minCount = countRange[0] ?? 2;
    const maxCount = countRange[1] ?? 3;
    const count = minCount + Math.floor(rng() * (maxCount - minCount + 1));

    const pool = (data.events || []).map((e) => e.id);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    eventIds = pool.slice(0, count);
  }

  const evalResult = evaluateDesign(design, data);
  const orbit = (data.orbits || []).find((o) => o.id === design.orbitId);
  const computer = (data.parts || []).find((p) => p.id === design.computerId);

  const results = [];

  for (const id of eventIds) {
    const eventDef = (data.events || []).find((e) => e.id === id);
    if (!eventDef) continue;

    const params = eventDef.params || {};
    let survived = false;
    let effect = 'None';
    let reason = '';
    let scienceMultiplier = 1.0;
    let lifetimeMultiplier = 1.0;

    switch (id) {
      case 'solar_flare': {
        const scienceLoss = params.scienceLoss ?? 0.30;
        const lowOrbit = orbit && (orbit.id === 'leo' || orbit.id === 'sso');
        const radTolerant = Boolean(computer?.radTolerant);
        survived = Boolean(lowOrbit || radTolerant);

        if (survived) {
          effect = 'None';
          scienceMultiplier = 1.0;
          lifetimeMultiplier = 1.0;
          reason = lowOrbit
            ? "Protected from solar flare by Earth's magnetic field in low orbit."
            : "Radiation-tolerant computer shielded the spacecraft from the solar flare.";
        } else {
          effect = `-${Math.round(scienceLoss * 100)}% science`;
          scienceMultiplier = 1.0 - scienceLoss;
          lifetimeMultiplier = 1.0;
          reason = `Unshielded computer reset in high radiation environment, losing ${Math.round(scienceLoss * 100)}% science.`;
        }
        break;
      }

      case 'antenna_fault': {
        const minMargin = params.minDownlinkMargin ?? 0.5;
        const downlinkMargin = evalResult.margins.downlink;
        survived = downlinkMargin >= minMargin;

        if (survived) {
          effect = 'None';
          scienceMultiplier = 1.0;
          lifetimeMultiplier = 1.0;
          reason = `Downlink margin was ${(downlinkMargin * 100).toFixed(1)}%, meeting the ${(minMargin * 100).toFixed(0)}% safe threshold.`;
        } else {
          const shortfall = Math.min(1.0, Math.max(0.0, (minMargin - downlinkMargin) / minMargin));
          effect = `-${Math.round(shortfall * 100)}% science`;
          scienceMultiplier = 1.0 - shortfall;
          lifetimeMultiplier = 1.0;
          reason = `Downlink margin was ${(downlinkMargin * 100).toFixed(1)}%, below the ${(minMargin * 100).toFixed(0)}% requirement (lost ${Math.round(shortfall * 100)}% science).`;
        }
        break;
      }

      case 'battery_fade': {
        const minMargin = params.minBatteryMargin ?? 0.25;
        const scienceLoss = params.scienceLoss ?? 0.15;
        const batteryMargin = evalResult.margins.battery;
        survived = batteryMargin >= minMargin;

        if (survived) {
          effect = 'None';
          scienceMultiplier = 1.0;
          lifetimeMultiplier = 1.0;
          reason = `Eclipse battery margin was ${(batteryMargin * 100).toFixed(1)}%, safely absorbing battery degradation.`;
        } else {
          effect = `-${Math.round(scienceLoss * 100)}% science`;
          scienceMultiplier = 1.0 - scienceLoss;
          lifetimeMultiplier = 1.0;
          reason = `Eclipse battery margin was ${(batteryMargin * 100).toFixed(1)}%, below the ${(minMargin * 100).toFixed(0)}% safety threshold (lost ${Math.round(scienceLoss * 100)}% science).`;
        }
        break;
      }

      case 'budget_cut': {
        const maxBudget = params.maxBudgetUsed ?? 0.80;
        const lifetimeLoss = params.lifetimeLoss ?? 0.20;
        const budgetUsed = evalResult.budgetUsedFraction;
        survived = budgetUsed <= maxBudget;

        if (survived) {
          effect = 'None';
          scienceMultiplier = 1.0;
          lifetimeMultiplier = 1.0;
          reason = `Budget used was ${(budgetUsed * 100).toFixed(1)}%, within the ${(maxBudget * 100).toFixed(0)}% safe buffer.`;
        } else {
          effect = `-${Math.round(lifetimeLoss * 100)}% lifetime`;
          scienceMultiplier = 1.0;
          lifetimeMultiplier = 1.0 - lifetimeLoss;
          reason = `Budget used was ${(budgetUsed * 100).toFixed(1)}%, exceeding the ${(maxBudget * 100).toFixed(0)}% safe limit (lost ${Math.round(lifetimeLoss * 100)}% mission lifetime).`;
        }
        break;
      }

      case 'debris_warning': {
        const fuelBurn = params.fuelBurnKg ?? 3;
        const lifetimeLoss = params.lifetimeLoss ?? 0.25;
        const insertionFuel = orbit ? (orbit.insertionFuel ?? 0) : 0;
        const extraFuel = evalResult.fuelKg - insertionFuel;
        survived = extraFuel >= fuelBurn;

        if (survived) {
          effect = 'None';
          scienceMultiplier = 1.0;
          lifetimeMultiplier = 1.0;
          reason = `Spacecraft carried ${extraFuel.toFixed(1)} kg extra fuel, covering the ${fuelBurn} kg avoidance burn.`;
        } else {
          effect = `-${Math.round(lifetimeLoss * 100)}% lifetime`;
          scienceMultiplier = 1.0;
          lifetimeMultiplier = 1.0 - lifetimeLoss;
          reason = `Only ${extraFuel.toFixed(1)} kg extra fuel available for avoidance burn (needed ${fuelBurn} kg; lost ${Math.round(lifetimeLoss * 100)}% lifetime).`;
        }
        break;
      }

      default:
        survived = true;
        effect = 'None';
        reason = 'No known risk factors encountered.';
        scienceMultiplier = 1.0;
        lifetimeMultiplier = 1.0;
        break;
    }

    results.push({
      id: eventDef.id,
      name: eventDef.name,
      survived,
      effect,
      reason,
      scienceMultiplier,
      lifetimeMultiplier
    });
  }

  return results;
}

export function rollLaunch(design, data, rng = Math.random) {
  const launcher = launcherFor(design,data);
  const reliability = launcher?.reliability ?? 1.0;

  const diff = design.difficulty || 'normal';
  const diffConfig = data.difficulty ? data.difficulty[diff] : null;
  const launchFailureEnabled = diffConfig?.launchFailure === true;

  if (!launchFailureEnabled || design.missionId === 'tutorial') {
    return { success: true, reliability };
  }

  const roll = rng();
  if (roll <= reliability) {
    return { success: true, reliability };
  } else {
    return {
      success: false,
      reliability,
      reason: 'Launch vehicle failed to reach orbit.'
    };
  }
}

export function applyEvents(evalResult, eventResults = []) {
  let sciencePoints = evalResult.sciencePoints;
  let lifetimeFactor = evalResult.lifetimeFactor ?? 1.0;
  const initialLifetimeFactor = lifetimeFactor;

  for (const ev of eventResults) {
    if (typeof ev.scienceMultiplier === 'number') {
      sciencePoints *= ev.scienceMultiplier;
    }
    if (typeof ev.lifetimeMultiplier === 'number') {
      lifetimeFactor *= ev.lifetimeMultiplier;
    }
  }

  if (lifetimeFactor < 1.0) {
    if (initialLifetimeFactor > 0) {
      sciencePoints *= (lifetimeFactor / initialLifetimeFactor);
    } else {
      sciencePoints *= lifetimeFactor;
    }
  }

  return { sciencePoints, lifetimeFactor };
}