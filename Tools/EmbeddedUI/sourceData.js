import {NASA_BUNDLES} from './nasaBundles.js';
import {propagate,toFixed,elevation} from '../engine/orbitalGeometry.js';

const fail=message=>{throw Error('NASA bundle: '+message);};
const date=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT/.test(value)&&Number.isFinite(Date.parse(value));
const checksum=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function validateSourceProduct(p){
 for(const key of ['id','provider','productName','productVersion','units','coordinateSystem','missingValueMeaning','attribution','redistributionNotes'])if(typeof p?.[key]!=='string'||!p[key]||p[key].length>4000)fail('Missing or invalid product '+key);
 if(!date(p.retrievedAtUTC)||!date(p.observedStartUTC)||!date(p.observedEndUTC)||Date.parse(p.observedStartUTC)>Date.parse(p.observedEndUTC)||!checksum(p.rawChecksum))fail('Invalid product timestamps or checksum');
 if(!/^https:\/\//.test(p.sourceUrl)||!p.resolution||!Number.isFinite(p.resolution.value)||p.resolution.value<=0)fail('Invalid product URL or resolution');
 return p;
}
export function validateScenarioBundle(entry){
 const {bundle:b,products}=entry??{};
 if(!b||b.schemaVersion!==1||!checksum(b.processedChecksum)||!date(b.referenceTime)||!Array.isArray(products)||products.length>8)fail('Invalid bundle envelope');
 products.forEach(validateSourceProduct);
 if(!Array.isArray(b.productIds)||b.productIds.some(id=>!products.some(p=>p.id===id)))fail('Unknown source product');
 if(!Array.isArray(b.targets)||b.targets.length>2048||!Array.isArray(b.validityMask)||b.validityMask.length!==b.targets.length||b.validityMask.some(v=>typeof v!=='boolean'))fail('Invalid bounded targets or validity mask');
 for(const t of b.targets)if(typeof t.id!=='string'||!Number.isFinite(t.latitudeDeg)||Math.abs(t.latitudeDeg)>90||!Number.isFinite(t.longitudeDeg)||Math.abs(t.longitudeDeg)>180||t.temperatureK!==undefined&&(!Number.isFinite(t.temperatureK)||t.temperatureK<0||t.temperatureK>450)||t.elevationM!==undefined&&!Number.isFinite(t.elevationM))fail('Invalid target coordinate or measurement');
 if(b.targets.some(t=>t.floodClass!==undefined&&![0,1,2,3,255].includes(t.floodClass)))fail('Unknown numerical flood encoding');
 for(const key of ['unknownMask','cloudMask'])if(b[key]&&(!Array.isArray(b[key])||b[key].length!==b.targets.length||b[key].some(v=>typeof v!=='boolean'&&(key!=='cloudMask'||v!==null))))fail('Invalid aligned '+key);
 if(!b.assumptions||!Number.isFinite(b.assumptions.deadlineSec)||b.assumptions.deadlineSec<=0)fail('Invalid authored deadline');
 return entry;
}
export function sourceBundle(id){
 if(!id)return null;
 const entry=NASA_BUNDLES[id];if(!entry)fail('Unavailable bundle '+id+'. Choose the original mission or install a validated bundle.');
 return validateScenarioBundle(entry);
}
export const bundleIdentity=b=>b?({id:b.id,version:b.scenarioVersion,checksum:b.processedChecksum,processingVersion:b.processingVersion,scoringVersion:b.scoringVersion}):null;
export function validateBundleIdentity(identity){
 if(!identity)return null;
 const entry=sourceBundle(identity.id);
 if(JSON.stringify(bundleIdentity(entry.bundle))!==JSON.stringify(identity))fail('Pinned source bundle version/checksum is unavailable; original evidence must be retained.');
 return entry;
}
export function bundleForMission(id){return id==='m1'?sourceBundle('sindh-flood-20261110-1'):id==='m3'?sourceBundle('lunar-polar-context-1'):id==='wildfire'?sourceBundle('rhodes-firms-20230723-1'):null;}

export function scenarioFromBundle(missionId,original,id){
 if(!id)return original;
 const entry=sourceBundle(id);
 if(bundleForMission(missionId)?.bundle.id!==id)fail('Source bundle does not match mission');
 const lunar=missionId==='m3';
 if(missionId==='m1')return {...original,product:'Archived numerical flood-context brief',question:'Can valid flood-class cells and reference context be followed up and received before the briefing?',windows:[['Flood and reference context',0,110]],minimum:1,deadline:110,sourceBundleId:id,approximation:entry.bundle.assumptions.description};
 return {...original,product:lunar?'Archived south-polar context investigation':'Archived Rhodes follow-up inspection',
  question:lunar?'Can orbital spectroscopy return context for archived cold lunar cells?':'Can hypothetical follow-up evidence from archived thermal priorities arrive before the desk deadline?',
  windows:[[lunar?'South-polar source cells':'Rhodes archived priorities',0,120]],minimum:entry.bundle.assumptions.minimumDeliveredMinutes,
  deadline:entry.bundle.assumptions.deadlineSec/270,sourceBundleId:id,
  approximation:lunar?'Spacecraft sunlight approximates payload lighting; terrain shadow and illumination are not solved. Cold temperatures do not confirm ice.':'Active thermal detections are inspection priorities, not burned area. Follow-up evidence is simulated.'};
}

// Spherical line of sight sampled on the authoritative orbit at 15 seconds.
// This is a conservative centre-point field-of-regard model, not a terrain
// shadow solution or a promise of calibrated spacecraft measurements.
export function targetAccess(state,entry,startSec,seconds){
 if(!state.orbit)return {fraction:0,known:false,visibleTargetIds:[]};
 const b=entry.bundle;
 let known=b.targets.filter((t,i)=>b.validityMask[i]&&(t.confidencePercent===undefined||t.confidencePercent>0));
 if(state.evidence?.sourcePolicy==='priority'){
  if(b.id.startsWith('sindh-'))known=known.filter(t=>t.floodClass===2||t.floodClass===3);
  else {
  const lunar=b.id.startsWith('lunar');
  const sorted=[...known].sort((a,b)=>lunar?a.temperatureK-b.temperatureK:b.confidencePercent-a.confidencePercent);
  known=sorted.slice(0,Math.max(1,Math.ceil(sorted.length/2)));
  }
 }
 if(!known.length)return {fraction:0,known:false,visibleTargetIds:[]};
 const visible=new Set();let accessible=0,n=0;
 for(let t=startSec+7.5;t<startSec+seconds;t+=15){
  const pos=toFixed(propagate(state.orbit,t),state.orbit.body,t+(state.orbit.epochS??0));
  let any=false;
  for(const target of known)if(elevation(pos,target,state.orbit.body)>=(b.assumptions.minimumElevationDeg??20)){visible.add(target.id);any=true;}
  accessible+=Number(any);n++;
 }
 const weights=known.filter(t=>visible.has(t.id)&&t.confidencePercent!==undefined).map(t=>t.confidencePercent/100);
 return {fraction:n?accessible/n:0,known:true,visibleTargetIds:[...visible],priorityWeight:weights.length?weights.reduce((a,b)=>a+b,0)/weights.length:1};
}
