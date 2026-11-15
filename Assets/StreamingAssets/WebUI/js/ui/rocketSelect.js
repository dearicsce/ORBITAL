import {geometryIssues, stowedEnvelope} from '../workshop/collision.js';
import {launcherFor} from '../rocket/engineering.js';
import { getState,setDesign,saveProgress } from '../state.js';
import { getUnlocked } from '../engine.js';
import { createRocketCarousel } from '../three/rocketCarousel.js';
import { showScreen } from './router.js';
import { showLine } from './speech.js';
import { getUnlockLabel } from './designTooltips.js';
export function renderRocketSelect(container,data) {
  const state=getState(),mission=data.missions.find(m=>m.id===state.currentMissionId);
  const ids=mission.launchers,unlocked=getUnlocked(data,Object.keys(state.completedMissions)).launchers;
  let selected=ids.includes(state.currentDesign.launcherId)&&unlocked.includes(state.currentDesign.launcherId)?state.currentDesign.launcherId:ids.find(id=>unlocked.includes(id));
  container.innerHTML=`<section class="screen scene-screen" data-screen="rocketSelect"><div class="scene-canvas" id="rocket-canvas"></div><header class="screen-top"><button class="btn" id="back">← Briefing</button><h1>Choose your rocket</h1><button class="btn" id="custom-rocket">Rocket Workshop ↗</button></header><aside class="scene-info glass" id="rocket-info"></aside><footer class="screen-actions"><div class="choice-chips">${ids.map(id=>{const l=data.launchers.find(l=>l.id===id);return `<button class="btn" data-rocket="${id}" ${unlocked.includes(id)?'':'disabled'}>${l.name}${unlocked.includes(id)?'':' · '+getUnlockLabel(l.unlock)}</button>`;}).join('')}</div><button class="btn btn-primary" id="next">${mission.transfer?'Next: Earth departure orbit':'Next: operating location'} →</button></footer></section>`;
  const view=createRocketCarousel(container.querySelector('#rocket-canvas'),{launcherIds:ids,lockedIds:ids.filter(id=>!unlocked.includes(id)),onSelect:select});
  function select(id){selected=id;view.select(id);const l=data.launchers.find(l=>l.id===id);if(!l)return;
    container.querySelector('#rocket-info').innerHTML=`<span class="mission-tag">Launch vehicle</span><h2>${l.name}</h2><p class="rocket-scale-note">Payload limits and costs are scaled for these engineering challenges.</p><dl><dt>Launch cost</dt><dd>$${l.cost}M</dd><dt>Reliability</dt><dd>${Math.round(l.reliability*100)}%</dd>${Object.entries(l.capacity).map(([k,v])=>`<dt>${{leo:'Low Earth orbit',gto:'Geostationary transfer',tli:'Trans-lunar injection'}[k]}</dt><dd>${v?v+' kg':'Cannot reach'}</dd>`).join('')}</dl>`;
    if(l.description){const role=document.createElement('p');role.textContent=l.description;container.querySelector('#rocket-info h2').after(role);}
    const assembly = state.currentDesign.assembly;
    const launcher = launcherFor({launcherId:id}, data);
    if (assembly?.busId && Number.isFinite(launcher?.fairingRadiusM)) {
      const envelope = stowedEnvelope(assembly, data);
      const issues = geometryIssues(assembly, data, launcher);
      const note = document.createElement('p');
      note.className = issues.length ? 'text-red' : 'text-green';
      note.textContent = 'Stowed radius ' + envelope.radiusM.toFixed(2) + ' / ' + launcher.fairingRadiusM.toFixed(2) +
        ' m · height ' + envelope.heightM.toFixed(2) + ' / ' + launcher.fairingHeightM.toFixed(2) + ' m. ' +
        (issues.length ? issues.map(issue => issue.message).join(' ') : 'Fits the selected fairing.');
      container.querySelector('#rocket-info').append(note);
    }
    container.querySelectorAll('[data-rocket]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rocket===id));
    showLine('nova','Choose enough lift for your spacecraft and its destination.',{pointAt:'#rocket-info'});
  }
  container.querySelectorAll('[data-rocket]').forEach(b=>b.onclick=()=>select(b.dataset.rocket));
  container.querySelector('#back').onclick=()=>showScreen(state.currentDesign.flightWorkflow?'workshop':'brief',{mission:true});
  container.querySelector('#custom-rocket').onclick=()=>showScreen('rocketWorkshop',{mission:true});
  container.querySelector('#next').disabled=!selected;
  container.querySelector('#next').onclick=()=>{setDesign({launcherId:selected,rocketId:null,rocketBlueprint:null,planId:null,flightPlan:null});saveProgress();showScreen('orbitSelect');};
  select(selected);return ()=>view.destroy();
}
