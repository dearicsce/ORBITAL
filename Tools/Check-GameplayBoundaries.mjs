import assert from 'node:assert/strict';
import fs from 'node:fs';
import {enrichCampaign,starterDesign} from '../Assets/StreamingAssets/WebUI/js/campaign.js';
import {createMissionRun,migrateMissionRun,advanceMissionRun,advanceUntilDecision} from '../Assets/StreamingAssets/WebUI/js/contracts/missionRun.js';
import {configureFlightContracts,setFlightSession,getFlightSession,importFlightSession} from '../Assets/StreamingAssets/WebUI/js/flightSession.js';
import {createOperations,stepOperations,resolveIncident,operationSummary} from '../Assets/StreamingAssets/WebUI/js/engine/operations.js';
import {initializeFromLaunch,initializeOperations} from '../Assets/StreamingAssets/WebUI/js/unity/missionLifecycle.js';
import {ascentVehicle,simulateAscent,numericalTarget} from '../Assets/StreamingAssets/WebUI/js/engine/ascent.js';
import {makeBlueprint} from '../Assets/StreamingAssets/WebUI/js/workshop/blueprint.js';
import {hardwareOptions,rerunExperiment} from '../Assets/StreamingAssets/WebUI/js/unity/missionExperiment.js';
import {norm,sub,propagateState,lambert} from '../Assets/StreamingAssets/WebUI/js/unity/navigation.js';
import {chooseMissionEnd,validateMissionEnd} from '../Assets/StreamingAssets/WebUI/js/unity/missionEnd.js';
const data=enrichCampaign(JSON.parse(fs.readFileSync('Assets/StreamingAssets/WebUI/data/world1.json')));
configureFlightContracts(data);let values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const run=createMissionRun(starterDesign(data.missions.find(m=>m.id==='m1'),data),data,6103);
assert.ok(setFlightSession(run,storage));const saved=storage.getItem('space_mission_flight_v1');
assert.equal(setFlightSession({...run,seedState:0},storage),false);assert.equal(storage.getItem('space_mission_flight_v1'),saved,'Invalid checkpoint cannot replace working save');
assert.equal(setFlightSession(run,{getItem:storage.getItem,setItem:()=>{throw Error('disk full')}}),false);assert.equal(storage.getItem('space_mission_flight_v1'),saved,'Failed write retains durable save');
assert.equal(importFlightSession('{broken',storage),false);assert.equal(storage.getItem('space_mission_flight_v1'),saved);
const older=structuredClone(run);older.runId='stale-flight';assert.ok(setFlightSession(older,storage));
const imported=structuredClone(run);imported.runId='imported-flight';assert.ok(importFlightSession(imported,storage));
const newerSave=storage.getItem('space_mission_flight_v1');assert.equal(setFlightSession(older,storage),false,'Superseded page-exit callback rejected');assert.equal(storage.getItem('space_mission_flight_v1'),newerSave);
assert.ok(importFlightSession(older,storage),'Explicit historical reimport remains available');
const oldObject=getFlightSession(storage),sameId=structuredClone(oldObject);sameId.wasCompleted=true;
assert.ok(importFlightSession(sameId,storage));const sameIdSave=storage.getItem('space_mission_flight_v1');assert.equal(setFlightSession(oldObject,storage),false,'Superseded object with the same run identity cannot undo an explicit restore');assert.equal(storage.getItem('space_mission_flight_v1'),sameIdSave);
const mismatch=structuredClone(run);mismatch.lifecycle.design.busId='other';assert.throws(()=>migrateMissionRun(mismatch,data),/snapshot/);
// Timestep sensitivity against an independently specified Vallado-style Lambert case.
// Curtis, Orbital Mechanics example: r1=[5000,10000,2100] km,
// r2=[-14600,2500,7000] km, dt=3600 s, mu=398600 km^3/s^2.
const a=[5000000,10000000,2100000],b=[-14600000,2500000,7000000],mu=3.986e14;
const solution=lambert(a,b,3600,mu);assert.ok(norm(sub(solution.v1,[-5992.5,1925.4,3245.6]))<.2,'Published 3D Lambert reference agrees to 0.2 m/s');
const coarse=propagateState({r:a,v:solution.v1},3600,mu,20),fine=propagateState({r:a,v:solution.v1},3600,mu,10);
assert.ok(norm(sub(coarse.r,b))<5&&norm(sub(fine.r,b))<1,'Transfer closure across step sizes');
const dot=v=>v.reduce((s,x)=>s+x*x,0),energy=s=>dot(s.v)/2-mu/norm(s.r);
assert.ok(Math.abs((energy(fine)-energy({r:a,v:solution.v1}))/energy(fine))<1e-7,'Independent specific-energy conservation');
const mission=data.missions.find(m=>m.id==='m1'),design=starterDesign(mission,data);design.assembly=makeBlueprint(design,data).assembly;
const flight=createMissionRun(design,data,6103),ascent=simulateAscent(ascentVehicle(flight.design,flight.evalResult.launchMass),numericalTarget(flight.design));assert.equal(ascent.reason,'');
initializeFromLaunch(flight,{orbit:ascent.orbit,insertionTimeS:ascent.end.timeS,positionM:ascent.end.positionM,velocityMps:ascent.end.velocityMps,massKg:ascent.end.massKg,upperPropellantKg:ascent.end.propellantKgByTank.upper,upperIgnitions:ascent.end.ignitions.upper});
flight.operations=initializeOperations(flight,createOperations({...flight.design,orbitElements:ascent.orbit},data,flight.evalResult));flight.phase='operations';
while(!flight.operations.finished){if(flight.operations.pendingIncident)resolveIncident(flight.operations,({contact:'buffer',battery:'recover',thermal:'cool',storage:'diagnose',radiation:'shield',debris:'hold'})[flight.operations.pendingIncident.id]);stepOperations(flight.operations);}
flight.operationsSummary=operationSummary(flight.operations);
assert.deepEqual(rerunExperiment(flight,data).summary,flight.operationsSummary,'Deployment control reproduces');
const full=rerunExperiment(flight,data,{scope:'full-mission'});assert.ok(full.launchResult.success);assert.deepEqual(full.summary,flight.operationsSummary,'Full ascent control reproduces');
const hardware=hardwareOptions(flight.design,data).find(x=>/battery/i.test(x.from));assert.ok(hardware);
const changed=rerunExperiment(flight,data,{scope:'full-mission',hardware:hardware.id});assert.equal(changed.scope,'full-mission');assert.notEqual(changed.massKg,full.massKg);
const confounded=rerunExperiment(flight,data,{hardware:hardware.id,schedule:'observe'});assert.equal(confounded.confounded,true);
assert.throws(()=>rerunExperiment(flight,data,{scope:'unknown'}));
const originalCompleted=JSON.stringify(flight),extension=structuredClone(flight),disposal=structuredClone(flight),passive=structuredClone(flight);
let stepped=createMissionRun(design,data,6103);stepped.operations=createOperations(stepped.design,data,stepped.evalResult);stepped.phase='operations';let skipped=structuredClone(stepped);
for(let i=0;i<3;i++){
 skipped=advanceUntilDecision(skipped);
 while(!stepped.operations.finished&&!stepped.operations.pendingIncident)stepped=advanceMissionRun(stepped);
 assert.deepEqual(skipped,stepped,'Explicit skip and normal stepping preserve identical state including failures/decisions');
 if(stepped.operations.pendingIncident){const choice=({contact:'buffer',battery:'recover',thermal:'cool',storage:'diagnose',radiation:'shield',debris:'hold'})[stepped.operations.pendingIncident.id];resolveIncident(stepped.operations,choice);resolveIncident(skipped.operations,choice);}
}
assert.ok(chooseMissionEnd(extension,'extend'));validateMissionEnd(extension);assert.ok(extension.missionEnd.orbit.semiMajorAxisM>flight.operations.orbit.semiMajorAxisM);assert.equal(extension.missionEnd.extension.history.length,24);assert.equal(extension.missionEnd.finalMissionElapsedSec-extension.missionEnd.missionElapsedSec,6480);assert.equal(extension.lifecycle.missionElapsedSec,extension.missionEnd.finalMissionElapsedSec);assert.deepEqual(extension.operations,flight.operations);assert.deepEqual(extension.operationsSummary,flight.operationsSummary);
assert.ok(chooseMissionEnd(disposal,'disposal'));validateMissionEnd(disposal);assert.ok(disposal.missionEnd.orbit.semiMajorAxisM<flight.operations.orbit.semiMajorAxisM);assert.ok(disposal.missionEnd.disposal.passivated);assert.ok(chooseMissionEnd(passive,'passivate'));assert.equal(passive.missionEnd.active,false);assert.equal(JSON.stringify(flight),originalCompleted);
migrateMissionRun(extension,data);migrateMissionRun(disposal,data);
const evidence=process.argv[2]||'Verification/CompleteGameplay-2026-11-11';
fs.mkdirSync(evidence,{recursive:true});
fs.writeFileSync(evidence+'/boundaries.json',JSON.stringify({passed:true,checks:['failed storage write','corrupt import','immutable snapshot','published 3D Lambert case','timestep convergence','energy','full-mission control','hardware ascent treatment','confounding'],lambert:{departureMps:solution.v1,coarseMissM:norm(sub(coarse.r,b)),fineMissM:norm(sub(fine.r,b))},experiment:{scope:changed.scope,baselineMass:full.massKg,changedMass:changed.massKg,outcome:changed.summary.passed}},null,2));
console.log('PASS: persistence boundaries, independent 3D reference, step sensitivity and full-mission experiments');
