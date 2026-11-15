import assert from 'node:assert/strict';
import fs from 'node:fs';
import content from '../js/campaignContent.js';
import {enrichCampaign,starterDesign,campaignOrder} from '../js/campaign.js';
import {validateWorld,validatePart,migrateDesign,validateFlightRecord} from '../js/contracts/validate.js';
import * as units from '../js/contracts/units.js';
import {createOperations,operationSummary,stepOperations} from '../js/engine/operations.js';
import {evaluateDesign} from '../js/engine.js';
import {createMissionRun,migrateMissionRun,validateMissionRun,reduceRunCommand,advanceMissionRun,nextRandom} from '../js/contracts/missionRun.js';
import {getState,resetState,setDesign,loadProgress,importProgress,configureStateContracts} from '../js/state.js';
import {setFlightSession,getFlightSession,importFlightSession,configureFlightContracts,clearFlightSession} from '../js/flightSession.js';
let assertions=0;
const check=(condition,message)=>{assert.ok(condition,message);assertions++;};
const fails=(fn,message)=>{assert.throws(fn,undefined,message);assertions++;};
const clone=structuredClone;
const data=validateWorld(enrichCampaign(JSON.parse(fs.readFileSync(new URL('../data/world1.json',import.meta.url)))));
assert.deepEqual(content,JSON.parse(fs.readFileSync(new URL('../data/campaign-contracts.json',import.meta.url))));assertions++;
check(campaignOrder(data).length===12,'All twelve contracts validate');
fails(()=>enrichCampaign({...clone(data),schemaVersion:99}),'Future world schema rejected');
check(validateFlightRecord({schemaVersion:2,scoringVersion:'ops-1',missionId:'m1',stars:4,rating:{total:4}},data).stars===4,'Versioned flight record validates');
fails(()=>validateFlightRecord({schemaVersion:2,scoringVersion:'ops-1',missionId:'m1',stars:4,rating:{total:5}},data),'Mismatched flight record rejected');
for(const part of [...data.parts,...data.instruments])check(Boolean(part.visualId&&part.units&&part.resources.massKg>=0),'Units/visual for '+part.id);
for(const [convert,inverse,n] of [[units.whToJ,units.jToWh,300],[units.gbToBits,units.bitsToGb,1.25],[units.gbDayToBitSec,units.bitSecToGbDay,60],[units.celsiusToKelvin,units.kelvinToCelsius,24],[units.degreesToRadians,units.radiansToDegrees,45]])check(Math.abs(inverse(convert(n))-n)<1e-9,'Unit round trip');
check(units.gbToBits(1)===8e9,'Decimal GB, not GiB');
fails(()=>units.whToJ(NaN),'Nonfinite conversion');fails(()=>units.whToJ(1e308),'Overflow conversion');
for(const change of [d=>d.parts[0].mass=-1,d=>d.parts[0].resources.massKg=NaN,d=>d.missions[1].launchers=['missing'],d=>d.missions[1].requires=['wildfire'],d=>d.parts[1].id=d.parts[0].id]){const copy=clone(data);change(copy);fails(()=>validateWorld(copy),'Invalid world rejected');}
const design=starterDesign(data.missions.find(m=>m.id==='m1'),data);
const oldDesign=clone(design);delete oldDesign.schemaVersion;
check(migrateDesign(oldDesign,data).schemaVersion===2,'v1 design migrates');
check(JSON.stringify(migrateDesign(oldDesign,data).instrumentIds)===JSON.stringify(design.instrumentIds),'Selections preserved');
for(const change of [d=>d.busId='missing',d=>d.panelIds=['panel_m','panel_m','panel_m'],d=>d.instrumentIds=['transponder_l','optical_camera'],d=>d.batteryIds=['fuel_s'],d=>d.schemaVersion=99,d=>d.trainingStep=Infinity]){const copy=clone(design);change(copy);fails(()=>migrateDesign(copy,data),'Invalid spacecraft rejected');}
configureStateContracts(data);configureFlightContracts(data);resetState();setDesign(design);
const before=JSON.stringify(getState());
for(const payload of ['{bad',[],17,'"text"',{schemaVersion:99},{currentDesign:{...design,busId:'missing'}},{completedMissions:{m1:{stars:NaN}}},{completedMissions:{missing:{stars:4}}},{settings:{audio:'yes'}},JSON.parse('{"__proto__":{"polluted":true}}')]){
  check(!importProgress(payload,data).ok,'Bad import refused');check(JSON.stringify(getState())===before,'Bad import is atomic');
}
const legacy={currentMissionId:'m1',difficulty:'normal',currentDesign:oldDesign,completedMissions:{m1:{stars:4.5,medal:'Silver'}},tutorialDone:true,settings:{audio:false,hints:true}};
check(loadProgress({getItem:()=>JSON.stringify(legacy)}),'Legacy storage load');
check(getState().completedMissions.m1.stars===4.5&&getState().currentDesign.schemaVersion===2,'Old record/design retained');
check(importProgress(JSON.stringify(getState()),data).ok,'v2 round trip');
const stateBefore=JSON.stringify(getState());setDesign({panelIds:['missing']});check(JSON.stringify(getState())===stateBefore,'Invalid direct setter is atomic');

const basic=data.parts.find(p=>p.id==='computer_basic'),radio=data.parts.find(p=>p.id==='comms_x_band');
const fastData=clone(data);fastData.parts.find(p=>p.id===basic.id).maxDataGbDay*=4;
const standard=createOperations(design,data,evaluateDesign(design,data));
const faster=createOperations(design,fastData,evaluateDesign(design,fastData));
check(standard.storageCapacityGb===8&&faster.storageCapacityGb===8,'Recorder independent from processing speed');
const smallRecorder=clone(data);smallRecorder.parts.find(p=>p.id===basic.id).recorderCapacityGb=.2;
const recorder=createOperations(design,smallRecorder,evaluateDesign(design,smallRecorder));
check(recorder.storageCapacityGb===.2,'Explicit recorder capacity used');
standard.mode='observe';stepOperations(standard);check(standard.loadW===evaluateDesign(design,data).averageLoad-radio.power+radio.standbyPowerW,'Observe uses radio standby');
standard.mode='downlink';stepOperations(standard);check(standard.loadW===standard.hardware.baseW+radio.transmitPowerW,'Transmit mode has explicit radio load');

function start(seed=12345,difficulty='normal'){
  const run=createMissionRun({...design,difficulty},data,seed);run.phase='operations';run.operations=createOperations(run.design,data,run.evalResult);return run;
}
const early=reduceRunCommand(start(),{type:'end'});check(early.operations.finished&&!early.operationsSummary.passed,'End command cannot clear partial flight');
const badHardware=start();badHardware.operations.hardware.panelW=-1;fails(()=>validateMissionRun(badHardware,data),'Impossible hardware rejected on import');
const changedState=clone(design);const snapshotRun=createMissionRun(changedState,data,55);changedState.panelIds.length=0;check(snapshotRun.design.panelIds.length===1,'Launched blueprint snapshot independent of edits');
check(JSON.stringify(createMissionRun({...design,difficulty:'hard'},data,999))===JSON.stringify(createMissionRun({...design,difficulty:'hard'},data,999)),'Hard launch/event draws seeded');
const a={seedState:123},b={seedState:123};check(Array.from({length:10},()=>nextRandom(a)).join()===Array.from({length:10},()=>nextRandom(b)).join(),'Seed stream replay');
let run=start();run=reduceRunCommand(run,{type:'mode',mode:'safe',tick:2});run=reduceRunCommand(run,{type:'mode',mode:'auto',tick:3});
let snapshot=JSON.stringify(run);fails(()=>reduceRunCommand(run,{type:'mode',mode:'bad'}),'Invalid command');fails(()=>reduceRunCommand(run,{type:'mode',mode:'safe',sequence:0}),'Duplicate sequence');fails(()=>reduceRunCommand(run,{type:'mode',mode:'safe',tick:120}),'Out-of-window command');fails(()=>reduceRunCommand(run,{type:'pause',paused:'false'}),'Invalid pause');check(JSON.stringify(run)===snapshot,'Rejected commands do not mutate');
run=advanceMissionRun(run);run=advanceMissionRun(run);run=advanceMissionRun(run);check(run.operations.mode==='safe','Command applied at intended tick');run=advanceMissionRun(run);check(run.operations.mode==='auto','Ordered future command applied');
run=reduceRunCommand(run,{type:'pause',paused:true});snapshot=JSON.stringify(run);check(JSON.stringify(advanceMissionRun(run))===snapshot,'Paused step preserves envelope');run=reduceRunCommand(run,{type:'pause',paused:false});
while(!run.operations.pendingIncident)run=advanceMissionRun(run);
const restored=migrateMissionRun(JSON.parse(JSON.stringify(run)),data);
function finish(input){let current=clone(input);while(!current.operations.finished){if(current.operations.pendingIncident){const choice={contact:'buffer',battery:'recover'}[current.operations.pendingIncident.id];current=reduceRunCommand(current,{type:'incident',choiceId:choice});}current=advanceMissionRun(current);}return current;}
const complete=finish(run);check(JSON.stringify(complete)===JSON.stringify(finish(restored)),'Pending incident + command history survive JSON round trip');check(operationSummary(complete.operations).passed,'Migrated baseline still succeeds');validateMissionRun(complete,data);assertions++;
check(Math.abs(complete.operations.collectedGb-complete.operations.deliveredGb-complete.operations.storageGb-complete.operations.lostGb)<1e-7,'Data conservation');
const legacyFlight=clone(run);delete legacyFlight.schemaVersion;delete legacyFlight.initialSeed;delete legacyFlight.seedState;delete legacyFlight.commands;delete legacyFlight.nextSequence;delete legacyFlight.simulationVersion;
check(migrateMissionRun(legacyFlight,data).launchResult.success===run.launchResult.success,'Legacy launch not rerolled');
const legacyLoads=start();delete legacyLoads.schemaVersion;legacyLoads.operations.hardware.baseW+=legacyLoads.operations.hardware.radioTransmitW;delete legacyLoads.operations.hardware.radioTransmitW;delete legacyLoads.operations.hardware.radioStandbyW;delete legacyLoads.operations.hardware.modelVersion;
const migratedLoads=migrateMissionRun(legacyLoads,data);stepOperations(migratedLoads.operations);check(migratedLoads.operations.loadW===115,'Old active hardware retains original radio-inclusive load');
let storageValue=null;const storage={setItem:(_k,v)=>storageValue=v,getItem:()=>storageValue,removeItem:()=>storageValue=null};
check(Boolean(setFlightSession(run,storage)),'Valid session persists');const prior=JSON.stringify(getFlightSession());
const corrupt=clone(run);corrupt.operations.storageGb+=1;
check(!importFlightSession(JSON.stringify(corrupt),storage),'Conservation-breaking flight import rejected');check(JSON.stringify(getFlightSession())===prior&&storageValue===prior,'Failed flight import preserves memory/storage');
clearFlightSession(storage);check(importFlightSession(JSON.stringify(run),storage),'Flight envelope import succeeds');
const results={date:'2026-11-02',assertions,missions:12,partAndInstrumentCount:data.parts.length+data.instruments.length};
fs.writeFileSync(new URL('./contracts-results.json',import.meta.url),JSON.stringify(results,null,2));console.log('PASS: '+JSON.stringify(results));
