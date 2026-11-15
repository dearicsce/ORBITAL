import {evaluateDesign} from '../engine.js';
import {createOperations,stepOperations,resolveIncident,operationSummary,INCIDENTS} from '../engine/operations.js';
import {escapeHtml as escape} from '../ui/html.js';
import {placementIssues} from '../workshop/blueprint.js';
import {SCENARIOS} from './scienceScenarios.js';

export const FORECAST_VERSION = 'forecast-cooperative-3';

function* forecastSteps(design,data){
 if(design.assembly&&placementIssues(design.assembly,data).length)throw Error('Resolve component placement before forecasting.');
 const e=evaluateDesign(design,data);
 const values={massKg:e.launchMass,costM:e.totalCost,generationW:e.panelPower,loadW:e.averageLoad,batteryWh:e.batteryUsableWh,recorderGb:data.parts.find(p=>p.id===design.computerId)?.recorderCapacityGb??0,downlinkGbDay:e.downlinkPerDay};
 if(!Object.values(values).every(Number.isFinite))throw Error('Choose valid components before forecasting.');
 const mission=data.missions.find(m=>m.id===design.missionId);
 let summary=null;
 if(mission?.profile&&Array.isArray(SCENARIOS[mission.id]?.windows)&&design.busId&&design.orbitId&&design.instrumentIds?.length){
  const state=createOperations(design,data,e,{relayTraffic:true});
  if(state.evidence?.bundle){state.evidence.sourceEvidenceModel='unique-target-1';state.evidence.sourcePolicy='broad';state.evidence.targetSeconds={};}
  while(!state.finished){
   if(state.pendingIncident){const choice=INCIDENTS[state.pendingIncident.id].choices.find(c=>!['burn','maneuver'].includes(c.id)||state.fuelKg>=3);if(!resolveIncident(state,choice.id))throw Error('Forecast incident unavailable');}
   stepOperations(state);
   yield;
  }
  summary=operationSummary(state);
  values.minimumWh=summary.science?.minimumWh??state.batteryWh;
  values.peakRecorderGb=Math.max(0,...state.history.map(s=>s.data??0));
  values.usefulGb=summary.science?.usefulGb??state.deliveredGb;
  values.deliveredGb=state.deliveredGb;
  values.targetMinutes=Object.values(state.evidence?.deliveredSeconds??{}).reduce((s,v)=>s+v,0)/60;
  values.contactMinutes=(state.evidence?.contactSec??0)/60;
  values.eclipseMinutes=state.history.reduce((s,p)=>s+(1-(p.sunlitFraction??1))*4.5,0);
 }
 return {modelVersion:FORECAST_VERSION,values,summary,scope:summary?'Planning estimate · operations only · launch and transfer feasibility not evaluated':'Engineering estimate only · encounter forecast is in flight planning',assumptions:'Estimate from selected orbit and full initial battery with Autopilot, broad source priorities, a 600 s useful-integration cap per source location, current two-link relay queues, and the first affordable listed incident choice. Launch electrical use and achieved insertion are excluded. Actual ascent, player commands and incident decisions can change this result. This operations estimate cannot establish launch/transfer feasibility; transfer/arrival forecasts remain in flight planning.'};
}
// Both APIs consume identical model steps; yielding never changes simulated time.
export function designForecast(design,data){
 const steps=forecastSteps(design,data);
 let next; do { next=steps.next(); } while(!next.done);
 return next.value;
}
export async function designForecastAsync(design,data,{signal,budgetMs=5}={}){
 const steps=forecastSteps(design,data);
 let start=performance.now();
 while(true){
  if(signal?.aborted)throw new DOMException('Forecast superseded','AbortError');
  const next=steps.next();
  if(next.done)return next.value;
  if(performance.now()-start>=budgetMs){
   await new Promise(resolve=>setTimeout(resolve,0));
   start=performance.now();
  }
 }
}
// A panel owns an immutable data snapshot, cancellation and a bounded cache.
// Every design input and model version is included in the key. The complete
// data/model/source snapshot scopes the cache for the lifetime of this panel.
export function createForecastService(data){
 const snapshot=structuredClone(data),cache=new Map();
 return {async forecast(design,signal){
  const key=FORECAST_VERSION+JSON.stringify(design);
  if(signal?.aborted)throw new DOMException('Forecast superseded','AbortError');
  if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return structuredClone(value);}
  const value=await designForecastAsync(structuredClone(design),snapshot,{signal});
  if(signal?.aborted)throw new DOMException('Forecast superseded','AbortError');
  cache.set(key,structuredClone(value));
  if(cache.size>8)cache.delete(cache.keys().next().value);
  return value;
 },clear(){cache.clear();}};
}
const labels={targetMinutes:['Useful received integration','min','Requires target access, instrument suitability and timely receipt'],contactMinutes:['Earth contact','min','Spherical contact geometry'],eclipseMinutes:['Time in shadow','min','Battery reserve must cover these intervals'],massKg:['Launch mass','kg','More mass uses launch capacity'],costM:['Mission cost','$M','More cost uses budget'],generationW:['Solar generation','W','Power when illuminated'],loadW:['Average requested load','W','Power demand'],batteryWh:['Usable stored energy','Wh','Energy for shadow'],recorderGb:['Recorder capacity','GB','Space for recorded bytes'],downlinkGbDay:['Forecast downlink','GB/day','Contact and power constrain actual receipt'],minimumWh:['Lowest reserve','Wh','Higher reserve gives more margin'],peakRecorderGb:['Peak recorder use','GB','Higher use can approach capacity'],usefulGb:['Useful evidence received','GB','Receipt before the mission deadline'],deliveredGb:['Raw bytes received','GB','Volume alone does not ensure useful evidence']};

export function createConsequencesPanel(host,data,initialBaseline=null){
 let baseline=initialBaseline?structuredClone(initialBaseline):null,baselineForecast=null,current=null,timer=null,revision=0,dead=false,controller=null;
 const service=createForecastService(data);
 host.innerHTML='<p>Pin a design baseline to compare changes. Forecasts use the flight resource model.</p><button class="btn" id="pin-consequences">Pin current design as baseline</button><div id="consequences-result" aria-live="polite"></div>';
 const result=host.querySelector('#consequences-result');
 const update=design=>{
  current=structuredClone(design);baseline??=structuredClone(design);
  const ticket=++revision;clearTimeout(timer);controller?.abort();
  controller=new AbortController();const signal=controller.signal;
  result.setAttribute('aria-busy','true');result.textContent='Estimates outdated · computing the current design…';
  timer=setTimeout(async()=>{
   if(dead||ticket!==revision)return;
   try{
    const before=baselineForecast??await service.forecast(baseline,signal);
    if(dead||ticket!==revision)return;
    baselineForecast=before;
    const after=await service.forecast(current,signal);
    if(dead||ticket!==revision)return;
    const rows=Object.entries(labels).filter(([key])=>Number.isFinite(after.values[key])&&Number.isFinite(before.values[key])).map(([key,[label,unit,meaning]])=>{const a=before.values[key],b=after.values[key],delta=b-a;return '<tr><th>'+escape(label)+' ('+unit+')</th><td>'+a.toFixed(2)+'</td><td>'+b.toFixed(2)+'</td><td>'+(delta>0?'+':'')+delta.toFixed(2)+' '+unit+'</td><td>'+escape(meaning)+'</td></tr>';}).join('');
    const limits=(after.summary?.objectives?.filter(o=>!o.passed)??[]).sort((a,b)=>a.value/a.target-b.value/b.target);
    const overview=['massKg','batteryWh','usefulGb'].filter(key=>Number.isFinite(before.values[key])&&Number.isFinite(after.values[key])).map(key=>{const [label,unit,meaning]=labels[key],a=before.values[key],b=after.values[key],delta=b-a;return '<div class="consequence-metric"><strong>'+escape(label)+' · '+unit+'</strong><p>Pinned '+a.toFixed(2)+' → Current '+b.toFixed(2)+'<br>Change '+(delta>0?'+':'')+delta.toFixed(2)+' '+unit+'</p><small>'+escape(meaning)+'</small></div>';}).join('');
    const noBenefit=after.values.batteryWh>before.values.batteryWh&&Math.abs((after.values.usefulGb??0)-(before.values.usefulGb??0))<1e-9&&after.summary?'<p>Extra battery did not increase useful receipt in this estimate. Inspect access, observing schedule, recorder and contact before adding more capacity.</p>':'';
    result.setAttribute('aria-busy','false');
    result.innerHTML='<p class="forecast-scope"><strong>'+escape(after.scope)+'</strong></p>'+noBenefit+'<p>'+escape(!after.summary?'Encounter science is evaluated in flight planning and flight results.':limits.length?'Largest forecast shortfall: '+limits[0].name+' ('+limits[0].value.toFixed(2)+' / '+limits[0].target.toFixed(2)+' '+limits[0].unit+'). Other misses: '+(limits.slice(1).map(o=>o.name).join(', ')||'none')+'.':'No forecast objective shortfall under these assumptions.')+'</p>'+overview+'<details><summary>All numbers and forecast assumptions</summary><p>The detailed table scrolls horizontally.</p><div class="science-table"><table><thead><tr><th>Measure</th><th>Pinned</th><th>Current</th><th>Change</th><th>Interpretation</th></tr></thead><tbody>'+rows+'</tbody></table></div><p>'+escape(after.assumptions)+'</p></details><p>W is power used now. Wh is stored energy. More radio power can reduce battery margin; more battery capacity adds the component’s actual mass and cost.</p>';
   }catch(error){if(!dead&&ticket===revision&&error.name!=='AbortError'){result.setAttribute('aria-busy','false');result.textContent='Forecast unavailable: '+error.message;}}
  },180);
 };
 host.querySelector('#pin-consequences').onclick=()=>{if(current){baseline=structuredClone(current);baselineForecast=null;update(current);}};
 return {update,destroy(){dead=true;revision++;clearTimeout(timer);controller?.abort();service.clear();}};
}
