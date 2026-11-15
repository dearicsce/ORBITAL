import {projectAssembly} from '../workshop/blueprint.js';
import { evaluateDesign } from './evaluate.js';
function findItem(list, id) {
  if (!Array.isArray(list) || !id) return null;
  return list.find((item) => item.id === id) || null;
}

export function rateDesign(design, data, eventResults = [], adjusted = null) {
  design=projectAssembly(design,data);
  const evalResult = evaluateDesign(design, data);
  const mission = findItem(data.missions, design.missionId);
  const computer = findItem(data.parts, design.computerId);
  const orbit = findItem(data.orbits, design.orbitId);

  // --- 1. ENGINEER ---
  // Find weakest margin among: launch mass, power, eclipse battery, downlink, fuel
  const m = evalResult.margins;
  const weakestMargin = Math.min(m.mass, m.power, m.battery, m.downlink, m.fuel);

  let engineerStars = 0.5;
  const engineerTiers = data.settings?.engineerTiers || [
    { minMargin: 0.15, stars: 2.0 },
    { minMargin: 0.10, stars: 1.5 },
    { minMargin: 0.05, stars: 1.0 },
    { minMargin: 0.00, stars: 0.5 }
  ];
  for (const tier of engineerTiers) {
    if (weakestMargin >= tier.minMargin) {
      engineerStars = tier.stars;
      break;
    }
  }

  // Deduct 0.5 star for each random event the design did not survive
  let failedEventsCount = 0;
  if (Array.isArray(eventResults)) {
    for (const ev of eventResults) {
      if (ev.survived === false) {
        failedEventsCount++;
      }
    }
  }
  engineerStars = Math.max(0, engineerStars - failedEventsCount * 0.5);

  // Beyond low Earth orbit without radiation-tolerant computer: Engineer gives at most 1 star
  const beyondLEO = orbit && orbit.id !== 'leo' && orbit.id !== 'sso';
  const radTolerant = computer && computer.radTolerant;
  if (beyondLEO && !radTolerant) {
    engineerStars = Math.min(engineerStars, 1.0);
  }

  // Engineer comment
  let engineerComment = `Weakest margin is ${(weakestMargin * 100).toFixed(1)}%. Good engineering margins across subsystems.`;
  if (weakestMargin < 0.05) {
    engineerComment = `Weakest margin is razor-thin at ${(weakestMargin * 100).toFixed(1)}%. Add extra battery, power, or fuel buffer.`;
  } else if (beyondLEO && !radTolerant) {
    engineerComment = `Operating beyond LEO without radiation hardening capped technical rating to 1 star.`;
  }

  // --- 2. SCIENTIST ---
  const thresholds = mission?.starThresholds || [2.5, 4.0, 5.5, 7.0];
  const sciencePoints = (adjusted && typeof adjusted.sciencePoints === 'number')
    ? adjusted.sciencePoints
    : evalResult.sciencePoints;

  let scientistStars = 0;
  if (sciencePoints >= thresholds[3]) {
    scientistStars = 2.0;
  } else if (sciencePoints >= thresholds[2]) {
    scientistStars = 1.5;
  } else if (sciencePoints >= thresholds[1]) {
    scientistStars = 1.0;
  } else if (sciencePoints >= thresholds[0]) {
    scientistStars = 0.5;
  }

  let scientistComment = `Delivered ${sciencePoints.toFixed(1)} science points. Meets mission objectives well.`;
  if (scientistStars < 1.0) {
    scientistComment = `Only ${sciencePoints.toFixed(1)} science points achieved. Add high-value mission-relevant instruments or improve downlink.`;
  }

  // --- 3. ACCOUNTANT ---
  const budgetFraction = evalResult.budgetUsedFraction;
  let accountantStars = 0.5;
  const accountantTiers = data.settings?.accountantTiers || [
    { maxBudgetFraction: 0.70, stars: 2.0 },
    { maxBudgetFraction: 0.80, stars: 1.5 },
    { maxBudgetFraction: 0.90, stars: 1.0 },
    { maxBudgetFraction: 1.00, stars: 0.5 }
  ];
  for (const tier of accountantTiers) {
    if (budgetFraction <= tier.maxBudgetFraction) {
      accountantStars = tier.stars;
      break;
    }
  }

  let accountantComment = `Budget used is ${(budgetFraction * 100).toFixed(1)}% of allocation ($${evalResult.totalCost}M). Excellent cost efficiency.`;
  if (budgetFraction > 0.9) {
    accountantComment = `Budget used is ${(budgetFraction * 100).toFixed(1)}%. Consider switching to a smaller bus or cheaper launcher to save money.`;
  }

  // Total stars & Medal
  const total = engineerStars + scientistStars + accountantStars;
  let medal = null;
  const medals = data.settings?.medals || [
    { name: 'Bronze', minStars: 3.0, maxStars: 4.0 },
    { name: 'Silver', minStars: 4.5, maxStars: 5.0 },
    { name: 'Gold', minStars: 5.5, maxStars: 6.0 }
  ];
  for (const mDef of medals) {
    if (total >= mDef.minStars && total <= mDef.maxStars) {
      medal = mDef.name;
      break;
    }
  }

  return {
    engineer: engineerStars,
    scientist: scientistStars,
    accountant: accountantStars,
    total,
    medal,
    comments: {
      engineer: engineerComment,
      scientist: scientistComment,
      accountant: accountantComment
    }
  };
}

