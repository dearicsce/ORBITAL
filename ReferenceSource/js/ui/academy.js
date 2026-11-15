import {renderRocketWorkshop} from './rocketWorkshop.js';
import {renderWorkshop} from './workshop.js';
import {academyWorld,academyDesign,academyBlueprint,readAcademy,saveAcademy,advanceAcademy,LESSONS,ACADEMY_KIT} from '../academy.js';
import {academyGuide,bindAcademyGuide} from './academyGuide.js';
import {checkLaunchGate} from '../engine/gate.js';
import {createMissionRun} from '../contracts/missionRun.js';
import {createLaunchScene} from '../three/launchScene.js';
import {createOrbitOps} from '../three/orbitOps.js';
import {renderMissionControl} from './missionControl.js';
import {showScreen} from './router.js';

const review=()=>showScreen('academy');
const map=()=>showScreen('missionSelect');

export function renderAcademy(container,world){
 const data=academyWorld(world);
 const state=readAcademy();
 if(state.step<5)return renderWorkshop(container,data,{academy:state});
 if(state.step===7)return renderRocketWorkshop(container,data,{academy:state});
 if(state.step>=LESSONS.length){
  container.innerHTML='<section class="screen content-screen"><p class="orbital-eyebrow">ORBITAL / FLIGHT ACADEMY</p><h1>Academy complete</h1><p>Your spacecraft returned data and your launcher passed review.</p><button class="btn" id="academy-start">Replay from lesson one</button> <button class="btn btn-primary" id="academy-map">Continue campaign →</button></section>';
  container.querySelector('#academy-start').onclick=()=>{Object.assign(state,{step:0,furthest:0,faces:[],wings:{},folded:false,unfolded:false,blueprint:null,flight:null,deployed:false,opsPassed:false,preset:false});saveAcademy(state);review();};
  container.querySelector('#academy-map').onclick=map;
  return;
 }
 const design=academyDesign(academyBlueprint(state,data).assembly,data);
 const persist=flight=>{state.flight=flight;saveAcademy(state);};
 const finish=()=>{advanceAcademy(state);review();};
 if(state.step===6&&state.deployed&&state.flight){
  const cleanup=renderMissionControl(container,data,state.flight,()=>{
   if(state.opsPassed){finish();return;}
   state.flight.operations=null;
   state.flight.phase='launch';
   state.flight.commands=[];
   state.flight.nextSequence=0;
   delete state.flight.playback;
   saveAcademy(state);
   review();
  },null,{training:true,persist,onTrainingSuccess:()=>{state.opsPassed=true;}});
  container.querySelector('.control-header').insertAdjacentHTML('afterend',academyGuide(state,{next:state.opsPassed,nextLabel:'First custom rocket →'}));
  bindAcademyGuide(container,state,{back:review,skip:map,next:()=>{if(state.opsPassed)finish();}});
  return cleanup;
 }
 let scene,orbit;
 const launcher=data.launchers.find(l=>l.id==='kestrel');
 const checks=checkLaunchGate(design,data,ACADEMY_KIT);
 const ready=checks.every(c=>c.ok);
 const flight=state.flight;
 const preflight=state.step===5&&!flight;
 container.innerHTML=`<section class="screen content-screen" data-screen="academy"><header class="screen-top"><button class="btn" id="academy-home">← Mission control</button><h1>Flight Academy</h1></header>${academyGuide(state,{next:preflight&&state.preset&&ready||state.step===5&&state.furthest>=6,nextLabel:preflight?'Launch training spacecraft →':'Continue lesson →'})}
 ${preflight?`<div class="glass academy-flight-controls"><label><input type="checkbox" id="academy-preset" class="academy-target" ${state.preset?'checked':''}> Use Falcon 9 training preset</label><p>Low Earth orbit · Wide training fairing · ${launcher.capacity.leo} kg capacity · ${checks[0].value} kg spacecraft · $${launcher.cost}M launch cost</p>${checks.filter(c=>!c.ok).map(c=>`<p class="text-red">${c.message}</p>`).join('')}</div>`:''}
 <div class="academy-flight"><div class="scene-canvas" id="academy-canvas"></div><div class="academy-flight-controls"><p id="academy-flight-status" role="status"></p>${state.step===5&&flight?'<button class="btn" id="academy-pause">Pause</button> <button class="btn" id="academy-fast-launch" hidden>Run launch without 3D</button>':''}${state.step===6?'<button class="btn btn-primary academy-target" id="academy-deploy">Deploy solar wings</button>':''}</div></div></section>`;
 const find=id=>container.querySelector('#academy-'+id);
 const home=()=>showScreen('menu');
 find('home').onclick=home;
 bindAcademyGuide(container,state,{back:review,skip:map,next:()=>{
  if(state.furthest>=6&&state.step===5){finish();return;}
  if(!preflight||!state.preset||!ready)return;
  const run=createMissionRun(design,data);
  run.mission={...run.mission,name:'Academy flight · First signal',objective:'Collect and transmit your first data.',profile:{coverage:1,delivered:.01,contact:.25,eclipse:.25}};
  persist(run);review();
 }});
 if(preflight){
  find('preset').onchange=e=>{state.preset=e.target.checked;saveAcademy(state);find('next').disabled=!state.preset||!ready;};
  orbit=createOrbitOps(find('canvas'),{orbitId:'leo',design,data,stowed:true});
 }else if(state.step===5){
  const saveLaunch=()=>{if(state.step===5&&scene){flight.launchCheckpoint=scene.getCheckpoint();persist(flight);}};
  const pause=find('pause');
  let paused=Boolean(flight.launchCheckpoint?.paused);
  scene=createLaunchScene(find('canvas'),{launcherId:'kestrel',design:flight.design,data,launchResult:flight.launchResult,
   checkpoint:flight.launchCheckpoint,manualDeployment:true,onPhase:text=>{find('flight-status').textContent=text;if(/Skip to continue|3D unavailable/.test(text))find('fast-launch').hidden=false;},
   onDone:()=>{advanceAcademy(state);review();}
  });
  find('fast-launch').onclick=()=>scene.skip();
  pause.textContent=paused?'Resume':'Pause';
  pause.onclick=()=>{paused=!paused;scene.togglePause();pause.textContent=paused?'Resume':'Pause';saveLaunch();};
  const timer=setInterval(saveLaunch,1000);
  window.addEventListener('pagehide',saveLaunch);
  return ()=>{clearInterval(timer);window.removeEventListener('pagehide',saveLaunch);if(readAcademy().step===5)saveLaunch();scene.destroy();};
 }else{
  orbit=createOrbitOps(find('canvas'),{orbitId:'leo',design:flight.design,data,stowed:true});
  find('flight-status').textContent='Orbit acquired · arrays stowed';
  find('deploy').onclick=()=>{state.deployed=true;saveAcademy(state);review();};
 }
 return ()=>orbit?.destroy();
}
