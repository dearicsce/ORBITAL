import {cameraControls,bindCameraControls} from './flightCamera.js';
import {operationsElapsedSec} from '../engine/flightClock.js';
import {groundTrackMarkup} from './groundTrack.js';
import {BODIES,orbitalPeriod,propagate} from '../engine/orbitalGeometry.js';
import { createOrbitOps } from '../three/orbitOps.js';
import { createOperations,stepOperations,chooseMode,resolveIncident,operationObjectives,operationSummary,INCIDENTS } from '../engine/operations.js';
import { setFlightSession } from '../flightSession.js';
import {reduceRunCommand,advanceMissionRun,migrateMissionRun} from '../contracts/missionRun.js';

function sparkline(history,key,max=100){
  const points=history.map((p,i)=>`${i/Math.max(1,history.length-1)*270},${48-Math.min(1,p[key]/max)*44}`).join(' ');
  return `<svg viewBox="0 0 270 52" role="img" aria-label="${key} history over the operational window"><path d="M0 48H270M0 25H270" stroke="#253742" fill="none"/><polyline points="${points}" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`;
}
function metric(label,id,unit){return `<div class="control-metric"><span>${label}</span><strong id="${id}">—</strong><small>${unit}</small></div>`;}

export function renderMissionControl(container,data,session,onReport,continuation=null,{persist=setFlightSession,training=false,onTrainingSuccess=()=>{}}={}){
  const {design,mission,evalResult}=session;
  const saved=session.operations;
  if(training&&!saved)session.phase='operations';
  const achieved=session.ascentInsertion?.orbit;
  let state=saved?.version===1?saved:createOperations(achieved?{...design,orbitElements:achieved}:design,data,evalResult);
  if(!saved){session.simulationVersion='guided-orbits-3';if(training){state.mode='safe';state.activeMode='safe';state.profile={...state.profile,...mission.profile};}}
  session.operations=state;session.eventResults=[];
  Object.assign(session,migrateMissionRun(session,data));state=session.operations;
  const command=input=>{try{Object.assign(session,reduceRunCommand(session,input));state=session.operations;return true;}catch(error){find('command-help').textContent=error.message;return false;}};
  const existing=continuation?container.querySelector('#launch-canvas'):null;
  container.innerHTML=`<section class="mission-control" data-screen="operations">
    <div class="mission-control-space" id="ops-canvas"></div><div class="control-vignette"></div>
    <header class="control-header"><div><p class="orbital-eyebrow">ORBITAL / LIVE OPERATIONS</p><h1>${mission.name}</h1></div><div class="control-clock"><span>MISSION ELAPSED</span><strong id="mission-clock">00:00</strong><small><span id="real-clock"></span></small></div><button class="orbital-button" id="pause-ops">Pause</button></header>
    <div class="control-layout"><aside class="control-panel control-objectives"><p class="orbital-eyebrow">FLIGHT OBJECTIVES</p><h2>${mission.objective}</h2><div id="ops-objectives"></div><div class="control-sector-title">${state.profile.relay?'SERVICE':'SURVEY'} COMPLETION</div><div class="control-sectors" id="survey-sectors"></div><p class="control-note">${state.profile.relay?'Availability across the sampled operational window.':'Coverage represents useful observing time, not geographic ground resolution.'}</p><div class="control-environment"><span id="sun-state"></span><span id="contact-state"></span></div></aside>
    <div class="control-centre">${cameraControls(design.orbitId)}<div class="control-orbit-label"><span>${design.orbitId.toUpperCase()} / ${mission.chapter==='frontier'?'LUNAR & DEEP SPACE':'EARTH ORBIT'}</span><strong id="active-mode">INITIALIZING</strong><span id="orbit-altitude"></span><p id="mode-explanation">Flight systems online</p></div></div>
    <aside class="control-panel control-telemetry"><p class="orbital-eyebrow">SPACECRAFT TELEMETRY</p><div class="control-metric-grid">${metric('BATTERY','battery-live','Wh usable')}${metric('RECORDER','storage-live','GB onboard')}${metric('RETURNED','returned-live','GB delivered')}${metric('PROPELLANT','fuel-live','kg reserve')}</div><div class="control-power"><span>GENERATION / LOAD · LAST 270 s AVG</span><strong id="power-live"></strong></div><div class="control-chart"><span>BATTERY / %</span><div id="battery-chart"></div></div><div class="control-chart data-chart"><span>RECORDER / GB</span><div id="data-chart"></div></div><div class="control-temperature"><span>PAYLOAD TEMPERATURE</span><strong id="temperature-live"></strong></div></aside></div>
    <details class="ground-overlay"><summary>Ground track, contacts & target access</summary><div id="ground-track"></div></details><div class="control-bottom"><div class="control-progress"><span id="orbit-number"></span><progress id="ops-progress" max="120" value="0"></progress><span id="ops-percent"></span></div><div class="control-commandbar"><div class="control-commands" role="group" aria-label="Spacecraft command">${[['auto','A','Autopilot'],['observe','01','Observe'],['downlink','02','Transmit'],['safe','03','Safe mode']].map(([id,n,name])=>`<button data-command="${id}" aria-pressed="${state.mode===id}"><small>${n}</small>${name}</button>`).join('')}</div><div class="control-speed" role="group" aria-label="Simulation speed">${[1,2,4].map(s=>`<button data-speed="${s}" aria-pressed="${s===1}">${s}×</button>`).join('')}</div><button class="orbital-button" id="finish-ops">End now & evaluate</button><button class="orbital-button primary" id="report" hidden>View mission report ↗</button></div><p id="command-help" class="control-command-help">Autopilot schedules observations and downlinks. You remain in command of incident responses.</p><div class="control-log" id="ops-log" aria-live="polite"></div></div>
    <div id="incident-host"></div></section>`;
  if(existing){existing.id='ops-canvas';existing.className='mission-control-space';container.querySelector('#ops-canvas').replaceWith(existing);}
  const view=continuation||createOrbitOps(container.querySelector('#ops-canvas'),{orbitId:design.orbitId,design,data,operationsSnapshot:state,initialProgress:state.tick/state.totalTicks});
  let speed=session.playback?.speed??1,accumulator=session.playback?.fractionMs??0,last=performance.now(),realMs=session.playback?.realMs??0,incidentShown=null,alive=true;
  const find=id=>container.querySelector('#'+id);
  const save=()=>{session.operations=state;session.operationsSummary=operationSummary(state);session.playback={speed,fractionMs:accumulator,realMs};persist(session);};
  function render(){
    const objectives=operationObjectives(state);
    find('battery-live').textContent=state.batteryWh.toFixed(0)+' / '+state.batteryCapacityWh.toFixed(0);
    find('storage-live').textContent=state.storageGb.toFixed(1)+' / '+state.storageCapacityGb.toFixed(0);
    find('returned-live').textContent=state.deliveredGb.toFixed(2);find('fuel-live').textContent=state.fuelKg.toFixed(1);
    find('power-live').textContent=state.tick===0?'— / — W (no completed interval)':state.generationW.toFixed(0)+' / '+state.loadW.toFixed(0)+' W';
    find('temperature-live').textContent=state.temperature.toFixed(0)+' °C';
    find('sun-state').textContent=state.sunlit?'☀ Sunlit arc':'◐ Eclipse';
    let contactLabel='○ No ground contact';
    if(state.contactOutage>0){
      contactLabel='⚠ Station outage';
    }else if(state.contact){
      if(state.activeMode==='safe'){
        contactLabel='◉ Ground station in view · Transmitter off (Safe)';
      }else if(state.intervalDeliveredGb>0){
        contactLabel=state.storageGb>0.001
          ?`◉ Ground link active · Transmitting (${state.intervalDeliveredGb.toFixed(3)} GB this interval)`
          :`◉ Ground link active · Delivered ${state.intervalDeliveredGb.toFixed(3)} GB · Recorder empty`;
      }else if(state.activeMode==='downlink'){
        contactLabel=state.storageGb>0.001?'◉ Ground link active · Standing by to transmit':'◉ Ground station in view · Recorder empty';
      }else if(state.hardware?.relay){
        contactLabel='◉ Ground station in view · Relay standby';
      }else{
        contactLabel='◉ Ground station in view · Transmitter standby';
      }
    }else if(state.intervalDeliveredGb>0){
      contactLabel=`○ Station pass completed · Delivered ${state.intervalDeliveredGb.toFixed(3)} GB this interval`;
    }
    find('contact-state').textContent=contactLabel;
    let activeLabel='POWER CONSERVATION';
    if(state.finished)activeLabel='WINDOW COMPLETE';
    else if(state.pendingIncident)activeLabel='DECISION REQUIRED';
    else if(state.paused)activeLabel='MISSION PAUSED';
    else if(state.activeMode==='safe')activeLabel='POWER CONSERVATION';
    else if(state.intervalDeliveredGb>0){
      if(state.activeMode==='observe'&&state.hardware?.relay)activeLabel='RELAY DOWNLINK ACTIVE';
      else if(state.storageGb<=0.001)activeLabel='DOWNLINK COMPLETE (IDLE)';
      else activeLabel='TRANSMITTING DATA';
    }
    else if(state.activeMode==='observe')activeLabel='SCIENCE COLLECTION';
    else if(state.activeMode==='downlink'){
      if(!state.contact||state.contactOutage>0)activeLabel='DOWNLINK STANDBY';
      else if(state.storageGb<=0.001)activeLabel='DOWNLINK IDLE';
      else activeLabel='TRANSMITTING DATA';
    }
    find('active-mode').textContent=activeLabel;
    find('mode-explanation').textContent=state.cooldown
      ?'Protective recovery in progress'
      :state.intervalDeliveredGb>0
      ?`Downlink active · Delivered ${state.intervalDeliveredGb.toFixed(3)} GB this interval${state.storageGb<=0.001?' (recorder empty)':''}`
      :state.activeMode==='downlink'&&(!state.contact||state.contactOutage>0)?'Waiting for a ground station pass'
      :state.activeMode==='downlink'&&state.storageGb<=0.001?'Recorder empty · waiting for observations'
      :state.activeMode==='observe'?'Payload active · recording useful observations'
      :state.activeMode==='safe'?'Reduced load · payload idle':'Returning stored observations to the ground';
    find('ops-objectives').innerHTML=objectives.map(o=>`<div class="control-objective ${o.passed?'complete':''}"><div><span>${o.name}</span><strong>${o.value.toFixed(o.unit==='GB'?1:0)}<small> / ${o.target} ${o.unit}</small></strong></div><progress max="${o.target}" value="${Math.min(o.target,o.value)}"></progress></div>`).join('');
    find('survey-sectors').innerHTML=Array.from({length:20},(_,i)=>`<span class="${objectives[0].value>=((i+1)*5)?'surveyed':''}"></span>`).join('');
    find('battery-chart').innerHTML=sparkline(state.history,'battery');find('data-chart').innerHTML=sparkline(state.history,'data',state.storageCapacityGb);
    find('ground-track').innerHTML=groundTrackMarkup(state);find('orbit-number').textContent=state.orbit?'ORBIT '+(1+Math.floor(operationsElapsedSec(state.tick)/orbitalPeriod(state.orbit))):'GUIDED SCHEMATIC';find('ops-progress').value=state.tick;find('ops-percent').textContent=Math.round(state.tick/state.totalTicks*100)+'%';
    find('pause-ops').textContent=state.paused?'Resume':'Pause';find('pause-ops').disabled=state.finished;
    const practicePassed=training&&state.collectedGb>0&&state.deliveredGb>0&&['observe','downlink'].every(mode=>session.commands.some(c=>c.type==='mode'&&c.mode===mode&&c.status==='applied'));
    if(practicePassed){state.paused=true;onTrainingSuccess();container.querySelector('#academy-next')?.removeAttribute('disabled');}
    find('finish-ops').hidden=training||state.finished;
    find('report').hidden=training?!practicePassed&&!state.finished:!state.finished;
    if(training){
      container.querySelectorAll('[data-command]').forEach(b=>b.classList.toggle('academy-target',b.dataset.command===(state.collectedGb>0?'downlink':'observe')));
      find('pause-ops').disabled=practicePassed||state.finished;
    }
    if(training)find('report').textContent=practicePassed?'Continue training →':'Retry operations';
    container.querySelectorAll('[data-command]').forEach(b=>{b.setAttribute('aria-pressed',String(state.mode===b.dataset.command));b.disabled=state.finished;});
    find('ops-log').textContent=state.log.slice(-1)[0]?.text||'Spacecraft acquired. Operational window open. All commands available.';
    sampleClock();
    if(state.pendingIncident&&incidentShown!==state.pendingIncident.id){
      incidentShown=state.pendingIncident.id;const event=INCIDENTS[incidentShown];view.flash(incidentShown==='radiation'?'solar_flare':incidentShown==='contact'?'antenna_fault':incidentShown==='debris'?'debris_warning':'battery_fade');
      find('incident-host').innerHTML=`<div class="control-incident-backdrop"><section class="control-incident" role="dialog" aria-modal="true" aria-labelledby="incident-title"><p class="orbital-eyebrow">FLIGHT DIRECTOR / YOUR DECISION</p><h2 id="incident-title">${event.name}</h2><p>${event.description}</p><div class="incident-choices">${event.choices.map(c=>`<button data-choice="${c.id}" ${['maneuver','burn'].includes(c.id)&&state.fuelKg<3?'disabled':''}><strong>${c.label} ↗</strong><span>${c.cost}</span></button>`).join('')}</div><small>Simulation paused while you decide. Your response changes this flight.</small></section></div>`;
      find('incident-host').querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(command({type:'incident',choiceId:b.dataset.choice})){find('incident-host').innerHTML='';incidentShown=null;save();render();find('pause-ops').focus();}});
      find('incident-host').querySelector('button:not(:disabled)')?.focus();
    }
  }
  const help={auto:'Autopilot schedules observations and downlinks. You remain in command of incident responses.',observe:'Collect observations. Uses payload power and recorder space; does not transmit stored data.',downlink:'Transmit stored data during a ground pass. Science collection pauses while transmitting.',safe:'Reduce power consumption and cool the payload. Science collection and transmission pause.'};
  container.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>{if(command({type:'mode',mode:b.dataset.command})){find('command-help').textContent=help[state.mode];save();render();}});
  container.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{speed=Number(b.dataset.speed);container.querySelectorAll('[data-speed]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));save();});
  find('pause-ops').onclick=()=>{if(command({type:'pause',paused:!state.paused})){save();render();}};
  find('finish-ops').onclick=()=>{if(command({type:'end'})){save();onReport();}};
  find('report').onclick=()=>{save();onReport();};
  function sampleClock(){
    const seconds=operationsElapsedSec(state.tick+(state.finished||state.pendingIncident?0:accumulator/1000));
    view.setTime(seconds,{orbit:state.orbit});
    if(state.orbit){
      const altitude=(Math.hypot(...propagate(state.orbit,seconds))-BODIES[state.orbit.body].radiusM)/1000;
      find('orbit-altitude').textContent=`${altitude.toFixed(1)} km altitude`;
    }
    const mins=Math.floor(seconds/60);
    const missionMinutes=mins+Math.floor((state.orbit?.epochS??0)/60);
    find('mission-clock').textContent=String(Math.floor(missionMinutes/60)).padStart(2,'0')+':'+String(missionMinutes%60).padStart(2,'0');
    find('real-clock').textContent='PLAY TIME · '+Math.floor(realMs/1000)+' s';
  }
  bindCameraControls(container,view,session.camera,options=>{session.camera=options;save();});
  container.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===speed)));
  window.addEventListener('pagehide',save);
  const timer=setInterval(()=>{
    if(!alive)return;const now=performance.now(),delta=Math.min(1000,now-last);last=now;
    if(state.paused||state.pendingIncident||state.finished)return;
    realMs+=delta;
    accumulator+=delta*speed;
    let changed=false;while(accumulator>=1000&&!state.pendingIncident&&!state.finished){Object.assign(session,advanceMissionRun(session));state=session.operations;accumulator-=1000;changed=true;}
    if(state.pendingIncident||state.finished)accumulator=0;
    if(changed){save();render();}else sampleClock();
  },40);
  find('command-help').textContent=help[state.mode];
  render();save();
  return ()=>{alive=false;clearInterval(timer);window.removeEventListener('pagehide',save);save();view.destroy();};
}
