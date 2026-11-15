import {TRANSFER_MISSIONS} from './transfer/catalogue.js';
import {extendCatalogue} from './workshop/catalogue.js';
import content from './campaignContent.js';
import {adaptWorld} from './contracts/world.js';
// Campaign content extends the original three contracts without changing their IDs.
export const CHAPTERS = [
  { id: 'earth', name: 'Protect our planet', subtitle: 'Earth observation', number: '01' },
  { id: 'network', name: 'Connect the world', subtitle: 'Communications & resilience', number: '02' },
  { id: 'frontier', name: 'Beyond the horizon', subtitle: 'Lunar & deep space', number: '03' }
];

const contracts = content.contracts;

export function enrichCampaign(data) {
  adaptWorld(data);
  if (data.campaignVersion >= 2) {
    if(data.campaignVersion===2)data.missions.push(...structuredClone(TRANSFER_MISSIONS));
    data.campaignVersion=3;
    return adaptWorld(extendCatalogue(data));
  }
  const original = content.original;
  data.missions.forEach(m => { if(original[m.id]) Object.assign(m,structuredClone(original[m.id])); });
  data.missions.push(...contracts.map(m=>({...structuredClone(m),fixedEvents:[]})));
  // The extended Atlas scenario already exists in the source catalogue.
  const heavy=data.launchers.find(l=>l.id==='roc');if(heavy)heavy.unlock='after_m3';
  data.missions.push(...structuredClone(TRANSFER_MISSIONS));
  const extended=data.launchers.find(l=>l.id==='roc');if(extended)extended.name='ORBITAL Atlas-derived heavy preset';
  const concept=data.launchers.find(l=>l.id==='albatross');if(concept)concept.name='Ares I · concept preset';
  data.campaignVersion=3;
  return adaptWorld(extendCatalogue(data));
}

export function isMissionUnlocked(mission, completed = {}) {
  return (mission.requires || []).every(id => Boolean(completed[id]));
}

export function missionPrerequisite(mission, data) {
  return (mission.requires || []).map(id=>data.missions.find(m=>m.id===id)?.name||id).join(' + ');
}

export function campaignOrder(data) {
  return CHAPTERS.flatMap(chapter=>data.missions.filter(m=>m.chapter===chapter.id));
}

export function programOrder(data){return [...campaignOrder(data),...data.missions.filter(m=>m.transfer)];}

// Editable baseline, not an auto-winning design. All components remain visible.
export function starterDesign(mission, data, difficulty='normal') {
  if(mission.transfer){
    const distant=['ceres','jupiter','europa','saturn','uranus','neptune','frontier','precursor','proxima'].includes(mission.destination);
    return {missionId:mission.id,difficulty,launcherId:'albatross',orbitId:'leo',busId:'bus_micro',
     panelIds:['panel_l'],batteryIds:['battery_m'],
     commsId:distant?'comms_ka_band':'comms_x_band',computerId:'computer_rad_hard',
     pointingId:distant?'pointing_star_tracker':'pointing_reaction_wheels',fuelIds:distant?['fuel_m']:['fuel_s'],instrumentIds:[mission.payload]};
  }
  const lunar=mission.chapter==='frontier'&&mission.id!=='dip';
  const relay=Boolean(mission.profile?.relay);
  const payload=mission.payload||'optical_camera';
  const orbitId=lunar?(mission.id==='observatory'?'lagrange':'llo'):relay?'geo':mission.id==='night'?'leo':'sso';
  const launcherId=lunar?'albatross':relay||mission.id==='solar'?'condor':'kestrel';
  return {
    missionId:mission.id,difficulty,launcherId,orbitId,
    busId:relay?'bus_small':'bus_micro',
    panelIds:relay?['panel_m','panel_m']:['panel_m'],
    batteryIds:['battery_m'],
    commsId:'comms_x_band',
    computerId:lunar||mission.id==='solar'?'computer_rad_hard':'computer_basic',
    pointingId:['spectrometer','laser_altimeter'].includes(payload)?'pointing_star_tracker':'pointing_reaction_wheels',
    fuelIds:lunar?['fuel_l']:relay?['fuel_m','fuel_s']:['fuel_s'],
    instrumentIds:[payload]
  };
}

