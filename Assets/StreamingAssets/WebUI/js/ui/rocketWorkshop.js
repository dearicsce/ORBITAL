import {escapeHtml as escape} from './html.js';
import {referenceRocket} from '../rocket/reference.js';
import {createRocketWorkshopView} from '../three/rocketWorkshopView.js';
import {recommendedPlan,transferTrajectory,serviceMass} from '../transfer/planning.js';
import {ROCKET_PARTS,ROCKET_LABELS,rocketPartUnlocked,STANDARD_STAGING,BOOSTER_STAGING} from '../rocket/catalogue.js';
import {newRocket,rocketEngineering,requiredLaunchDv} from '../rocket/engineering.js';
import {rocketLibrary} from '../rocket/library.js';
import {academyGuide,bindAcademyGuide} from './academyGuide.js';
import {advanceAcademy,saveAcademy,academyDesign} from '../academy.js';
import {evaluateDesign} from '../engine/evaluate.js';
import {geometryIssues} from '../workshop/collision.js';
import {getState,setDesign,saveProgress} from '../state.js';
import {showScreen} from './router.js';

const events={ignition:'Liftoff · ignite core', 'booster-separation':'Release solid boosters', 'core-separation':'Separate core · ignite upper stage', 'fairing-release':'Release fairing halves', 'upper-cutoff':'Cut off upper stage', 'payload-release':'Release spacecraft'};

export function renderRocketWorkshop(container,data,params={}){
 const academy=params.academy,missionMode=Boolean(params.mission),library=rocketLibrary();
 const state=getState(),current=state.currentDesign,completed=academy?{}:state.completedMissions;
 const design=academy?academyDesign(academy.blueprint.assembly,data):current;
 const mission=data.missions.find(m=>m.id===design.missionId);
 const evaluation=evaluateDesign(design,data);
 const orbit=data.orbits.find(o=>o.id===(missionMode?design.orbitId:'leo'));
 const defaultTransfer=missionMode&&mission?.transfer&&orbit?(params.planDraft??recommendedPlan(mission,orbit.id,completed)):null;
 const trajectory=defaultTransfer?transferTrajectory(mission,design,defaultTransfer):null;
 const service=defaultTransfer?serviceMass(defaultTransfer,evaluation.spacecraftMass):null;
 const payloadKg=missionMode?evaluation.spacecraftMass+(service?.wetKg||0):150;
 const requirement=requiredLaunchDv(orbit?.id,orbit?.launcherClass)+(trajectory?.departureDv||0);
 let rocket=newRocket(),notice='',selected='';
 try{
  const existing=academy?academy.rocket:library.find(current.rocketId);
  if(existing){rocket=structuredClone(existing);selected=existing.id;}
 }catch(error){notice=error.message;}
 container.innerHTML=`<section class="screen content-screen rocket-bench" data-screen="rocketWorkshop"><header class="screen-top"><button class="btn" id="rocket-back">← ${academy?'Flight Academy':params.planDraft?'Transfer plan':missionMode?'Launcher presets':'Mission control'}</button><div><p class="orbital-eyebrow">ORBITAL / VEHICLE ENGINEERING</p><h1>Rocket Workshop</h1></div></header>
 ${academy?academyGuide(academy,{nextLabel:'Finish Academy →'}):'<div class="rocket-library"><label>My Rockets <select id="rocket-library"></select></label><button class="btn" id="rocket-new">New launcher</button><button class="btn" id="rocket-save">Save</button><button class="btn" id="rocket-save-as">Save as new</button><button class="btn" id="rocket-reference">Load reference vehicle</button></div>'}
 <p class="rocket-status" id="rocket-status" role="status"></p><div class="rocket-layout"><section class="glass rocket-options"><h2>Vehicle components</h2><label>Vehicle name <input id="rocket-name" maxlength="70"></label>
 ${Object.entries(ROCKET_PARTS).map(([slot,choices])=>`<label>${ROCKET_LABELS[slot]}<select data-rocket-slot="${slot}"><option value="">${slot==='boosters'?'No boosters':'Select a component'}</option>${choices.map(p=>`<option value="${p.id}" ${rocketPartUnlocked(p,completed)?'':'disabled'}>${p.name}${p.requires&&!completed[p.requires]?' · Locked':''}</option>`).join('')}</select></label>`).join('')}
 </section><section class="glass rocket-visual"><h2>Vehicle integration bay</h2><div class="rocket-hangar" id="rocket-diagram" aria-label="Preview of selected rocket components"></div><p>Drag to orbit · scroll to inspect</p><small>Schematic proportions · engineering checks use catalogue dimensions</small></section>
 <section class="glass rocket-engineering"><h2>Engineering review</h2><div id="rocket-margins"></div><h3>Staging sequence</h3><ol id="rocket-staging"></ol><button class="btn" id="rocket-stage">Set staging sequence</button><p><small>Stack delta-v includes fixed ascent loss allowance in the requirement. Upper-stage reserve follows the selected orbit or transfer.</small></p></section></div>
 ${missionMode?'<footer class="screen-actions"><button class="btn btn-primary" id="rocket-use">Use launcher →</button></footer>':''}</section>`;
 const find=id=>container.querySelector('#rocket-'+id);
 const view=createRocketWorkshopView(find('diagram'));
 if(view)find('diagram').classList.add('rocket-hangar-live');
 const stageOrder=()=>rocket.parts.boosters?BOOSTER_STAGING:STANDARD_STAGING;
 function saveTraining(){if(academy){academy.rocket=structuredClone(rocket);saveAcademy(academy);}}
 function engineering(){
  const result=rocketEngineering(rocket,payloadKg,{completed,requirement});
  if(missionMode&&design.assembly&&result.fairingRadiusM)result.issues.push(...geometryIssues(design.assembly,data,{...result,fairingHeightM:result.fairingHeightM-(service?.wetKg?Math.min(2,.35+service.wetKg/250):0)}).filter(i=>i.instanceId==='bus').map(i=>i.message));
  return result;
 }
 function updateLibrary(){
  const select=find('library');if(!select)return;
  try{select.innerHTML='<option value="">Unsaved launcher</option>'+library.list().map(item=>`<option value="${item.id}">${escape(item.name)}</option>`).join('');select.value=selected;}catch(error){notice=error.message;}
 }
 function update(){
  find('status').textContent=notice;
  find('name').value=rocket.name;
  container.querySelectorAll('[data-rocket-slot]').forEach(select=>{select.value=rocket.parts[select.dataset.rocketSlot]||'';});
  const r=engineering();
  find('margins').innerHTML=`<p> ${academy?'Training mass block':missionMode?'Payload':'Reference payload'} ${payloadKg.toFixed(1)} kg · ${orbit?.name||'LEO reference'}</p><dl><dt>Loaded mass with payload</dt><dd>${Math.round(r.wetKg).toLocaleString()} kg</dd><dt>Launcher dry mass</dt><dd>${Math.round(r.dryKg).toLocaleString()} kg</dd><dt>Liftoff thrust / weight</dt><dd>${r.twr.toFixed(2)}</dd><dt>Available / required delta-v</dt><dd>${Math.floor(r.deltaV).toLocaleString()} / ${requirement.toLocaleString()} m/s</dd><dt>Launch cost</dt><dd>$${r.cost.toFixed(1)}M</dd></dl>
  ${r.stages.map(s=>`<p>${s.label} · ${Math.round(s.deltaV)} m/s · T/W ${s.twr.toFixed(2)}</p>`).join('')}
  ${r.issues.length?`<ul class="text-red">${r.issues.map(issue=>`<li>${escape(issue)}</li>`).join('')}</ul>`:'<p class="text-green">Launcher checks passed.</p>'}`;
  find('staging').innerHTML=rocket.staging.length?rocket.staging.map(step=>`<li>${events[step]} <button class="btn rocket-order" data-move-stage="${rocket.staging.indexOf(step)}" aria-label="Move ${events[step]} up" ${rocket.staging[0]===step?'disabled':''}>↑</button></li>`).join(''):'<li>Sequence required</li>';
  find('staging').querySelectorAll('[data-move-stage]').forEach(button=>button.onclick=()=>{
   const index=Number(button.dataset.moveStage);
   [rocket.staging[index-1],rocket.staging[index]]=[rocket.staging[index],rocket.staging[index-1]];
   saveTraining();update();find('staging').querySelector('[data-move-stage="'+(index-1)+'"]')?.focus();
  });
  if(view)view.update(rocket);
  else find('diagram').innerHTML=`<div class="rocket-stack ${rocket.parts.coreTank?.includes('28')||rocket.parts.coreTank?.includes('methane')?'wide':''} ${rocket.parts.boosters?'boosted':''}">${['fairing','adapter','upperTank','upperEngine','separator','coreTank','coreEngine'].map(slot=>`<div class="rocket-shape ${slot} ${rocket.parts[slot]?'installed':''}">${slot==='coreTank'&&rocket.parts[slot]?'ORBITAL':''}</div>`).join('')}</div><strong>${escape(rocket.name)}</strong>`;
  if(find('use'))find('use').disabled=Boolean(r.issues.length);
  if(academy){
   const next=container.querySelector('#academy-next');next.disabled=Boolean(r.issues.length);
   const target=container.querySelector('[data-rocket-slot]:has(option:checked[value=""]):not([data-rocket-slot=boosters])')||find('stage');
   container.querySelectorAll('.academy-target').forEach(el=>el.classList.remove('academy-target'));
   target.classList.add('academy-target');
  }
 }
 function save(as=false){
  try{
   if(as)rocket={...rocket,id:newRocket().id};
   rocket=library.save(rocket);selected=rocket.id;notice='Launcher saved in My Rockets.';
   updateLibrary();update();return true;
  }catch(error){notice=error.message;update();return false;}
 }
 find('name').onchange=e=>{rocket.name=e.target.value.trim()||'Untitled launcher';saveTraining();update();};
 container.querySelectorAll('[data-rocket-slot]').forEach(select=>select.onchange=()=>{
  rocket.parts[select.dataset.rocketSlot]=select.value||null;saveTraining();update();
 });
 find('stage').onclick=()=>{rocket.staging=[...stageOrder()];saveTraining();update();};
 if(academy){
  const back=()=>showScreen('academy');
  bindAcademyGuide(container,academy,{back,skip:()=>showScreen('missionSelect'),next:()=>{if(!engineering().issues.length){saveTraining();advanceAcademy(academy);back();}}});
  find('back').onclick=()=>container.querySelector('#academy-back').click();
 }else{
  find('back').onclick=()=>showScreen(params.planDraft?'flightPlan':missionMode?'rocketSelect':'menu',{planDraft:params.planDraft});
  find('reference').onclick=()=>{rocket=referenceRocket(missionMode?mission:null);selected='';notice='Reference configuration loaded as a separate draft.';updateLibrary();update();};
  find('new').onclick=()=>{rocket=newRocket();selected='';notice='New launcher draft.';updateLibrary();update();};
  find('library').onchange=e=>{try{const item=library.find(e.target.value);rocket=item?structuredClone(item):newRocket();selected=item?.id||'';update();}catch(error){notice=error.message;update();}};
  find('save').onclick=()=>save();find('save-as').onclick=()=>save(true);
  if(find('use'))find('use').onclick=()=>{if(engineering().issues.length||!save())return;setDesign({rocketId:rocket.id,rocketBlueprint:rocket,planId:null,flightPlan:null});saveProgress();showScreen(params.planDraft?'flightPlan':'orbitSelect',{planDraft:params.planDraft});};
 }
 updateLibrary();update();
 return ()=>view?.destroy();
}
