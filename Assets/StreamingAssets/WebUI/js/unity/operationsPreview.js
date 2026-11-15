import {operationEnvironment,MINUTES_PER_TICK} from '../engine/operations.js';
import {escapeHtml as escape} from '../ui/html.js';
import {targetAccess,validateBundleIdentity} from './sourceData.js';

export function opportunityTimeline(state, intervals=8){
 const entry=validateBundleIdentity(state.evidence?.bundle),scenario=state.evidence?.scenario;
 const rows=[];
 for(let offset=0;offset<intervals&&state.tick+offset<state.totalTicks;offset++){
  const sample={...state,tick:state.tick+offset,contactOutage:Math.max(0,(state.contactOutage||0)-offset)};
  const env=operationEnvironment(sample),seconds=sample.tick*MINUTES_PER_TICK*60;
  const target=scenario?.windows?.find(([,a,b])=>sample.tick>=a&&sample.tick<b)?.[0]||'Outside scheduled targets';
  const access=entry?targetAccess(sample,entry,seconds,MINUTES_PER_TICK*60):null;
  rows.push({minutes:seconds/60,sunlit:env.sunlitFraction??Number(env.sunlit),contact:env.contactFraction??Number(env.contact),target,access:access?(access.known?Math.round(access.fraction*100)+'% modeled source access':'Unknown source access'):null});
 }
 return rows;
}

export function operationsPreviewMarkup(state){
 const rows=opportunityTimeline(state),e=state.evidence;
 const deadline=e?.scenario?.deadline;
 const left=Number.isFinite(deadline)?(deadline-state.tick)*MINUTES_PER_TICK:null;
 const cutoff=left===null?'':left>0?'Receipt cutoff in '+left.toFixed(1)+' min.':'Receipt cutoff passed; later evidence cannot meet this deadline.';
 const mode=state.mode==='auto'?'Autopilot chooses the applied mode each interval.':state.cooldown?'Protective recovery overrides the requested mode.':'Player commands apply within the modeled interval.';
 return '<p>'+escape(operationsPreview(state))+'</p><p>Requested: '+escape(state.mode)+' · Last applied: '+escape(state.activeMode)+' · '+escape(mode)+'</p><p>Recorder '+state.storageGb.toFixed(2)+' / '+state.storageCapacityGb.toFixed(2)+' GB · '+escape(cutoff)+'</p><details><summary>Upcoming opportunities · sampled estimates</summary><p>T+ minutes from deployment. Rows cover '+MINUTES_PER_TICK+' min intervals using the current orbit and known outage countdown. Future incidents, commands and resource use can change what is possible. Percentages describe opportunity, not guaranteed acquisition or receipt.</p><div class="science-table"><table><thead><tr><th>T+ min</th><th>Sunlit</th><th>Contact</th><th>Scheduled target / access</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r.minutes.toFixed(1)+'</td><td>'+Math.round(r.sunlit*100)+'%</td><td>'+Math.round(r.contact*100)+'%</td><td>'+escape(r.target+(r.access?' · '+r.access:''))+'</td></tr>').join('')+'</tbody></table></div></details>';
}

export function operationsPreview(state){
 if(state.finished)return 'The operations window has ended.';
 const env=operationEnvironment(state),h=state.hardware;
 const sunlit=env.sunlitFraction??Number(env.sunlit);
 const contact=env.contactFraction??Number(env.contact);
 const observeW=h.baseW+h.payloadW+((h.relay?h.radioTransmitW:h.radioStandbyW)??0);
 const energy=Math.max(0,observeW-h.panelW*sunlit)*MINUTES_PER_TICK/60;
 const messages=[`Next ${MINUTES_PER_TICK} min · ${Math.round((1-sunlit)*100)}% in shadow · ${Math.round(contact*100)}% station visibility.`];
 if(energy>state.batteryWh){
  messages.push('Observe may exceed the available energy. Safe mode sheds payload load.');
 }
 if(state.storageCapacityGb>0&&state.storageGb>=state.storageCapacityGb*.8){
  messages.push(contact>0?'Recorder above 80%. A downlink now can free space.':'Recorder above 80%. Check the ground track for the next pass.');
 }
 if(state.mode!=='auto'&&state.activeMode!==state.mode){
  messages.push(state.cooldown?'Protective recovery is overriding the requested mode.':'Requested mode '+state.mode+' · last applied mode '+state.activeMode+'.');
 }
 return messages.join(' ');
}
