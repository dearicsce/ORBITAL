import {getFlightSession, flightStorageIssue} from '../flightSession.js';
import {getState, setDesign, setSettings, saveProgress} from '../state.js';
import {showScreen} from '../ui/router.js';
import {escapeHtml} from '../ui/html.js';
import {startEarth, stopEarth} from '../three/earth.js';
import {campaignDraft, resolveCampaignContinuation, acknowledgeReport} from '../unity/campaignResume.js';
import {ANCHOR, WINDOWS, PERIOD, CASES, DURATION_HOURS} from '../kepler/keplerConfig.js';
import {archivedNeighborhood, MEDIAN} from '../kepler/keplerSource.js';
import {predictionAt} from '../kepler/keplerPredictions.js';

const plot = archivedNeighborhood(ANCHOR).map(row => ({
  hourOffset: (row.time - ANCHOR) * 24,
  label: row.time.toFixed(6) + ' BKJD',
  flux: row.flux / MEDIAN,
  isSharedDipWindow: Math.abs(row.time - ANCHOR) * 48 <= DURATION_HOURS,
}));

const candidateDates = WINDOWS.map(window => ({
  id: window.id,
  archiveDate: window.label + ' · ' + window.archiveDate,
  relativeHours: window.relativeHours + ' from reference event',
  ephemerisNote: window.center.toFixed(4) + ' BKJD',
  visibilityWindow: ['H1', 'H2'].map(id => id + ' predicts ' + predictionAt(window.center, id)).join(' · '),
}));

const predictionTracks = ['H1', 'H2'].map((id, index) => ({
  id,
  teamName: 'Team ' + (index + 1) + ' · ' + id,
  modelCode: 'Period ' + (PERIOD * (index + 1)).toFixed(2) + ' days',
  hypothesisSummary: 'A dip recurs every ' + (PERIOD * (index + 1)).toFixed(2) + ' days.',
}));

export function createLiveAdapterFacade(container, data, screen) {
  const listeners = new Set();
  let isNavigating = false;
  let showingSharedExample = true;
  let showingTimeSystemNote = false;
  let notice = '';
  let snapshot;

  function refresh() {
    const state = getState();
    const flight = getFlightSession();
    const continuation = resolveCampaignContinuation(state, data, flight);
    const current = state.currentDesign;
    const hasSave = continuation.kind !== 'openCampaign';
    const savedDraftLabel = continuation.label || 'Continue Campaign';

    snapshot = {
      activeScreen: screen,
      hasSave,
      continuationKind: continuation.kind,
      selectedDateId: current.windowId ?? null,
      selectedTrackId: current.prediction ?? null,
      policy: current.keplerPolicy ?? 'all',
      caseId: current.keplerCase ?? 'nominal',
      savedDraftLabel,
      sharedEventPlot: plot,
      candidateDates,
      predictionTracks,
      showingSharedExample,
      showingTimeSystemNote,
      notice,
    };
    for (const notify of listeners) notify();
  }

  function updateDesign(patch) {
    const design = setDesign(patch).currentDesign;
    const saved = Object.entries(patch).every(([key, value]) => JSON.stringify(design[key]) === JSON.stringify(value)) && saveProgress();
    notice = saved ? '' : 'The mission plan could not be saved. Check profile storage and try again.';
    refresh();
    return saved;
  }

  function continueCampaign() {
    if (isNavigating) return;
    const state = getState();
    const flight = getFlightSession();
    const continuation = resolveCampaignContinuation(state, data, flight);

    if (continuation.kind === 'blocked') {
      notice = continuation.reason || 'Storage unavailable.';
      refresh();
      return;
    }

    isNavigating = true;
    try {
      if (continuation.kind === 'resumeRun') {
        if (flight?.design && flight.design.missionId !== getState().currentDesign.missionId) {
          setDesign(flight.design);
          if (!saveProgress()) {
            notice = 'Could not save flight configuration.';
            refresh();
            isNavigating = false;
            return;
          }
        }
        showScreen(continuation.targetScreen || 'simulation', continuation.targetParams);
      } else if (continuation.kind === 'resumeDraft') {
        showScreen(continuation.targetScreen || 'workshop', continuation.targetParams || {mission: true});
      } else if (continuation.kind === 'viewReport') {
        showScreen(continuation.targetScreen || 'report', continuation.targetParams);
      } else {
        showScreen('missionSelect', {openNext: true});
      }
    } finally {
      setTimeout(() => { isNavigating = false; }, 300);
    }
  }

  function start() {
    const current = getState().currentDesign;
    if (flightStorageIssue()) {
      notice = 'The saved flight could not be read. Check the profile before starting another mission.';
      refresh();
      return;
    }
    const flight = getFlightSession();
    const active = flight && flight.phase !== 'report' ? flight : null;
    const draft = campaignDraft(getState(), data, null);
    if (current.missionId !== 'dip' && (active || draft) &&
        !window.confirm('Start Catch the Next Dip? This replaces the active campaign selection. Named spacecraft designs remain available.')) return;

    if (current.missionId !== 'dip' && !updateDesign({
      missionId: 'dip', evidencePlan: null, busId: null, assembly: null, panelIds: [], batteryIds: [],
      commsId: null, computerId: null, pointingId: null, fuelIds: [], instrumentIds: [],
      launcherId: null, orbitId: null, orbitElements: null, rocketId: null, rocketBlueprint: null,
      planId: null, flightPlan: null, stationIds: null, trainingStep: 1, trainingOrbits: [],
      spacecraftName: 'Kepler photometry satellite', spacecraftBlueprintId: null,
      scienceBundleId: null, flightWorkflow: true, windowId: null, prediction: null,
      keplerCase: 'nominal', keplerPolicy: 'all', keplerRecipe: 'native',
    })) return;
    showScreen('brief');
  }

  function openSettings() {
    const trigger = document.activeElement;
    const settings = getState().settings;
    const dialog = document.createElement('dialog');
    dialog.className = 'orbital-learning-dialog';
    dialog.setAttribute('aria-labelledby', 'game-settings-title');
    dialog.innerHTML = `<form method="dialog"><button class="orbital-button" autofocus>Close</button></form>
      <h2 id="game-settings-title">Settings</h2>
      <label><input type="checkbox" id="game-audio" ${settings.audio ? 'checked' : ''}> Sound effects</label>
      <fieldset class="audio-mixer"><legend>Volume</legend>
      ${[['masterVolume', 'Master'], ['effectsVolume', 'Effects'], ['ambienceVolume', 'Ambience']].map(([key, label]) => `<label>${label}<input type="range" min="0" max="1" step=".05" data-mix="${key}" value="${escapeHtml(settings[key] ?? .75)}"></label>`).join('')}</fieldset>`;
    container.append(dialog);
    dialog.addEventListener('change', event => {
      const input = event.target;
      if (input.id === 'game-audio') setSettings({audio: input.checked});
      if (input.dataset.mix) setSettings({[input.dataset.mix]: Number(input.value)});
      saveProgress();
    });
    dialog.addEventListener('close', () => {dialog.remove(); trigger?.focus();}, {once: true});
    dialog.showModal();
  }

  refresh();
  return {
    subscribe(notify) {listeners.add(notify); return () => listeners.delete(notify);},
    getMissionState: () => snapshot,
    mountScene(_scene, host) { startEarth(host); return stopEarth; },
    continueCampaign,
    // Compatibility aliases:
    startCatchTheNextDip: start,
    resumeSavedAttempt: continueCampaign,
    openLegacyCampaign: () => showScreen('missionSelect', {openNext: true}),
    openHangar: () => showScreen('workshop', {mission: false}),
    openAcademy: () => showScreen('academy'),
    openReference: () => showScreen('evidence'),
    openSettings,
    returnToTitle: () => {
      const flight = getFlightSession();
      if (flight?.phase === 'report' && flight.runId) {
        acknowledgeReport(flight.runId);
      }
      showScreen('menu');
    },
    toggleSharedEventExample() {showingSharedExample = !showingSharedExample; refresh();},
    toggleTimeSystemNote() {showingTimeSystemNote = !showingTimeSystemNote; refresh();},
    selectPredictionTrack(id) {if (['H1', 'H2'].includes(id)) updateDesign({prediction: snapshot.selectedTrackId === id ? null : id});},
    selectCandidateDate(id) {if (WINDOWS.some(window => window.id === id)) updateDesign({windowId: id});},
    choosePolicy(id) {if (['all', 'bracket'].includes(id)) updateDesign({keplerPolicy: id});},
    chooseCase(id) {if (Object.hasOwn(CASES, id)) updateDesign({keplerCase: id});},
    useStarterSpacecraft() {
      if (!snapshot.selectedDateId || !updateDesign({flightWorkflow: true})) return;
      const current = getState().currentDesign;
      const preset = {
        ...current, assembly: null, busId: 'bus_micro', panelIds: ['panel_m'], batteryIds: ['battery_m'],
        commsId: 'comms_x_band', computerId: 'computer_basic', pointingId: 'pointing_reaction_wheels',
        fuelIds: ['fuel_s'], instrumentIds: ['optical_camera'],
      };
      showScreen('workshop', {mission: true, preset});
    },
    lockPredictionAndProceed() {
      if (snapshot.selectedDateId && updateDesign({flightWorkflow: true})) showScreen('workshop', {mission: true});
    },
  };
}

export function mountMissionDeck(container, data, screen) {
  window.OrbitalAdapter = createLiveAdapterFacade(container, data, screen);
  const unmount = window.mountOrbitalUI(container, screen);
  return () => {
    unmount();
    delete window.OrbitalAdapter;
  };
}
