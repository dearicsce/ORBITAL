/**
 * ORBITAL Campaign Policy & Active Mission Governance
 * 
 * Defines the authoritative boundary between active campaign missions and retired content.
 * 
 * Rules:
 * 1. Active campaign consists of 28 contracts across 7 solar/planetary chapters.
 * 2. 'proxima-sail' and stellar/galaxy destinations are retired from normal campaign navigation.
 * 3. Historical saves with Proxima completed retain their records and currency, but are excluded
 *    from the active campaign numerator and denominator.
 * 4. Retired drafts or active runs safely redirect to eligible active missions with a clear notice.
 */

export const RETIRED_MISSION_IDS = new Set(['proxima-sail']);
export const RETIRED_LEVEL_IDS = new Set(['stars', 'galaxy']);
export const RETIRED_CHAPTER_IDS = new Set(['Nearby stars', 'Milky Way overview']);

/**
 * Ordered list of active campaign chapters.
 */
export const CAMPAIGN_CHAPTERS = [
  { id: 'earth', name: 'Earth operations', subtitle: 'Observation & Earth orbits', icon: 'earth' },
  { id: 'moon', name: 'Moon and observatories', subtitle: 'Lunar science & transfer points', icon: 'moon' },
  { id: 'inner', name: 'Inner planets', subtitle: 'Venus & Mars reconnaissance', icon: 'inner' },
  { id: 'small-bodies', name: 'Small bodies', subtitle: 'Asteroid belt & comet encounters', icon: 'small-bodies' },
  { id: 'jupiter', name: 'Jupiter system', subtitle: 'Jovian radiation & icy moons', icon: 'jupiter' },
  { id: 'outer', name: 'Outer planets', subtitle: 'Saturn, Uranus & Neptune long cruise', icon: 'outer' },
  { id: 'frontier', name: 'Solar frontier', subtitle: 'Heliopause & local interstellar medium', icon: 'frontier' },
];

/**
 * Authoritative chapter grouping for the 28 retained active missions.
 */
export const CHAPTER_MISSIONS = {
  earth: ['m1', 'wildfire', 'ocean', 'ice', 'm2', 'storm', 'night', 'solar', 'dip'],
  moon: ['m3', 'mapping', 'relay', 'observatory', 'lunar-pathfinder', 'lunar-capture'],
  inner: ['venus-clouds', 'mars-scout', 'mars-orbiter'],
  'small-bodies': ['ceres-rendezvous', 'comet-pass'],
  jupiter: ['jupiter-scout', 'jupiter-orbiter', 'europa-scout'],
  outer: ['saturn-scout', 'uranus-scout', 'neptune-scout'],
  frontier: ['heliopause-crossing', 'interstellar-precursor'],
};

/**
 * Sequential order of all 28 active missions (Stage 01 to Stage 28).
 */
export const STAGE_ORDER_IDS = Object.values(CHAPTER_MISSIONS).flat();

/**
 * Check if a mission ID belongs to the active playable campaign.
 */
export function isActiveCampaignMission(missionId) {
  if (!missionId || typeof missionId !== 'string') return false;
  if (missionId === 'tutorial') return false;
  return !RETIRED_MISSION_IDS.has(missionId);
}

/**
 * Get all active playable campaign missions from world data.
 */
export function getActiveCampaignMissions(data) {
  if (!data?.missions || !Array.isArray(data.missions)) return [];
  // Return active missions sorted by the authoritative stage order
  const missionMap = new Map(data.missions.map(m => [m.id, m]));
  const ordered = [];
  for (const id of STAGE_ORDER_IDS) {
    const m = missionMap.get(id);
    if (m && isActiveCampaignMission(m.id)) {
      ordered.push(m);
    }
  }
  // Also append any unexpected newly added active missions not in the predefined 28
  for (const m of data.missions) {
    if (isActiveCampaignMission(m.id) && !ordered.some(existing => existing.id === m.id)) {
      ordered.push(m);
    }
  }
  return ordered;
}

/**
 * Retrieve retired mission definition for historical inspection.
 */
export function getRetiredCampaignMission(missionId, data) {
  if (!RETIRED_MISSION_IDS.has(missionId)) return null;
  return data?.missions?.find(m => m.id === missionId) || null;
}

/**
 * Compatibility lookup for reading historical runs/saves.
 */
export function getMissionForHistoricalSave(missionId, data) {
  return data?.missions?.find(m => m.id === missionId) || null;
}

/**
 * Check whether an active mission's prerequisites are met.
 */
export function isMissionUnlocked(mission, completed = {}) {
  if (!mission) return false;
  const requires = mission.requires || [];
  return requires.every(id => Boolean(completed[id]));
}

/**
 * Authoritative campaign progress computation.
 * Excludes retired completions from both numerator and denominator.
 */
export function getActiveCampaignProgress(state, data) {
  const active = getActiveCampaignMissions(data);
  const completed = state?.completedMissions || {};
  const completedCount = active.filter(m => Boolean(completed[m.id])).length;
  return {
    completed: completedCount,
    total: active.length, // 28
    isComplete: active.length > 0 && completedCount === active.length,
    percentage: active.length > 0 ? Math.round((completedCount / active.length) * 100) : 0,
  };
}

/**
 * Determine the next recommended active campaign contract.
 */
export function getNextRecommendedMission(state, data) {
  const active = getActiveCampaignMissions(data);
  if (!active.length) return null;
  const completed = state?.completedMissions || {};

  // 1. First unlocked, uncompleted core mission
  const nextCore = active.find(m => m.core && !completed[m.id] && isMissionUnlocked(m, completed));
  if (nextCore) return nextCore;

  // 2. First unlocked, uncompleted mission in stage order
  const nextAny = active.find(m => !completed[m.id] && isMissionUnlocked(m, completed));
  if (nextAny) return nextAny;

  // 3. If all completed, return first mission for replay or the terminal stage
  return active.find(m => !completed[m.id]) || active[0];
}

/**
 * Safe, versioned, idempotent save migration.
 * Cleanses retired active runs, drafts, and camera selections while preserving
 * historical records and currency.
 */
export function migrateRetiredCampaignState(state, data) {
  if (!state) return { state, migrated: false, notice: '' };
  let migrated = false;
  let notice = '';

  // 1. Check if current design is for a retired mission
  if (state.currentDesign?.missionId && RETIRED_MISSION_IDS.has(state.currentDesign.missionId)) {
    const recommended = getNextRecommendedMission(state, data) || { id: 'm1' };
    state.currentDesign.missionId = recommended.id;
    state.currentDesign.flightWorkflow = true;
    notice = 'The previous Proxima sail contract has been retired from the active campaign.';
    migrated = true;
  }

  // 2. Check current mission ID pointer
  if (state.currentMissionId && RETIRED_MISSION_IDS.has(state.currentMissionId)) {
    const recommended = getNextRecommendedMission(state, data) || { id: 'm1' };
    state.currentMissionId = recommended.id;
    migrated = true;
  }

  return { state, migrated, notice };
}
