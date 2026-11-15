import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {NASA_BUNDLES} from '../Assets/StreamingAssets/WebUI/js/unity/nasaBundles.js';
import {validateScenarioBundle,sourceBundle,bundleForMission,targetAccess} from '../Assets/StreamingAssets/WebUI/js/unity/sourceData.js';
import {enrichCampaign,starterDesign} from '../Assets/StreamingAssets/WebUI/js/campaign.js';
import {evaluateDesign} from '../Assets/StreamingAssets/WebUI/js/engine.js';
import {createMissionRun,migrateMissionRun} from '../Assets/StreamingAssets/WebUI/js/contracts/missionRun.js';
import {createOperations,stepOperations,chooseMode,operationSummary,resolveIncident,INCIDENTS} from '../Assets/StreamingAssets/WebUI/js/engine/operations.js';
import {surfacePoint,subSatellite,presetOrbit,RAD} from '../Assets/StreamingAssets/WebUI/js/engine/orbitalGeometry.js';
import {acquire,send,receive,validateEvidence} from '../Assets/StreamingAssets/WebUI/js/unity/scienceEvidence.js';
import {designForecast} from '../Assets/StreamingAssets/WebUI/js/unity/consequences.js';
import {download,sha256} from './NasaPipeline/download.mjs';
const out=(process.argv[2]||'Verification/Sol61-2026-11-10').replace(/[\\/]$/,'')+'/';
await fs.mkdir(out,{recursive:true});
const data=enrichCampaign(JSON.parse(await fs.readFile('Assets/StreamingAssets/WebUI/data/world1.json')));
const rows=[];
for(const entry of Object.values(NASA_BUNDLES)){
 validateScenarioBundle(entry);
 const {processedChecksum,...body}=entry.bundle;
 assert.equal(sha256(JSON.stringify(body)),processedChecksum,'Processed source bundle checksum');
 for(const t of entry.bundle.targets){
  const round=subSatellite(surfacePoint(entry.bundle.id.startsWith('lunar')?'moon':'earth',t.latitudeDeg,t.longitudeDeg));
  assert.ok(Math.abs(round.latitudeDeg-t.latitudeDeg)<1e-9);assert.ok(Math.abs(round.longitudeDeg-t.longitudeDeg)<1e-9);
 }
 const bad=structuredClone(entry);bad.bundle.targets[0].latitudeDeg=91;assert.throws(()=>validateScenarioBundle(bad),/coordinate/);
 const unknown=structuredClone(entry);unknown.bundle.validityMask.fill(false);
 const access=targetAccess({orbit:presetOrbit(entry.bundle.id.startsWith('lunar')?'llo':'sso')},unknown,0,270);
 assert.equal(access.known,false,'Entirely unknown source coverage stays unknown');
 rows.push({bundle:entry.bundle.id,checksum:processedChecksum,products:entry.products.map(p=>({id:p.id,rawChecksum:p.rawChecksum})),targets:entry.bundle.targets.length});
}
for(const [lat,lon] of [[90,180],[-90,-180],[0,179.999],[0,-179.999]]){
 const p=subSatellite(surfacePoint('earth',lat,lon));assert.ok(Math.abs(p.latitudeDeg-lat)<1e-9);
}
function simulate(design,mode='auto',fault){
 const s=createOperations(design,data,evaluateDesign(design,data));chooseMode(s,mode);fault?.(s);
 while(!s.finished){if(s.pendingIncident){const c=INCIDENTS[s.pendingIncident.id].choices.find(c=>!['burn','maneuver'].includes(c.id)||s.fuelKg>=3);resolveIncident(s,c.id);}stepOperations(s);}
 assert.ok(Math.abs(s.collectedGb-s.deliveredGb-s.storageGb-s.lostGb)<1e-7);
 assert.ok(s.batteryWh>=0&&s.batteryWh<=s.batteryCapacityWh+1e-7);
 validateEvidence(s,design.missionId,'mission-evidence-1');
 return {state:s,summary:operationSummary(s)};
}
const cases=[];
for(const id of ['m3','wildfire']){
 const design=starterDesign(data.missions.find(m=>m.id===id),data);
 design.scienceBundleId=bundleForMission(id).bundle.id;
 if(id==='wildfire')design.orbitElements=presetOrbit('sso',{raanRad:60*RAD});
 const baseline=simulate(design),alternativeDesign={...design,batteryIds:['battery_s']},alternative=simulate(alternativeDesign);
 assert.equal(baseline.summary.passed,true,id+' feasible baseline');assert.equal(alternative.summary.passed,true,id+' alternative feasible design');
 assert.ok(alternative.summary.science.minimumWh<baseline.summary.science.minimumWh,'Lighter battery gives less reserve');
 const failure=simulate({...design,computerId:'computer_minimal'},'observe');assert.equal(failure.summary.passed,false,'All observation/no delivery fails');
 const noContact=simulate({...design,stationIds:[]});
 if(id==='wildfire')assert.equal(noContact.summary.deliveredGb,0);
 const noPower=simulate(design,'observe',s=>{s.hardware.panelW=0;s.batteryWh=0;});assert.ok(noPower.state.outageMinutes>0);
 const full=simulate(design,'observe',s=>{s.storageCapacityGb=.001;});assert.ok(full.state.lostGb>0);
 const noAccess=simulate({...design,orbitElements:presetOrbit(id==='m3'?'llo':'sso',{inclinationRad:0})});
 assert.equal(noAccess.summary.objectives.find(o=>o.id==='product-0').passed,false,'Equatorial orbit cannot access polar/Greece priority');
 const run=createMissionRun(design,data,6103);run.operations=baseline.state;run.phase='operations';assert.equal(migrateMissionRun(run,data).sourceBundle.id,design.scienceBundleId);
 const old=createMissionRun({...design,scienceBundleId:null},data,6103);delete old.launchModelVersion;assert.equal(migrateMissionRun(old,data).sourceBundle,null,'Historical source-free runs remain source-free');
 const a=designForecast(design,data),b=designForecast(alternativeDesign,data);assert.ok(a.values.massKg>b.values.massKg);
 cases.push({mission:id,seed:6103,baseline:{design,summary:baseline.summary},alternative:{design:alternativeDesign,summary:alternative.summary,disadvantage:'Lower minimum stored energy; advantage lower launch mass'},failure:{design:{...design,computerId:'computer_minimal'},mode:'observe',summary:failure.summary},boundaries:{noContact:noContact.summary,noPower:noPower.summary,fullStorage:full.summary,noAccess:noAccess.summary}});
 assert.deepEqual(simulate(design).summary,baseline.summary,'Deterministic replay');
}
// Same recorder ledger, different source priority/receipt latency.
function receipt(delay,quality){const design=cases[1].baseline.design;const s=createOperations(design,data,evaluateDesign(design,data));const e=s.evidence;acquire(e,e.scenario.windows[0][0],0,600*quality,1,1,'test acquisition');receive(e,send(e,1),delay,27000);return {seconds:Object.values(e.deliveredSeconds)[0],bytes:e.usefulGb};}
assert.ok(receipt(7200,1).seconds<receipt(0,1).seconds);assert.ok(receipt(0,.5).seconds<receipt(0,1).seconds);assert.equal(receipt(0,.5).bytes,receipt(0,1).bytes);
const temp=await fs.mkdtemp(out+'cache-test-');const record=await download('https://cmr.earthdata.nasa.gov/search/collections.json',{cacheDir:temp,fetcher:async()=>new Response('{}',{status:200})});
const key=sha256('https://cmr.earthdata.nasa.gov/search/collections.json|');await fs.writeFile(temp+'/'+key+'.bin','corrupted');await assert.rejects(download('https://cmr.earthdata.nasa.gov/search/collections.json',{cacheDir:temp}),/Corrupted/);
await assert.rejects(download('https://example.com/data'),/origin/);
await assert.rejects(download('https://cmr.earthdata.nasa.gov/search/test',{cacheDir:temp,fetcher:async()=>new Response('',{status:403})}),/authorized archive/);
await fs.writeFile(out+'nasa-scenarios.json',JSON.stringify({sources:rows,cases},null,2));
console.log('PASS: '+rows.length+' numerical NASA bundles, provenance, coordinates, masks, deterministic strategies, resource boundaries, confidence/latency, cache and migration.');
