import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {enrichCampaign,programOrder,starterDesign,isMissionUnlocked} from '../Assets/StreamingAssets/WebUI/js/campaign.js';
import {missionDestination} from '../Assets/StreamingAssets/WebUI/js/campaignAtlas.js';
import {validateWorld} from '../Assets/StreamingAssets/WebUI/js/contracts/validate.js';
import {createMissionRun,migrateMissionRun,reduceRunCommand} from '../Assets/StreamingAssets/WebUI/js/contracts/missionRun.js';
import {configureStateContracts,completeMission,getState,saveProgress} from '../Assets/StreamingAssets/WebUI/js/state.js';
import {checkLaunchGate,getUnlocked} from '../Assets/StreamingAssets/WebUI/js/engine.js';
import {createOperations,chooseMode,stepOperations,resolveIncident,operationSummary,INCIDENTS} from '../Assets/StreamingAssets/WebUI/js/engine/operations.js';
import {numericalTarget} from '../Assets/StreamingAssets/WebUI/js/engine/ascent.js';
import {makeBlueprint} from '../Assets/StreamingAssets/WebUI/js/workshop/blueprint.js';
import {claimReward} from '../Assets/StreamingAssets/WebUI/js/workshop/economy.js';
import {referenceRocket} from '../Assets/StreamingAssets/WebUI/js/rocket/reference.js';
import {recommendedPlan} from '../Assets/StreamingAssets/WebUI/js/transfer/planning.js';
import {createCruise,cruiseCommand,stepCruise,cruiseSummary} from '../Assets/StreamingAssets/WebUI/js/transfer/cruise.js';
import {rateFlight} from '../Assets/StreamingAssets/WebUI/js/flightOutcome.js';
import {lessons} from '../Assets/StreamingAssets/WebUI/js/unity/missionLessons.js';
import {powerExperiment} from '../Assets/StreamingAssets/WebUI/js/unity/learningTools.js';
import {floodwatchSampling} from '../Assets/StreamingAssets/WebUI/js/unity/floodwatch.js';
import {BODIES,presetOrbit} from '../Assets/StreamingAssets/WebUI/js/engine/orbitalGeometry.js';

import {scienceReport} from '../Assets/StreamingAssets/WebUI/js/unity/scienceUI.js';
import {hardwareOptions,rerunExperiment,robustnessTrials} from '../Assets/StreamingAssets/WebUI/js/unity/missionExperiment.js';
import {acquire,createEvidence,receive,send,scienceObjectives} from '../Assets/StreamingAssets/WebUI/js/unity/scienceEvidence.js';
import {SCIENCE_VERSION,SCENARIOS} from '../Assets/StreamingAssets/WebUI/js/unity/scienceScenarios.js';

const root=new URL('../Assets/StreamingAssets/WebUI/',import.meta.url);
const evidence=process.argv[2] ? pathToFileURL(resolve(process.argv[2])+'/') :
 new URL('../Verification/MissionExperiments/',import.meta.url);
const data=validateWorld(enrichCampaign(JSON.parse(await readFile(new URL('data/world1.json',root),'utf8'))));
const missions=programOrder(data);
assert.equal(new Set(missions.map(m=>m.id)).size,28);
configureStateContracts(data);
const values=new Map();
const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
const locks={request:(_name,action)=>Promise.resolve().then(action)};
const commands={departure:'depart',correction:'correct',encounter:'acquire',science:'observe',downlink:'transmit'};
const rows=new Map();
let demo,proximaExample,hardwareDemo;
const scope=Object.keys(SCENARIOS);
assert.deepEqual(scope.sort(),missions.map(m=>m.id).sort());
const ledger=createEvidence('m1',[{id:'optical_camera',name:'Optical camera'}],100,true);
acquire(ledger,'Response region',0,1080,1,1,'30 m/sample');
const firstHalf=send(ledger,.5),secondHalf=send(ledger,.5);
receive(ledger,firstHalf,60,60);
receive(ledger,firstHalf,60,60);
assert.equal(ledger.usefulGb,.5,'Duplicate fragment cannot use the remaining transmission credit');
assert.equal(scienceObjectives(ledger)[0].passed,true,'Receipt at the deadline is accepted');
receive(ledger,secondHalf,60.0001,60);
assert.equal(ledger.observations[0].receivedGb,1,'Late packet still arrives');
assert.equal(ledger.usefulGb,.5,'Receipt after the deadline has no objective value');
assert.equal(ledger.interruptions["late/Response region"].count,1);
const [small,large]=powerExperiment(data);
assert.ok(small.firstOutage>0&&!small.summary.passed);
assert.ok(large.firstOutage===null&&large.summary.passed);
assert.ok(large.massKg>small.massKg&&large.costM>small.costM);
const low=presetOrbit('leo');
const high={...low,semiMajorAxisM:BODIES.earth.radiusM+800000};
assert.ok(floodwatchSampling('m1',low).meetsBenchmark);
assert.ok(!floodwatchSampling('m1',high).meetsBenchmark);
const optics=starterDesign(missions[0],data);
const overAltitude=createMissionRun({...optics,orbitElements:high},data);
overAltitude.operations=createOperations(overAltitude.design,data,overAltitude.evalResult);
assert.equal(operate(overAltitude).collectedGb,0,'Floodwatch withholds useful data above the optical benchmark');

function family(mission){
 if(mission.destination==='proxima')return 'Speculative stellar flyby';
 if(mission.transfer?.type==='crossing')return 'Solar escape and boundary crossing';
 if(mission.transfer)return 'Guided transfer and '+mission.transfer.type;
 if(mission.profile?.relay)return 'Powered relay service';
 if(mission.profile?.nightScience)return 'Night-side survey';
 if(missionDestination(mission)==='moon')return 'Low lunar operations';
 if(missionDestination(mission)==='transfer')return 'Guided observatory';
 return 'Earth survey and monitoring';
}
function operate(run,until=120){
 const s=run.operations;
 while(s.tick<until&&!s.finished){
  if(s.pendingIncident){
   const choice=INCIDENTS[s.pendingIncident.id].choices.find(c=>s.fuelKg>=3||!['burn','maneuver'].includes(c.id));
   assert.ok(resolveIncident(s,choice.id));
  }
  stepOperations(s);
 }
 return operationSummary(s);
}
function cruise(run,{fail=false,checkpoint=false}={}){
 const s=run.cruise;
 for(let steps=0;steps<200&&!s.finished;steps++){
  if(s.pending){
   if(checkpoint&&s.pending==='correction')return;
   assert.ok(cruiseCommand(s,fail&&s.pending==='correction'?'coast':commands[s.pending]));
  }else stepCruise(s);
 }
 return cruiseSummary(s);
}
function runMission(m,completed){
 const starter=starterDesign(m,data);
 const design={...starter,assembly:makeBlueprint(starter,data).assembly};
 if(m.transfer){
  const plan=recommendedPlan(m,design.orbitId,completed);
  Object.assign(design,{planId:plan.id,flightPlan:plan});
  if(m.destination!=='moon'){
   const rocket=referenceRocket(m);
   Object.assign(design,{rocketId:rocket.id,rocketBlueprint:rocket});
  }
 }
 const access=getUnlocked(data,Object.keys(completed)),allowed=[...access.parts,...access.instruments];
 assert.deepEqual(checkLaunchGate(design,data,allowed,completed).filter(c=>!c.ok),[],m.id+' launch gate');
 const withoutBus={...design,busId:null,assembly:makeBlueprint({busId:null},data).assembly};
 assert.ok(checkLaunchGate(withoutBus,data,allowed,completed).some(c=>!c.ok),m.id+' missing spacecraft rejection');
 const withoutInstrument={...design,assembly:null,instrumentIds:[]};
 withoutInstrument.assembly=makeBlueprint(withoutInstrument,data).assembly;
 const hardwareFailures=checkLaunchGate(withoutInstrument,data,allowed,completed).filter(c=>!c.ok);
 if(!hardwareFailures.length){
  assert.ok(!m.transfer,m.id+' transfer gate rejects a missing science payload');
  const underperforming=createMissionRun(withoutInstrument,data);
  underperforming.operations=createOperations(underperforming.design,data,underperforming.evalResult);
  assert.equal(operate(underperforming).collectedGb,0,m.id+' missing payload collects no useful data');
 }
 const run=createMissionRun(design,data);
 assert.ok(run.launchResult.success,m.id+' deterministic nominal launch seed');
 run.runId='verification-'+m.id;
 if(m.transfer){
  run.phase='cruise';
  run.cruise=createCruise(run.design,m,data,run.evalResult);
  cruise(run,{checkpoint:true});
 }else{
  run.phase='operations';
  run.operations=createOperations(run.design,data,run.evalResult);
  operate(run,45);
 }
 const resumed=migrateMissionRun(JSON.parse(JSON.stringify(run)),data);
 const adverse=m.transfer?structuredClone(resumed):{...resumed,operations:createOperations(run.design,data,run.evalResult)};
 if(!m.transfer)assert.ok(chooseMode(adverse.operations,'safe'));
 const finish=m.transfer?cruise:operate;
 if(m.id==='night'){
   const visibleOnly={...design,assembly:null,instrumentIds:['optical_camera']};
   visibleOnly.assembly=makeBlueprint(visibleOnly,data).assembly;
   const other=createMissionRun(visibleOnly,data);
   other.operations=createOperations(other.design,data,other.evalResult);
   const result=operate(other);
   assert.equal(result.science.usefulGb,0,'Ordinary visible imager earns no dark thermal credit');
   assert.ok(result.objectives.filter(o=>o.id.startsWith('product-')).every(o=>!o.passed));
 }
 if(m.transfer?.type==='capture'||m.transfer?.type==='rendezvous'){
   const underfuel=structuredClone(run);
   underfuel.cruise.brakingKg=0;
   const result=cruise(underfuel);
   assert.ok(!result.passed&&!underfuel.cruise.arrived);
   assert.match(result.log.at(-1).text,/Braking stage exhausted/);
 }
 const nominal=finish(run);
 const replay=finish(resumed);
 assert.deepEqual(replay,nominal,m.id+' save and deterministic replay');
 const negative=finish(adverse,m.transfer?{fail:true}:120);
 assert.ok(nominal.passed&&!negative.passed,m.id+' objective success and failure');
 run.operationsSummary=nominal;run.phase='report';
 adverse.operationsSummary=negative;adverse.phase='report';
 for(const sample of [run,adverse]){
  const s=sample.cruise||sample.operations;
  const transit=(s.inFlight||[]).reduce((sum,packet)=>sum+packet.amount,0);
  assert.ok(Math.abs(s.collectedGb-s.deliveredGb-s.lostGb-s.storageGb-transit)<1e-7,m.id+' data conservation');
  assert.ok(s.batteryWh>=0&&s.batteryWh<=(s.batteryCapacityWh??s.hardware.batteryWh),m.id+' battery bound');
  assert.equal(sample.operationsSummary.deliveredGb,s.deliveredGb,m.id+' report agreement');
 }
 return {design,run,adverse,hardwareFailures:hardwareFailures.map(c=>c.id)};
}
while(rows.size<missions.length){
 const completed=getState().completedMissions;
 const m=missions.find(m=>!rows.has(m.id)&&isMissionUnlocked(m,completed));
 assert.ok(m,'unreachable campaign prerequisites');
 for(const id of m.requires||[])assert.ok(!isMissionUnlocked(m,{...completed,[id]:null}));
 const {design,run,adverse,hardwareFailures}=runMission(m,completed);
 const rating=sample=>rateFlight(sample.design,data,sample.evalResult,sample.launchResult,sample.eventResults,sample.operationsSummary);
 const passing=rating(run),failing=rating(adverse);
 assert.equal(completeMission(m.id,failing,3,adverse),false,m.id+' failure cannot progress');
 await assert.rejects(claimReward(adverse,m,failing,3,storage,locks));
 assert.equal(completeMission(m.id,passing,data.settings.passStars,run),true,m.id+' real progression unlocks successor '+JSON.stringify(passing));
 assert.ok(saveProgress(storage));
 const first=await claimReward(run,m,passing,3,storage,locks);
 assert.ok(first.amount>0);
 assert.equal((await claimReward(run,m,passing,3,storage,locks)).amount,0);
 const snapshot=JSON.stringify(run),walletSnapshot=JSON.stringify([...values]);
 const same=rerunExperiment(run,data);
 assert.deepEqual(same.summary,run.operationsSummary,m.id+' isolated replay reproduces result');
 const options=hardwareOptions(run.design,data);
 const hardwareResults=options.map(option=>{
   const trial=rerunExperiment(run,data,{hardware:option.id});
   assert.deepEqual(trial.state.orbit??null,same.state.orbit??null);
   assert.equal(trial.initialSeed,same.initialSeed);
   const requests=trial.commands.map(({rejected,...command})=>{
     if (!rejected) return command;
     assert.equal(command.command,'coast');
     assert.match(rejected,/Insufficient trim propellant/);
     assert.equal(trial.summary.passed,false);
     return {...command,command:'correct'};
   });
   assert.deepEqual(requests,same.commands.slice(0,requests.length),
     m.id+' component swap preserves the command sequence until termination');
   const changes=trial.design.assembly.components.filter((c,index)=>c.catalogId!==run.design.assembly.components[index].catalogId);
   assert.equal(changes.length,1);
   return {option:option.id,from:option.from,to:option.to,location:option.location,
     massKg:trial.massKg,costM:trial.costM,passed:trial.summary.passed,
     usefulGb:trial.summary.science.usefulGb,minimumWh:trial.summary.science.minimumWh,gateIssues:trial.gateIssues};
 });
 const alternative=rerunExperiment(run,data,m.transfer?{plan:'priority'}:{schedule:m.profile.relay?'protect':'transmit'});
 assert.ok(alternative.summary.passed,m.id+' alternative schedule meets objectives');
 if(m.transfer){
   const a=same.state.evidence.observations,b=alternative.state.evidence.observations;
   assert.ok(b[0].effectiveSec>a[0].effectiveSec&&b[1].effectiveSec<a[1].effectiveSec,m.id+' primary integration trades against second target');
 }else{
   assert.ok(alternative.summary.science.servedWh<same.summary.science.servedWh,m.id+' alternative scheduling reduces served load');
 }
 if(!m.transfer){
   const h=run.operations.history;
   assert.equal(h.length,120);
   for(const p of h)assert.ok(p.batteryWh>=0&&p.sunlitFraction>=0&&p.sunlitFraction<=1+1e-9&&p.contactFraction>=0&&p.contactFraction<=1+1e-9);
   const generationWh=h.reduce((sum,p)=>sum+p.generationW*270/3600,0);
   const e=run.operations.evidence;
   assert.ok(Math.abs(run.evalResult.batteryUsableWh+generationWh-e.servedWh-e.spilledWh-run.operations.batteryWh)<1e-7,m.id+' power balance in Wh');
 }
 const sensitivity=robustnessTrials(run,data);
 assert.deepEqual(sensitivity,robustnessTrials(run,data),m.id+' reproducible sensitivity ensemble');
 assert.equal(JSON.stringify(run),snapshot,m.id+' replay does not mutate campaign record');
 assert.equal(JSON.stringify([...values]),walletSnapshot,m.id+' replay does not mutate wallet');
 assert.equal((await claimReward({...run,runId:run.runId+'-again'},m,passing,3,storage,locks)).amount,0);
 await assert.rejects(claimReward({...run,experiment:true},m,passing,3,storage,locks));
 const report=scienceReport(adverse,adverse.operationsSummary);
 assert.match(report,/Objectives missed/);
 assert.match(report,m.transfer?/uncorrected trajectory missed/:/Safe mode suspended/);
 const legacy={...run,simulationVersion:'guided-orbits-3',scoringVersion:'ops-1'};
 if(m.transfer)legacy.cruise=createCruise(design,m,data,run.evalResult,{science:false});
 else legacy.operations=createOperations(design,data,run.evalResult,{science:false});
 assert.equal((migrateMissionRun(legacy,data).cruise??migrateMissionRun(legacy,data).operations).evidence,null);
 if(m.id==='proxima-sail'){
   const slow=rerunExperiment(run,data,{assumption:'speed'});
   assert.equal(slow.state.trajectory.travelSec/same.state.trajectory.travelSec,1.25);
   assert.equal(slow.state.trajectory.lightMinutes,same.state.trajectory.lightMinutes);
   assert.equal(rerunExperiment(run,data,{assumption:'life'}).summary.passed,false);
   assert.equal(rerunExperiment(run,data,{assumption:'receiver'}).summary.passed,false);
   proximaExample=[same,slow,rerunExperiment(run,data,{assumption:'life'}),rerunExperiment(run,data,{assumption:'receiver'})]
     .map(({input,state,summary})=>({input,passed:summary.passed,arrived:state.arrived,
       speedFraction:state.trajectory.arrivalRelative/299792458,lifetimeYears:state.hardware.lifetimeYears,
       travelYears:state.trajectory.travelSec/86400/365.25,lightYears:state.trajectory.lightMinutes/525960,
       usefulGb:summary.science.usefulGb,confirmedGb:summary.deliveredGb,lastEvent:state.log.at(-1).text}));
 }
 const summarize=trial=>({input:trial.input,passed:trial.summary.passed,
   minimumWh:trial.summary.science.minimumWh,servedWh:trial.summary.science.servedWh,usefulGb:trial.summary.science.usefulGb,
   generatedGb:trial.summary.collectedGb,discardedGb:trial.summary.lostGb,deliveredGb:trial.summary.deliveredGb,
   products:trial.summary.objectives.filter(o=>o.id.startsWith('product-')),
   fuelKg:trial.summary.fuelKg,elapsedMinutes:trial.summary.elapsedMinutes});
 if(m.id==='m1'){
   const early={...run,operations:createOperations(run.design,data,run.evalResult),commands:[],nextSequence:0};
   operate(early,32);
   assert.ok(early.operations.pendingIncident);
   const ended=reduceRunCommand(early,{type:'end'});
   assert.deepEqual(rerunExperiment(ended,data).summary,ended.operationsSummary,
     'Ending at an unanswered incident must replay without resolving the incident');
   assert.deepEqual(rerunExperiment(ended,data,{schedule:'observe'}).state.tick,ended.operations.tick,
     'Schedule treatment keeps the original stop time');
   const part=hardwareResults.find(option=>option.minimumWh!==same.summary.science.minimumWh &&
     option.from.toLowerCase().includes('battery'));
   assert.ok(part,'Floodwatch can test a fitted battery with a measurable reserve difference');
   hardwareDemo={before:summarize(same),after:summarize(rerunExperiment(run,data,{hardware:part.option})),part,
     original:{massKg:same.massKg,costM:same.costM}};
   const observing=rerunExperiment(run,data,{schedule:'observe'});
   assert.ok(!observing.summary.passed&&observing.summary.collectedGb>0&&observing.summary.deliveredGb===0);
   assert.ok(same.summary.passed&&same.summary.science.usefulGb>0);
   assert.ok(same.summary.collectedGb<observing.summary.collectedGb);
   demo={prediction:'If I switch to autopilot, more samples will reach Earth because it transmits during contact.',
     modelVersion:SCIENCE_VERSION,before:summarize(observing),after:summarize(same),
     transferChallenge:'storm'};
 }
 const phase=m.transfer?.type||'operations';
 rows.set(m.id,{
  id:m.id,name:m.name,prerequisites:m.requires||[],destination:missionDestination(m),objective:m.objective||m.brief,
  family:family(m),learning:lessons[m.id],
  phases:[numericalTarget(design)?'numerical ascent':'illustrative ascent',...(m.transfer?['departure','cruise','trim',phase,'science','confirmed downlink']:['resource operations']),'report'],
  supportedDesign:{launchers:m.launchers,scienceOrbits:Object.keys(m.orbitFit).filter(id=>m.orbitFit[id]>0),nominal:{bus:design.busId,payload:m.payload,orbit:design.orbitId,
   launcher:design.rocketId||design.launcherId,plan:design.flightPlan||null}},
  objectives:run.operationsSummary.objectives,failedObjectives:adverse.operationsSummary.objectives.filter(o=>!o.passed).map(o=>o.id),
  missingPayload:hardwareFailures.length?{blockedBy:hardwareFailures}:{usefulDataGb:0},
  failureEvidence:adverse.operationsSummary.science,science:SCENARIOS[m.id],modelVersion:SCIENCE_VERSION,baseline:summarize(same),alternative:summarize(alternative),sensitivity:sensitivity.map(summarize),
  hardwareTrials:hardwareResults,reward:first.amount,checkpoint:m.transfer?'pending trim':'operations tick 45',result:'pass'
 });
 console.log(m.id,phase,'PASS');
}
await mkdir(evidence,{recursive:true});
await writeFile(new URL('proxima-assumptions.json',evidence),JSON.stringify(proximaExample,null,2)+'\n');
await writeFile(new URL('floodwatch-demo.json',evidence),JSON.stringify(demo,null,2)+'\n');
await writeFile(new URL('floodwatch-hardware-demo.json',evidence),JSON.stringify(hardwareDemo,null,2)+'\n');
await writeFile(new URL('models.json',evidence),JSON.stringify([...rows.values()],null,2)+'\n');

