import {escapeHtml as escape} from './html.js';
import {renderHistoricalContext} from './historicalContext.js';
import {readAcademy} from '../academy.js';
import {mountAtlasGlobe} from '../three/atlasGlobe.js';
import {ATLAS_TEXTURES,EARTH_ATLAS_LAYERS} from '../content/atlasTextures.js';
import {agencyMarkup,mountAgencyMedia} from './agencyMedia.js';
import {celestialDiagram} from './celestialDiagram.js';
import {lagrangeChart} from './lagrangeChart.js';
import {compatibleSavedBuilds} from '../workshop/compatibility.js';
import {makeBlueprint,projectAssembly} from '../workshop/blueprint.js';
import {REWARDS,missionDifficulty} from '../workshop/economy.js';
import {getUnlocked,checkLaunchGate,evaluateDesign} from '../engine.js';
import {getState,setDesign,saveProgress} from '../state.js';
import {showScreen} from './router.js';
import {programOrder,isMissionUnlocked,starterDesign} from '../campaign.js';
import {MAP_LEVELS,CELESTIAL_BODIES,bodyById,missionDestination,isCoreMission,missionChapter} from '../campaignAtlas.js';
import {missionImage,bindMissionImages,destinationArt,ATLAS_PORTRAITS} from './missionArt.js';
import {defaultPlan,transferTrajectory,DAY_SEC} from '../transfer/planning.js';
import {missionLayout} from './missionMapLayout.js';

let levelId=null,selectedId=null,listView=false,cleanupMap=()=>{};
const formatBudget=(mission,data,difficulty)=>'$'+(mission.budget*data.difficulty[difficulty].budgetMultiplier).toFixed(0)+'M';
const stars=mission=>'★'.repeat(missionDifficulty(mission))+'☆'.repeat(5-missionDifficulty(mission));

export function renderMissionSelect(container,data){
 cleanupMap();
 let destroyGlobe=()=>{};
 const state=getState(),completed=state.completedMissions,missions=programOrder(data);
 const current=missions.find(m=>m.id===state.currentMissionId&&!completed[m.id]&&isMissionUnlocked(m,completed));
 const latestCore=missions.findLastIndex(m=>isCoreMission(m)&&completed[m.id]);
 const next=current||missions.slice(latestCore+1).find(m=>isCoreMission(m)&&!completed[m.id]&&isMissionUnlocked(m,completed))||missions.find(m=>isCoreMission(m)&&!completed[m.id]&&isMissionUnlocked(m,completed))||missions.find(m=>!completed[m.id]&&isMissionUnlocked(m,completed))||missions.at(-1);
 const destinationLevel=mission=>bodyById(missionDestination(mission))?.level||'earth';
 levelId??=next?destinationLevel(next):'earth';
 const level=MAP_LEVELS.find(l=>l.id===levelId);
 const inSystem=levelId==='jupiter';
 const levelName=level?.name||'Jupiter system';
 const shown=missions.filter(m=>destinationLevel(m)===levelId||inSystem&&missionDestination(m)==='jupiter'||(levelId==='solar'&&destinationLevel(m)==='jupiter'));
 let selected=shown.find(m=>m.id===selectedId)||shown.find(m=>m.id===next?.id)||shown[0];
 let bodySelection=null,lastFocused=null;
 const status=m=>completed[m.id]?'completed':m.id===current?.id?'active':isMissionUnlocked(m,completed)?'available':'locked';
 const academy=readAcademy();
 const progress=missions.filter(m=>completed[m.id]).length;
 const layout=missionLayout(shown);
 const button=m=>`<button class="program-tile ${status(m)}" data-map-mission="${m.id}" style="--tile-x:${layout.positions.get(m.id).x/layout.width*100}%;--tile-y:${layout.positions.get(m.id).y/layout.height*100}%" aria-pressed="${selected?.id===m.id}" aria-label="${escape(m.name)}, ${status(m)}${next?.id===m.id?', you are here':''}"><span class="program-tile-art">${missionImage(m)}</span><span class="program-tile-label"><strong>${escape(m.name)}</strong><small>${next?.id===m.id?'◆ You are here':status(m)} · ${isCoreMission(m)?'Core':'Side mission'}</small></span></button>`;
 const bodies=CELESTIAL_BODIES.filter(body=>body.level===levelId);
 const breadcrumbs=inSystem?[...MAP_LEVELS.slice(0,2),{id:'jupiter',name:'Jupiter system'}]:MAP_LEVELS;
 container.innerHTML=`<section class="orbital-campaign program-map" data-screen="missionSelect">
 <header class="orbital-topbar program-top"><button class="orbital-brand" id="map-home">◉ ORBITAL<span>CAMPAIGN ATLAS</span></button><span class="orbital-status"><i></i> ${progress} / ${missions.length} CONTRACTS COMPLETE</span><button class="orbital-button primary" id="campaign-continue">Continue campaign →</button></header>
 <div class="program-intro"><div><p class="orbital-eyebrow">ORBITAL / NAVIGATION DESK</p><h1>${levelName}</h1><p>Follow the dotted campaign route from your first satellite to the frontier.</p></div><div class="program-tools"><button class="orbital-button subtle" id="map-help">Flight Academy / Help</button><button class="orbital-button" id="map-list" aria-pressed="${listView}">${listView?'Visual map':'List view'}</button><label class="campaign-difficulty">ASSISTANCE <select id="campaign-difficulty">${Object.keys(data.difficulty).map(d=>`<option value="${d}" ${state.difficulty===d?'selected':''}>${d==='easy'?'Explorer':d==='normal'?'Mission director':'Veteran'}</option>`).join('')}</select></label></div></div>
 ${!academy.skipped&&academy.step<8&&progress===0?`<aside class="program-academy"><div><strong>Start in Flight Academy</strong><p>Build a satellite, collect its first data and assemble a two-stage rocket in a guided scenario.</p></div><button class="orbital-button primary" id="map-academy">${academy.step?'Resume lessons':'Start training'} →</button></aside>`:''}
 <nav class="program-breadcrumbs" aria-label="Atlas scale"><button class="orbital-button" id="atlas-back">← Back</button>${breadcrumbs.map(l=>`<button class="orbital-button subtle" data-level="${l.id}" ${l.id===levelId?'aria-current="page"':''}>${l.name}</button>`).join('')}</nav>
 <div class="program-layout"><main class="program-main"><img class="program-apod" alt="" hidden><div class="program-legend"><span>● Available</span><span>◆ Active</span><span>✓ Completed</span><span>○ Locked</span><small>Dotted links show campaign prerequisites.</small></div>
 ${shown.length?`<div class="program-scroll ${listView?'list-mode':''}"><div class="program-chart" style="--chart-width:${layout.width}px;--chart-height:${layout.height}px">${listView?'':`<svg viewBox="0 0 ${layout.width} ${layout.height}" preserveAspectRatio="none" aria-hidden="true">${layout.links.map(l=>`<path class="${completed[l.from]?'cleared':''}" d="${l.path}"/>`).join('')}</svg>`}${shown.map(button).join('')}</div></div>`:'<p class="program-empty">Explore the atlas to locate destinations and their campaign branches.</p>'}
 <section class="program-bodies"><h2>Celestial atlas</h2>${listView?'<p>Body sizes are illustrative. Distances are listed separately.</p>':celestialDiagram(levelId)}<div class="atlas-body-list">${bodies.map(body=>`<button class="orbital-button body-button" data-body="${body.id}"><span class="atlas-body atlas-${body.id}" aria-hidden="true"></span><span><strong>${body.name}</strong><small>${body.distanceAU?body.distanceAU+' AU from Sun':body.kind}</small></span></button>`).join('')}</div></section></main>
 <aside class="program-panel" id="program-panel" aria-label="Mission and destination details"></aside></div>
 <footer class="program-footer"><button class="orbital-button subtle" id="map-evidence">Earth intelligence ↗</button><span>Educational simulation · Scaled engineering values</span></footer>${agencyMarkup}<div id="map-history-host"></div></section>`;
 const find=id=>container.querySelector('#'+id);
 const panel=find('program-panel');
 const cleanupAgency=mountAgencyMedia(container);
 const closeHistory=renderHistoricalContext(find('map-history-host'));
 cleanupMap=()=>{cleanupAgency();destroyGlobe();closeHistory?.();};
 function rerender(id,selection=null){
  levelId=id;selectedId=selection;renderMissionSelect(container,data);
  if(selection){const tile=container.querySelector(`[data-map-mission="${selection}"]`);tile?.scrollIntoView({block:'nearest',inline:'center'});tile?.click();}
  else container.querySelector('[aria-current=page]')?.focus();
 }
 function openPanel(focus=false){
  panel.dataset.open='true';
  if(focus&&matchMedia('(max-width:760px)').matches){panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.querySelector('h2')?.focus();}
 }
 function bindPanel(){
  panel.querySelector('#panel-close').onclick=()=>{panel.dataset.open='false';panel.removeAttribute('aria-modal');panel.removeAttribute('role');destroyGlobe();lastFocused?.focus();};
  bindMissionImages(panel);
 }
 function chooseMission(m,focus=false){
  destroyGlobe();destroyGlobe=()=>{};
  selected=m;selectedId=m.id;bodySelection=null;
  container.querySelectorAll('[data-map-mission]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapMission===m.id)));
  const unlocked=isMissionUnlocked(m,completed),record=completed[m.id],destination=bodyById(missionDestination(m));
  const preset=starterDesign(m,data,state.difficulty),blueprint=makeBlueprint(preset,data,m.name+' preset');
  const design=projectAssembly({...preset,assembly:blueprint.assembly},data);
  const access=getUnlocked(data,Object.keys(completed)),allowed=[...access.parts,...access.instruments];
  const evaluation=evaluateDesign(design,data);
  const saved=unlocked?compatibleSavedBuilds(m,data,state):[];
  const presetReady=unlocked&&access.launchers.includes(preset.launcherId)&&checkLaunchGate(design,data,allowed).every(c=>c.ok||m.transfer&&c.id.startsWith('transfer-'));
  const transfer=m.transfer?transferTrajectory(m,preset,defaultPlan(m)):null;
  const orbit=data.orbits.find(o=>o.id===preset.orbitId);
  const reward=REWARDS[missionDifficulty(m)];
  const artCredit=m.id==='comet-pass'?'ESA / Rosetta / NAVCAM · CC BY-SA 3.0 IGO':m.id==='lunar-pathfinder'?'Earthrise · NASA / Apollo 8':m.transfer?(ATLAS_PORTRAITS[destination?.id]?.credit||ATLAS_TEXTURES[destination?.id]?.caption):'';
  panel.innerHTML=`<button class="orbital-button subtle program-close" id="panel-close" aria-label="Close mission details">×</button><div class="program-panel-art ${destination?.id==='transfer'?'lagrange-hero':''}">${missionImage(m)}</div><div class="program-panel-copy"><p class="orbital-eyebrow">${missionChapter(m)} / ${status(m)}</p><h2 tabindex="-1">${escape(m.name)}</h2>${artCredit?`<small>${escape(artCredit)}</small>`:''}<p>${escape(m.objective||m.brief)}</p><p class="program-rating"><span aria-label="${missionDifficulty(m)} of 5 difficulty stars">${stars(m)}</span> ${record?.medal?' · '+escape(record.medal)+' medal':record?' · Completed':' · Unflown'}</p>
  <dl><dt>Destination</dt><dd>${destination?.name||'Earth'} · ${escape(transfer?'via Earth parking orbit':orbit?.name||'Transfer')}</dd><dt>Mission type</dt><dd>${escape(m.tag||'Orbital operations')} · ${isCoreMission(m)?'Core':'Optional'}</dd><dt>Budget</dt><dd>${formatBudget(m,data,state.difficulty)}</dd><dt>Travel / operations</dt><dd>${transfer?(transfer.travelSec>=365.25*DAY_SEC?(transfer.travelSec/DAY_SEC/365.25).toFixed(1)+' years':(transfer.travelSec/DAY_SEC).toFixed(1)+' days')+' · '+m.tag:escape(m.travelLabel||(['leo','sso'].includes(preset.orbitId)?'Numerical ascent':destination?.id==='moon'?'Lunar transfer · compressed presentation':'Compressed ascent')+' · '+m.targetLifetime+' yr service target')}</dd><dt>Payload</dt><dd>${escape(data.instruments.find(p=>p.id===m.payload)?.name||'Mission instrument')}</dd><dt>Communications</dt><dd>${m.profile?.delivered||0} GB returned in operations</dd><dt>Power</dt><dd>110% of average load · preset ${Math.ceil(evaluation.averageLoad*1.1)} W minimum</dd><dt>Propulsion</dt><dd>${transfer?.speculative?'Speculative beamed sail · 5% light speed':transfer?Math.round(transfer.departureDv)+' m/s departure · '+Math.round(transfer.correctionDv)+' m/s trim':(orbit?.insertionFuel||0)+' kg insertion reserve · '+(orbit?.yearlyBurn||0)+' kg/year stationkeeping'}</dd><dt>Unlock conditions</dt><dd>${m.requires?.length?m.requires.map(id=>`<button class="program-prereq" data-prerequisite="${id}">${escape(data.missions.find(parent=>parent.id===id)?.name||id)}</button>`).join(''):'Available from the start'}</dd><dt>First / replay rewards</dt><dd>${reward.join(' / ')} coins</dd></dl>
  <label class="program-saved">Compatible saved spacecraft <select id="map-saved">${saved.length?saved.map((b,i)=>`<option value="${i}">${escape(b.name)}</option>`).join(''):'<option value="">None for preset deployment</option>'}</select></label>
  <div class="program-actions"><button class="orbital-button primary" id="map-build" ${unlocked?'':'disabled'}>Build</button><button class="orbital-button" id="map-satellites" ${unlocked?'':'disabled'}>My Satellites</button><button class="orbital-button" id="map-preset" ${presetReady?'':'disabled'}>Use preset</button></div>${unlocked&&!presetReady?'<small>Preset needs equipment, a different assistance level, or launch adjustments. Build to see engineering checks.</small>':''}</div>`;
  const enter=(assembly=null,options={})=>{
   setDesign({missionId:m.id,launcherId:preset.launcherId,orbitId:preset.orbitId,orbitElements:null,stationIds:null,...(assembly?{assembly}:{}),rocketId:null,planId:null,flightWorkflow:true});
   saveProgress();showScreen('workshop',{mission:true,...options});
  };
  panel.querySelectorAll('[data-prerequisite]').forEach(button=>button.onclick=()=>{const parent=missions.find(other=>other.id===button.dataset.prerequisite);if(parent)rerender(destinationLevel(parent),parent.id);});
  panel.querySelector('#map-build').onclick=()=>enter();
  panel.querySelector('#map-satellites').onclick=()=>{const index=panel.querySelector('#map-saved').value,item=index===''?null:saved[Number(index)];enter(item?.assembly,item?{blueprint:item}:{library:true});};
  panel.querySelector('#map-preset').onclick=()=>enter(blueprint.assembly,{blueprint});
  bindPanel();if(focus)openPanel(true);
 }
 function chooseBody(body){
  destroyGlobe();destroyGlobe=()=>{};
  bodySelection=body;
  const parent=bodyById(body.parent);
  const globeId=body.id==='earth-orbit'?'earth':body.id;
  const art=destinationArt(body.id);
  const spec=art?null:ATLAS_TEXTURES[globeId];
  const credit=ATLAS_PORTRAITS[body.id]?.credit||spec?.caption;
  panel.innerHTML=`<button class="orbital-button subtle program-close" id="panel-close" aria-label="Close destination details">×</button><div class="program-body-hero ${body.id==='transfer'?'lagrange-hero':''}" id="atlas-globe">${body.id==='transfer'?lagrangeChart():art||`<span class="atlas-body atlas-${body.id}" aria-hidden="true"></span>`}</div><div class="program-panel-copy"><p class="orbital-eyebrow">CELESTIAL ATLAS</p><h2 tabindex="-1">${body.name}</h2>${credit?`<small id="atlas-globe-credit">${credit}</small>`:''}${globeId==='earth'?`<label class="atlas-layer">Earth imagery <select id="atlas-earth-layer">${Object.entries(EARTH_ATLAS_LAYERS).map(([id,layer])=>`<option value="${id}">${layer.name}</option>`).join('')}</select></label>`:''}<p>${body.kind}${body.distanceAU?' · '+body.distanceAU+' AU mean orbital distance':''}</p><p>${body.note||((body.level==='solar'&&body.id!=='sun'||body.level==='jupiter'||body.id==='moon')?'Orbits '+parent?.name:parent?'Located in '+parent.name:'')}</p>
  ${body.moons?`<p>Moons orbiting ${body.name}</p><ul>${body.moons.map(id=>`<li>${bodyById(id).name}</li>`).join('')}</ul>${inSystem?'':'<button class="orbital-button" id="body-zoom">Open Jupiter system →</button>'}`:body.zoom?`<button class="orbital-button" id="body-zoom">Open ${MAP_LEVELS.find(l=>l.id===body.zoom)?.name} →</button>`:''}
  ${missions.filter(m=>missionDestination(m)===body.id).map(m=>`<button class="orbital-button" data-body-mission="${m.id}">${escape(m.name)} · ${status(m)}</button>`).join('')}</div>`;
  panel.querySelector('#body-zoom')?.addEventListener('click',()=>rerender(body.moons?'jupiter':body.zoom));
  panel.querySelectorAll('[data-body-mission]').forEach(b=>b.onclick=()=>chooseMission(missions.find(m=>m.id===b.dataset.bodyMission),true));
  bindPanel();openPanel(true);
  if(spec){
   const host=panel.querySelector('#atlas-globe');
   destroyGlobe=mountAtlasGlobe(host,globeId);
   panel.querySelector('#atlas-earth-layer')?.addEventListener('change',event=>{
    destroyGlobe();
    destroyGlobe=mountAtlasGlobe(host,globeId,event.target.value);
    panel.querySelector('#atlas-globe-credit').textContent=EARTH_ATLAS_LAYERS[event.target.value].caption;
   });
  }
 }
 container.querySelectorAll('[data-map-mission]').forEach(b=>b.onclick=()=>{lastFocused=b;chooseMission(shown.find(m=>m.id===b.dataset.mapMission),true);});
 container.querySelectorAll('[data-body]').forEach(b=>b.onclick=()=>{lastFocused=b;chooseBody(bodyById(b.dataset.body));});
 container.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>rerender(b.dataset.level));
 find('campaign-continue').onclick=()=>{if(next)rerender(destinationLevel(next),next.id);};
 find('map-home').onclick=()=>showScreen('menu');
 find('map-help').onclick=()=>showScreen('academy');
 find('map-academy')?.addEventListener('click',()=>showScreen('academy'));
 find('map-evidence').onclick=()=>showScreen('evidence');
 find('map-list').onclick=()=>{listView=!listView;renderMissionSelect(container,data);container.querySelector('#map-list').focus();};
 find('atlas-back').onclick=()=>{const index=MAP_LEVELS.indexOf(level);if(inSystem)rerender('solar');else if(index>0)rerender(MAP_LEVELS[index-1].id);else showScreen('menu');};
 find('campaign-difficulty').onchange=e=>{setDesign({difficulty:e.target.value});saveProgress();renderMissionSelect(container,data);container.querySelector('#campaign-difficulty').focus();};
 container.querySelector('.program-chart')?.addEventListener('keydown',event=>{
  const keys={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1};
  if(!Object.hasOwn(keys,event.key))return;
  const tiles=Array.from(container.querySelectorAll('[data-map-mission]'));
  const index=tiles.indexOf(document.activeElement);
  if(index<0)return;
  event.preventDefault();tiles[(index+keys[event.key]+tiles.length)%tiles.length].focus();
 });
 panel.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&(selected||bodySelection))panel.querySelector('#panel-close')?.click();
  if(event.key==='Tab'&&panel.hasAttribute('aria-modal')){
   const elements=[...panel.querySelectorAll('button:not(:disabled),select,a[href]')].filter(el=>el.getClientRects().length);
   const first=elements[0],last=elements.at(-1);
   if(event.shiftKey&&(document.activeElement===first||document.activeElement.tagName==='H2')){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
 });
 if(selected)chooseMission(selected);
 else panel.innerHTML='<div class="program-panel-copy"><h2>Chart a destination</h2><p>Select a body to see its parent system and available branches.</p></div>';
 return ()=>{cleanupMap();cleanupMap=()=>{};};
}
