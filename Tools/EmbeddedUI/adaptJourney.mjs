export function adaptJourney(edit){
 edit('js/ui/simulation.js',
   ['export function clearSimulationResults(){session=null;clearFlightSession();}', `export function clearSimulationResults(){
 if(clearFlightSession()===false)return false;
 session=null;
 return true;
}`]);
 edit('js/ui/router.js',
  ["import { renderMenu,cleanupMenu }", "import { renderMenu }"],
  ["cleanup?.();cleanup=null;cleanupMenu();clearLines();", "cleanup?.();cleanup=null;clearLines();"],
  ["from './menu.js'","from '../unity/menu.js'"],
  ["from './evidence.js'","from '../unity/observations.js'"],
  ["import {renderFlightPlan}", "import {bindJourney} from '../unity/journeyBar.js';\nimport {rememberCampaignDraft} from '../unity/campaignResume.js';\nimport {renderFlightPlan}"],
  [" if(name==='report'&&(!getSimulationResults()||getSimulationResults().design.missionId!==design.missionId))name=mission?'design':'menu';",
   " if(name==='report'&&getSimulationResults()?.phase!=='report')name=mission?'design':'menu';\n const savedReport=name==='report';"],
  [" if(!['menu','missionSelect','evidence','workshop','academy','rocketWorkshop'].includes(name)&&!mission)", " if(!savedReport&&!['menu','missionSelect','evidence','workshop','academy','rocketWorkshop'].includes(name)&&!mission)"],
  [" if(mission&&mission.id!=='tutorial'){"," if(!savedReport&&!state.practiceMode&&mission&&mission.id!=='tutorial'){"],
  [" if(mission&&!['menu'"," if(!savedReport&&!state.practiceMode&&mission&&!['menu'"],
  [" saveProgress();const nextCleanup=", " if(saveProgress())rememberCampaignDraft(name,params,getState().currentDesign);\n const nextCleanup="],
  ["if(typeof nextCleanup==='function')cleanup=nextCleanup;", "const journeyCleanup=bindJourney(appContainer,worldData,name,params,showScreen,getSimulationResults());cleanup=()=>{journeyCleanup();if(typeof nextCleanup==='function')nextCleanup();};"]);
 // Keep practice purchases, named designs, plans and campaign checkpoints in the practice profile.
 for (const [file, anchor, count] of [
   ['state.js', '// Game state', 2], ['academy.js', 'export function readAcademy', 2],
   ['workshop/library.js', 'export const LIBRARY_KEY', 1], ['workshop/economy.js', 'export const ECONOMY_KEY', 2],
   ['rocket/library.js', 'export function rocketLibrary', 1], ['transfer/library.js', 'export function planLibrary', 1],
 ]) {
   const directory = file.includes('/') ? '..' : '.';
   edit('js/' + file, [anchor, "import {profileStorage} from '" + directory + "/unity/practiceProfile.js';\n" + anchor],
     ['globalThis.localStorage', 'profileStorage()', count]);
 }
 edit('js/state.js',
  ['let state = getDefaultState();', `let state = getDefaultState();
export function setPracticeMode(active, origin = null) {
  if (active) {
    state.practiceMode = true;
    state.practiceOrigin = origin || state.currentMissionId || 'm1';
  } else {
    delete state.practiceMode;
    delete state.practiceOrigin;
  }
}
export function isPracticeMode() {
  return Boolean(state.practiceMode);
}`],
  ['    state.currentDesign = candidate;', "    state.currentDesign = candidate;\n    if(typeof window!=='undefined')window.dispatchEvent(new Event('orbital-design-change'));"]);
 edit('js/ui/review.js',
  ["if(!ok||!playableLaunchChecks(design,data).every(c=>c.ok))return;", "if(JSON.stringify(resolveFlightDesign(getState().currentDesign))!==JSON.stringify(design)){showScreen('review');return;}if(!ok||!playableLaunchChecks(design,data).every(c=>c.ok))return;"]);
 edit('js/ui/advisory.js',
  ["import {escapeHtml}","import {validationDestination} from '../unity/journeyBar.js';\nimport {escapeHtml}"],
  ["()=>showScreen('design',{highlight:checkRows[b.dataset.fix],tab:fixTabs[b.dataset.fix]})", "()=>{const fix=validationDestination(b.dataset.fix);showScreen(fix.screen,fix.params);}"]);
 edit('js/ui/missionSelect.js',
  ["import {escapeHtml as escape}", "import {observationMarkup,bindObservations} from '../unity/observations.js';\nimport {bundleForMission} from '../unity/sourceData.js';\nimport {escapeHtml as escape}"],
  ["export function renderMissionSelect(container,data){","export function renderMissionSelect(container,data,{openNext=false}={}){"],
  [" levelId??=next?destinationLevel(next):'earth';"," if(openNext){levelId=next?destinationLevel(next):'earth';selectedId=next?.id;}\n levelId??=next?destinationLevel(next):'earth';"],
  ["Earth intelligence ↗","Observation archive ↗"],
  ["  if(focus&&matchMedia('(max-width:760px)').matches){panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.querySelector('h2')?.focus();}",
   "  if(!focus)return;\n  if(matchMedia('(max-width:760px)').matches){panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');}\n  panel.querySelector('h2')?.focus();"],
  ['${scienceBrief(m.id)}<p class="program-rating">','${scienceBrief(m.id)}${observationMarkup(m.id)}<p class="mission-journey"><strong>Brief</strong> → Design → Readiness → Flight → Debrief</p><p class="program-rating">'],
  ['  const saved=unlocked?', '  const source=bundleForMission(m.id),sameDraft=state.currentDesign.missionId===m.id&&state.currentDesign.flightWorkflow;\n  const saved=unlocked?'],
  ['  <div class="program-actions">', '  ${source?`<label class="program-saved">Mission approach <select id="map-approach"><option value="">Guided scenario · authored targets</option><option value="${source.bundle.id}" ${sameDraft&&state.currentDesign.scienceBundleId===source.bundle.id?\'selected\':\'\'}>Archived NASA context · modeled follow-up</option></select></label>`:\'\'}<div class="program-actions">'],
  ['  const enter=(assembly=null,options={})=>{', "  const controls=document.createElement('div');controls.className='program-launch-controls';\n  controls.setAttribute('role','group');controls.setAttribute('aria-label','Start this mission');\n  controls.append(panel.querySelector('.program-actions'));\n  const approach=panel.querySelector('#map-approach')?.closest('label');\n  if(approach)controls.append(approach);\n  controls.append(panel.querySelector('.program-saved:has(#map-saved)'));\n  panel.querySelector('.program-panel-copy h2').after(controls);\n  const enter=(assembly=null,options={})=>{"],
  ["   setDesign({missionId:m.id,launcherId:preset.launcherId,orbitId:preset.orbitId,orbitElements:null,stationIds:null,...(assembly?{assembly}:{}),rocketId:null,planId:null,flightWorkflow:true});",
   "   const scienceBundleId=panel.querySelector('#map-approach')?.value||null;\n   if(sameDraft&&!assembly)setDesign({scienceBundleId});\n   else setDesign({missionId:m.id,launcherId:preset.launcherId,orbitId:preset.orbitId,orbitElements:null,stationIds:null,...(assembly?{assembly}:{}),rocketId:null,planId:null,flightWorkflow:true,scienceBundleId});"],
  ['  bindPanel();if(focus)openPanel(true);','  bindObservations(panel);bindPanel();if(focus)openPanel(true);'],
  [' if(selected)chooseMission(selected);',' if(selected){lastFocused=container.querySelector(`[data-map-mission="${selected.id}"]`);chooseMission(selected,openNext);}']);
 edit('js/ui/report.js',
  ["import {escapeHtml}","import {observationMarkup,bindObservations} from '../unity/observations.js';\nimport {escapeHtml}"],
  ['Required ${o.target} ${o.unit}', 'At least ${o.target} ${o.unit}'],
  ["  bindReportExport(container,sim,ops,rating);","  container.querySelector('#mission-evidence')?.insertAdjacentHTML('beforeend',observationMarkup(missionId));\n  bindObservations(container);\n  bindReportExport(container,sim,ops,rating);"]);
 edit('js/ui/workshop.js',
  ["tab='all',query=", "tab=categories.some(([id])=>id===params.category)?params.category:'all',query="],
  [" const library=createLibrary(data);let build", " let build"],
  [" try{build=library.recover();}", " const library=createLibrary(data,undefined,mission?.id);\n try{build=library.recover();}"],
  ["find('ws-home').onclick=()=>training?showScreen('menu'):guard(()=>showScreen('menu'));",
   "find('ws-home').onclick=()=>training||mission?showScreen('menu'):guard(()=>showScreen('menu'));"],
  ["persistDraft();setDesign(projectAssembly({...getState().currentDesign,assembly:build.assembly},data));saveProgress();action();",
   "persistDraft();if(mission){setDesign(projectAssembly({...getState().currentDesign,assembly:build.assembly},data));saveProgress();}action();"],
  ['<summary>What changes?</summary>', '<summary>Power & design forecast</summary>'],
  ['<summary>Science scenario version</summary>', '<summary>Mission observations & approach</summary>'],
  ['id="ws-review-top">Review / launch →','id="ws-review-top">Choose launcher →'],
  ['id="ws-review">Continue to launch review →','id="ws-review">Continue to launcher →'],
  ["<dt>Power / load</dt><dd>${e.panelPower.toFixed(0)} / ${e.averageLoad.toFixed(0)} W</dd><dt>Usable battery</dt>", "<dt>Solar generation</dt><dd>${e.panelPower.toFixed(0)} W when illuminated</dd><dt>Average design load</dt><dd>${e.averageLoad.toFixed(0)} W</dd><dt>Usable battery storage</dt>"],
  ['h endurance</dd>', 'h at average load with no generation</dd>'],
  ["</dl><p>${mission?'Mission cost:", "</dl><p>Solar arrays generate power in sunlight. The battery stores energy for eclipse and other generation shortfalls. Added capacity costs mass and budget.</p><p>${mission?'Mission cost:"],
  ["find('ws-mission').textContent=", "if(mission&&!training)find('ws-review-top').textContent=getState().currentDesign.flightWorkflow?'Choose launcher →':'Review / launch →';\n  find('ws-mission').textContent="]);
 edit('js/workshop/library.js',
  ['export function createLibrary(data,storage){','export function createLibrary(data,storage,missionId){\n const draftKey=missionId?DRAFT_KEY+\':\'+missionId:DRAFT_KEY;'],
  ['storage.setItem(DRAFT_KEY,','storage.setItem(draftKey,'],
  ['const raw=storage.getItem(DRAFT_KEY);','const raw=storage.getItem(draftKey)??(missionId?storage.getItem(DRAFT_KEY):null);']);
 edit('js/ui/academy.js',
  ["import {renderRocketWorkshop}","import {bindPreparedExercise} from '../unity/learningTools.js';\nimport {renderRocketWorkshop}"],
  ["export function renderAcademy(container,world){","export function renderAcademy(container,world){\n const cleanup=renderAcademyLesson(container,world);\n bindPreparedExercise(container,world);\n return cleanup;\n}\nfunction renderAcademyLesson(container,world){"]);
 edit('js/ui/missionControl.js',
  ["import {scheduleBrief","import {operationsPreviewMarkup} from '../unity/operationsPreview.js';\nimport {scheduleBrief"],
  ['<div class="control-environment">','<div id="ops-preview" class="ops-preview"></div><div class="control-environment">'],
  ["    find('sun-state').textContent=", "    const preview=find('ops-preview'),opened=preview.querySelector('details')?.open;preview.innerHTML=operationsPreviewMarkup(state);if(opened)preview.querySelector('details').open=true;\n    find('sun-state').textContent="],
  ['<small> / ${o.target} ${o.unit}</small>', '<small> ${o.unit} · at least ${o.target} ${o.unit}</small>']);
}


