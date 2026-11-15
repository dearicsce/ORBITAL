import {createLifecycle,validateLifecycle,synchronizeLifecycle} from '../unity/missionLifecycle.js';
import {validateSystems,MODES} from '../unity/spacecraftSystems.js';
import {SYSTEM_INCIDENTS} from '../unity/systemsOperations.js';
import {validateRelay} from '../unity/relayTraffic.js';
import {validatePhysical} from '../unity/physicalCruise.js';
import {validateMissionEnd} from '../unity/missionEnd.js';
import {sourceBundle,bundleIdentity,validateBundleIdentity} from '../unity/sourceData.js';
import {SCIENCE_VERSION} from '../unity/scienceScenarios.js';
import {validateEvidence} from '../unity/scienceEvidence.js';
import {validateCruise} from '../transfer/cruise.js';
import {validateOrbit,EARTH_STATIONS} from '../engine/orbitalGeometry.js';
import {assertSerializable, migrateDesign, number} from './validate.js';
import {chooseMode,resolveIncident,stepOperations,operationSummary,INCIDENTS} from '../engine/operations.js';
import {evaluateDesign} from '../engine.js';
import {rollLaunch,runEvents} from '../events.js';
import {ASCENT_LIMIT_S} from '../engine/ascent.js';

function freezeSnapshot(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.values(value).forEach(freezeSnapshot);Object.freeze(value);
  }
  return value;
}
export function nextRandom(stream) {
  let n=stream.seedState>>>0;n^=n<<13;n^=n>>>17;n^=n<<5;
  stream.seedState=n>>>0;return stream.seedState/4294967296;
}
export function createMissionRun(design,data,seed=0x6d2b79f5) {
  number(seed,'seed',{min:1,max:0xffffffff,integer:true});
  const snapshot=freezeSnapshot(migrateDesign(design,data));
  const stream={seedState:seed};const rng=()=>nextRandom(stream);
  const launchResult=rollLaunch(snapshot,data,rng),eventResults=runEvents(snapshot,data,rng);
  const selectedSource=sourceBundle(snapshot.scienceBundleId);
  const run={sourceBundle:bundleIdentity(selectedSource?.bundle),sourceProducts:selectedSource?structuredClone(selectedSource.products):null,schemaVersion:2,timeStepSec:270,launchModelVersion:'ascent-2',simulationVersion:SCIENCE_VERSION,scoringVersion:SCIENCE_VERSION,initialSeed:seed,seedState:stream.seedState,nextSequence:0,commands:[],phase:'launch',design:snapshot,mission:structuredClone(data.missions.find(m=>m.id===snapshot.missionId)),evalResult:evaluateDesign(snapshot,data),launchResult,eventResults};
  run.lifecycle=createLifecycle(run);return run;
}
export function validateCommand(command) {
  assertSerializable(command);
  if(command.schemaVersion!==2||!['mode','pause','incident','end'].includes(command.type))throw new Error('Unknown command schema/type');
  number(command.tick,'command tick',{integer:true,max:120});number(command.sequence,'command sequence',{integer:true});
  if(command.type==='mode'&&!MODES.includes(command.mode))throw new Error('Invalid command mode');
  if(command.type==='pause'&&typeof command.paused!=='boolean')throw new Error('Pause command requires a boolean');
  if(command.type==='incident'&&(typeof command.choiceId!=='string'||![...Object.values(INCIDENTS),...Object.values(SYSTEM_INCIDENTS)].some(i=>i.choices.some(c=>c.id===command.choiceId))))throw new Error('Unknown incident choice');
  return command;
}
export function validateMissionRun(run,data) {
  assertSerializable(run);
  validateSystems(run.operations?.systems);validateSystems(run.cruise?.systems);
  validateLifecycle(run);validateRelay(run.operations);validatePhysical(run.cruise);validateMissionEnd(run);
  if(run.sourceBundle){const entry=validateBundleIdentity(run.sourceBundle);if(run.sourceBundle.id!==run.design.scienceBundleId)throw Error('Source bundle/design mismatch');if(JSON.stringify(run.sourceProducts)!==JSON.stringify(entry.products))throw Error('Source attribution snapshot mismatch');}
  else if(run.design?.scienceBundleId)throw Error('Missing pinned source bundle');
  if(run.launchModelVersion!==undefined&&!['ascent-1','ascent-2'].includes(run.launchModelVersion))throw Error('Unsupported launch model version');
  if(run.runId!==undefined&&(typeof run.runId!=='string'||!run.runId||run.runId.length>100))throw Error('Invalid flight run identity');
  if(run.wasCompleted!==undefined&&typeof run.wasCompleted!=='boolean')throw Error('Invalid replay eligibility');
  if(run.schemaVersion!==2||!['launch','operations','cruise','report'].includes(run.phase))throw new Error('Unsupported mission-run envelope');
  if(![SCIENCE_VERSION,'guided-orbits-3','guided-resources-2','guided-legacy-1'].includes(run.simulationVersion)||run.scoringVersion!==(run.simulationVersion===SCIENCE_VERSION?SCIENCE_VERSION:'ops-1'))throw new Error('Unsupported simulation/scoring version');
  if(run.cruisePlayback){
    number(run.cruisePlayback.realMs,'cruise play time');number(run.cruisePlayback.carry??0,'fractional cruise tick',{max:500});
    if(![1,4,16].includes(run.cruisePlayback.speed))throw Error('Invalid cruise speed');
  }
  if(run.camera&&(typeof run.camera.north!=='boolean'||!['solar','earth-moon','inertial','follow','fixed'].includes(run.camera.mode)))throw Error('Invalid flight camera');
  if(run.playback){
    number(run.playback.fractionMs,'fractional operation tick',{max:1000});
    number(run.playback.realMs,'real play time');
    if(![1,2,4].includes(run.playback.speed))throw Error('Invalid playback speed');
  }
  if(run.launchCheckpoint){
    if(run.launchCheckpoint.version===1){
      number(run.launchCheckpoint.timeS,'ascent elapsed',{max:ASCENT_LIMIT_S+12});
      if(![1,4,16,64].includes(run.launchCheckpoint.speed))throw Error('Invalid ascent time acceleration');
      if(run.launchCheckpoint.camera!==undefined&&!['track','wide'].includes(run.launchCheckpoint.camera))throw Error('Invalid ascent camera');
    }else{
      number(run.launchCheckpoint.elapsed,'launch elapsed',{max:60});
      number(run.launchCheckpoint.spaceElapsed,'deployment elapsed',{max:18});
      number(run.launchCheckpoint.failureAt,'launch failure point',{min:8,max:12});
    }
    if(typeof run.launchCheckpoint.paused!=='boolean')throw Error('Invalid launch pause state');
  }
  for(const insertion of [run.ascentInsertion,run.parkingAscent].filter(Boolean)){
    validateOrbit(insertion.orbit);
    if(insertion.orbit.body!=='earth'||(insertion===run.ascentInsertion&&!['leo','sso'].includes(run.design.orbitId)))throw Error('Ascent insertion frame mismatch');
    number(insertion.orbit.periapsisM,'payload periapsis');
    number(insertion.orbit.apoapsisM,'payload apoapsis',{min:insertion.orbit.periapsisM});
    number(insertion.insertionTimeS,'insertion time',{max:ASCENT_LIMIT_S});
    number(insertion.massKg,'insertion mass',{min:.001});
    number(insertion.upperPropellantKg,'upper-stage propellant');
    if([insertion.positionM,insertion.velocityMps].some(v=>!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite)))throw Error('Invalid insertion vectors');
    if(!Array.isArray(insertion.events)||insertion.events.length>10||insertion.events.at(-1)?.id!=='payload')throw Error('Missing deployment sequence');
    const seen=new Set();
    let last=0;
    for(const event of insertion.events){
      if(!['ignition','liftoff','boosters','core','fairing','insertion','payload'].includes(event.id)||seen.has(event.id))throw Error('Invalid ascent event');
      number(event.timeS,'ascent event time',{min:last,max:ASCENT_LIMIT_S+12});
      seen.add(event.id);last=event.timeS;
    }
  }
  number(run.timeStepSec,'guided step seconds',{min:270,max:270});
  migrateDesign(run.design,data);
  if(run.design.missionId!==run.mission?.id||typeof run.launchResult?.success!=='boolean'||!Array.isArray(run.eventResults)||!run.evalResult)throw new Error('Flight snapshot mismatch');
  number(run.seedState,'seed state',{min:1,max:0xffffffff,integer:true});number(run.initialSeed,'initial seed',{min:1,max:0xffffffff,integer:true});number(run.nextSequence,'next command sequence',{integer:true});
  if(!Array.isArray(run.commands)||run.commands.length>10000)throw new Error('Invalid command history');
  let previous=-1;
  for(const c of run.commands){validateCommand(c);if(c.sequence<=previous||c.sequence>=run.nextSequence||!['pending','applied'].includes(c.status))throw new Error('Command sequence conflict');previous=c.sequence;}
  const contract=data?.missions.find(m=>m.id===run.design.missionId);
  if(contract?.transfer&&(run.mission.transfer?.type!==contract.transfer.type||run.mission.destination!==contract.destination||run.mission.profile?.delivered!==contract.profile.delivered||!run.design.flightPlan||run.operations))throw Error('Transfer mission snapshot mismatch');
  if(run.cruise)validateCruise(run.cruise,run.design,run.mission);
  validateEvidence(run.cruise??run.operations,run.mission.id,run.scoringVersion);
  if(run.phase==='cruise'&&!run.cruise)throw Error('Transfer phase requires an authoritative checkpoint');
  if(run.legacyOperations){
    const legacy=run.legacyOperations;
    if(run.operations||run.mission.profile||typeof legacy.paused!=='boolean'||![1,2,4].includes(legacy.speed))throw Error('Invalid legacy playback');
    number(legacy.progress,'legacy progress',{max:1});
    number(legacy.eventIndex,'legacy event index',{max:run.eventResults.length,integer:true});
  }
  if(run.keplerAttempt&&(run.design.missionId!=='dip'||!run.ascentInsertion||run.launchResult.success!==true||run.keplerAttempt.id!==run.runId||run.keplerAttempt.plan?.window!==run.design.windowId||!['pointing','capture','filter','aggregate','prepare','downlink','complete'].includes(run.keplerAttempt.stage)||!Number.isFinite(run.keplerAttempt.energy)||run.keplerAttempt.energy<0||['stored','queue','ground','excluded','ledger'].some(key=>!Array.isArray(run.keplerAttempt[key]))))throw Error('Invalid Kepler observation checkpoint');
  if(run.operations){
    const o=run.operations;
    if(o.geometryVersion!==undefined&&o.geometryVersion!==1)throw Error('Unsupported geometry version');
    if(o.orbit){validateOrbit(o.orbit);if(o.orbit.body!==(run.design.orbitId==='llo'?'moon':'earth'))throw Error('Saved orbit frame mismatch');}
    if(o.geometryVersion===1&&!o.orbit&&run.design.orbitId!=='lagrange')throw Error('Missing saved orbital elements');
    if(o.stations&&(!Array.isArray(o.stations)||o.stations.length>32||o.stations.some(s=>typeof s.id!=='string'||!/^[a-z0-9-]{1,32}$/.test(s.id)||!Number.isFinite(s.latitudeDeg)||Math.abs(s.latitudeDeg)>90||!Number.isFinite(s.longitudeDeg)||Math.abs(s.longitudeDeg)>180||!Number.isFinite(s.maskDeg)||s.maskDeg<0||s.maskDeg>90)))throw Error('Invalid ground station');
    if(o.version!==1)throw new Error('Unsupported guided operations schema');
    if(o.missionId!==run.design.missionId)throw new Error('Operations mission mismatch');
    number(o.totalTicks,'total ticks',{min:120,max:120,integer:true});number(o.tick,'tick',{max:o.totalTicks,integer:true});
    for(const key of ['storageGb','storageCapacityGb','collectedGb','deliveredGb','lostGb','batteryWh','batteryCapacityWh','fuelKg','outageMinutes','observedMinutes','serviceMinutes'])number(o[key],key);
    number(o.temperature,'temperature',{min:-273.15,max:1000});
    if(o.batteryWh>o.batteryCapacityWh+1e-7||o.storageGb>o.storageCapacityGb+1e-7||Math.abs(o.collectedGb-o.deliveredGb-o.storageGb-o.lostGb)>1e-7)throw new Error('Resource conservation failure');
    if(!MODES.includes(o.mode)||typeof o.paused!=='boolean'||typeof o.finished!=='boolean'||!Array.isArray(o.history)||!Array.isArray(o.log)||!Array.isArray(o.resolvedIncidents))throw new Error('Invalid operations state');
    if(!o.hardware||!o.profile)throw new Error('Missing operational hardware/profile');
    for(const key of ['panelW','baseW','payloadW','dataGbDay','downlinkGbDay','orbitFit'])number(o.hardware[key],'hardware '+key);
    for(const key of ['radioTransmitW','radioStandbyW','instantDownlinkGbDay'])if(o.hardware[key]!==undefined)number(o.hardware[key],'hardware '+key);
    number(o.profile.contact,'contact',{max:1});number(o.profile.eclipse,'eclipse',{max:1});number(o.profile.coverage,'coverage',{max:100});number(o.profile.delivered,'delivered target');
    if(o.pendingIncident&&(!INCIDENTS[o.pendingIncident.id]||o.pendingIncident.tick!==o.tick))throw new Error('Invalid pending incident');
    if(run.commands.some(c=>c.status==='pending'&&c.tick<o.tick))throw new Error('Pending command is in the past');
  }else if(run.phase==='operations'&&!run.legacyOperations&&!(run.design.missionId==='dip'&&run.ascentInsertion&&run.launchResult.success===true))throw new Error('Operations phase requires engine state');
  return run;
}
export function migrateMissionRun(input,data) {
  assertSerializable(input);
  if(input.schemaVersion!==undefined&&![1,2].includes(input.schemaVersion))throw new Error('Unsupported flight schema');
  const run=structuredClone(input);
  run.schemaVersion=2;run.design=migrateDesign(run.design,data);
  run.timeStepSec ??= 270;
  run.simulationVersion ||= run.scoringVersion===SCIENCE_VERSION?SCIENCE_VERSION:'guided-legacy-1';run.scoringVersion ||= 'ops-1';
  run.initialSeed ??= 0x6d2b79f5;run.seedState ??= run.initialSeed;run.nextSequence ??= 0;run.commands ??= [];
  // Saved legacy hardware keeps its original load model; only new flights use
  // the explicit standby/transmit loads. Launch results are never rerolled.
  validateMissionRun(run,data);freezeSnapshot(run.design);return run;
}
function apply(state,command) {
  if(command.type==='mode'){if(!chooseMode(state,command.mode))throw new Error('Mode unavailable');}
  else if(command.type==='pause')state.paused=command.paused;
  else if(command.type==='incident'){if(!resolveIncident(state,command.choiceId))throw new Error('Incident choice unavailable or insufficient propellant');}
  else if(command.type==='end'){state.finished=true;state.log.push({tick:state.tick,type:'command',text:'Operational window ended early by flight director.'});}
}
export function reduceRunCommand(run,input) {
  if(!run.operations||run.operations.finished)throw new Error('Flight is not accepting commands');
  if(input.schemaVersion!==undefined&&input.schemaVersion!==2)throw new Error('Unsupported command schema');
  const command=validateCommand({...input,schemaVersion:2,sequence:input.sequence??run.nextSequence,tick:input.tick??run.operations.tick});
  if(command.sequence!==run.nextSequence||command.tick<run.operations.tick||command.tick>=run.operations.totalTicks)throw new Error('Stale, duplicate or out-of-window command');
  if(command.type!=='mode'&&command.tick!==run.operations.tick)throw new Error('Only mode changes can be scheduled');
  const next=structuredClone(run);freezeSnapshot(next.design);command.status=command.tick===next.operations.tick?'applied':'pending';
  if(command.status==='applied')apply(next.operations,command);
  next.commands.push(command);next.nextSequence++;next.operationsSummary=operationSummary(next.operations);return next;
}
export function advanceMissionRun(run) {
  const next=structuredClone(run),state=next.operations;freezeSnapshot(next.design);
  if(!state||state.finished||state.paused||state.pendingIncident)return next;
  const pending=next.commands.filter(c=>c.status==='pending'&&c.tick===state.tick).sort((a,b)=>a.sequence-b.sequence);
  for(const command of pending){apply(state,command);command.status='applied';}
  stepOperations(state);next.operationsSummary=operationSummary(state);synchronizeLifecycle(next);return next;
}
// Explicit acceleration traverses identical authoritative resource steps and
// stops before any incident decision. Paused, failed and completed states stay put.
export function advanceUntilDecision(run){
 let next=run;
 for(let i=0;i<120&&next.operations&&!next.operations.finished&&!next.operations.paused&&!next.operations.pendingIncident;i++)next=advanceMissionRun(next);
 return next;
}
export function designFingerprint(design) {
  return JSON.stringify(Object.keys(design).filter(k=>k!=='schemaVersion').sort().map(k=>[k,design[k]]));
}
