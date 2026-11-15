export function adaptScienceUI(edit) {
  edit('js/contracts/missionRun.js',
    ['import {validateCruise}', "import {SCIENCE_VERSION} from '../unity/scienceScenarios.js';\nimport {validateEvidence} from '../unity/scienceEvidence.js';\nimport {validateCruise}"],
    ["simulationVersion:'guided-orbits-3',scoringVersion:'ops-1'", "simulationVersion:SCIENCE_VERSION,scoringVersion:SCIENCE_VERSION"],
    ["['guided-orbits-3','guided-resources-2','guided-legacy-1'].includes(run.simulationVersion)||run.scoringVersion!=='ops-1'",
     "[SCIENCE_VERSION,'guided-orbits-3','guided-resources-2','guided-legacy-1'].includes(run.simulationVersion)||run.scoringVersion!==(run.simulationVersion===SCIENCE_VERSION?SCIENCE_VERSION:'ops-1')"],
    ["run.simulationVersion ||= 'guided-legacy-1';", "run.simulationVersion ||= run.scoringVersion===SCIENCE_VERSION?SCIENCE_VERSION:'guided-legacy-1';"],
    ['  if(run.cruise)validateCruise(run.cruise,run.design,run.mission);',
     '  if(run.cruise)validateCruise(run.cruise,run.design,run.mission);\n  validateEvidence(run.cruise??run.operations,run.mission.id,run.scoringVersion);']);
  edit('js/ui/missionControl.js',
    ['import {cameraControls', "import {scheduleBrief,scienceQuestion} from '../unity/scienceUI.js';\nimport {SCIENCE_VERSION} from '../unity/scienceScenarios.js';\nimport {cameraControls"],
    ['design,data,evalResult);', 'design,data,evalResult,{science:!training&&session.scoringVersion===SCIENCE_VERSION});'],
    ["if(!saved){session.simulationVersion='guided-orbits-3';if(training)", "if(!saved){if(training)"],
    ['<h2>${mission.objective}</h2>', '<h2>${state.evidence?scienceQuestion(mission.id):mission.objective}</h2>${scheduleBrief(state.evidence)}'],
    ["'Payload active · recording useful observations'", "'Payload active · acquisition depends on the target window and conditions'"],
    ["find('ground-track').innerHTML=groundTrackMarkup(state);", "if(find('ground-track').parentElement.open)find('ground-track').innerHTML=groundTrackMarkup(state);"],
    ["  bindCameraControls(container,view,", "  find('ground-track').parentElement.addEventListener('toggle',event=>{if(event.target.open)find('ground-track').innerHTML=groundTrackMarkup(state);});\n  bindCameraControls(container,view,"]);
  edit('js/ui/brief.js',
    ['import {difficultyLabel,REWARDS', "import {scienceBrief} from '../unity/scienceUI.js';\nimport {difficultyLabel,REWARDS"],
    ['REWARDS[missionDifficulty(mission)][state.completedMissions[mission.id]?1:0]', '(state.completedMissions[mission.id]?0:REWARDS[missionDifficulty(mission)][0])'],
    ['<p class="brief-lead">${mission.brief}</p>', '<p class="brief-lead">${mission.brief}</p>${scienceBrief(mission.id)}'],
    ["?'service availability':'survey coverage'", "?'service availability':'effective observing time'"]);
  edit('js/ui/missionSelect.js',
    ["import {lessons}", "import {scienceBrief} from '../unity/scienceUI.js';\nimport {lessons}"],
    ["<p>${escape(lessons[m.id]||'')}</p>", "<p>${escape(lessons[m.id]||'')}</p>${scienceBrief(m.id)}"],
    ["<dt>First / replay rewards</dt><dd>${reward.join(' / ')} coins</dd>", "<dt>First-clear reward</dt><dd>${reward[0]} coins</dd>"]);
  edit('js/ui/simulation.js',
    ["import {createCruise}", "import {SCIENCE_VERSION} from '../unity/scienceScenarios.js';\nimport {createCruise}"],
    ['createCruise(session.design,session.mission,data,session.evalResult)',
     'createCruise(session.design,session.mission,data,session.evalResult,{science:session.scoringVersion===SCIENCE_VERSION})']);
  edit('js/ui/cruise.js',
    ["import {cruiseCommand", "import {OBSERVE_PLANS} from '../unity/scienceScenarios.js';\nimport {selectEncounterPlan} from '../unity/scienceTransfer.js';\nimport {scienceBrief} from '../unity/scienceUI.js';\nimport {cruiseCommand"],
    ['<p id="cruise-brief" aria-live="polite"></p>',
     '<p id="cruise-brief" aria-live="polite"></p>${state.evidence?scienceBrief(state.missionId)+`<label>Encounter schedule <select id="cruise-plan">${Object.entries(OBSERVE_PLANS).map(([id,name])=>`<option value="${id}">${name}</option>`).join(\'\')}</select></label> <small>${state.evidence.scenario.targets.join(\' → \')} · ${state.evidence.scenario.hours} h total</small>`: \'\'}'],
    ["  find('report').hidden=!state.finished;", "  find('report').hidden=!state.finished;\n  if(find('plan')){find('plan').value=state.observationPlan;find('plan').disabled=state.finished||state.phase==='return';}"],
    [" find('pause').onclick=", " if(find('plan'))find('plan').onchange=event=>{if(selectEncounterPlan(state,event.target.value))save();};\n find('pause').onclick="]);
  edit('js/ui/report.js',
    ["import {bindReportExport}", "import {scienceReport,bindMissionExperiment} from '../unity/scienceUI.js';\nimport {bindReportExport}"],
    ['        ${ops?`<section class="ops-report-summary">','        ${scienceReport(sim,ops)}\n        ${ops?`<section class="ops-report-summary">'],
    ['  bindReportExport(container,sim,ops,rating);','  bindReportExport(container,sim,ops,rating);\n  bindMissionExperiment(container,sim,data);']);
  edit('js/workshop/economy.js',
    ['const amount=REWARDS[missionDifficulty(mission)][first?0:1];',
     'if(!first&&run.scoringVersion==="mission-evidence-1")return {amount:0,coins:e.coins};\n const amount=REWARDS[missionDifficulty(mission)][first?0:1];']);
  edit('js/flightCompletion.js', ["    missionId && missionId", "    !flight?.experiment && missionId && missionId"]);
  edit('js/transfer/planning.js',
    ['function transferTrajectory(mission,design,plan)', 'function transferTrajectory(mission,design,plan,assumptions={})'],
    ['  const distanceM=target.distanceLy', '  const speedFraction=assumptions.speedFraction??target.speedFraction;\n  const distanceM=target.distanceLy'],
    ['target.speedFraction*LIGHT_SPEED','speedFraction*LIGHT_SPEED',2],
    ['function cruiseHardware(plan,design,data,evaluation,trajectory)', 'function cruiseHardware(plan,design,data,evaluation,trajectory,assumptions={})'],
    ['const lifetimeYears=module.lifetimeYears??', 'const lifetimeYears=assumptions.lifetimeYears??module.lifetimeYears??'],
    ['module.opticalGbDayAt1Ly/trajectory.target.distanceLy**2', '(assumptions.receiverFactor??1)*module.opticalGbDayAt1Ly/trajectory.target.distanceLy**2']);
}
