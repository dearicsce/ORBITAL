import fs from 'node:fs';
import path from 'node:path';
import {adaptScience} from './adaptScience.mjs';
import {adaptScienceUI} from './adaptScienceUI.mjs';
import {adaptAscent} from './adaptAscent.mjs';
import {adaptNasa} from './adaptNasa.mjs';
import {adaptLifecycle} from './adaptLifecycle.mjs';
import {adaptJourney} from './adaptJourney.mjs';
import {adaptLauncherAndLayout} from './adaptLauncherAndLayout.mjs';
import {adaptCampaignPresentation} from './adaptCampaignPresentation.mjs';
import {adaptSceneRepair} from './adaptSceneRepair.mjs';
import {adaptMissionLocations} from './adaptMissionLocations.mjs';

// Apply small, checked edits to preserved reference modules. A changed upstream
// anchor requires review instead of silently returning to the old behavior.
export function adaptBrowser(target){
 const files=[];
 function edit(file,...changes){
  const full=path.join(target,file);
  let code=fs.readFileSync(full,'utf8').replaceAll('\r\n','\n');
  for(const [before,after,count=1] of changes){
   if(code.split(before).length!==count+1)throw Error(file+' needs its adaptation reviewed: '+before);
   code=code.replaceAll(before,()=>after);
  }
  fs.writeFileSync(full,code);
  files.push(file);
 }
 edit('index.html',['  </head>','    <link rel="stylesheet" href="css/theme.css" />\n    <link rel="stylesheet" href="css/embedded.css" />\n    <link rel="stylesheet" href="css/stageSelect.css" />\n    <link rel="stylesheet" href="presentation/orbital-ui.css" />\n  </head>']);
 edit('vendor/three/three.module.js',
  ["if ( program.isReady() ) {",
   "// A disposed launch renderer clears material properties before this poll.\n\t\t\t\t\t\tif ( program === undefined || program.isReady() ) {"]);
 edit('js/ui/workshop.js',
  ["Working draft exported as a portable JSON backup.","Export requested. The Windows host reports when the file is saved."],
  ["setTimeout(()=>URL.revokeObjectURL(url),1000);","setTimeout(()=>URL.revokeObjectURL(url),60000);",2]);
 edit('js/ui/missionSelect.js',
  ["import {escapeHtml as escape} from './html.js';","import {escapeHtml as escape} from './html.js';\nimport {lessons} from '../unity/missionLessons.js';"],
  ["<p>${escape(m.objective||m.brief)}</p>","<p>${escape(m.objective||m.brief)}</p><p>${escape(lessons[m.id]||'')}</p>"]);
 edit('js/ui/review.js',
  ["if(!playableLaunchChecks(getState().currentDesign,data).every(c=>c.ok))return;clearSimulationResults();showScreen('simulation');",
   "if(!ok||!playableLaunchChecks(design,data).every(c=>c.ok))return;clearSimulationResults();showScreen('simulation',{reviewedDesign:design});"]);
 edit('js/ui/simulation.js',
  ["import { getState }", "import {renderKeplerOperations, observationPlan} from './keplerOperations.js';\nimport { getState }"],
  [" const seed=globalThis.crypto", " if(design.missionId==='dip'&&!resume&&!observationPlan(design)){queueMicrotask(()=>showScreen('brief'));return;}\n const seed=globalThis.crypto"],
  [" if(session.phase==='cruise'&&session.cruise)", " if(session.design.missionId==='dip'&&session.phase==='operations')return renderKeplerOperations(container,session,report);\n if(session.phase==='cruise'&&session.cruise)"],
  ["export function renderSimulation(container,data) {","export function renderSimulation(container,data,{reviewedDesign}={}) {"],
  ["const design=resume?previous.design:resolveFlightDesign(selected);","const design=reviewedDesign||(resume?previous.design:resolveFlightDesign(selected));"],
  ["session=resume?previous:createMissionRun(design,data,seed);","session=!reviewedDesign&&resume?previous:createMissionRun(design,data,seed);"]);
 edit('js/flightCompletion.js',
  ["import {cruiseSummary}", "import {evaluate as evaluateKepler} from './kepler/keplerMission.js';\nimport {cruiseSummary}"],
  ["  const ops = flight", "  if (missionId === 'dip') return Boolean(flight?.design?.missionId === 'dip' && flight.phase === 'report' &&\n    flight.ascentInsertion && flight.launchResult?.success === true && flight.keplerAttempt?.stage === 'complete' &&\n    Number.isFinite(rating?.total) && rating.total >= passStars && rating.total <= 6 &&\n    evaluateKepler(flight.keplerAttempt.ground).discriminates);\n  const ops = flight"]);
 edit('js/flightOutcome.js',
  ["  const adjusted=applyEvents(evaluation,eventResults);",
   "  // Resource operations and cruise already resolve their own incidents. Legacy rolls were never flown.\n  if(operations)eventResults=[];\n  const adjusted=applyEvents(evaluation,eventResults);"]);
 edit('js/flightCompletion.js',
  ["import {cruiseSummary} from './transfer/cruise.js';","import {cruiseSummary} from './transfer/cruise.js';\nimport {operationSummary} from './engine/operations.js';"],
  ["flight?.operationsSummary;","(flight?.operations?operationSummary(flight.operations):flight?.operationsSummary);"]);
 edit('js/ui/report.js',
  ["import {escapeHtml} from './html.js';","import {escapeHtml} from './html.js';\nimport {floodwatchReport} from '../unity/floodwatch.js';\nimport {lessons} from '../unity/missionLessons.js';\nimport {bindReportExport} from '../unity/reportExport.js';"],
  ["const hurtingEvents = eventResults.filter((e) => !e.survived);","const hurtingEvents = ops?[]:eventResults.filter((e) => !e.survived);"],
  ["Your flight. Measured.</h2>","Your flight. Measured.</h2>${floodwatchReport(sim)}<p>${escapeHtml(lessons[missionId]||'')}</p>"],
  ["${ops.lostGb.toFixed(2)} GB lost", "${ops.lostGb.toFixed(2)} GB discarded${ops.storageGb!=null?` · ${ops.storageGb.toFixed(2)} GB in recorder`:''}${ops.unconfirmedGb?` · ${ops.unconfirmedGb.toFixed(2)} GB in transit`:''}"],
  ["  const topRosterBtn", "  bindReportExport(container,sim,ops,rating);\n  const topRosterBtn"]);
 edit('js/transfer/cruise.js',
  ["lostGb:state.lostGb+(state.finished?unconfirmed:0)","lostGb:state.lostGb,storageGb:state.storageGb,unconfirmedGb:unconfirmed"]);
 edit('js/main.js',
  ["import { preloadModels } from './three/models.js';\n", ""],
  ["import { sanitizeDesign }","import {guardCampaignStorage,installStorageStatus} from './unity/storageStatus.js';\nimport { sanitizeDesign }"],
  ["    loadProgress();", "    installStorageStatus();\n    if(!guardCampaignStorage(app,loadProgress))return;"],
   ["import { initRouter, showScreen } from './ui/router.js';", "import { initRouter, showScreen } from './ui/router.js';\nimport '../presentation/orbital-ui.js';"]);
 edit('js/engine/operations.js',
  ["import {projectAssembly}", "import {floodwatchSampling} from '../unity/floodwatch.js';\nimport {projectAssembly}"],
  ["  return {\n    version:1,geometryVersion:1,orbit:structuredClone(design.orbitElements||presetOrbit(design.orbitId)),",
   "  const elements=design.orbitElements||presetOrbit(design.orbitId);\n  return {\n    sampling:floodwatchSampling(mission.id,elements),linkedRelay:true,\n    version:1,geometryVersion:1,orbit:structuredClone(elements),"],
  ["  const useful=powered&&mode==='observe'&&h.relevant&&h.orbitFit>0&&scienceFraction>0;",
   "  const useful=powered&&mode==='observe'&&h.relevant&&h.orbitFit>0&&scienceFraction>0&&(!state.sampling||state.sampling.meetsBenchmark);"],
  ["    if(h.relay)state.serviceMinutes+=minutes*scienceFraction*state.efficiency;",
   "    if(h.relay)state.serviceMinutes+=minutes*scienceFraction*state.efficiency*(state.linkedRelay?(env.contactFraction??Number(env.contact)):1);"],
  ["lostGb:state.lostGb,","lostGb:state.lostGb,storageGb:state.storageGb,"]);
 edit('js/ui/rocketSelect.js',
  ["import { getState", "import {geometryIssues, stowedEnvelope} from '../workshop/collision.js';\nimport {launcherFor} from '../rocket/engineering.js';\nimport { getState"],
  ["    container.querySelectorAll('[data-rocket]').forEach(b=>b.setAttribute", `    const assembly = state.currentDesign.assembly;
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
    container.querySelectorAll('[data-rocket]').forEach(b=>b.setAttribute`]);
 edit('js/three/rocketCarousel.js',
  ["import { getModel } from './models.js';","import {createLaunchVehicle} from './launchVehicle.js';"],
  ["getModel(id).then(m=>{if(kit.dead){disposeObject(m);return;}", "Promise.resolve(createLaunchVehicle(id)).then(m=>{if(kit.dead){disposeObject(m);return;}"]);
 edit('js/ui/orbitSelect.js',
  ["unlocked.includes(id)&&(!mission.transfer", "unlocked.includes(id)&&(mission.id!=='dip'||['leo','sso'].includes(id))&&(!mission.transfer"],
  ["import {escapeHtml} from './html.js';","import {escapeHtml} from './html.js';\nimport {floodwatchSampling,samplingText} from '../unity/floodwatch.js';"],
  ["    if(model&&!training&&!mission.transfer){","    if(mission.id==='m1'){const p=document.createElement('p');p.id='sampling-preview';p.textContent=samplingText(floodwatchSampling(mission.id,model));container.querySelector('#orbit-info').append(p);}\n    if(model&&!training&&!mission.transfer){"],
  ["view.select(id,custom);info.querySelector('dl')","view.select(id,custom);const sample=info.querySelector('#sampling-preview');if(sample)sample.textContent=samplingText(floodwatchSampling(mission.id,custom));info.querySelector('dl')"]);
 adaptScience(edit);
 adaptScienceUI(edit);
 adaptAscent(edit);
 adaptNasa(edit);
 adaptLifecycle(edit);
 adaptJourney(edit);
 adaptCampaignPresentation(edit);
 adaptLauncherAndLayout(edit);
 adaptSceneRepair(edit);
 adaptMissionLocations(edit);
 edit('js/ui/agencyMedia.js', ['<summary>Imagery and background</summary>', '<summary>Imagery and background</summary><p>Spaceflight sky: <a href="https://svs.gsfc.nasa.gov/3895/" target="_blank" rel="noopener">NASA SVS / Ernie Wright · Deep Star Maps (2012), 8K</a></p>']);
 edit('js/academy.js', ['Falcon 9', 'Kestrel']);
 edit('js/ui/academy.js', ['Falcon 9', 'Kestrel']);
 return files;
}
