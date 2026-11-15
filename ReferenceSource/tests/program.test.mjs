import assert from 'node:assert/strict';
import fs from 'node:fs';
import {enrichCampaign,programOrder,starterDesign,isMissionUnlocked} from '../js/campaign.js';
import {isCoreMission} from '../js/campaignAtlas.js';
import {createMissionRun,migrateMissionRun,validateMissionRun} from '../js/contracts/missionRun.js';
import {validateWorld} from '../js/contracts/validate.js';
import {getUnlocked,checkLaunchGate,evaluateDesign} from '../js/engine.js';
import {createOperations,stepOperations,operationSummary,resolveIncident,INCIDENTS} from '../js/engine/operations.js';
import {makeBlueprint,placementIssues} from '../js/workshop/blueprint.js';
import {rocketEngineering,requiredLaunchDv} from '../js/rocket/engineering.js';
import {referenceRocket} from '../js/rocket/reference.js';
import {rocketLibrary} from '../js/rocket/library.js';
import {recommendedPlan,transferTrajectory,transferPosition,DAY_SEC} from '../js/transfer/planning.js';
import {createCruise,cruiseCommand,stepCruise,cruiseSummary} from '../js/transfer/cruise.js';
import {rateFlight} from '../js/flightOutcome.js';
import {canCompleteFlight} from '../js/flightCompletion.js';
import {claimReward} from '../js/workshop/economy.js';
import {loadProgress,getState,configureStateContracts} from '../js/state.js';
import {createLibrary} from '../js/workshop/library.js';
import {imageApod,cachedApod,refreshApod} from '../js/content/agencyMedia.js';

const data=validateWorld(enrichCampaign(JSON.parse(fs.readFileSync(new URL('../data/world1.json',import.meta.url)))));
const missions=programOrder(data);
assert.equal(new Set(missions.map(m=>m.id)).size,missions.length);
assert.equal(enrichCampaign(data).missions.length,missions.length+1);
const readStorage=()=>{
 const memory=new Map();
 return {getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
};
const prereqs=mission=>{
 const completed={};
 function visit(next){for(const id of next.requires||[]){completed[id]={stars:5};visit(data.missions.find(m=>m.id===id));}}
 visit(mission);
 return completed;
};
const commands={departure:'depart',correction:'correct',encounter:'acquire',science:'observe',downlink:'transmit'};
function runCruise(state,{ignoreCorrection=false}={}){
 for(let i=0;i<200&&!state.finished;i++){
  if(state.pending)assert.ok(cruiseCommand(state,ignoreCorrection&&state.pending==='correction'?'coast':commands[state.pending]),state.pending);
  else stepCruise(state);
 }
 return cruiseSummary(state);
}
let transferCount=0,legacyCount=0,sampleFlight,sampleRating;
for(const mission of missions){
 const completed=prereqs(mission),parts=getUnlocked(data,Object.keys(completed));
 assert.ok(isMissionUnlocked(mission,completed));
 for(const id of mission.requires||[])assert.ok(!isMissionUnlocked(mission,{...completed,[id]:null}));
 if(isCoreMission(mission))assert.ok(Object.keys(completed).every(id=>isCoreMission(data.missions.find(m=>m.id===id))),mission.id+' core path depends only on core achievements');
 const preset=starterDesign(mission,data);
 const design={...preset,assembly:makeBlueprint(preset,data).assembly};
 if(mission.transfer){
  const plan=recommendedPlan(mission,'leo',completed);
  Object.assign(design,{planId:plan.id,flightPlan:plan});
  if(mission.destination!=='moon'){
   const rocket=referenceRocket(mission);
   Object.assign(design,{rocketId:rocket.id,rocketBlueprint:rocket});
  }
 }
 assert.deepEqual(placementIssues(design.assembly,data,[...parts.parts,...parts.instruments]),[],mission.id+' spacecraft uses unlocked hardware and mounts');
 const evaluation=evaluateDesign(design,data);
 assert.deepEqual(checkLaunchGate(design,data,[...parts.parts,...parts.instruments],completed).filter(c=>!c.ok),[],mission.id+' launch gate');
 const flight=createMissionRun(design,data);
 assert.ok(flight.launchResult.success);
 let summary;
 if(mission.transfer){
  transferCount++;
  flight.phase='cruise';flight.cruise=createCruise(flight.design,flight.mission,data,flight.evalResult);
  const t=transferTrajectory(mission,flight.design,design.flightPlan);
  assert.ok(Math.abs(Math.hypot(...transferPosition(t,0))-t.r1)/t.r1<1e-7,mission.id+' departure radius');
  assert.ok(Math.abs(Math.hypot(...transferPosition(t,1))-t.r2)/t.r2<1e-7,mission.id+' arrival radius');
  assert.ok(cruiseCommand(flight.cruise,'depart'));
  while(!flight.cruise.pending)stepCruise(flight.cruise);
  assert.equal(flight.cruise.pending,'correction');
  const frozenTime=flight.cruise.elapsedSec;
  for(let i=0;i<16;i++)stepCruise(flight.cruise);
  assert.equal(flight.cruise.elapsedSec,frozenTime,'high time acceleration pauses for a milestone');
  const restored=migrateMissionRun(JSON.parse(JSON.stringify(flight)),data);
  const missed=structuredClone(restored.cruise);
  assert.ok(!runCruise(missed,{ignoreCorrection:true}).passed);
  if(['lunar-capture','mars-orbiter'].includes(mission.id)){
   const depleted=structuredClone(restored.cruise);
   depleted.brakingKg=0;
   assert.ok(!runCruise(depleted).passed);
   assert.equal(depleted.arrived,false);
   assert.match(depleted.log.at(-1).text,/Braking stage exhausted/);
  }
  summary=runCruise(flight.cruise);
  assert.deepEqual(summary,runCruise(restored.cruise),'reload has identical resource and milestone outcome');
  assert.ok(summary.deliveredGb>=mission.profile.delivered&&flight.cruise.elapsedSec>t.travelSec);
  assert.ok(!canCompleteFlight(mission.id,{total:6},3,{...flight,cruise:null,operationsSummary:summary}),'transfer reward requires authoritative cruise');
  if(t.speculative){
   assert.ok(t.travelSec/DAY_SEC/365.25>80&&t.lightMinutes/525960>4);
   const noSail={...design,flightPlan:{...design.flightPlan,powerModule:'solar'}};
   assert.ok(checkLaunchGate(noSail,data).some(c=>!c.ok&&c.message.includes('beamed-sail')));
  }
 }else{
  legacyCount++;
  flight.phase='operations';
  flight.operations=createOperations(flight.design,data,flight.evalResult);
  while(!flight.operations.finished){
   if(flight.operations.pendingIncident)resolveIncident(flight.operations,INCIDENTS[flight.operations.pendingIncident.id].choices[0].id);
   stepOperations(flight.operations);
  }
  summary=operationSummary(flight.operations);
 }
 flight.operationsSummary=summary;flight.phase='report';flight.runId='program-'+mission.id;
 validateMissionRun(flight,data);
 const rating=rateFlight(flight.design,data,flight.evalResult,flight.launchResult,[],summary);
 assert.ok(summary.passed&&canCompleteFlight(mission.id,rating,3,flight),mission.id+' progression and report');
 if(mission.id==='mars-scout'){sampleFlight=flight;sampleRating=rating;}
}
const courier=referenceRocket(null);
const flightBlueprint=structuredClone(sampleFlight.design);
assert.ok(Object.isFrozen(sampleFlight.design.rocketBlueprint.parts)&&Object.isFrozen(sampleFlight.design.flightPlan)&&Object.isFrozen(sampleFlight.design.assembly.components));
courier.parts.upperTank='upper-h28';
assert.ok(rocketEngineering(courier,200,{requirement:requiredLaunchDv('leo')}).issues.some(i=>i.includes('propellants')));
courier.parts.upperTank='upper-18';courier.staging.reverse();
assert.ok(rocketEngineering(courier,200).issues.some(i=>i.includes('staging')));
assert.deepEqual(sampleFlight.design,flightBlueprint);

const storage=readStorage(),locks={request:(_name,action)=>Promise.resolve().then(action)};
configureStateContracts(data);
storage.setItem('space_mission_game_state_v1',JSON.stringify({currentMissionId:'m3',difficulty:'normal',currentDesign:starterDesign(data.missions.find(m=>m.id==='m3'),data),completedMissions:{m1:{stars:4.5,medal:'Silver'},m2:{stars:4},m3:{stars:5}},tutorialDone:true}));
storage.setItem('orbital_economy_v1',JSON.stringify({schemaVersion:1,coins:550,unlocked:['panel_l'],claims:{}}));
const satellite=makeBlueprint(starterDesign(missions[0],data),data,'Legacy satellite');
createLibrary(data,storage).save(satellite);
assert.ok(loadProgress(storage));
assert.equal(getState().completedMissions.m1.stars,4.5);
assert.equal(createLibrary(data,storage).list()[0].name,'Legacy satellite');
assert.ok(isMissionUnlocked(sampleFlight.mission,getState().completedMissions));
const launcherLibrary=rocketLibrary(storage);launcherLibrary.save(referenceRocket(sampleFlight.mission));
assert.equal(launcherLibrary.list().length,1);
const first=await claimReward(sampleFlight,sampleFlight.mission,sampleRating,3,storage,locks);
assert.equal(first.amount,100);
assert.equal((await claimReward(sampleFlight,sampleFlight.mission,sampleRating,3,storage,locks)).amount,0);
const replay=await claimReward({...sampleFlight,runId:'replay-mars',wasCompleted:true},sampleFlight.mission,sampleRating,3,storage,locks);
assert.equal(replay.amount,25);
assert.deepEqual(JSON.parse(storage.getItem('orbital_economy_v1')).unlocked,['panel_l']);

const valid={media_type:'image',title:'Example',date:'2026-11-05',url:'https://apod.nasa.gov/apod/image/sample.jpg'};
assert.ok(imageApod(valid));
for(const changes of [{media_type:'video'},{copyright:'Third party'},{url:'https://example.com/image.jpg'},{url:'https://apod.nasa.gov.example.com/image.jpg'}])assert.equal(imageApod({...valid,...changes}),null);
const cacheData=new Map(),cache={match:async key=>cacheData.get(key)?.clone(),put:async(key,response)=>cacheData.set(key,response.clone()),delete:async key=>cacheData.delete(key)};
const caches={open:async()=>cache},apiStorage=readStorage(),key='fake-test-credential',now=1_000_000;
let calls=0;
const fetcher=async input=>{calls++;return String(input).includes('api.nasa.gov')?Response.json(valid):new Response(new Blob(['image'],{type:'image/jpeg'}));};
const result=await refreshApod(key,{storage:apiStorage,caches,fetcher,now});
assert.equal(result.status,'updated');
assert.equal((await cachedApod({storage:apiStorage,caches})).title,'Example');
assert.ok(!apiStorage.getItem('orbital_apod_metadata_v1').includes(key));
assert.equal((await refreshApod(key,{storage:apiStorage,caches,fetcher,now:now+1000})).status,'cached');
assert.equal(calls,2);
const rate=await refreshApod(key,{storage:apiStorage,caches,fetcher:async()=>new Response(null,{status:429}),now:now+45_000_000});
assert.equal(rate.status,'rate');assert.ok(rate.asset);
const offline=await refreshApod(key,{storage:readStorage(),caches,fetcher:async()=>{throw Error('network down');},now});
assert.equal(offline.status,'offline');assert.equal(offline.asset,null);

console.log(`PASS: ${legacyCount} original contracts, ${transferCount} complete transfer missions, hardware access, authoritative rewards, checkpoint migration, APOD rejection and offline cache.`);
