import {missionGuide,bindMissionGuide} from '../unity/missionGuide.js';
import {escapeHtml} from './html.js';
import {floodwatchSampling,samplingText} from '../unity/floodwatch.js';
import {launcherFor} from '../rocket/engineering.js';
import {resolveFlightDesign} from '../flightConfiguration.js';
import {presetOrbit,BODIES,RAD,orbitalPeriod,geometryForecast,EARTH_STATIONS} from '../engine/orbitalGeometry.js';
import { getState,setDesign,saveProgress } from '../state.js';
import { getUnlocked } from '../engine.js';
import { createOrbitGlobe } from '../three/orbitGlobe.js';
import { showScreen } from './router.js';
import { showLine } from './speech.js';
import {missionOrbitAllowed,orbitLocationIssue,transferDestination} from '../unity/missionRoute.js';
import {lagrangeChart} from './lagrangeChart.js';
import {missionImage,bindMissionImages} from './missionArt.js';
export function renderOrbitSelect(container,data) {
  const state=getState(),training=state.currentMissionId==='tutorial',mission=data.missions.find(m=>m.id===state.currentMissionId);
  const unlocked=getUnlocked(data,Object.keys(state.completedMissions)).orbits;
  const allowed=id=>unlocked.includes(id)&&missionOrbitAllowed(mission,id)&&(!training||data.tutorial.allowedOrbits.includes(id));
  const seen=new Set(state.currentDesign.trainingOrbits||[]);
  const departure=mission.transfer?transferDestination(mission):null;
  const orbits=data.orbits.filter(o=>missionOrbitAllowed(mission,o.id)&&(!training||data.tutorial.allowedOrbits.includes(o.id)));
  let selected=orbits.find(o=>o.id===state.currentDesign.orbitId&&allowed(o.id))?.id
    ?? orbits.find(o=>allowed(o.id))?.id ?? null;
  const heading=departure?'Earth departure orbit':'Choose where to operate';
  container.innerHTML=`<section class="screen scene-screen" data-screen="orbitSelect"><div class="scene-canvas" id="orbit-canvas">
    <div id="orbit-preview" class="orbit-preview"></div><div id="orbit-region" class="orbit-region" hidden>${lagrangeChart()}</div>
    <span id="orbit-location" class="orbit-location" hidden></span></div>
    <header class="screen-top">${training?'<span>Training · 1 of 5</span>':'<button class="btn" id="back">← Rockets</button>'}<h1>${heading}</h1></header>
    <aside class="scene-info glass" id="orbit-info"><h2>Select an orbit</h2><p>Compare sunlight, contact time, and fuel needs.</p></aside>
    <footer class="screen-actions"><div class="choice-chips">${orbits.map(o=>`<button class="btn" data-orbit="${o.id}" ${allowed(o.id)?'':'disabled'}>${o.id==='lagrange'?'Lagrange region':o.id.toUpperCase()}${allowed(o.id)?'':' · Locked'}</button>`).join('')}</div><button class="btn btn-primary" id="confirm" disabled>${departure?'Plan transfer to '+escapeHtml(departure.name)+' →':'Confirm operating location →'}</button></footer></section>`;
  const preview=container.querySelector('#orbit-preview');
  const region=container.querySelector('#orbit-region');
  const marker=container.querySelector('#orbit-location');
  const view=createOrbitGlobe(preview,{orbits,selectedId:selected});
  const geometryRows=(model,stations)=>{if(!model)return [['Location model','Guided Earth–Moon region']];const f=geometryForecast(model,stations);return [['Mean altitude',((model.semiMajorAxisM-BODIES[model.body].radiusM)/1000).toFixed(0)+' km'],['Inclination',(model.inclinationRad/RAD).toFixed(1)+'° · '+(Math.abs(model.inclinationRad/RAD-90)<.01?'Polar':model.inclinationRad/RAD<90?'Prograde':'Retrograde')],['Orbital period',(f.periodSec/60).toFixed(1)+' min'],['Longest eclipse',(f.longestEclipseSec/60).toFixed(1)+' min / orbit'],[model.body==='moon'?'Earth link in 9 h':'Station contact in 9 h',(f.contactFraction*540).toFixed(1)+' min']];};
  function select(id,preserve=false){
    const o=orbits.find(o=>o.id===id);if(!o||!allowed(id))return;
    const current=getState().currentDesign;
    const elements=preserve&&current.orbitId===id&&!orbitLocationIssue(mission,current,data.orbits)?current.orbitElements:null;
    const model=elements||presetOrbit(id);
    selected=id;seen.add(id);
    const changed=id!==current.orbitId||Boolean(current.orbitElements&&!elements);
    setDesign({orbitId:id,orbitElements:elements,trainingOrbits:[...seen],...(changed?{planId:null,flightPlan:null}:{})});saveProgress();
    region.hidden=id!=='lagrange';preview.hidden=id==='lagrange';
    view.select(id,elements);
    marker.hidden=false;marker.textContent=departure?'Earth · parking before departure':id==='llo'?'Moon · operating orbit':id==='lagrange'?'Operating region · Earth–Moon system':'Earth · operating orbit';
    const rocket=launcherFor(resolveFlightDesign(state.currentDesign),data),capacity=(rocket?.capacity[o.launcherClass.toLowerCase()]||0)*(o.capacityFactor??1);
    const geometry=geometryRows(model,EARTH_STATIONS.filter(s=>!current.stationIds||current.stationIds.includes(s.id)));
    const rows=departure?geometry.slice(0,3):[...geometry,['Insertion fuel',o.insertionFuel+' kg'],['Yearly fuel burn',o.yearlyBurn+' kg'],['Radiation',o.highRadiation?'High':'Normal']];
    rows.push([departure?'Parking orbit lift':'Rocket lift',capacity?capacity+' kg':'Cannot reach']);
    const route=departure?`<div class="orbit-destination"><div class="orbit-destination-art">${missionImage(mission)}</div><div><span class="orbital-eyebrow">SCIENCE DESTINATION</span><h2>${escapeHtml(departure.name)}</h2><p>${escapeHtml(departure.arrival)} · science starts after arrival</p></div></div><p>Launch to Earth parking orbit, then depart for ${escapeHtml(departure.name)}. The next screen sets the transfer and arrival hardware.</p>`:'';
    let passSelectorHtml = '';
    if (id === 'sso' && mission.id === 'm1') {
      const isSindh = Boolean(elements && Math.abs(((elements.raanRad || 0) / RAD) - 75) < 1.0);
      passSelectorHtml = `<div class="orbit-preset-box" style="margin: 0.8rem 0; padding: 0.6rem; background: rgba(164, 240, 205, 0.08); border: 1px solid rgba(164, 240, 205, 0.25); border-radius: 6px;">
        <h3 style="margin: 0 0 0.4rem; font-size: 0.88rem; color: #a4f0cd; text-transform: uppercase; letter-spacing: 0.05em;">Ground-Track Alignment (Sindh Flood)</h3>
        <div class="choice-chips" style="margin-bottom: 0.4rem;">
          <button type="button" class="btn btn-sm ${isSindh ? 'btn-primary' : ''}" id="btn-pass-target" aria-pressed="${isSindh}">Sindh Flood Pass (75° node)</button>
          <button type="button" class="btn btn-sm ${!isSindh ? 'btn-primary' : ''}" id="btn-pass-standard" aria-pressed="${!isSindh}">Standard SSO (0° node)</button>
        </div>
        <p style="margin: 0; font-size: 0.82rem; line-height: 1.35; color: ${isSindh ? '#a4f0cd' : '#f1bd74'};">${isSindh ? '✓ Ground track crosses the Indus basin during daylight (~5.2 min target access). Enables regional flood-context product.' : '⚠ Spacecraft will not intersect the Sindh flood targets during this 5-hour window (0.0 min target access). Flood context brief will fail.'}</p>
      </div>`;
    } else if (id === 'sso' && mission.id === 'wildfire') {
      const isRhodes = Boolean(elements && Math.abs(((elements.raanRad || 0) / RAD) - 60) < 1.0);
      passSelectorHtml = `<div class="orbit-preset-box" style="margin: 0.8rem 0; padding: 0.6rem; background: rgba(241, 189, 116, 0.08); border: 1px solid rgba(241, 189, 116, 0.25); border-radius: 6px;">
        <h3 style="margin: 0 0 0.4rem; font-size: 0.88rem; color: #f1bd74; text-transform: uppercase; letter-spacing: 0.05em;">Ground-Track Alignment (Rhodes Hotspot)</h3>
        <div class="choice-chips" style="margin-bottom: 0.4rem;">
          <button type="button" class="btn btn-sm ${isRhodes ? 'btn-primary' : ''}" id="btn-pass-target" aria-pressed="${isRhodes}">Rhodes Revisit Pass (60° node)</button>
          <button type="button" class="btn btn-sm ${!isRhodes ? 'btn-primary' : ''}" id="btn-pass-standard" aria-pressed="${!isRhodes}">Standard SSO (0° node)</button>
        </div>
        <p style="margin: 0; font-size: 0.82rem; line-height: 1.35; color: ${isRhodes ? '#a4f0cd' : '#f1bd74'};">${isRhodes ? '✓ Ground track passes over the Aegean wildfire cluster in daylight (~2.6 min target access). Enables thermal revisit inspection.' : '⚠ Rhodes hotspot cluster is out-of-swath during this 5-hour window (0.0 min target access). Wildfire inspection brief will fail.'}</p>
      </div>`;
    }
    container.querySelector('#orbit-info').innerHTML=`${route}<h2>${id==='lagrange'?'Earth–Moon Lagrange region':escapeHtml(o.name)}</h2>${passSelectorHtml}${!capacity?`<p class="text-red"><strong>${escapeHtml(rocket?.name||'This rocket')} cannot reach this orbit.</strong> Return to Rockets to change your vehicle.</p>`:''}${id==='lagrange'?'<p>Operations use a guided scenario in this region. The chart shows the reference points.</p>':''}<dl>${rows.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>${training?`<p>Inspect both LEO and SSO: ${['leo','sso'].filter(id=>seen.has(id)).length} / 2</p>`:''}`;
    const btnTarget = container.querySelector('#btn-pass-target');
    const btnStandard = container.querySelector('#btn-pass-standard');
    if (btnTarget) {
      btnTarget.onclick = () => {
        const targetRaan = mission.id === 'm1' ? 75 * RAD : 60 * RAD;
        const newElements = presetOrbit('sso', { raanRad: targetRaan });
        setDesign({ orbitId: 'sso', orbitElements: newElements, planId: null, flightPlan: null });
        saveProgress();
        select('sso', true);
      };
    }
    if (btnStandard) {
      btnStandard.onclick = () => {
        const newElements = presetOrbit('sso', { raanRad: 0 });
        setDesign({ orbitId: 'sso', orbitElements: newElements, planId: null, flightPlan: null });
        saveProgress();
        select('sso', true);
      };
    }
    bindMissionImages(container);
    if(mission.id==='m1'){const p=document.createElement('p');p.id='sampling-preview';p.textContent=samplingText(floodwatchSampling(mission.id,model));container.querySelector('#orbit-info').append(p);}
    if(!departure){container.querySelector('#orbit-info').insertAdjacentHTML('beforeend',missionGuide('orbit',mission.id));bindMissionGuide(container);}
    container.querySelector('#confirm').disabled=!capacity||(training&&!(seen.has('leo')&&seen.has('sso')));
    container.querySelectorAll('[data-orbit]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.orbit===id));
    if(id!=='lagrange'&&!departure)showLine('nova',training?'Compare LEO and SSO, then confirm your orbit.':o.tip,{pointAt:'#orbit-info'});
  }
  container.querySelector('#back')?.addEventListener('click',()=>showScreen('rocketSelect'));
  container.querySelectorAll('[data-orbit]').forEach(b=>b.onclick=()=>select(b.dataset.orbit));
  container.querySelector('#confirm').onclick=()=>{
    const cur=getState().currentDesign;
    const elements=cur.orbitId===selected?cur.orbitElements:null;
    setDesign({orbitId:selected,orbitElements:elements,planId:null,flightPlan:null});
    if(saveProgress())showScreen(departure||state.currentDesign.flightWorkflow||state.currentDesign.rocketId?'flightPlan':'design');
  };
  if(selected)select(selected,true);else container.querySelector('#orbit-info').innerHTML='<h2>Operating location locked</h2><p>Complete the required campaign stage, then return here.</p>';
  return ()=>{view.destroy();};
}
