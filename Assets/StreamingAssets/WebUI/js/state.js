// Game state management and local persistence
import { canCompleteFlight } from './flightCompletion.js';
import {migrateDesign,validateProgress,validateFlightRecord,assertSerializable} from './contracts/validate.js';
let worldData=null;
export function configureStateContracts(data){worldData=data;}

const STORAGE_KEY = 'space_mission_game_state_v1';

function getDefaultDesign() {
  return {
    schemaVersion: 2,
    missionId: 'tutorial',
    busId: null,
    panelIds: [],
    batteryIds: [],
    commsId: null,
    computerId: null,
    pointingId: null,
    fuelIds: [],
    instrumentIds: [],
    orbitId: null,
    launcherId: null,
    difficulty: 'normal'
  };
}

function getDefaultState() {
  return {
    schemaVersion: 2,
    currentMissionId: 'tutorial',
    difficulty: 'normal',
    tutorialDone: false,
    completedMissions: {}, // { [missionId]: { stars: number, medal: string|null, rating: object } }
    currentDesign: getDefaultDesign(),
    settings: {
      audio: true,
      masterVolume:.75,
      effectsVolume:.8,
      ambienceVolume:.55,
      hints: true
    }
  };
}

let state = getDefaultState();

export function getState() {
  return JSON.parse(JSON.stringify(state));
}

export function resetState() {
  state = getDefaultState();
  return getState();
}

export function setSettings(partial) {
  if (partial && typeof partial === 'object') {
    try{
      assertSerializable(partial);
      for(const key of ['audio','hints'])if(partial[key]!==undefined&&typeof partial[key]!=='boolean')throw new Error('Invalid settings');
      for(const key of ['masterVolume','effectsVolume','ambienceVolume'])if(partial[key]!==undefined&&(!Number.isFinite(partial[key])||partial[key]<0||partial[key]>1))throw new Error('Invalid volume');
    }catch{return getState();}
    state.settings = {
      ...state.settings,
      ...partial
    };
  }
  return getState();
}

export function setDesign(partial) {
  if (partial && typeof partial === 'object') {
    if(partial.missionId&&partial.missionId!==state.currentDesign.missionId&&!Object.hasOwn(partial,'scienceBundleId'))partial={...partial,scienceBundleId:null};
    let candidate={
      ...state.currentDesign,
      ...partial
    };
    try{candidate=migrateDesign(candidate,worldData,{strictSlots:false});}catch{return getState();}
    state.currentDesign = candidate;
    if(typeof window!=='undefined')window.dispatchEvent(new Event('orbital-design-change'));
    if (partial.missionId) {
      state.currentMissionId = partial.missionId;
    }
    if (partial.difficulty) {
      state.difficulty = partial.difficulty;
    }
  }
  return getState();
}

export function clearDesign() {
  state.currentDesign = {
    schemaVersion: 2,
    missionId: state.currentMissionId || 'tutorial',
    busId: null,
    panelIds: [],
    batteryIds: [],
    commsId: null,
    computerId: null,
    pointingId: null,
    fuelIds: [],
    instrumentIds: [],
    orbitId: null,
    launcherId: null,
    difficulty: state.difficulty || 'normal'
  };
  return getState();
}

export function markTutorialDone() {
  state.tutorialDone = true;
  return getState();
}

export function completeMission(missionId, rating, passStars = 3.0, flight = null) {
  if(worldData?.missions.find(m=>m.id===missionId)?.transfer&&(!flight?.mission?.transfer||!flight.cruise))return false;
  if (!canCompleteFlight(missionId, rating, passStars, flight)) return false;
  try{assertSerializable(rating);assertSerializable(flight);}catch{return false;}

  const totalStars = typeof rating.total === 'number' ? rating.total : 0;
  if (totalStars < passStars) {
    return false;
  }

  const existing = state.completedMissions[missionId];
  if (!existing || totalStars > existing.stars) {
    const record = {
      schemaVersion: 2,
      missionId,
      scoringVersion: flight.scoringVersion || 'ops-1',
      stars: totalStars,
      medal: rating.medal || null,
      rating: structuredClone(rating)
    };
    try{validateFlightRecord(record,worldData);}catch{return false;}
    state.completedMissions[missionId] = record;
  }

  return true;
}

export function saveProgress(storage) {
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    if (!storage) return false;
    const payload = JSON.stringify(state);
    storage.setItem(STORAGE_KEY, payload);
    return true;
  } catch (err) {
    return false;
  }
}

export function loadProgress(storage) {
  try {
    if (storage === undefined) storage = globalThis.localStorage;
    if (!storage) return false;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const loaded = validateProgress(JSON.parse(raw),worldData);
    if (loaded && typeof loaded === 'object') {
      state = {
        ...getDefaultState(),
        ...loaded,
        tutorialDone: Boolean(loaded.tutorialDone),
        completedMissions: loaded.completedMissions || {},
        currentDesign: {
          ...getDefaultDesign(),
          ...(loaded.currentDesign || {})
        },
        settings: {
          ...getDefaultState().settings,
          ...(loaded.settings || {})
        }
      };
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

// Validate the entire import before touching memory or persistence.
export function importProgress(payload,data=worldData) {
  try{
    const parsed=validateProgress(typeof payload==='string'?JSON.parse(payload):payload,data);
    const defaults=getDefaultState();
    const candidate={...defaults,...parsed,currentDesign:{...getDefaultDesign(),...parsed.currentDesign},settings:{...defaults.settings,...parsed.settings}};
    assertSerializable(candidate);state=structuredClone(candidate);return {ok:true,state:getState()};
  }catch(error){return {ok:false,error:error.message};}
}
