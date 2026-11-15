import {escapeHtml as escape} from '../ui/html.js';
import {MINUTES_PER_TICK} from '../engine/operations.js';
import {opportunityTimeline} from './operationsPreview.js';
import {encounterAllocation} from './scienceTransfer.js';
import {usingPracticeProfile} from './practiceProfile.js';

const minutes = seconds => (seconds / 60).toFixed(1);
const dataGb = value => (value > 0 && value < .001 ? '<0.001' : value.toFixed(3)) + ' GB';
const clock = seconds => 'T+' + minutes(seconds) + ' min';
const modeName = {observe:'Observe', downlink:'Transmit', auto:'Autopilot', safe:'Safe mode', charge:'Charge'};
const relayName = {urgent:'Urgent first', batch:'Batch messages'};

function details(label, elements) {
  const group = document.createElement('details');
  group.className = 'featured-advanced';
  const summary = document.createElement('summary');
  summary.textContent = label;
  group.append(summary, ...elements.filter(Boolean));
  return group;
}

function relayFlow(queue, live=false) {
  return `<div class="relay-flow" aria-label="Message route">
    <div><span>Crew</span><strong>${queue.source.length}</strong><small>awaiting pickup</small></div><b aria-hidden="true">→</b>
    <div><span>Relay</span><strong>${queue.onboard.length}</strong><small>onboard</small></div><b aria-hidden="true">→</b>
    <div><span>Earth</span><strong>${queue.received.length}</strong><small>received</small></div>
  </div><p class="relay-expired"><strong>${queue.expired.length} expired</strong>${live?
    ` · Crew link ${Math.round(queue.sourceVisibleFraction*100)}% · Earth link ${Math.round(queue.earthVisibleFraction*100)}%`:''}</p>`;
}

function relayReceipts(queue, live=false) {
  const events = [
    ...queue.received.map(m=>({message:m, time:m.receiptSec, text:'Received on Earth'})),
    ...queue.expired.map(m=>({message:m, time:m.expiredSec, text:m.owner==='source'?'Expired at crew':'Expired onboard'})),
    ...(live ? queue.onboard.filter(m=>Number.isFinite(m.pickupSec)).map(m=>({message:m,time:m.pickupSec,text:'Picked up by relay'})) : []),
  ].sort((a,b)=>b.time-a.time).slice(0,live?2:3);
  return events.length ? `<ol class="relay-receipts">${events.map(({message,time,text})=>
    `<li><strong>#${message.id} ${message.urgent?'Urgent':'Routine'}</strong><span>${text} · ${clock(time)}</span></li>`).join('')}</ol>` : '';
}

export function mountFeaturedOperations(container, missionId, onForecastOpen) {
  if(missionId!=='m1' && missionId!=='relay')return ()=>{};
  const host=container.querySelector('.control-objectives');
  const panel=document.createElement('section');
  panel.className='featured-decision';
  const flood=missionId==='m1';
  panel.innerHTML=flood
    ? '<h2>When to observe and transmit</h2><div class="featured-ops-controls"></div><p id="featured-opportunity"></p><p id="featured-cutoff"></p>'
    : '<h2>Choose a dispatch policy</h2><p>Send urgent traffic first or wait to send messages in batches.</p><div id="featured-relay-flow"></div>';
  if(usingPracticeProfile())container.querySelector('.control-header .orbital-eyebrow').textContent='ORBITAL / ISOLATED PRACTICE';
  host.prepend(panel);
  const find=id=>container.querySelector('#'+id);
  const sourcePolicy=find('source-policy')?.closest('label');
  const relayPolicy=find('relay-policy');
  const advanced=details('Advanced operations', [
    host.querySelector('.orbital-eyebrow'), host.querySelector(':scope > h2'),
    ...Array.from(host.children).filter(el=>el.matches('details') || (el.nodeName==='P'&&!el.id)),
    sourcePolicy, sourcePolicy?.nextElementSibling, find('relay-status'), find('ops-preview'),
  ]);
  const objective=find('ops-objectives');
  objective.before(advanced);
  advanced.addEventListener('toggle',()=>{if(advanced.open)onForecastOpen();});
  if(flood){
    const controls=panel.querySelector('.featured-ops-controls');
    for(const id of ['observe','downlink','auto']){
      const button=container.querySelector(`[data-command="${id}"]`);
      button.textContent=modeName[id];
      controls.append(button);
    }
    const more=details('Power modes', []);
    const other=container.querySelector('.control-commands');
    other.before(more);
    more.append(other);
  }else if(relayPolicy){
    panel.querySelector('#featured-relay-flow').before(relayPolicy.closest('label'));
    relayPolicy.options[0].textContent='Urgent first';
    relayPolicy.options[1].textContent='Batch every sixth interval';
  }
  let previous='';
  return state=>{
    if(flood){
      const observed=state.finished?null:opportunityTimeline(state,1)[0];
      const target=observed?.access??(observed?.target==='Outside scheduled targets'?'Outside target window':'Target window scheduled');
      find('featured-opportunity').textContent=observed
        ? `Next ${MINUTES_PER_TICK} min · ${target} · ${Math.round(observed.sunlit*100)}% sunlit · ${Math.round(observed.contact*100)}% Earth contact.`
        : 'Observation window ended.';
      const deadline=state.evidence?.scenario.deadline;
      const received=state.evidence?.usefulGb;
      find('featured-cutoff').textContent=Number.isFinite(deadline)
        ? `Cutoff ${clock(deadline*MINUTES_PER_TICK*60)} · ${dataGb(received)} useful data received`
        : 'Cutoff and useful receipts unavailable for this flight.';
      return;
    }
    const queue=state.relayTraffic, flow=find('featured-relay-flow');
    if(relayPolicy)relayPolicy.disabled=state.finished;
    const html=queue?relayFlow(queue,true)+relayReceipts(queue,true):'<p>Message tracking unavailable for this flight.</p>';
    if(html!==previous){flow.innerHTML=html;previous=html;}
  };
}

function allocationBar(allocation) {
  const total=allocation.reduce((sum,entry)=>sum+entry.seconds,0);
  return `<div class="encounter-split" aria-hidden="true">${allocation.map(({seconds})=>
    `<span style="flex-basis:${seconds/total*100}%"></span>`).join('')}</div>`;
}

export function mountMarsDecision(container, state) {
  if(state.missionId!=='mars-scout')return ()=>{};
  const select=container.querySelector('#cruise-plan');
  const host=container.querySelector('.cruise-commands');
  const panel=document.createElement('section');
  panel.className='featured-decision';
  panel.innerHTML='<h2>Divide the flyby window</h2><div id="feature-encounter-allocation"></div>';
  if(usingPracticeProfile()){
    const label=document.createElement('small');
    label.className='practice-flight-label';
    label.textContent='Isolated practice';
    panel.prepend(label);
  }
  host.prepend(panel);
  if(!select){
    panel.querySelector('div').textContent='Encounter planning unavailable for this flight.';
    return ()=>{};
  }
  const label=select.closest('label');
  const duplicate=label.nextElementSibling;
  if(duplicate?.nodeName==='SMALL')duplicate.remove();
  panel.querySelector('div').before(label);
  select.options[0].textContent='Split evenly';
  select.options[1].textContent='Favor regional context';
  let previous='';
  return ()=>{
    const revision=state.observationPlan+'|'+Boolean(state.encounterAllocation);
    if(revision===previous)return;
    previous=revision;
    const allocation=state.encounterAllocation??encounterAllocation(state.evidence.scenario,state.observationPlan);
    panel.querySelector('div').innerHTML=allocationBar(allocation)+'<div class="encounter-labels">'+allocation.map(
      ({target,seconds})=>'<span>'+escape(target)+' <strong>'+minutes(seconds)+' min</strong></span>').join('')+'</div>';
  };
}

function floodResult(run, state) {
  const evidence=state.evidence;
  const deadline=evidence?.scenario.deadline;
  if(!Number.isFinite(deadline) || !Array.isArray(evidence.observations))return null;
  const end=deadline*MINUTES_PER_TICK*60;
  const observed=evidence.observations.filter(o=>o.effectiveSec>0&&o.acquiredSec<=end);
  const received=observed.filter(o=>o.usefulGb>0);
  const when=o=>o.firstUsefulReceiptSec??(Math.abs(o.receivedGb-o.usefulGb)<1e-9?o.receivedSec:undefined);
  const markers=(entries,getTime,kind)=>entries.filter(o=>Number.isFinite(getTime(o))).map(o=>{
    const time=getTime(o);
    return `<i class="${kind}" style="left:${Math.min(100,Math.max(0,time/end*100))}%" title="${clock(time)}"></i>`;
  }).join('');
  const choices=run.commands?.filter(c=>c.type==='mode'&&c.status==='applied'&&c.tick<state.tick)??[];
  const latest=new Map();
  for(const command of choices)latest.set(command.mode,command);
  const shown=[...latest.values()].sort((a,b)=>b.sequence-a.sequence).slice(0,2).reverse();
  const schedule=shown.length?shown.map(c=>modeName[c.mode]+' at '+clock(c.tick*MINUTES_PER_TICK*60)).join(' and '):
    state.mode==='auto'&&Array.isArray(run.commands)?'Autopilot timing':null;
  const sentence=schedule?`With ${schedule}, Earth received ${dataGb(evidence.usefulGb)} of useful flood observations by the cutoff.`:
    'Decision history unavailable for this flight.';
  return {
    title:'Flood observations at Earth', sentence,
    body:`<div class="receipt-headline"><strong>${escape(dataGb(evidence.usefulGb))}</strong><span>useful data received by ${clock(end)}</span></div>
      <div class="receipt-timeline">
        <div><span>Observe</span><span class="receipt-track" aria-hidden="true">${markers(observed,o=>o.acquiredSec,'acquired')}</span><b>${observed.length}</b></div>
        <div><span>Earth receipt</span><span class="receipt-track" aria-hidden="true">${markers(received,when,'received')}</span><b>${received.length}</b></div>
      </div><div class="receipt-axis"><span>Deployment</span><span>Receipt deadline</span></div>`,
  };
}

function relayResult(run,state) {
  const queue=state.relayTraffic;
  if(!queue)return null;
  const changes=new Map(run.relayPolicyCommands?.filter(c=>c.tick<state.tick).map(c=>[c.tick,c.policy]));
  const policies=new Set([...(changes.has(0)?[]:['urgent']),...changes.values()]);
  const policy=policies.size>1?'With both dispatch policies used':`With ${relayName[[...policies][0]].toLowerCase()}`;
  const counts=`${queue.received.length} dispatches reached Earth and ${queue.expired.length} expired.`;
  return {
    title:'Lunar dispatches',
    sentence:!state.tick||(!run.relayPolicyCommands&&queue.policy!=='urgent')?'Applied dispatch policy unavailable for this flight.':`${policy}, ${counts}`,
    body:relayFlow(queue)+relayReceipts(queue),
  };
}

function marsResult(state) {
  const evidence=state.evidence;
  if(!evidence)return null;
  const allocation=state.encounterAllocation??(state.scienceEndSec&&state.observationPlan
    ? encounterAllocation(evidence.scenario,state.observationPlan):null);
  if(!allocation)return state.arrived
    ? {title:'Mars science return', sentence:'Encounter allocation unavailable for this flight.', body:''}
    : {title:'Mars science return', sentence:'The spacecraft did not reach the encounter.', body:''};
  const total=allocation.reduce((sum,entry)=>sum+entry.seconds,0);
  const received=evidence.observations.reduce((sum,sample)=>sum+sample.receivedGb,0);
  return {
    title:'Mars science return',
    sentence:`The ${allocation.map(entry=>Math.round(entry.seconds/total*100)).join('/')} encounter split returned ${dataGb(received)} of science to Earth.`,
    body:allocationBar(allocation)+`<div class="mars-return">${allocation.map(({target,seconds})=>{
      const bytes=evidence.observations.filter(sample=>sample.target===target).reduce((sum,sample)=>sum+sample.receivedGb,0);
      return `<div><span>${escape(target)} · ${minutes(seconds)} min allocated</span><strong>${escape(dataGb(bytes))}</strong><small>received on Earth</small></div>`;
    }).join('')}</div>`,
  };
}

export function featuredResult(missionId, run) {
  const report={m1:floodResult,relay:relayResult,'mars-scout':(_,state)=>marsResult(state)}[missionId];
  if(!report)return null;
  const state=run?.cruise??run?.operations;
  const result=state&&run.launchResult?.success?report(run,state):null;
  return result??{title:'Flight evidence unavailable',sentence:run?.launchResult?.success===false?
    'The flight ended before the spacecraft could collect evidence.':'This flight record has no detailed decision and receipt evidence.',body:''};
}

export function featuredObjectives(ops){
  const products=ops?.objectives?.filter(item=>item.id.startsWith('product-'))??[];
  if(!products.length)return '';
  return `<div class="featured-report-objectives">${products.map(item=>`<div><span>${escape(item.name)}</span><strong>${item.value.toFixed(1)} / ${item.target.toFixed(1)} ${escape(item.unit)}</strong><progress value="${Math.min(item.target,item.value)}" max="${item.target}" aria-label="${escape(item.name)}"></progress></div>`).join('')}</div>`;
}

