import {TRANSFER_TARGETS} from '../transfer/catalogue.js';
import {validatePlan} from '../transfer/planning.js';
import {validateRocket} from '../rocket/engineering.js';
import {assertSerializable} from './serializable.js';
export {assertSerializable} from './serializable.js';
import {validateAssembly,projectAssembly} from '../workshop/blueprint.js';
import {validateOrbit,presetOrbit,EARTH_STATIONS} from '../engine/orbitalGeometry.js';
import {INCIDENTS} from '../engine/operations.js';
import {validateRules} from '../unity/spacecraftSystems.js';
export const SCHEMA_VERSION=2;
export function number(value,name,{min=0,max=Infinity,integer=false}={}) {
  if(!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isSafeInteger(value)))throw new Error(`${name} is outside its valid range`);
}
function uniqueIds(list,name){
  if(!Array.isArray(list)||!list.length)throw new Error(`${name} must be a nonempty list`);
  const seen=new Set();for(const p of list){if(typeof p.id!=='string'||!p.id||seen.has(p.id))throw new Error(`${name}: invalid or duplicate ID`);seen.add(p.id);}return seen;
}
export function validatePart(p){
  assertSerializable(p);
  for(const field of ['category','subcategory','description','intendedStrengths','limitations','balanceStatus'])if(typeof p[field]!=='string'||!p[field].trim())throw Error(`Part ${p.id}: missing ${field}`);
  if(!p.attachmentRequirements||typeof p.attachmentRequirements.kind!=='string'||!Array.isArray(p.unlockPrerequisites))throw Error(`Part ${p.id}: missing attachment/unlock contract`);
  number(p.unlockPrice,'unlock price',{integer:true});
  if(['battery','computer','pointing','fuel'].includes(p.type))number(p.bayUnits,'internal bay units',{min:1,max:64,integer:true});
  if(p.dimensionsM){if(!Array.isArray(p.dimensionsM)||p.dimensionsM.length!==3)throw Error('Invalid dimensions');for(const n of p.dimensionsM)number(n,'component dimension',{min:.00001});}
  else number(p.installationVolumeM3,'installation volume',{min:.0000001});
  if(p.type==='fuel'&&!p.includesThruster)throw Error('Propellant requires integrated propulsion hardware');
  if(p.schemaVersion!==2||typeof p.visualId!=='string'||!p.visualId||typeof p.units!=='object'||!p.units||typeof p.resources!=='object'||!p.resources)throw new Error(`Part ${p.id}: missing version, units or visual ID`);
  if(p.units.mass!=='kg'||p.units.cost!=='million USD'||p.units.power!=='W')throw new Error('Unsupported catalog units');
  for(const key of ['massKg','costUsd','generatedPowerW','basePowerW','operatingPowerW','batteryCapacityJ','recorderCapacityBit','processingBitPerSec','instrumentBitPerSec','transmitPowerW','standbyPowerW','propellantKg'])number(p.resources[key],`${p.id}.${key}`);
  for(const [key,value] of Object.entries(p.resources))number(value,`${p.id}.${key}`);
  for(const key of ['mass','cost','power','baseLoad','capacityWh','recorderCapacityGb','maxDataGbDay','baseDownlinkGbDay','fuelKg','dataPerDay'])if(p[key]!==undefined)number(p[key],`${p.id}.${key}`);
  if(p.slots!==undefined)number(p.slots,'slots',{integer:true,max:100});
  if(p.type==='computer')number(p.recorderCapacityGb,'recorder capacity',{min:.001});
  if(p.type==='comms'){number(p.standbyPowerW,'standby power');number(p.transmitPowerW,'transmit power',{min:p.standbyPowerW});}
  if(p.type==='fuel'&&p.fuelKg>p.mass)throw new Error('Propellant exceeds wet pack mass');
  return p;
}
export function validateWorld(data){
  assertSerializable(data);
  const parts=uniqueIds(data.parts,'parts'), instruments=uniqueIds(data.instruments,'instruments'), missions=uniqueIds(data.missions,'missions'), launchers=uniqueIds(data.launchers,'launchers'), orbits=uniqueIds(data.orbits,'orbits');
  for(const p of [...data.parts,...data.instruments])validatePart(p);
  for(const m of data.missions){
    if(m.schemaVersion!==2||!m.units)throw new Error('Missing mission schema/units');
    if(m.transfer&&(!TRANSFER_TARGETS[m.destination]||!['flyby','capture','rendezvous','crossing'].includes(m.transfer.type)||!m.profile||m.orbitFit?.leo!==1))throw Error('Invalid transfer mission');
    if(m.missionDifficulty!==undefined)number(m.missionDifficulty,'fixed mission difficulty',{min:1,max:5,integer:true});
    number(m.budget,'mission budget',{min:.001});number(m.targetLifetime,'mission lifetime',{min:.001});
    if(!Array.isArray(m.launchers)||!m.launchers.length||m.launchers.some(id=>!launchers.has(id)))throw new Error('Invalid mission launcher');
    if(Object.keys(m.relevance||{}).some(id=>!instruments.has(id))||Object.keys(m.orbitFit||{}).some(id=>!orbits.has(id)))throw new Error('Invalid mission hardware/orbit ID');
    for(const n of Object.values(m.relevance||{}))number(n,'instrument relevance');
    for(const n of Object.values(m.orbitFit||{}))number(n,'orbit fit',{max:1});
    if((m.requires||[]).some(id=>!missions.has(id)||id===m.id))throw new Error('Invalid mission prerequisite');
    if(m.payload&&!instruments.has(m.payload)||(m.fixedEvents||[]).some(id=>!data.events.some(e=>e.id===id))||(m.profile?.incidents||[]).some(id=>!INCIDENTS[id]))throw new Error('Invalid mission payload/event ID');
    if(m.profile){number(m.profile.coverage,'coverage',{max:100});number(m.profile.delivered,'delivery');for(const key of ['contact','eclipse'])number(m.profile[key],'profile '+key,{max:1});}
  }
  function visit(id,trail=[]){if(trail.includes(id))throw new Error('Mission prerequisite cycle');for(const next of data.missions.find(m=>m.id===id).requires||[])visit(next,[...trail,id]);}
  for(const id of missions)visit(id);
  return data;
}
export function migrateDesign(input,data,{strictSlots=true}={}) {
  assertSerializable(input);
  if(!input||typeof input!=='object'||Array.isArray(input)||input.schemaVersion!==undefined&&![1,2].includes(input.schemaVersion))throw new Error('Unsupported spacecraft schema');
  let design={...structuredClone(input),schemaVersion:2};
  if(design.autonomy!==undefined)design.autonomy=validateRules(design.autonomy);
  if(design.evidencePlan!=null&&!['balanced','focused'].includes(design.evidencePlan))throw Error('Invalid evidence plan');
  if(design.scienceBundleId!=null&&(typeof design.scienceBundleId!=='string'||!/^[a-z0-9-]{1,80}$/.test(design.scienceBundleId)))throw Error('Invalid science bundle selection');
  for(const key of ['rocketId','planId'])if(design[key]!=null&&(typeof design[key]!=='string'||!/^[a-z0-9-]{1,80}$/i.test(design[key])))throw Error('Invalid '+key);
  if(design.spacecraftName!=null&&(typeof design.spacecraftName!=='string'||design.spacecraftName.length>100))throw Error('Invalid spacecraft name');
  if(design.flightPlan){validatePlan(design.flightPlan);if(design.flightPlan.id!==design.planId||design.flightPlan.missionId!==design.missionId||design.flightPlan.orbitId!==design.orbitId)throw Error('Flight plan mismatch');}
  if(design.rocketBlueprint){validateRocket(design.rocketBlueprint);if(design.rocketBlueprint.id!==design.rocketId)throw Error('Launcher blueprint mismatch');}
  if(design.assembly){validateAssembly(design.assembly,data);design=projectAssembly(design,data);}
  if(!['easy','normal','hard'].includes(design.difficulty||'normal'))throw new Error('Invalid difficulty');
  if(data&&!data.missions.some(m=>m.id===design.missionId))throw new Error('Unknown mission ID');
  for(const [field,type] of [['busId','bus'],['commsId','comms'],['computerId','computer'],['pointingId','pointing']]){
    const id=design[field];if(id!=null&&(typeof id!=='string'||data&&!data.parts.some(p=>p.id===id&&p.type===type)))throw new Error(`Invalid ${field}`);
  }
  for(const [field,type] of [['panelIds','panel'],['batteryIds','battery'],['fuelIds','fuel'],['instrumentIds','instrument'],['thermalIds','thermal']]){
    design[field] ??= [];
    if(!Array.isArray(design[field])||design[field].length>(design.assembly?128:type==='instrument'?100:type==='thermal'?24:2))throw new Error(`Impossible quantity: ${field}`);
    if(design[field].some(id=>typeof id!=='string'||data&&!(type==='instrument'?data.instruments:data.parts.filter(p=>p.type===type)).some(p=>p.id===id)))throw new Error(`Invalid ${field} ID`);
  }
  for(const [field,list] of [['launcherId','launchers'],['orbitId','orbits']])if(design[field]!=null&&(typeof design[field]!=='string'||data&&!data[list].some(p=>p.id===design[field])))throw new Error(`Invalid ${field}`);
  if(data&&strictSlots&&!design.assembly&&design.instrumentIds.length>(data.parts.find(p=>p.id===design.busId)?.slots||0))throw new Error('Payload exceeds bus slots');
  if(design.trainingStep!==undefined)number(design.trainingStep,'training step',{min:1,max:5,integer:true});
  if(design.trainingOrbits!==undefined&&(!Array.isArray(design.trainingOrbits)||design.trainingOrbits.some(id=>typeof id!=='string'||data&&!data.orbits.some(o=>o.id===id))))throw new Error('Invalid training orbit history');
  if(design.orbitElements!=null){validateOrbit(design.orbitElements);if(design.orbitElements.body!==presetOrbit(design.orbitId)?.body)throw Error('Orbit frame does not match destination');}
  if(design.stationIds!=null&&(!Array.isArray(design.stationIds)||design.stationIds.some(id=>!EARTH_STATIONS.some(s=>s.id===id))||new Set(design.stationIds).size!==design.stationIds.length))throw Error('Invalid station network');
  return design;
}
export function validateProgress(input,data){
  assertSerializable(input);
  if(!input||typeof input!=='object'||Array.isArray(input)||input.schemaVersion!==undefined&&![1,2].includes(input.schemaVersion))throw new Error('Unsupported progress schema');
  if(input.completedMissions!==undefined&&(!input.completedMissions||Array.isArray(input.completedMissions)||typeof input.completedMissions!=='object'))throw new Error('Invalid completion records');
  for(const [id,record] of Object.entries(input.completedMissions||{})){
    if(data&&!data.missions.some(m=>m.id===id&&id!=='tutorial'))throw new Error('Unknown completed mission');
    number(record.stars,'historical stars',{max:6});
    if(record.schemaVersion===2){validateFlightRecord(record,data);if(record.missionId!==id)throw new Error('Flight record mission mismatch');}
    else if(record.schemaVersion!==undefined&&record.schemaVersion!==1)throw new Error('Unsupported historical record schema');
  }
  if(input.currentMissionId&&data&&!data.missions.some(m=>m.id===input.currentMissionId))throw new Error('Unknown current mission');
  if(input.difficulty!==undefined&&!['easy','normal','hard'].includes(input.difficulty))throw new Error('Invalid saved difficulty');
  if(input.settings!==undefined&&(!input.settings||Array.isArray(input.settings)||typeof input.settings!=='object'))throw new Error('Invalid settings');
  for(const key of ['audio','hints'])if(input.settings?.[key]!==undefined&&typeof input.settings[key]!=='boolean')throw new Error('Invalid setting '+key);
  for(const key of ['masterVolume','effectsVolume','ambienceVolume'])if(input.settings?.[key]!==undefined)number(input.settings[key],key,{max:1});
  if(input.tutorialDone!==undefined&&typeof input.tutorialDone!=='boolean')throw new Error('Invalid tutorial state');
  if(input.currentDesign)input={...input,currentDesign:migrateDesign(input.currentDesign,data)};
  if(input.currentDesign&&input.currentMissionId&&input.currentDesign.missionId!==input.currentMissionId)throw new Error('Saved design/mission mismatch');
  return {...input,schemaVersion:2};
}

export function validateFlightRecord(record,data){
  assertSerializable(record);
  if(record.schemaVersion!==2||typeof record.scoringVersion!=='string'||!record.scoringVersion||typeof record.missionId!=='string'||data&&!data.missions.some(m=>m.id===record.missionId&&m.id!=='tutorial'))throw new Error('Invalid flight record identity/version');
  number(record.stars,'record stars',{max:6});
  if(record.rating?.total!==record.stars)throw new Error('Flight record score mismatch');
  return record;
}
