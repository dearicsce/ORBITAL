import {programOrder} from '../campaign.js';
import {getFlightSession} from '../flightSession.js';
import {readAcademy} from '../academy.js';
import {clearSimulationResults} from './simulation.js';
import { startEarth, stopEarth } from '../three/earth.js';
import { getState, setDesign, clearDesign, setSettings, resetState, saveProgress } from '../state.js';
import { showScreen } from './router.js';
export function renderMenu(container,data) {
  stopEarth();const count=Object.keys(getState().completedMissions).length,academy=readAcademy();
  container.innerHTML=`<section class="orbital-home" data-screen="menu"><div class="orbital-home-earth" id="earth-canvas-container" aria-hidden="true"></div><div class="orbital-home-shade"></div>
    <header class="orbital-topbar"><div class="orbital-brand">◉ ORBITAL<span>MISSION CONTROL</span></div><span class="orbital-status"><i></i> SYSTEMS NOMINAL</span><button class="orbital-button subtle" id="settings">Settings</button></header>
    <main class="orbital-home-copy"><p class="orbital-eyebrow">A SPACE MISSION DESIGN EXPERIENCE</p><h1>The universe<br>is waiting.<br><em>Build your way.</em></h1><p class="orbital-home-description">From the first blueprint to the final signal.<br>Design a spacecraft. Command the launch.<br>Make every decision count.</p><div class="orbital-home-actions"><button class="orbital-button primary large" id="campaign">${count?'Continue campaign':'Enter mission control'} <span>↗</span></button><button class="orbital-button large" id="training">${academy.step>0&&academy.step<8&&!academy.skipped?'Resume Flight Academy':'Flight Academy / Help'}</button></div><div class="orbital-home-stats"><span><strong>${programOrder(data).length}</strong>MISSIONS</span><span><strong>04</strong>ATLAS SCALES</span><span><strong>01</strong>FLIGHT DIRECTOR. YOU.</span></div></main>
    <aside class="orbital-home-orbit"><span>EARTH / HOME</span><strong>One planet.<br>Endless possibilities.</strong><p>Observation · Communication · Exploration</p></aside><footer class="orbital-home-footer"><span>DESIGN → LAUNCH → OPERATE → DISCOVER</span><span>OFFLINE READY / LOCAL PROGRESS</span></footer><div id="menu-modal-container"></div></section>`;
  startEarth(container.querySelector('#earth-canvas-container'));
  container.querySelector('#campaign').onclick=()=>{showScreen('missionSelect');};
  container.querySelector('#training').onclick=()=>showScreen('academy');
  const flight=getFlightSession();
  if(flight&&flight.phase!=='report'&&flight.design.missionId===getState().currentDesign.missionId){
    const resume=document.createElement('button');resume.className='orbital-button large';resume.textContent='Resume saved flight';resume.onclick=()=>showScreen('simulation');container.querySelector('.orbital-home-actions').prepend(resume);
  }
  const workshopButton=document.createElement('button');workshopButton.className='orbital-button large';workshopButton.textContent='Satellite Workshop';workshopButton.onclick=()=>showScreen('workshop',{mission:false});container.querySelector('.orbital-home-actions').append(workshopButton);
  const rocketButton=document.createElement('button');rocketButton.className='orbital-button large';rocketButton.textContent='Rocket Workshop';rocketButton.onclick=()=>showScreen('rocketWorkshop');container.querySelector('.orbital-home-actions').append(rocketButton);
  const evidenceButton=document.createElement('button');evidenceButton.className='orbital-button large';evidenceButton.textContent='Earth intelligence';evidenceButton.onclick=()=>showScreen('evidence');container.querySelector('.orbital-home-actions').append(evidenceButton);
  container.querySelector('#settings').onclick=()=>{
    const host=container.querySelector('#menu-modal-container');
    host.innerHTML=`<div class="orbital-modal-backdrop"><section class="orbital-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><p class="orbital-eyebrow">MISSION PREFERENCES</p><h2 id="settings-title">Make yourself at home.</h2><button class="orbital-button" id="audio">Sound: ${getState().settings.audio?'on':'off'}</button><p>Progress is saved in this browser. This is a simplified educational simulation; vehicle values are scaled for gameplay. <a href="docs/REALISM_AND_SPACE_APPS_AUDIT.md" target="_blank" rel="noopener">Read the physics and Space Apps audit</a>.</p><button class="orbital-button" id="reset-progress">Reset campaign progress</button><button class="orbital-button primary" id="close-settings">Return to mission control</button></section></div>`;
    host.querySelector('#audio').onclick=e=>{setSettings({audio:!getState().settings.audio});saveProgress();e.target.textContent='Sound: '+(getState().settings.audio?'on':'off');};
    const mixer=document.createElement('fieldset');
    mixer.className='audio-mixer';
    mixer.innerHTML='<legend>Flight effects mix</legend>'+[['masterVolume','Master'],['effectsVolume','Effects'],['ambienceVolume','Ambience']].map(([key,label])=>`<label>${label}<input type="range" min="0" max="1" step=".05" data-mix="${key}" value="${getState().settings[key]}"></label>`).join('');
    host.querySelector('#audio').after(mixer);
    mixer.addEventListener('change',event=>{const {mix}=event.target.dataset;if(mix){setSettings({[mix]:Number(event.target.value)});saveProgress();}});
    host.querySelector('#reset-progress').onclick=()=>{const button=host.querySelector('#reset-progress');if(button.dataset.confirm==='yes'){resetState();clearSimulationResults();try{localStorage.removeItem('orbital_economy_v1');}catch{}saveProgress();renderMenu(container,data);}else{button.dataset.confirm='yes';button.textContent='Confirm reset — clears mission records, coins and equipment purchases';}};
    host.querySelector('#close-settings').onclick=()=>{host.innerHTML='';container.querySelector('#settings').focus();};host.querySelector('#close-settings').focus();
  };return stopEarth;
}
export function cleanupMenu(){stopEarth();}
