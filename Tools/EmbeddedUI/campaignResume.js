import {profileStorage} from './practiceProfile.js';
import {flightStorageIssue} from '../flightSession.js';
import {isMissionUnlocked, isActiveCampaignMission, getNextRecommendedMission} from './campaignPolicy.js';

const key = 'orbital_campaign_resume_v1';
const ackKey = 'orbital_acknowledged_reports_v1';

const screens = {
  brief: 'Mission brief',
  workshop: 'Spacecraft design',
  rocketSelect: 'Launcher selection',
  rocketWorkshop: 'Launcher design',
  orbitSelect: 'Orbit selection',
  flightPlan: 'Flight plan',
  advisory: 'Readiness checks',
  review: 'Launch review',
};

export function rememberCampaignDraft(screen, params, design) {
  if (screen === 'simulation') { clearCampaignDraft(); return; }
  if (!Object.hasOwn(screens, screen) || !design?.flightWorkflow || !design.missionId || design.missionId === 'tutorial') return;
  if (!isActiveCampaignMission(design.missionId)) return;
  if (['workshop', 'rocketWorkshop'].includes(screen) && !params.mission) return;
  try {
    profileStorage().setItem(key, JSON.stringify({screen, missionId: design.missionId}));
  } catch {
    dispatchEvent(new CustomEvent('orbital-storage-issue', {detail: 'The campaign resume location could not be saved. Export your design and check profile permissions or free disk space before restarting.'}));
  }
}

export function clearCampaignDraft() {
  try {
    profileStorage().removeItem(key);
  } catch {
    dispatchEvent(new CustomEvent('orbital-storage-issue', {detail: 'The previous resume location could not be cleared. The active flight remains available; check profile storage before restarting.'}));
  }
}

export function campaignDraft(state, data, reportMissionId, storage = profileStorage()) {
  const design = state?.currentDesign;
  if (!design?.flightWorkflow) return null;
  if (!isActiveCampaignMission(design.missionId)) return null;
  const mission = data?.missions?.find(m => m.id === design.missionId && m.id !== 'tutorial');
  if (!mission || !isMissionUnlocked(mission, state.completedMissions)) return null;
  let stored;
  try {
    stored = JSON.parse(storage?.getItem(key));
  } catch {}
  const bookmarked = stored?.missionId === mission.id && Object.hasOwn(screens, stored.screen);
  // A replay gets its own planning bookmark. Older releases kept the flown design after debrief.
  if (!bookmarked && (reportMissionId === mission.id || state.completedMissions?.[mission.id])) return null;
  if (stored?.missionId && !isActiveCampaignMission(stored.missionId)) return null;
  const screen = bookmarked ? stored.screen : (mission.id === 'dip' && !design.windowId ? 'brief' : 'workshop');
  return {screen, missionId: mission.id, label: screens[screen] || 'Spacecraft design'};
}

export function unfinishedFlight(flight) {
  return flight?.design?.missionId && !['report', 'complete', 'failed'].includes(flight.phase) ? flight : null;
}

export function isReportAcknowledged(runId, storage = profileStorage()) {
  if (!runId) return false;
  try {
    const raw = storage?.getItem(ackKey);
    if (!raw) return false;
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.includes(runId);
  } catch {
    return false;
  }
}

export function acknowledgeReport(runId, storage = profileStorage()) {
  if (!runId) return;
  try {
    const raw = storage?.getItem(ackKey);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;
    if (!list.includes(runId)) {
      list.push(runId);
      if (list.length > 50) list.shift();
      storage?.setItem(ackKey, JSON.stringify(list));
    }
  } catch {}
}

/**
 * Authoritative deterministic continuation resolver for the single Continue Campaign action.
 * Priority:
 * 1. Valid unfinished persisted run for active mission (resumeRun)
 * 2. Valid unfinished campaign draft without an active run (resumeDraft)
 * 3. Completed but still pending/unacknowledged report for active mission (viewReport)
 * 4. Campaign progression selector with next available unlock (openCampaign)
 */
export function resolveCampaignContinuation(state, data, flight, storage = profileStorage()) {
  const storageIssue = flightStorageIssue();
  if (storageIssue) {
    return {
      kind: 'blocked',
      reason: storageIssue,
      label: 'Storage unavailable',
    };
  }

  // 1. Valid unfinished persisted run
  const activeRun = unfinishedFlight(flight);
  if (activeRun && flight.design?.missionId) {
    // If the active run is on a retired mission, do not loop into removed content
    if (!isActiveCampaignMission(flight.design.missionId)) {
      const nextMission = getNextRecommendedMission(state, data);
      return {
        kind: 'openCampaign',
        targetScreen: 'missionSelect',
        targetParams: { openNext: true, retiredNotice: true },
        notice: 'The previous Proxima sail contract has been retired from the active campaign.',
        label: 'Continue Campaign',
        retiredMissionId: flight.design.missionId,
      };
    }
    const mission = data?.missions?.find(m => m.id === flight.design.missionId);
    const missionName = mission?.name || flight.design.missionId;
    return {
      kind: 'resumeRun',
      runId: flight.runId,
      missionId: flight.design.missionId,
      targetScreen: 'simulation',
      targetParams: { mission: true },
      label: 'Resume · ' + missionName,
    };
  }

  // 2. Valid unfinished campaign draft without an active run
  const stagedDip = state?.currentDesign?.missionId === 'dip' && state.currentDesign.windowId &&
    !state.completedMissions?.dip && flight?.design?.missionId !== 'dip' && !Object.hasOwn(state.currentDesign, 'flightWorkflow');
  const draft = campaignDraft(state, data, activeRun ? null : flight?.design?.missionId, storage);
  if (draft && isActiveCampaignMission(draft.missionId)) {
    const mission = data?.missions?.find(m => m.id === draft.missionId);
    const missionName = mission?.name || draft.missionId;
    return {
      kind: 'resumeDraft',
      missionId: draft.missionId,
      targetScreen: draft.screen,
      targetParams: { mission: true },
      label: 'Resume · ' + missionName,
    };
  } else if (stagedDip) {
    return {
      kind: 'resumeDraft',
      missionId: 'dip',
      targetScreen: 'brief',
      targetParams: { mission: true },
      label: 'Resume · Catch the Next Dip',
    };
  }

  // 3. Completed but still pending / unacknowledged report
  if (flight?.phase === 'report' && flight.runId) {
    const acknowledged = isReportAcknowledged(flight.runId, storage);
    if (!acknowledged && isActiveCampaignMission(flight.design?.missionId)) {
      const mission = data?.missions?.find(m => m.id === flight.design?.missionId);
      const missionName = mission?.name || flight.design?.missionId || 'Flight';
      return {
        kind: 'viewReport',
        runId: flight.runId,
        missionId: flight.design?.missionId,
        targetScreen: 'report',
        targetParams: {},
        label: 'Debrief · ' + missionName,
      };
    }
  }

  // 4. Default / fresh profile -> open campaign stage selector with next unlocked contract
  return {
    kind: 'openCampaign',
    targetScreen: 'missionSelect',
    targetParams: { openNext: true },
    label: 'Continue Campaign',
  };
}
