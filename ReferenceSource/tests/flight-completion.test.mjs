import assert from 'node:assert/strict';
import {completedFlight} from './flight-fixture.js';
import {completeMission, resetState, getState, loadProgress} from '../js/state.js';
import {createOperations, operationSummary} from '../js/engine/operations.js';
import {enrichCampaign, starterDesign} from '../js/campaign.js';
import {evaluateDesign} from '../js/engine.js';
import {rateFlight} from '../js/flightOutcome.js';
import fs from 'node:fs';

let assertions=0;
const check=(value,message)=>{assert.ok(value,message);assertions++;};
const rating={total:5,medal:'Gold'};
for(const mutate of [
  ()=>null,
  f=>({...f,launchResult:{success:false}}),
  f=>({...f,operationsSummary:null}),
  f=>{f.operationsSummary.finished=false;return f;},
  f=>{f.operationsSummary.windowCompleted=false;return f;},
  f=>{f.operationsSummary.missionId='m2';return f;},
  f=>{f.operationsSummary.objectives=[];return f;},
  f=>{f.operationsSummary.objectives[0].value=0;return f;},
  f=>{f.operationsSummary.objectives[0].value=NaN;return f;},
  f=>{f.operationsSummary.objectives[0].passed=false;return f;}
]) {
  resetState();
  check(!completeMission('m1',rating,3,mutate(structuredClone(completedFlight))),'Invalid evidence rejected');
  check(!getState().completedMissions.m1,'Rejected flight cannot unlock');
}
resetState();
check(!completeMission('m1',{total:NaN},3,completedFlight),'NaN stars rejected');
check(!completeMission('m1',rating,NaN,completedFlight),'NaN threshold rejected');
check(completeMission('m1',rating,3,completedFlight),'Completed flight accepted');
check(completeMission('m1',{total:4},3,completedFlight),'Lower replay accepted');
check(getState().completedMissions.m1.stars===5,'Best stars retained');
check(completeMission('m1',{total:6},3,completedFlight),'Higher replay accepted');
check(getState().completedMissions.m1.stars===6,'Higher stars stored');
const legacy={completedMissions:{m1:{stars:4.5,medal:'Silver'}}};
resetState();
check(loadProgress({getItem:()=>JSON.stringify(legacy)}),'Legacy save loads');
check(getState().completedMissions.m1.stars===4.5,'Star-only historical record retained');
const data=enrichCampaign(JSON.parse(fs.readFileSync(new URL('../data/world1.json',import.meta.url))));
const design=starterDesign(data.missions.find(m=>m.id==='m1'),data);
const ops=createOperations(design,data,evaluateDesign(design,data));
check(rateFlight(design,data,evaluateDesign(design,data),{success:true},[]).medal===null,'No medal without operations evidence');
ops.finished=true;ops.observedMinutes=540;ops.deliveredGb=100;
check(!operationSummary(ops).passed,'Early end cannot pass even with objective values met');
console.log(`PASS: ${assertions} completion assertions`);
