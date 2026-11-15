import assert from 'node:assert/strict';
import fs from 'node:fs';
import {enrichCampaign,starterDesign} from '../Assets/StreamingAssets/WebUI/js/campaign.js';
import {evaluateDesign} from '../Assets/StreamingAssets/WebUI/js/engine.js';
import {createMissionRun,migrateMissionRun} from '../Assets/StreamingAssets/WebUI/js/contracts/missionRun.js';
import {createOperations,stepOperations,resolveIncident,operationSummary} from '../Assets/StreamingAssets/WebUI/js/engine/operations.js';
import {createCruise,cruiseCommand,stepCruise,cruiseSummary} from '../Assets/StreamingAssets/WebUI/js/transfer/cruise.js';
import {recommendedPlan} from '../Assets/StreamingAssets/WebUI/js/transfer/planning.js';
import {ascentVehicle,simulateAscent,numericalTarget} from '../Assets/StreamingAssets/WebUI/js/engine/ascent.js';
import {referenceRocket} from '../Assets/StreamingAssets/WebUI/js/rocket/reference.js';
import {initializeFromLaunch,initializeOperations,synchronizeLifecycle} from '../Assets/StreamingAssets/WebUI/js/unity/missionLifecycle.js';
import {NAV_VERSION,norm,sub,bodyState,lambert,propagateState,equatorialToEcliptic,eclipticToEquatorial,dateSeconds,datedTrajectory} from '../Assets/StreamingAssets/WebUI/js/unity/navigation.js';
import {attachPhysicalCruise,predictedCorrection} from '../Assets/StreamingAssets/WebUI/js/unity/physicalCruise.js';
import {relayPolicy,validateRelay,stepRelay,createRelayTraffic} from '../Assets/StreamingAssets/WebUI/js/unity/relayTraffic.js';
import {rerunExperiment} from '../Assets/StreamingAssets/WebUI/js/unity/missionExperiment.js';
import {chooseMissionEnd} from '../Assets/StreamingAssets/WebUI/js/unity/missionEnd.js';
import {bundleForMission,validateBundleIdentity} from '../Assets/StreamingAssets/WebUI/js/unity/sourceData.js';
import {presetOrbit,RAD} from '../Assets/StreamingAssets/WebUI/js/engine/orbitalGeometry.js';
const dir=process.argv[2]||'Verification/CompleteGameplay-2026-11-11';
fs.mkdirSync(dir,{recursive:true});
const data=enrichCampaign(JSON.parse(fs.readFileSync('Assets/StreamingAssets/WebUI/data/world1.json')));
const completed=Object.fromEntries(data.missions.map(m=>[m.id,true]));
const rows=[];
// Independent dimensional reference: quarter-circle 7000 km orbit around Earth.
const mu=3.986004418e14,r=7000000,v=7546.053290107542,T=5828.516637686015;
const q=lambert([r,0,0],[0,r,0],T/4,mu);
assert.ok(norm(sub(q.v1,[0,v,0]))<.001,'Lambert quarter-circle agrees with independent circular reference');
const propagated=propagateState({r:[r,0,0],v:[0,v,0]},T,mu,5);
assert.ok(norm(sub(propagated.r,[r,0,0]))<.1,'Independent circular closure < 10 cm');
const reverse=eclipticToEquatorial(equatorialToEcliptic([3,4,5]));assert.ok(norm(sub(reverse,[3,4,5]))<1e-12);
assert.equal(dateSeconds('2026-11-06')-dateSeconds('2026-11-05'),86400);assert.throws(()=>dateSeconds('2028-01-01'));
assert.throws(()=>dateSeconds('2027-02-29'),/calendar date/);assert.throws(()=>dateSeconds('2026-11-31'),/calendar date/);
for(const id of ['lunar-pathfinder','lunar-capture','mars-scout','mars-orbiter']){
 const mission=data.missions.find(m=>m.id===id),design=starterDesign(mission,data),plan=recommendedPlan(mission,design.orbitId,completed),rocket=referenceRocket(mission);
 Object.assign(plan,{navigationModel:NAV_VERSION,launchDateTDB:mission.destination==='moon'?'2026-11-14':'2026-11-11'});Object.assign(design,{flightPlan:plan,planId:plan.id});if(mission.destination!=='moon')Object.assign(design,{rocketBlueprint:rocket,rocketId:rocket.id});
 const run=createMissionRun(design,data,6103),f=simulateAscent(ascentVehicle(run.design,run.evalResult.launchMass),numericalTarget(run.design));
 assert.equal(f.reason,'',id+' launch');
 const insertion={orbit:f.orbit,insertionTimeS:f.end.timeS,positionM:f.end.positionM,velocityMps:f.end.velocityMps,massKg:f.end.massKg,upperPropellantKg:f.end.propellantKgByTank.upper,upperIgnitions:f.end.ignitions.upper};
 initializeFromLaunch(run,insertion);run.cruise=attachPhysicalCruise(createCruise(run.design,mission,data,run.evalResult),run);run.phase='cruise';
 assert.equal(run.cruise.evidence.minimumWh,run.cruise.batteryWh,'Cruise minimum reserve includes launch electrical debit');
 const t=run.cruise.trajectory,later=datedTrajectory(mission,design,{...plan,launchDateTDB:'2026-11-21'},insertion);
 assert.ok(Math.abs(t.departureDv-later.departureDv)>1,'Date changes geometry and demand');
 const changed=datedTrajectory(mission,design,plan,{...insertion,velocityMps:insertion.velocityMps.map(x=>x*.98)});
 assert.ok(Math.abs(changed.departureDv-t.departureDv)>1,'Achieved velocity changes departure');
 const dry=structuredClone(run);dry.cruise.physical.upperKg=0;assert.ok(cruiseCommand(dry.cruise,'depart'));assert.equal(dry.cruise.phase,'failed');
 assert.ok(cruiseCommand(run.cruise,'depart'));const burn=run.cruise.physical.burns[0];
 if(run.cruise.finished){rows.push({id,status:'departure infeasible',demand:t.departureDv,upperKg:run.cruise.physical.upperKg});continue;}
 assert.ok(Math.abs(burn.massBeforeKg-burn.massAfterKg-burn.fuelKg)<1e-7);
 while(!run.cruise.pending&&!run.cruise.finished)stepCruise(run.cruise);
 assert.equal(run.cruise.pending,'correction');
 const estimate=predictedCorrection(run.cruise),coast=structuredClone(run.cruise),observe=structuredClone(run.cruise);
 const trueBefore=JSON.stringify(observe.physical.craft);cruiseCommand(observe,'navigate');assert.equal(JSON.stringify(observe.physical.craft),trueBefore);assert.ok(observe.physical.uncertaintyM<run.cruise.physical.uncertaintyM);
 stepCruise(observe);assert.equal(observe.pending,'correction');assert.ok(observe.elapsedSec>run.cruise.elapsedSec);
 const split=JSON.parse(JSON.stringify(run.cruise));assert.ok(cruiseCommand(split,'correct'));assert.ok(cruiseCommand(run.cruise,'correct'));assert.equal(JSON.stringify(split),JSON.stringify(run.cruise),'Reload JSON correction state');
 cruiseCommand(coast,'coast');
 while(!run.cruise.pending&&!run.cruise.finished)stepCruise(run.cruise);
 while(!coast.pending&&!coast.finished)stepCruise(coast);
 const error=norm(sub(run.cruise.physical.craft.r,t.targetState.r)),uncorrected=norm(sub(coast.physical.craft.r,t.targetState.r));
 assert.ok(error<uncorrected,'Actual correction improves encounter');
 assert.equal(run.cruise.pending,'encounter');assert.ok(cruiseCommand(run.cruise,'acquire'),id+' arrival');
 if(run.cruise.physical.capturedOrbit)assert.ok(run.cruise.physical.capturedOrbit.specificEnergy<0);
 while(!run.cruise.finished){if(run.cruise.pending)assert.ok(cruiseCommand(run.cruise,({science:'observe',downlink:'transmit'})[run.cruise.pending]));else stepCruise(run.cruise);}
 synchronizeLifecycle(run);assert.equal(run.lifecycle.missionElapsedSec,run.lifecycle.launch.elapsedSec+run.cruise.elapsedSec);
 const summary=cruiseSummary(run.cruise);run.operationsSummary=summary;
 const control=rerunExperiment(run,data);assert.deepEqual(control.summary,summary,'Physical replay control reproduces');
 assert.ok(error<(t.lunar?150000:1500000),'Numerical Lambert closure inside patch corridor');
 rows.push({id,status:run.cruise.phase,summary,departureDv:t.departureDv,dateChangedDv:later.departureDv,changedInsertionDv:changed.departureDv,correction:estimate.dv,correctedMissM:error,uncorrectedMissM:uncorrected,launchFuelKg:insertion.upperPropellantKg,remaining:run.cruise.physical.upperKg});
}
for(const id of ['m2','relay']){
 const m=data.missions.find(m=>m.id===id),d=starterDesign(m,data),ev=evaluateDesign(d,data),strategies=[];
 for(const policy of ['urgent','batch']){
  const s=createOperations(d,data,ev,{relayTraffic:true});relayPolicy(s,policy);
  while(!s.finished){if(s.pendingIncident)resolveIncident(s,({contact:'buffer',battery:'recover',thermal:'cool',storage:'diagnose',radiation:'shield',debris:'hold'})[s.pendingIncident.id]);stepOperations(s);validateRelay(s);}
  const summary=operationSummary(s);assert.equal(summary.passed,true,id+' '+policy+' viable strategy');strategies.push({policy,summary,received:s.relayTraffic.received.length,expired:s.relayTraffic.expired.length});
 }
 rows.push({id,strategies});
}
// Separate-link boundary: a live Earth link without any source access cannot serve traffic.
const noSource={orbit:null,tick:0,relayTraffic:createRelayTraffic(),evidence:{scenario:{windows:[['test',0,10]]},serviceSec:{}},hardware:{dataGbDay:100,instantDownlinkGbDay:100},storageGb:0,storageCapacityGb:1};
stepRelay(noSource,{contactFraction:1},true,'observe',0,270);assert.equal(noSource.relayTraffic.received.length,0);validateRelay(noSource);
const old=createMissionRun(starterDesign(data.missions[0],data),data);delete old.lifecycle;assert.equal(migrateMissionRun(old,data).lifecycle,undefined,'Legacy checkpoint retains original model');
for(const id of ['m1','m3','wildfire']){
 const m=data.missions.find(m=>m.id===id),design=starterDesign(m,data);design.scienceBundleId=bundleForMission(id).bundle.id;
 if(id!=='m3')design.orbitElements=presetOrbit('sso',{raanRad:(id==='m1'?75:60)*RAD});
 const cases=[];
 for(const policy of ['broad','priority']){
  const state=createOperations(design,data,evaluateDesign(design,data));state.evidence.sourceEvidenceModel='unique-target-1';state.evidence.targetSeconds={};state.evidence.sourcePolicy=policy;
  while(!state.finished){if(state.pendingIncident)resolveIncident(state,({contact:'buffer',battery:'recover',thermal:'cool',storage:'diagnose',radiation:'shield',debris:'hold'})[state.pendingIncident.id]);stepOperations(state);}
  assert.ok(Object.values(state.evidence.targetSeconds).every(x=>x<=600+1e-8),'Unique evidence cap per location');
  const summary=operationSummary(state);assert.equal(summary.passed,true,id+' source '+policy+' viable policy');cases.push({policy,summary,uniqueTargets:Object.keys(state.evidence.targetSeconds).length});
 }
 rows.push({id,source:design.scienceBundleId,cases});
 if(id==='m1'){
  const capped=createOperations(design,data,evaluateDesign(design,data));capped.evidence.sourceEvidenceModel='unique-target-1';capped.evidence.sourcePolicy='broad';
  capped.evidence.targetSeconds=Object.fromEntries(bundleForMission(id).bundle.targets.map(t=>[t.id,600]));
  while(!capped.finished){if(capped.pendingIncident)resolveIncident(capped,({contact:'buffer',battery:'recover',thermal:'cool',storage:'diagnose',radiation:'shield',debris:'hold'})[capped.pendingIncident.id]);stepOperations(capped);}
  assert.ok(capped.deliveredGb>0,'Repeated raw bytes can still be returned');assert.equal(capped.evidence.usefulGb,0,'Previously saturated source locations earn no new useful evidence');
 }
}
const bad=structuredClone(old);bad.schemaVersion=999;assert.throws(()=>migrateMissionRun(bad,data));
const end=createMissionRun(starterDesign(data.missions[0],data),data);end.operations=createOperations(end.design,data,end.evalResult);Object.assign(end.operations,{finished:true,fuelKg:4,tick:120});assert.ok(chooseMissionEnd(end,'extend'));assert.equal(end.operations.fuelKg,4,'Historical completion reserve retained');assert.equal(end.missionEnd.remainingKg,3);assert.equal(end.missionEnd.extension.steps,24);assert.equal(chooseMissionEnd(end,'passivate'),false);
fs.writeFileSync(dir+'/complete-gameplay-models.json',JSON.stringify({status:'passed',tests:['Independent Lambert reference','Circular propagation','Frame round trip','Clock units','Date effects','Insertion dependency','Mass/fuel continuity','Impossible burn','Navigation knowledge','Correction effect','Capture energy','Reload equivalence','Relay ownership/expiry','Legacy migration','End-choice idempotency'],rows},null,2));
console.log(JSON.stringify(rows.map(r=>({id:r.id,status:r.status,strategies:r.strategies?.map(x=>({policy:x.policy,passed:x.summary.passed,received:x.received,expired:x.expired}))})),null,2));
console.log('PASS complete-gameplay model checks');


