import {escapeHtml as escape} from '../ui/html.js';
import {bundleForMission,validateBundleIdentity} from './sourceData.js';

const useInFlight={
 m1:'Flood classes and valid reference cells set the follow-up priorities. In SSO engineering geometry, try 75° ascending-node longitude, apply it, and check target access and Earth contacts. Schedule receipt before the briefing. Unknown cells receive no science credit. Class alone cannot determine depth or damage.',
 wildfire:'Archived hotspot coordinates and confidence guide the follow-up schedule. In SSO engineering geometry, try 60° ascending-node longitude and apply it. Check target access and decide whether to favor the higher-confidence half. Receipt measures simulated follow-up, with no burned-area estimate.',
 m3:'Seasonal temperature and nearby elevation samples establish cold-region context. Choose a suitable spectrometer and orbit, then compare broad and colder priorities. Returned context cannot confirm water ice.'
};
const intervalLabel={
 m1:'Nominal composite days (UTC)',
 wildfire:'Source archive coverage (UTC)',
 m3:'Product coverage metadata (UTC)'
};
export function sourceCard(missionId,identity){
 let entry;
 try{entry=identity?validateBundleIdentity(identity):bundleForMission(missionId);}catch(error){return '<p role="status">'+escape(error.message)+'</p>';}
 if(!entry){return missionId==='m1'?'<details class="source-card"><summary>NASA flood evidence status</summary><p>This mission currently uses its original authored scenario. The dated numerical flood bundle is unavailable; no observed flood map is claimed.</p></details>':'';}
 const b=entry.bundle;
 const products=entry.products.map(p=>{
  const dates=missionId==='m1'?p.observedStartUTC.slice(0,10)+' to '+p.observedEndUTC.slice(0,10):p.observedStartUTC+' to '+p.observedEndUTC;
  return '<section><h4>'+escape(p.productName)+'</h4><p>'+escape(p.provider+' · '+p.productVersion)+'<br>'+escape(intervalLabel[missionId]+' · '+dates)+'</p>'+
   '<p><a target="_blank" rel="noopener noreferrer" href="'+escape(p.sourceUrl)+'">Open source product ↗</a></p>'+
   '<details><summary>Grid, units and retrieval</summary><p>'+escape(p.coordinateSystem)+'</p><p>'+escape(p.units+' · '+p.resolution.value+' '+p.resolution.units+' '+p.resolution.meaning)+'</p><p>'+escape(p.missingValueMeaning)+'</p><p>'+escape(p.qualityLimit??'')+'</p><p>'+escape(p.attribution+' · Retrieved '+p.retrievedAtUTC)+'</p><code>'+escape(p.rawChecksum)+'</code></details></section>';
 }).join('');
 return '<details class="source-card"><summary>NASA observations · '+(identity?'used in this flight':'available mission context')+'</summary><p>'+escape(useInFlight[missionId])+'</p><p>'+escape(b.assumptions.description)+'</p><p>'+b.validityMask.filter(Boolean).length+' valid of '+b.targets.length+' archived samples. Unsampled locations remain unknown.</p>'+products+
  '<details><summary>Processing and bundle identity</summary><p>'+escape(entry.processing?.method??'The selected records retain their source coordinates and measurements.')+'</p><p>'+escape(b.id+' · '+b.processingVersion)+'</p><code>'+escape(b.processedChecksum)+'</code></details></details>';
}

export function sourceMap(state){
 const identity=state.evidence?.bundle;if(!identity)return '';
 const {bundle:b}=validateBundleIdentity(identity),e=state.evidence;
 const observed=new Set(e.observations.flatMap(o=>o.effectiveSec>0?o.visibleSourceTargetIds??[]:[]));
 const sent=new Set(e.observations.flatMap(o=>o.sentGb>0?o.visibleSourceTargetIds??[]:[]));
 const received=new Set(e.observations.flatMap(o=>o.receivedGb>0?o.visibleSourceTargetIds??[]:[]));
 const {west,east,south,north}=b.geographicBounds;
 const dots=b.targets.map((t,i)=>{const x=20+360*(t.longitudeDeg-west)/Math.max(.00001,east-west),y=180-160*(t.latitudeDeg-south)/Math.max(.00001,north-south);return '<circle cx="'+x.toFixed(2)+'" cy="'+y.toFixed(2)+'" r="4" fill="'+(received.has(t.id)?'#a4f0cd':observed.has(t.id)?'#f1bd74':'#8aa8c0')+'"><title>'+escape(t.id+' '+(b.validityMask[i]?'archived priority':'unknown')+(t.temperatureK!==undefined?' · '+t.temperatureK.toFixed(1)+' K seasonal average':t.floodClass!==undefined?' · flood class '+t.floodClass+' · '+t.cloudStatus:' · confidence '+t.confidencePercent+'%'))+'</title></circle>';}).join('');
 return '<section class="source-evidence-panel"><h3>Archived source priorities / simulated follow-up</h3><svg viewBox="0 0 400 200" role="img" aria-label="Source sample positions in geographic coordinates; list below provides statuses">'+dots+'</svg><p>Archived: '+b.targets.length+' · Observed in simulation: '+observed.size+' · Sent: '+sent.size+' · Received: '+received.size+'</p><p>In recorder: '+state.storageGb.toFixed(3)+' GB. Sent and received are byte-ledger states; partial packets can contribute to the same source priority. Unmapped locations are unknown.</p><details><summary>Source coordinates and non-colour statuses</summary><ul>'+b.targets.map(t=>'<li>'+escape(t.id)+' · '+t.latitudeDeg.toFixed(3)+'°, '+t.longitudeDeg.toFixed(3)+'° · '+(received.has(t.id)?'received':sent.has(t.id)?'sent':observed.has(t.id)?'observed; check recorder':'not observed')+'</li>').join('')+'</ul></details>'+sourceCard(state.missionId,identity)+'</section>';
}
