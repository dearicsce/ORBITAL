import {createOrbitOps} from '../three/orbitOps.js';
import {showLine} from './speech.js';
import {renderMissionControl} from './missionControl.js';
import {setFlightSession} from '../flightSession.js';
import {cameraControls,bindCameraControls} from './flightCamera.js';

export function renderOperations(container,data,session,onReport,continuation=null){
 if(session.mission.profile)return renderMissionControl(container,data,session,onReport,continuation);
 const {design,evalResult:e,eventResults,mission}=session;
 const orbit=data.orbits.find(o=>o.id===design.orbitId);
 const liveHost=continuation?container.querySelector('#launch-canvas'):null;
 const state=session.legacyOperations??={progress:0,eventIndex:0,paused:false,speed:1};
 container.innerHTML=`<section class="screen scene-screen scene-continuation" data-screen="operations">
 <div class="scene-canvas" id="ops-canvas"></div><header class="screen-top"><h1>Orbit operations</h1><div><button class="btn" id="legacy-pause">Pause</button> <button class="btn" id="skip">Skip operations</button></div></header>
 <aside class="scene-info glass">${cameraControls(design.orbitId)}<h2>${mission.name}</h2><p>${orbit.name}</p><dl><dt>Generation / load</dt><dd>${e.panelPower} / ${e.averageLoad} W</dd><dt>Data delivered</dt><dd>${Math.min(e.dataPerDay,e.downlinkPerDay).toFixed(1)} GB/day</dd><dt>Fuel remaining</dt><dd id="fuel"></dd></dl><p id="month"></p><progress id="progress" max="1" value="0"></progress><label>Speed <select id="legacy-speed"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><div id="event-feed" aria-live="polite"></div></aside>
 <footer class="screen-actions"><button class="btn btn-primary" id="report" hidden>View flight report →</button></footer></section>`;
 const find=id=>container.querySelector('#'+id);
 if(liveHost){liveHost.id='ops-canvas';find('ops-canvas').replaceWith(liveHost);}
 const achieved=session.ascentInsertion?.orbit;
 const view=continuation||createOrbitOps(find('ops-canvas'),{orbitId:design.orbitId,design:achieved?{...design,orbitElements:achieved}:design,data,initialProgress:state.progress});
 const save=()=>setFlightSession(session);
 function showEvent(event,announce){
  const text=`${event.name} · ${event.survived?'survived':event.effect}. ${event.reason}`;
  const card=document.createElement('p');card.textContent=text;find('event-feed').append(card);
  if(announce){view.flash(event.id);showLine(event.id==='budget_cut'?'accountant':event.id==='antenna_fault'?'scientist':'engineer',text);}
 }
 for(const event of eventResults.slice(0,state.eventIndex))showEvent(event,false);
 function update(){
  const p=state.progress,finished=p>=1;
  view.setProgress(p);
  find('month').textContent=`Month ${Math.round(mission.targetLifetime*12*p)} / ${Math.round(mission.targetLifetime*12)}`;
  find('progress').value=p;
  find('fuel').textContent=Math.max(0,e.fuelKg-orbit.insertionFuel-orbit.yearlyBurn*mission.targetLifetime*p).toFixed(1)+' kg';
  while(state.eventIndex<eventResults.length&&p>=(state.eventIndex+1)/(eventResults.length+1))showEvent(eventResults[state.eventIndex++],true);
  find('legacy-pause').textContent=state.paused?'Resume':'Pause';
  find('legacy-pause').disabled=finished;
  find('report').hidden=!finished;find('skip').hidden=finished;
  save();
 }
 const timer=setInterval(()=>{if(!state.paused&&state.progress<1){state.progress=Math.min(1,state.progress+.01*state.speed);update();}},200);
 bindCameraControls(container,view,session.camera,camera=>{session.camera=camera;save();});
 find('legacy-speed').value=state.speed;
 find('legacy-speed').onchange=event=>{state.speed=Number(event.target.value);save();};
 find('legacy-pause').onclick=()=>{state.paused=!state.paused;update();};
 find('skip').onclick=()=>{state.progress=1;update();};
 find('report').onclick=onReport;
 update();
 return ()=>{clearInterval(timer);save();view.destroy();};
}
