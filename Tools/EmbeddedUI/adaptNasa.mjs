export function adaptNasa(edit){
 edit('js/state.js',
  ['    let candidate={',"    if(partial.missionId&&partial.missionId!==state.currentDesign.missionId&&!Object.hasOwn(partial,'scienceBundleId'))partial={...partial,scienceBundleId:null};\n    let candidate={"]);
 edit('js/ui/orbitSelect.js',
  ["import {escapeHtml}","import {createConsequencesPanel} from '../unity/consequences.js';\nimport {escapeHtml}"],
  ["import {escapeHtml}","import {missionGuide,bindMissionGuide} from '../unity/missionGuide.js';\nimport {escapeHtml}"],
  ['  function select(id,preserve=false)', '  let consequencePanel;\n  function select(id,preserve=false)'],
  ["    container.querySelector('#confirm').disabled=", "    container.querySelector('#orbit-info').insertAdjacentHTML('beforeend',missionGuide('orbit',mission.id));bindMissionGuide(container);\n    consequencePanel?.destroy();\n    if(model&&!training&&!mission.transfer){const host=document.createElement('details');host.innerHTML='<summary>Target access, eclipse and delivery consequences</summary><div></div>';container.querySelector('#orbit-info').append(host);consequencePanel=createConsequencesPanel(host.lastElementChild,data,state.currentDesign);consequencePanel.update({...resolveFlightDesign(getState().currentDesign),orbitElements:model});}\n    container.querySelector('#confirm').disabled="],
  ['view.select(id,custom);const sample=', 'view.select(id,custom);consequencePanel?.update({...resolveFlightDesign(getState().currentDesign),orbitElements:custom});const sample='],
  ['return ()=>view.destroy();','return ()=>{consequencePanel?.destroy();view.destroy();};'],
  ['<label>Eccentricity <input id="orbit-eccentricity"', '<label>Ascending-node longitude / degrees <input id="orbit-node" type="number" min="-180" max="180" step="1" value="${(model.raanRad/RAD).toFixed(1)}"></label><label>Eccentricity <input id="orbit-eccentricity"'],
  ["{semiMajorAxisM:BODIES[model.body].radiusM+Number(info.querySelector('#orbit-altitude').value)*1000", "{raanRad:Number(info.querySelector('#orbit-node').value)*RAD,semiMajorAxisM:BODIES[model.body].radiusM+Number(info.querySelector('#orbit-altitude').value)*1000"]);
 edit('js/ui/missionControl.js',
  ["import {scheduleBrief", "import {missionGuide,bindMissionGuide} from '../unity/missionGuide.js';\nimport {scheduleBrief"],
  ["import {scheduleBrief", "import {sourceMap} from '../unity/sourceUI.js';\nimport {scheduleBrief"],
  ['scienceQuestion(mission.id)', 'scienceQuestion(mission.id,state.evidence)'],
  ['${scheduleBrief(state.evidence)}','${scheduleBrief(state.evidence)}${missionGuide(\'operations\',mission.id)}'],
  ["  find('command-help').textContent=help[state.mode];", "  bindMissionGuide(container);\n  find('command-help').textContent=help[state.mode];"],
  ['groundTrackMarkup(state)', 'groundTrackMarkup(state)+sourceMap(state)',2]);
 edit('js/contracts/missionRun.js',
  ["import {SCIENCE_VERSION}","import {sourceBundle,bundleIdentity,validateBundleIdentity} from '../unity/sourceData.js';\nimport {SCIENCE_VERSION}"],
  ['  return {schemaVersion:2,timeStepSec:270,',"  const selectedSource=sourceBundle(snapshot.scienceBundleId);\n  return {sourceBundle:bundleIdentity(selectedSource?.bundle),sourceProducts:selectedSource?structuredClone(selectedSource.products):null,schemaVersion:2,timeStepSec:270,"],
  ['  assertSerializable(run);',"  assertSerializable(run);\n  if(run.sourceBundle){const entry=validateBundleIdentity(run.sourceBundle);if(run.sourceBundle.id!==run.design.scienceBundleId)throw Error('Source bundle/design mismatch');if(JSON.stringify(run.sourceProducts)!==JSON.stringify(entry.products))throw Error('Source attribution snapshot mismatch');}\n  else if(run.design?.scienceBundleId)throw Error('Missing pinned source bundle');"]);
 edit('js/contracts/validate.js',
  ["  let design={...structuredClone(input),schemaVersion:2};", "  let design={...structuredClone(input),schemaVersion:2};\n  if(design.scienceBundleId!=null&&(typeof design.scienceBundleId!=='string'||!/^[a-z0-9-]{1,80}$/.test(design.scienceBundleId)))throw Error('Invalid science bundle selection');"]);
 edit('js/ui/workshop.js',
  ["import {launcherFor}","import {missionGuide,bindMissionGuide} from '../unity/missionGuide.js';\nimport {launcherFor}"],
  ["import {launcherFor}","import {createConsequencesPanel} from '../unity/consequences.js';\nimport {bundleForMission} from '../unity/sourceData.js';\nimport {sourceCard} from '../unity/sourceUI.js';\nimport {launcherFor}"],
  ['<details><summary>Blueprint role tags & notes</summary>', '<details><summary>What changes?</summary><div id="ws-consequences"></div></details><details><summary>Science scenario version</summary><div id="ws-science-choice"></div></details><details><summary>Blueprint role tags & notes</summary>'],
  [' function render(){if(!alive)return;', ' let consequencePanel;\n function render(){if(!alive)return;'],
  ["  find('ws-readiness').textContent=",`  consequencePanel??=createConsequencesPanel(find('ws-consequences'),data);consequencePanel.update(design);
  if(!find('ws-consequences').querySelector('.mission-guide')){find('ws-consequences').insertAdjacentHTML('afterbegin',missionGuide('workshop',mission?.id));bindMissionGuide(container);}
  const availableSource=mission?bundleForMission(mission.id):null;
  find('ws-science-choice').innerHTML=availableSource?'<label><input type="checkbox" id="ws-use-source" '+(design.scienceBundleId===availableSource.bundle.id?'checked':'')+'> Start a new source-backed context investigation ('+availableSource.bundle.scoringVersion+')</label><p>Optional new run. Existing saved reports keep their original scoring/data version.</p>'+sourceCard(mission.id):'<p>Original authored mission scenario. A validated numerical NASA bundle is not available for this mission.</p>';
  const sourceChoice=find('ws-use-source');if(sourceChoice)sourceChoice.onchange=()=>{setDesign({scienceBundleId:sourceChoice.checked?availableSource.bundle.id:null});saveProgress();render();};
  find('ws-readiness').textContent=`],
  ['return ()=>{persistDraft();alive=false;', 'return ()=>{consequencePanel?.destroy();persistDraft();alive=false;']);
}
