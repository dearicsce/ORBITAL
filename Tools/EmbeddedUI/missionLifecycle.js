import {ascentVehicle} from '../engine/ascent.js';
export const LIFECYCLE_VERSION='mission-continuity-1';
export function createLifecycle(run){
 return {version:LIFECYCLE_VERSION,missionId:run.design.missionId,objective:run.mission.objective,design:structuredClone(run.design),
  sources:structuredClone(run.sourceBundle??null),launchEpoch:run.design.flightPlan?.launchDateTDB??null,timeScale:run.design.flightPlan?.launchDateTDB?'TDB':'scenario seconds',
  model:run.design.flightPlan?.navigationModel??'labeled-simplified',missionElapsedSec:0,phaseElapsedSec:0,phase:'launch',events:[],assumptions:['Launch power: bus draw at 40%, no array deployment until insertion.','Resource phases retain their fixed-step clocks; mission clock includes ascent.']};
}
export function initializeFromLaunch(run,insertion){
 if(!run.lifecycle)return;
 const l=run.lifecycle,vehicle=ascentVehicle(run.design,run.evalResult.launchMass),upper=vehicle.parts.find(p=>p.id==='upper');
 const elapsed=insertion.insertionTimeS+12;
 const batteryWh=Math.max(0,run.evalResult.batteryUsableWh-run.evalResult.averageLoad*.4*elapsed/3600);
 l.launch={...structuredClone(insertion),elapsedSec:elapsed,batteryWh,upperDryKg:upper.dryKg,upperIsp:upper.isp,upperThrustN:upper.thrustN,
  upperIgnitions:insertion.upperIgnitions??2,upperMaxIgnitions:upper.maxIgnitions};
 l.events.push({phase:'launch',missionElapsedSec:elapsed,event:'Achieved launch state retained',massKg:insertion.massKg,upperPropellantKg:insertion.upperPropellantKg,batteryWh});
 synchronizeLifecycle(run);
}
export function initializeOperations(run,state){
 if(!run.lifecycle?.launch)return state;
 state.batteryWh=Math.min(state.batteryCapacityWh,run.lifecycle.launch.batteryWh);
 state.evidence&&(state.evidence.minimumWh=state.batteryWh);
 state.lifecycleVersion=LIFECYCLE_VERSION;
 if(state.evidence?.bundle){state.evidence.sourceEvidenceModel='unique-target-1';state.evidence.sourcePolicy='broad';state.evidence.targetSeconds={};}
 // Parking-only destination deliveries remain explicitly outside physical continuity.
 state.deliveryModel=run.parkingAscent?'labeled-simplified-destination-handoff':'achieved-earth-orbit';
 return state;
}
export function synchronizeLifecycle(run){
 const l=run?.lifecycle;if(!l)return;
 const state=run.cruise??run.operations,launch=l.launch?.elapsedSec??run.launchCheckpoint?.timeS??0;
 const elapsed=state?(state.elapsedSec??state.tick*270):0;
 l.missionElapsedSec=launch+elapsed;l.phase=run.phase;l.phaseElapsedSec=elapsed;
 l.frame=run.cruise?.physical?.frame??run.operations?.orbit?.body??'Earth inertial';
 l.resources=state?{batteryWh:state.batteryWh,recorderGb:state.storageGb,deliveredGb:state.deliveredGb,
  propellantKg:state.trimKg??state.fuelKg,brakingKg:state.brakingKg??0,health:state.outageSec??state.outageMinutes??0}:null;
 l.state=run.cruise?.physical?structuredClone(run.cruise.physical.craft):structuredClone(run.operations?.orbit??l.launch?.orbit??null);
 const end=run.missionEnd;
 if(end?.version==='end-choice-2'){
  l.phase='post-mission';l.missionElapsedSec=end.finalMissionElapsedSec;l.phaseElapsedSec=end.extension?.elapsedSec??0;
  l.resources={...l.resources,propellantKg:end.remainingKg,batteryWh:end.extension?.batteryWh??state?.batteryWh,recorderGb:end.extension?.storageGb??state?.storageGb,deliveredGb:(state?.deliveredGb??0)+(end.extension?.extraReceivedGb??0),active:end.active,...(end.burn?{massKg:end.burn.massAfterKg}:{})};
  if(end.orbit)l.state=structuredClone(end.orbit);
  if(!l.events.some(e=>e.eventId==='mission-end'))l.events.push({eventId:'mission-end',phase:'post-mission',missionElapsedSec:end.finalMissionElapsedSec,event:end.id,propellantKg:end.costKg});
 }
}
export function validateLifecycle(run){
 const l=run.lifecycle;if(!l)return;
 if(l.version!==LIFECYCLE_VERSION||l.missionId!==run.design.missionId||JSON.stringify(l.design)!==JSON.stringify(run.design)||JSON.stringify(l.sources)!==JSON.stringify(run.sourceBundle??null))throw Error('Mission continuity snapshot mismatch');
 for(const key of ['missionElapsedSec','phaseElapsedSec'])if(!Number.isFinite(l[key])||l[key]<0)throw Error('Invalid mission clock');
 if(l.launch&&(!Number.isFinite(l.launch.batteryWh)||l.launch.batteryWh<0||!Number.isFinite(l.launch.upperPropellantKg)||l.launch.upperPropellantKg<0))throw Error('Invalid launch resource continuity');
}
