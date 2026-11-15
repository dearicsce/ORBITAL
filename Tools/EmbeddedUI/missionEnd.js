import {propagate,BODIES,orbitalPeriod} from '../engine/orbitalGeometry.js';
import {elementsFromState} from '../engine/ascent.js';
import {stepOperations,resolveIncident} from '../engine/operations.js';
import {floodwatchSampling} from './floodwatch.js';
import {synchronizeLifecycle} from './missionLifecycle.js';
const EXTENSION_TICKS=24,STEP=270,ISP=305,G0=9.80665;
const norm=v=>Math.hypot(...v);
export function missionEndOptions(run){
 const state=run.operations;if(!state?.finished)return [];
 const options=[{id:'passivate',name:'Passivate spacecraft',costKg:0,description:'Disable future operations and retain the existing science report. Stored battery energy is retained but loads are shut down; no regulatory or debris-compliance claim.'}];
 if(state.orbit?.body==='earth')options.push(
  {id:'extend',name:'Fly 1.8-hour mission extension',costKg:1,disabled:state.fuelKg<1,description:'Spend 1 kg on a prograde extension burn, then fly 24 further 270-second resource steps with Auto prioritizing stored data. Battery, recorder, source caps and clocks continue. Late receipts cannot repair an expired original deadline. No repeat rewards.'},
  {id:'disposal',name:'Lower orbit and passivate',costKg:3,disabled:state.fuelKg<3,description:'Spend 3 kg in a retrograde burn and calculate the changed orbit. This may only lower the orbit; deorbit is not guaranteed. Then shut down. No atmosphere, reentry, debris-risk or regulatory-compliance model.'});
 return options;
}
function burn(run,amount,prograde){
 const s=run.operations,o=s.orbit,time=s.tick*STEP,r=propagate(o,time),a=propagate(o,time-.5),b=propagate(o,time+.5),v=b.map((x,i)=>x-a[i]);
 const mass=(run.evalResult.spacecraftMass??run.evalResult.launchMass)-Math.max(0,run.evalResult.fuelKg-s.fuelKg);
 if(!Number.isFinite(mass)||mass<=amount)throw Error('Invalid post-mission mass');
 const deltaV=G0*ISP*Math.log(mass/(mass-amount)),velocity=v.map(x=>x+(prograde?1:-1)*deltaV*x/norm(v));
 const orbit=elementsFromState(r,velocity,time),n=Math.sqrt(BODIES.earth.mu/orbit.semiMajorAxisM**3);
 orbit.meanAnomalyRad-=n*time;orbit.epochS=o.epochS??0;
 return {model:'two-body-impulsive-end-1',propellantKg:amount,ispSeconds:ISP,deltaV,prograde,massBeforeKg:mass,massAfterKg:mass-amount,positionM:r,velocityMps:velocity,orbit,
  assumptions:'Existing 305 s educational trim-thruster assumption; centred 1 s velocity difference; no drag, finite burn, collision or reentry model.'};
}
export function chooseMissionEnd(run,id){
 if(run.missionEnd)return false;
 const option=missionEndOptions(run).find(o=>o.id===id);if(!option||option.disabled)return false;
 const s=run.operations,startClock=(run.lifecycle?.launch?.elapsedSec??0)+s.tick*STEP;
 const outcome={version:'end-choice-2',id,costKg:option.costKg,remainingKg:s.fuelKg-option.costKg,originalCompletionPreserved:true,
  explanation:option.description,missionElapsedSec:startClock,finalMissionElapsedSec:startClock,active:false,
  resourcesBefore:{fuelKg:s.fuelKg,batteryWh:s.batteryWh,storageGb:s.storageGb,deliveredGb:s.deliveredGb}};
 if(id!=='passivate'){
  outcome.burn=burn(run,option.costKg,id==='extend');outcome.orbit=outcome.burn.orbit;
  if(id==='extend'){
   const extension=structuredClone(s),historyStart=extension.history.length;
   if(extension.evidence)extension.evidence.scenario.deadline??=s.totalTicks;
   extension.orbit=structuredClone(outcome.orbit);extension.fuelKg-=option.costKg;extension.finished=false;extension.paused=false;extension.mode='auto';extension.totalTicks=extension.tick+EXTENSION_TICKS;
   extension.sampling=floodwatchSampling(run.design.missionId,extension.orbit);
   const conservative={contact:'buffer',battery:'recover',thermal:'cool',storage:'diagnose',radiation:'shield',debris:'hold'};
   for(let i=0;i<EXTENSION_TICKS;i++){
    if(extension.pendingIncident&&!resolveIncident(extension,conservative[extension.pendingIncident.id]))throw Error('Extension incident response unavailable');
    stepOperations(extension);
   }
   outcome.active=extension.batteryWh>0;outcome.remainingKg=extension.fuelKg;outcome.finalMissionElapsedSec+=EXTENSION_TICKS*STEP;
   outcome.extension={model:'same-operations-continuation-1',policy:'Auto; conservative incident responses',elapsedSec:EXTENSION_TICKS*STEP,steps:EXTENSION_TICKS,
    batteryWh:extension.batteryWh,storageGb:extension.storageGb,extraReceivedGb:extension.deliveredGb-s.deliveredGb,extraUsefulGb:(extension.evidence?.usefulGb??0)-(s.evidence?.usefulGb??0),
    missedDeadlineRetained:true,history:extension.history.slice(historyStart),log:extension.log.slice(s.log.length),sourceBundle:extension.evidence?.bundle??null,
    scienceLedger:extension.evidence,resources:{collectedGb:extension.collectedGb,deliveredGb:extension.deliveredGb,lostGb:extension.lostGb,storageGb:extension.storageGb}};
   outcome.explanation+=' Actual extension: '+outcome.extension.extraReceivedGb.toFixed(3)+' additional GB received; '+outcome.extension.extraUsefulGb.toFixed(3)+' GB useful under the retained evidence/deadline rules; '+extension.batteryWh.toFixed(1)+' Wh remaining.';
  }else{
   const intersects=outcome.orbit.periapsisM<=0;
   outcome.disposal={periapsisKm:outcome.orbit.periapsisM/1000,apoapsisKm:outcome.orbit.apoapsisM/1000,surfaceIntersecting:intersects,passivated:true,
    afterOnePeriodM:intersects?null:propagate(outcome.orbit,s.tick*STEP+orbitalPeriod(outcome.orbit))};
   outcome.explanation+=' Calculated periapsis '+outcome.disposal.periapsisKm.toFixed(1)+' km, apoapsis '+outcome.disposal.apoapsisKm.toFixed(1)+' km. '+(intersects?'Surface-intersecting trajectory; surface dynamics not solved.':'Orbit lowered; deorbit not established.');
  }
 }
 run.missionEnd=outcome;synchronizeLifecycle(run);return true;
}
export function validateMissionEnd(run){
 const e=run.missionEnd;if(!e)return;
 if(e.version==='end-choice-1')return;
 if(e.version!=='end-choice-2'||!['extend','disposal','passivate'].includes(e.id)||!Number.isFinite(e.remainingKg)||e.remainingKg<0||e.originalCompletionPreserved!==true)throw Error('Invalid mission-end outcome');
 if(e.burn&&Math.abs(e.burn.massBeforeKg-e.burn.massAfterKg-e.costKg)>1e-8)throw Error('Post-mission mass conservation failed');
 if(e.extension){const x=e.extension,r=x.resources;if(x.steps!==EXTENSION_TICKS||x.elapsedSec!==EXTENSION_TICKS*STEP||x.history.length!==EXTENSION_TICKS||Math.abs(r.collectedGb-r.deliveredGb-r.lostGb-r.storageGb)>1e-7)throw Error('Invalid extension resource ledger');}
}
