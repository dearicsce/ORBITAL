import assert from 'node:assert/strict';
import fs from 'node:fs';
import {enrichCampaign,starterDesign} from '../js/campaign.js';
import {evaluateDesign} from '../js/engine.js';
import {createOperations,stepOperations,resolveIncident,INCIDENTS} from '../js/engine/operations.js';
import {geometryAt,presetOrbit,intervalEnvironment,accessWindows,EARTH_STATIONS} from '../js/engine/orbitalGeometry.js';
import {groundTrackMarkup} from '../js/ui/groundTrack.js';
import {createMissionRun,validateMissionRun,migrateMissionRun} from '../js/contracts/missionRun.js';
const data=enrichCampaign(JSON.parse(fs.readFileSync(new URL('../data/world1.json',import.meta.url)))),base=starterDesign(data.missions.find(m=>m.id==='m1'),data);
let n=0;const check=(ok,msg)=>{assert.ok(ok,msg);n++;};
function run(design){const state=createOperations(design,data,evaluateDesign(design,data));while(!state.finished){if(state.pendingIncident)resolveIncident(state,INCIDENTS[state.pendingIncident.id].choices[0].id);stepOperations(state);const g=geometryAt(state.orbit,state.tick*270,state.stations),html=groundTrackMarkup(state);check(state.sunlit===g.sunlit,'Engine sunlight matches same endpoint as map');check(html.includes(`${g.latitudeDeg.toFixed(2)}° lat / ${g.longitudeDeg.toFixed(2)}° lon`),'Map shows engine latitude/longitude');check(Math.abs(state.environment.timeSec-state.tick*270)<1e-8,'Interval ends at exact map epoch');}return state;}
const normal=run(base),none=run({...base,stationIds:[]});check(normal.deliveredGb>0&&none.deliveredGb===0,'Station removal changes actual delivery');
const a=accessWindows(presetOrbit('leo'),0,32400),b=accessWindows(presetOrbit('leo',{inclinationRad:0}),0,32400);check(JSON.stringify(a)!==JSON.stringify(b),'Inclination changes access windows');
const c=accessWindows(presetOrbit('leo',{semiMajorAxisM:1e7}),0,32400);check(JSON.stringify(a)!==JSON.stringify(c),'Altitude changes access windows');
const design={...base,orbitElements:presetOrbit('leo',{inclinationRad:0,eccentricity:.02}),stationIds:['madrid']};const state=createOperations(design,data,evaluateDesign(design,data)),runEnvelope=createMissionRun(design,data);runEnvelope.operations=state;runEnvelope.phase='operations';validateMissionRun(runEnvelope,data);check(JSON.stringify(migrateMissionRun(JSON.parse(JSON.stringify(runEnvelope)),data))===JSON.stringify(runEnvelope),'Engineering parameters and network round-trip exactly');
const snapshot=JSON.stringify(state.orbit);design.orbitElements.inclinationRad=1;check(JSON.stringify(state.orbit)===snapshot,'Operations owns immutable orbital snapshot');
const legacy={...createOperations(base,data,evaluateDesign(base,data))};delete legacy.geometryVersion;delete legacy.orbit;delete legacy.stations;check(groundTrackMarkup(legacy).includes('legacy saved flight'),'Old flight fallback visibly labelled');
for(let i=0;i<8;i++){stepOperations(legacy);check(!legacy.environment.positionM,'Legacy flight retains original profile model');}
assert.throws(()=>intervalEnvironment(presetOrbit('leo'),0,0));n++;
console.log(`PASS: ${n} orbit/engine/map/persistence assertions`);
