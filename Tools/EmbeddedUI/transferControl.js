import {predictedCorrection} from '../unity/physicalCruise.js';
import {bodyState} from '../unity/navigation.js';
import {OBSERVE_PLANS} from '../unity/scienceScenarios.js';
import {selectEncounterPlan} from '../unity/scienceTransfer.js';
import {scienceBrief} from '../unity/scienceUI.js';
import {cruiseCommand,stepCruise,cruiseSummary} from '../transfer/cruise.js';
import {DAY_SEC,transferPosition,generationAt,AU_M} from '../transfer/planning.js';
import {setFlightSession} from '../flightSession.js';
import {missionImage,bindMissionImages} from './missionArt.js';
import {createEncounterView} from '../three/encounterView.js';
import {transferDestination} from '../unity/missionRoute.js';
import {escapeHtml} from './html.js';
import {loadData} from '../data.js';
import {mountEvidenceTimeline} from '../unity/campaignEvidenceView.js';
import {mountMarsDecision} from '../unity/featuredFlight.js';
import {INTENTS} from '../unity/spacecraftSystems.js';

const pendingCopy={
 departure:'Departure opportunity acquired. Command the burn from the Earth parking orbit.',
 correction:'Tracking indicates a targeting error. Approve the planned trim burn to reach the encounter.',
 encounter:'Target reached. Verify the encounter and perform the planned braking burn if required.',
 science:'Pointing solution acquired. Command the payload to collect its science sample.',
 downlink:'Earth can receive the recorded packet. Begin the downlink.'
};

function trajectoryMap(t){
 const scale=115/Math.max(t.r1,t.r2);
 const xy=([x,y])=>[330+x*scale,140-y*scale];
 const coords=Array.from({length:121},(_,i)=>xy(transferPosition(t,i/120)));
 const circle=(r,kind)=>`<circle cx="330" cy="140" r="${r*scale}" class="${kind}"/>`;
 const [dx,dy]=coords.at(-1);
 const [cx,cy]=coords[51];
 const [sx,sy]=coords[0];
 return {xy,coords,markup:`<svg class="cruise-trajectory" viewBox="0 0 660 280" role="img" aria-label="Simplified two-body transfer arc and live spacecraft position">
 <defs><radialGradient id="transfer-star"><stop stop-color="#fff0b8"/><stop offset=".7" stop-color="#ec9a47"/><stop offset="1" stop-color="#ec9a4700"/></radialGradient></defs>
 ${circle(t.r1,'parking-ring')}${circle(t.r2,'arrival-ring')}<circle cx="330" cy="140" r="${t.lunar?8:12}" fill="${t.lunar?'#6bb7dc':'url(#transfer-star)'}"/><polyline class="transfer-plan" points="${coords.map(x=>x.join(',')).join(' ')}"/>
 ${t.lunar?'<text x="330" y="127" text-anchor="middle">Earth</text>':`<circle cx="${sx}" cy="${sy}" r="8" fill="none" stroke="#77b6e0"/><text x="${sx}" y="${sy-13}" text-anchor="middle">Earth at departure</text><text x="330" y="163" text-anchor="middle">Sun</text>`}
 <polyline id="cruise-flown" class="transfer-flown"/><circle cx="${sx}" cy="${sy}" r="6" class="transfer-burn"><title>Departure burn</title></circle>
 <circle cx="${cx}" cy="${cy}" r="5" class="transfer-burn"><title>Correction opportunity</title></circle>
 <circle cx="${dx}" cy="${dy}" r="8" class="transfer-burn"><title>Planned encounter</title></circle>
 <circle id="cruise-target" r="5" fill="#f1bf7c"/><text id="cruise-target-label">${escapeHtml(t.target.name)}</text>
 <circle id="cruise-marker" cx="${coords[0][0]}" cy="${coords[0][1]}" r="5" fill="#baf5d9"/>
 <text x="22" y="26">${t.speculative?'SPECULATIVE STELLAR':t.lunar?'EARTH-CENTRED':'SUN-CENTRED'} TRANSFER</text><text x="22" y="259">Dashed plan · solid flown · positions projected onto the transfer plane</text></svg>`};
}

function locationStatus(state, name, arrival) {
 if(state.phase==='departure')return 'Earth parking orbit';
 if(state.phase==='cruise')return state.pending==='encounter'?'Approach to '+name:'En route to '+name;
 if(state.arrived)return name+' · '+(state.physical?.arrivalKind==='flyby'?'Flyby':arrival);
 return 'Encounter incomplete';
}

function duration(seconds) {
 if(seconds>=365.25*DAY_SEC)return (seconds/DAY_SEC/365.25).toFixed(2)+' y';
 if(seconds>=DAY_SEC)return (seconds/DAY_SEC).toFixed(2)+' d';
 if(seconds>=3600)return (seconds/3600).toFixed(2)+' h';
 return (seconds/60).toFixed(1)+' min';
}

export function renderCruise(container,session,onReport){
 const state=session.cruise,t=state.trajectory,h=state.hardware;
 const map=trajectoryMap(t);
 const {name,arrival}=transferDestination(session.mission);
 let speed=[1,4,16].includes(session.cruisePlayback?.speed)?session.cruisePlayback.speed:1;
 let realMs=session.cruisePlayback?.realMs||0,carry=session.cruisePlayback?.carry??0,last=performance.now();
 container.innerHTML=`<section class="screen content-screen cruise-screen" data-screen="cruise"><header class="screen-top"><div><p class="orbital-eyebrow">ORBITAL / TRANSFER CONTROL</p><h1>${session.mission.name}</h1></div><button class="btn" id="cruise-pause">Pause</button></header>
 <div class="cruise-layout"><div class="glass cruise-main">${map.markup}<div class="cruise-clocks"><div><small>MISSION ELAPSED</small><strong id="cruise-clock"></strong></div><div><small>REAL PLAY TIME</small><strong id="cruise-real"></strong></div><div><small>FLIGHT PHASE</small><strong id="cruise-phase"></strong></div></div><progress id="cruise-progress" max="120"></progress></div>
 <aside class="glass cruise-telemetry"><div class="program-panel-art">${missionImage(session.mission)}</div><div><h2>${t.target.name}</h2><p>${t.conditions}</p><dl><dt>Battery</dt><dd id="cruise-battery"></dd><dt>Generation / cruise draw</dt><dd id="cruise-power"></dd><dt>Trim propellant</dt><dd id="cruise-fuel"></dd><dt>Recorder / confirmed</dt><dd id="cruise-data"></dd><dt>Conservative link distance</dt><dd>${t.speculative?t.target.distanceLy.toFixed(3)+' light-years':(t.distanceM/1e9).toFixed(2)+' million km'}</dd><dt>Signal delay</dt><dd>${t.speculative?(t.lightMinutes/525960).toFixed(2)+' years':t.lightMinutes.toFixed(1)+' min'} one way</dd></dl></div></aside></div>
 <div class="glass cruise-commands"><p id="cruise-brief" aria-live="polite"></p>${state.evidence?scienceBrief(state.missionId)+`<label>Encounter schedule <select id="cruise-plan">${Object.entries(OBSERVE_PLANS).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label> <small>${state.evidence.scenario.targets.join(' → ')} · ${state.evidence.scenario.hours} h total</small>`: ''}<output id="cruise-navigation"></output><div class="cruise-buttons">${state.physical?'<button class="btn" data-cruise-command="navigate">Track again (one interval)</button><button class="btn" data-cruise-command="wait-nav">Correct later (12 intervals)</button><button class="btn" data-cruise-command="abandon">Abandon encounter</button><button class="btn" data-cruise-command="flyby">Accept flyby; give up orbit</button>':''}<button class="btn btn-primary" data-cruise-command="depart">${t.speculative?'Deploy beamed sail':'Execute departure burn'}</button><button class="btn btn-primary" data-cruise-command="correct">Apply mid-course correction</button><button class="btn" data-cruise-command="coast">Coast without correction</button><button class="btn btn-primary" data-cruise-command="acquire">${state.arrivalType==='crossing'?'Confirm boundary crossing':state.arrivalType==='flyby'?'Acquire flyby target':state.arrivalType==='rendezvous'?'Match target velocity':'Execute capture burn'}</button><button class="btn btn-primary" data-cruise-command="observe">Collect encounter science</button><button class="btn btn-primary" data-cruise-command="transmit">Begin downlink</button><button class="btn btn-primary" id="cruise-report">View flight report →</button></div><div class="cruise-buttons" role="group" aria-label="Cruise time acceleration">${[1,4,16].map(n=>`<button class="btn" data-cruise-speed="${n}" aria-pressed="${n===speed}">${n}×</button>`).join('')}</div><p id="cruise-log" role="status"></p><div id="cruise-evidence-panel"></div></div></section>`;
 const find=id=>container.querySelector('#cruise-'+id);
 const systemsStatus=document.createElement('p');
 systemsStatus.id='cruise-systems';systemsStatus.hidden=!state.systems;
 find('power').parentElement.after(systemsStatus);
 const main=container.querySelector('.cruise-main');
 const trajectory=main.querySelector('.cruise-trajectory');
 const positionStrip=document.createElement('div');
 positionStrip.className='transfer-location-strip';
 positionStrip.innerHTML=`<span>Earth departure <span aria-hidden="true">→</span> ${escapeHtml(name)} ${escapeHtml(arrival.toLowerCase())}</span><strong id="cruise-location" role="status"></strong>`;
 main.prepend(positionStrip);
 const encounter=document.createElement('div');
 encounter.id='cruise-encounter';encounter.className='transfer-encounter';encounter.hidden=true;
 encounter.innerHTML=`<div class="transfer-encounter-visual">${missionImage(session.mission)}</div><span class="transfer-encounter-label">${escapeHtml(name)} <small>Encounter view · illustrative</small></span>`;
 trajectory.after(encounter);
 const switchView=document.createElement('button');
 switchView.type='button';switchView.className='btn transfer-view-toggle';switchView.hidden=true;
 encounter.after(switchView);
 let viewMode='track',seenArrival=false,localView=null,viewRequested=false,alive=true;
 function updateView(){
  const local=state.arrived&&viewMode==='encounter';
  trajectory.classList.toggle('transfer-track-hidden',local);encounter.hidden=!local;
  switchView.hidden=!state.arrived;switchView.textContent=local?'Show transfer track':'Show encounter view';
  if(local&&!viewRequested){
   viewRequested=true;
   loadData().then(async data=>{
    if(!alive)return;
    const mount=document.createElement('div');mount.className='transfer-encounter-model';encounter.prepend(mount);
    const captured=state.arrivalType==='capture'&&(!state.physical||state.physical.arrivalKind==='orbit');
    const arrivalKind=state.physical?.arrivalKind||(captured?'orbit':state.arrivalType);
    localView=createEncounterView(mount,{mission:session.mission,design:session.design,data,captured,arrivalKind,
     isPaused:()=>state.paused||viewMode!=='encounter',attitude:()=>state.systems?.quaternion});
    encounter.querySelector('.transfer-encounter-label small').textContent=(captured?'Orbit preview · 1 revolution / 36 s':arrivalKind==='rendezvous'?'Rendezvous preview · relative position held':'Flyby preview · unbound pass')+' · illustrative scale · scroll to zoom';
    const rendered=localView?.rendered&&await localView.ready;
    if(!alive)return;
    if(rendered){
     mount.dataset.encounterReady='true';
     encounter.querySelector('.transfer-encounter-visual').hidden=true;
    }else{
     localView?.destroy();mount.remove();localView=null;
    }
   }).catch(()=>{
    if(!alive)return;
    localView?.destroy();localView=null;
    encounter.querySelector('.transfer-encounter-model')?.remove();
   });
  }
 }
 switchView.onclick=()=>{viewMode=viewMode==='encounter'?'track':'encounter';updateView();};
 if(state.physical){
  const extra=document.createElement('div');
  extra.className='transfer-model-status';
  extra.innerHTML='<p>Two-body coast · circular target reference · estimated local capture</p><dl><dt>Time to encounter</dt><dd id="cruise-eta"></dd><dt>Braking propellant</dt><dd id="cruise-braking"></dd></dl>';
  container.querySelector('.cruise-main').append(extra);
 }
 bindMissionImages(container);
 const save=()=>{session.cruise=state;session.cruisePlayback={speed,realMs,carry};session.operationsSummary=cruiseSummary(state);setFlightSession(session);};
 function renderTrack(tick){
  const position=state.physical?state.physical.craft.r:transferPosition(t,tick/120),[x,y]=map.xy(position);
  find('marker').setAttribute('cx',x);find('marker').setAttribute('cy',y);
  const end=transferPosition(t,1);
  const remain=t.travelSec*(1-tick/120);
  let target=end;
  if(state.physical){
   target=bodyState(session.mission.destination,t.epochTdbSec+Math.min(state.elapsedSec,t.travelSec)).r;
  }else if(!t.escape&&!t.speculative&&!t.target.semimajorAu&&session.mission.destination!=='europa'){
   const angle=Math.atan2(end[1],end[0])-remain*Math.sqrt(t.centralMu/t.r2**3);
   target=[t.r2*Math.cos(angle),t.r2*Math.sin(angle)];
  }
  const [tx,ty]=map.xy(target);
  find('target').setAttribute('cx',tx);find('target').setAttribute('cy',ty);
  find('target-label').setAttribute('x',tx+10);find('target-label').setAttribute('y',ty-8);
  const flown=state.physical?state.physical.path.map(map.xy):[...map.coords.slice(0,Math.floor(tick)+1),[x,y]];
  find('flown').setAttribute('points',flown.map(p=>p.join(',')).join(' '));
  if(find('eta'))find('eta').textContent=remain<DAY_SEC?(remain/3600).toFixed(1)+' h':(remain/DAY_SEC).toFixed(1)+' d';
 }
 const refreshMarsDecision=mountMarsDecision(container,state);
 const evidencePanel=state.evidence?mountEvidenceTimeline(find('evidence-panel'),()=>state):null;
 function render(){
  evidencePanel?.refresh();
  refreshMarsDecision();
  const position=transferPosition(t,state.tick/120);
  renderTrack(state.tick);
  if(state.arrived&&!seenArrival){seenArrival=true;viewMode='encounter';}
  updateView();
  find('location').textContent=locationStatus(state,name,arrival);
  if(find('braking'))find('braking').textContent=state.brakingKg.toFixed(2)+' kg';
  const ascentSec=session.lifecycle?.launch?.elapsedSec??0;
  const phaseStart=state.scienceEndSec??(state.arrived?t.travelSec:0);
  find('clock').title='Current phase: '+duration(Math.max(0,state.elapsedSec-phaseStart))+' · includes '+duration(ascentSec)+' of ascent in total';
  find('clock').textContent=duration(state.elapsedSec+ascentSec);
  if(state.physical&&state.pending==='correction'){try{const n=predictedCorrection(state);find('navigation').textContent='Predicted miss '+(n.errorM/1000).toFixed(1)+' km ± '+(n.uncertaintyM/1000).toFixed(1)+' km knowledge bound; correction '+n.dv.toFixed(2)+' m/s / '+n.fuelKg.toFixed(3)+' kg, available '+state.trimKg.toFixed(3)+' kg. Bounds are authored, not probabilities.';}catch(e){find('navigation').textContent=e.message;}}
  find('real').textContent=Math.floor(realMs/1000)+' s';
  find('phase').textContent=state.phase==='return'?'Data return':state.phase;
  find('battery').textContent=state.batteryWh.toFixed(0)+' / '+h.batteryWh.toFixed(0)+' Wh';
  const sunAu=t.lunar?1:Math.hypot(...position)/AU_M;
  find('power').textContent=generationAt(h,sunAu,state.elapsedSec).toFixed(1)+' / '+h.hotelW.toFixed(1)+' W';
  find('fuel').textContent=state.trimKg.toFixed(2)+' kg';
  find('data').textContent=state.storageGb.toFixed(3)+' / '+state.deliveredGb.toFixed(3)+' GB';
  if(state.systems){
   const s=state.systems;
   systemsStatus.textContent=INTENTS[s.intent]+' · '+Math.round(s.batteryC)+' °C battery · '+Math.round(s.payloadC)+' °C payload'+
    (s.heaterOn?' · Heater on':'')+(s.lastReason?' · '+s.lastReason:'')+
    (state.uplink?' · Ground command arrives in '+duration(state.uplink.arrivesSec-state.elapsedSec):'');
  }
  find('progress').value=state.tick;
  find('pause').textContent=state.paused?'Resume':'Pause';find('pause').disabled=state.finished;
  find('report').hidden=!state.finished;
  if(find('plan')){find('plan').value=state.observationPlan;find('plan').disabled=state.finished||state.phase==='return';}
  find('brief').textContent=state.finished?'Flight complete. Review your objectives.':state.pending==='science'?'Encounter acquired. Collect science at '+name+'.':pendingCopy[state.pending]||(state.inFlight.length?'Science packets in flight. Awaiting receipt at Earth.':'Flight clock advancing through fixed resource intervals.');
  find('log').textContent=state.log.at(-1)?.text||'';
  const commands={departure:['depart'],correction:state.physical?['correct','coast','navigate','wait-nav','abandon']:['correct','coast'],encounter:state.physical?['acquire','flyby']:['acquire'],science:['observe'],downlink:['transmit']};
  container.querySelectorAll('[data-cruise-command]').forEach(b=>{
   const id=b.dataset.cruiseCommand;
   b.hidden=state.finished||id==='observe'&&!state.arrived||!(commands[state.pending]?.includes(id)||id==='transmit'&&state.phase==='return');
   b.disabled=state.paused||id==='navigate'&&state.physical?.observations>=3||id==='transmit'&&Boolean(state.uplink);
   if(id==='transmit')b.textContent=state.uplink?'Ground command en route':
    state.pending!=='downlink'&&(state.transmit||state.systems?.recorder&&!state.groundHold)?'Pause downlink':state.systems?'Point to Earth and transmit':'Begin downlink';
  });
 }
 container.querySelectorAll('[data-cruise-command]').forEach(b=>b.onclick=()=>{
  const accepted=cruiseCommand(state,b.dataset.cruiseCommand);carry=0;save();render();if(!accepted)find('brief').textContent='Command rejected: insufficient reserve or unavailable action. Inspect the event log; a flyby may remain possible.';
 });
 container.querySelectorAll('[data-cruise-speed]').forEach(b=>b.onclick=()=>{
  speed=Number(b.dataset.cruiseSpeed);
  container.querySelectorAll('[data-cruise-speed]').forEach(item=>item.setAttribute('aria-pressed',String(item===b)));
  save();
 });
 if(find('plan'))find('plan').onchange=event=>{if(selectEncounterPlan(state,event.target.value)){save();refreshMarsDecision();}};
 find('pause').onclick=()=>{cruiseCommand(state,'pause');save();render();};
 find('report').onclick=()=>{save();onReport();};
 const timer=setInterval(()=>{
  const now=performance.now(),delta=Math.min(500,now-last);last=now;
  if(state.paused||state.finished)return;
  realMs+=delta;
  if(state.pending){find('real').textContent=Math.floor(realMs/1000)+' s';return;}
  carry+=delta*speed;
  let changed=false;
  while(carry>=500&&!state.pending&&!state.finished){stepCruise(state);carry-=500;changed=true;}
  if(state.pending||state.finished)carry=0;
  if(changed){save();render();}
  if(state.phase==='cruise'&&!state.pending)renderTrack(state.tick+carry/500);
 },50);
 window.addEventListener('pagehide',save);
 render();save();
 return ()=>{alive=false;clearInterval(timer);window.removeEventListener('pagehide',save);save();evidencePanel?.destroy();localView?.destroy?.();};
}
