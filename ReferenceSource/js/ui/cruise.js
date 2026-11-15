import {cruiseCommand,stepCruise,cruiseSummary} from '../transfer/cruise.js';
import {DAY_SEC,transferPosition,generationAt,AU_M} from '../transfer/planning.js';
import {setFlightSession} from '../flightSession.js';
import {missionImage,bindMissionImages} from './missionArt.js';

const pendingCopy={
 departure:'Departure opportunity acquired. Command the burn from the Earth parking orbit.',
 correction:'Tracking indicates a targeting error. Approve the planned trim burn to reach the encounter.',
 encounter:'Target reached. Verify the encounter and perform the planned braking burn if required.',
 science:'Pointing solution acquired. Command the payload to collect its science sample.',
 downlink:'Earth can receive the recorded packet. Begin the downlink.'
};

function trajectoryMap(t,tracked){
 const scale=115/Math.max(t.r1,t.r2);
 const xy=([x,y])=>[330+x*scale,140-y*scale];
 const coords=Array.from({length:121},(_,i)=>xy(transferPosition(t,i/120)));
 const circle=(r,kind)=>`<circle cx="330" cy="140" r="${r*scale}" class="${kind}"/>`;
 const [dx,dy]=coords.at(-1);
 const [cx,cy]=coords[51];
 return {xy,coords,markup:`<svg class="cruise-trajectory" viewBox="0 0 660 280" role="img" aria-label="Simplified two-body transfer arc and live spacecraft position">
 <defs><radialGradient id="transfer-star"><stop stop-color="#fff0b8"/><stop offset=".7" stop-color="#ec9a47"/><stop offset="1" stop-color="#ec9a4700"/></radialGradient></defs>
 ${circle(t.r1,'parking-ring')}${circle(t.r2,'arrival-ring')}<circle cx="330" cy="140" r="16" fill="${t.lunar?'#6bb7dc':'url(#transfer-star)'}"/><polyline class="${tracked?'transfer-plan':''}" points="${coords.map(x=>x.join(',')).join(' ')}"/>
 ${tracked?`<polyline id="cruise-flown" class="transfer-flown"/><circle cx="${coords[0][0]}" cy="${coords[0][1]}" r="6" class="transfer-burn"><title>Departure burn</title></circle>
 <circle cx="${cx}" cy="${cy}" r="5" class="transfer-burn"><title>Correction opportunity</title></circle>
 <circle cx="${dx}" cy="${dy}" r="8" class="transfer-burn"><title>Planned encounter</title></circle>
 <circle id="cruise-target" r="5" fill="#f1bf7c"/><text id="cruise-target-label">${t.target.name}</text>`:
 `<circle cx="${dx}" cy="${dy}" r="5" fill="#f1bf7c"/><text x="${dx+12}" y="${dy+3}">${t.target.name}</text>`}
 <circle id="cruise-marker" cx="${coords[0][0]}" cy="${coords[0][1]}" r="5" fill="#baf5d9"/>
 <text x="22" y="26">${t.speculative?'SPECULATIVE STELLAR':t.lunar?'EARTH-CENTRED':'SUN-CENTRED'} TRANSFER</text><text x="22" y="259">${tracked?'Dashed plan · solid flown · rings mark burns and encounter':'Arc in plane · body sizes exaggerated · schematic encounter'}</text></svg>`};
}

export function renderCruise(container,session,onReport){
 const state=session.cruise,t=state.trajectory,h=state.hardware;
 const tracked=t.lunar||session.mission.destination==='mars';
 const map=trajectoryMap(t,tracked);
 let speed=[1,4,16].includes(session.cruisePlayback?.speed)?session.cruisePlayback.speed:1;
 let realMs=session.cruisePlayback?.realMs||0,carry=session.cruisePlayback?.carry??0,last=performance.now();
 container.innerHTML=`<section class="screen content-screen cruise-screen" data-screen="cruise"><header class="screen-top"><div><p class="orbital-eyebrow">ORBITAL / TRANSFER CONTROL</p><h1>${session.mission.name}</h1></div><button class="btn" id="cruise-pause">Pause</button></header>
 <div class="cruise-layout"><div class="glass cruise-main">${map.markup}<div class="cruise-clocks"><div><small>MISSION ELAPSED</small><strong id="cruise-clock"></strong></div><div><small>REAL PLAY TIME</small><strong id="cruise-real"></strong></div><div><small>FLIGHT PHASE</small><strong id="cruise-phase"></strong></div></div><progress id="cruise-progress" max="120"></progress></div>
 <aside class="glass cruise-telemetry"><div class="program-panel-art">${missionImage(session.mission)}</div><div><h2>${t.target.name}</h2><p>${t.conditions}</p><dl><dt>Battery</dt><dd id="cruise-battery"></dd><dt>Generation / cruise draw</dt><dd id="cruise-power"></dd><dt>Trim propellant</dt><dd id="cruise-fuel"></dd><dt>Recorder / confirmed</dt><dd id="cruise-data"></dd><dt>Conservative link distance</dt><dd>${t.speculative?t.target.distanceLy.toFixed(3)+' light-years':(t.distanceM/1e9).toFixed(2)+' million km'}</dd><dt>Signal delay</dt><dd>${t.speculative?(t.lightMinutes/525960).toFixed(2)+' years':t.lightMinutes.toFixed(1)+' min'} one way</dd></dl></div></aside></div>
 <div class="glass cruise-commands"><p id="cruise-brief" aria-live="polite"></p><div class="cruise-buttons"><button class="btn btn-primary" data-cruise-command="depart">${t.speculative?'Deploy beamed sail':'Execute departure burn'}</button><button class="btn btn-primary" data-cruise-command="correct">Apply mid-course correction</button><button class="btn" data-cruise-command="coast">Coast without correction</button><button class="btn btn-primary" data-cruise-command="acquire">${state.arrivalType==='crossing'?'Confirm boundary crossing':state.arrivalType==='flyby'?'Acquire flyby target':state.arrivalType==='rendezvous'?'Match target velocity':'Execute capture burn'}</button><button class="btn btn-primary" data-cruise-command="observe">Collect encounter science</button><button class="btn btn-primary" data-cruise-command="transmit">Begin downlink</button><button class="btn btn-primary" id="cruise-report">View flight report →</button></div><div class="cruise-buttons" role="group" aria-label="Cruise time acceleration">${[1,4,16].map(n=>`<button class="btn" data-cruise-speed="${n}" aria-pressed="${n===speed}">${n}×</button>`).join('')}</div><p id="cruise-log" role="status"></p></div></section>`;
 const find=id=>container.querySelector('#cruise-'+id);
 if(tracked){
  const extra=document.createElement('div');
  extra.className='transfer-model-status';
  extra.innerHTML='<p>Two-body coast · circular target reference · estimated local capture</p><dl><dt>Time to encounter</dt><dd id="cruise-eta"></dd><dt>Braking propellant</dt><dd id="cruise-braking"></dd></dl>';
  container.querySelector('.cruise-main').append(extra);
 }
 bindMissionImages(container);
 const save=()=>{session.cruise=state;session.cruisePlayback={speed,realMs,carry};session.operationsSummary=cruiseSummary(state);setFlightSession(session);};
 function renderTrack(tick){
  const position=transferPosition(t,tick/120),[x,y]=map.xy(position);
  find('marker').setAttribute('cx',x);find('marker').setAttribute('cy',y);
  if(tracked){
   const end=transferPosition(t,1);
   const remain=t.travelSec*(1-tick/120);
   const angle=Math.atan2(end[1],end[0])-remain*Math.sqrt(t.centralMu/t.r2**3);
   const [tx,ty]=map.xy([t.r2*Math.cos(angle),t.r2*Math.sin(angle)]);
   find('target').setAttribute('cx',tx);find('target').setAttribute('cy',ty);
   find('target-label').setAttribute('x',tx+10);find('target-label').setAttribute('y',ty-8);
   find('flown').setAttribute('points',[...map.coords.slice(0,Math.floor(tick)+1),[x,y]].map(p=>p.join(',')).join(' '));
   find('eta').textContent=remain<DAY_SEC?(remain/3600).toFixed(1)+' h':(remain/DAY_SEC).toFixed(1)+' d';
  }
 }
 function render(){
  const position=transferPosition(t,state.tick/120);
  renderTrack(state.tick);
  if(tracked)find('braking').textContent=state.brakingKg.toFixed(2)+' kg';
  find('clock').textContent=state.elapsedSec>=365.25*DAY_SEC?(state.elapsedSec/DAY_SEC/365.25).toFixed(2)+' years':state.elapsedSec>=DAY_SEC?(state.elapsedSec/DAY_SEC).toFixed(2)+' days':(state.elapsedSec/3600).toFixed(2)+' hours';
  find('real').textContent=Math.floor(realMs/1000)+' s';
  find('phase').textContent=state.phase;
  find('battery').textContent=state.batteryWh.toFixed(0)+' / '+h.batteryWh.toFixed(0)+' Wh';
  const sunAu=t.lunar?1:Math.hypot(...position)/AU_M;
  find('power').textContent=generationAt(h,sunAu,state.elapsedSec).toFixed(1)+' / '+h.hotelW.toFixed(1)+' W';
  find('fuel').textContent=state.trimKg.toFixed(2)+' kg';
  find('data').textContent=state.storageGb.toFixed(3)+' / '+state.deliveredGb.toFixed(3)+' GB';
  find('progress').value=state.tick;
  find('pause').textContent=state.paused?'Resume':'Pause';find('pause').disabled=state.finished;
  find('report').hidden=!state.finished;
  find('brief').textContent=state.finished?'Flight complete. Review your objectives.':pendingCopy[state.pending]||(state.inFlight.length?'Science packets in flight. Awaiting receipt at Earth.':'Flight clock advancing through fixed resource intervals.');
  find('log').textContent=state.log.at(-1)?.text||'';
  const commands={departure:['depart'],correction:['correct','coast'],encounter:['acquire'],science:['observe'],downlink:['transmit']};
  container.querySelectorAll('[data-cruise-command]').forEach(b=>{
   const id=b.dataset.cruiseCommand;
   b.hidden=state.finished||!(commands[state.pending]?.includes(id)||id==='transmit'&&state.phase==='return');
   b.disabled=state.paused;
   if(id==='transmit')b.textContent=state.transmit?'Pause downlink':'Begin downlink';
  });
 }
 container.querySelectorAll('[data-cruise-command]').forEach(b=>b.onclick=()=>{
  if(cruiseCommand(state,b.dataset.cruiseCommand)){carry=0;save();render();}
 });
 container.querySelectorAll('[data-cruise-speed]').forEach(b=>b.onclick=()=>{
  speed=Number(b.dataset.cruiseSpeed);
  container.querySelectorAll('[data-cruise-speed]').forEach(item=>item.setAttribute('aria-pressed',String(item===b)));
  save();
 });
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
  if(tracked&&state.phase==='cruise'&&!state.pending)renderTrack(state.tick+carry/500);
 },50);
 window.addEventListener('pagehide',save);
 render();save();
 return ()=>{clearInterval(timer);window.removeEventListener('pagehide',save);save();};
}
