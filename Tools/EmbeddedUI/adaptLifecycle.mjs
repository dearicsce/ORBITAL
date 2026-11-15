// Executed after historical adaptations: checked anchors retain reference ownership.
export function adaptLifecycle(edit){
 edit('js/contracts/missionRun.js',
  ['import {sourceBundle',"import {createLifecycle,validateLifecycle,synchronizeLifecycle} from '../unity/missionLifecycle.js';\nimport {validateRelay} from '../unity/relayTraffic.js';\nimport {validatePhysical} from '../unity/physicalCruise.js';\nimport {sourceBundle"],
  ['import {sourceBundle',"import {validateMissionEnd} from '../unity/missionEnd.js';\nimport {sourceBundle"],
  ['  return {sourceBundle:', '  const run={sourceBundle:'],
  ['launchResult,eventResults};','launchResult,eventResults};\n  run.lifecycle=createLifecycle(run);return run;'],
  ['  assertSerializable(run);','  assertSerializable(run);\n  validateLifecycle(run);validateRelay(run.operations);validatePhysical(run.cruise);validateMissionEnd(run);'],
  ['next.operationsSummary=operationSummary(state);return next;', 'next.operationsSummary=operationSummary(state);synchronizeLifecycle(next);return next;']);
 edit('js/contracts/missionRun.js',
  ['export function designFingerprint(design)', `// Explicit acceleration traverses identical authoritative resource steps and
// stops before any incident decision. Paused, failed and completed states stay put.
export function advanceUntilDecision(run){
 let next=run;
 for(let i=0;i<120&&next.operations&&!next.operations.finished&&!next.operations.paused&&!next.operations.pendingIncident;i++)next=advanceMissionRun(next);
 return next;
}
export function designFingerprint(design)`]);
 edit('js/engine/operations.js',
  ['import {floodwatchSampling}',"import {createRelayTraffic,queuedRelayGb,stepRelay} from '../unity/relayTraffic.js';\nimport {floodwatchSampling}"],
  ['{science=true}={}', '{science=true,relayTraffic=false}={}'],
  ['    evidence:createEvidence', '    ...(relayTraffic&&relay?{relayTraffic:createRelayTraffic()}:{}),\n    evidence:createEvidence'],
  ['  const sample=observeInterval', '  const relayResult=stepRelay(state,env,powered,mode,startSec,OPERATION_STEP_SEC);\n  const sample=observeInterval'],
  ['state.storageCapacityGb-state.storageGb)', 'state.storageCapacityGb-state.storageGb-queuedRelayGb(state))'],
  ['state.serviceMinutes+=minutes*scienceFraction*state.efficiency*(state.linkedRelay?(env.contactFraction??Number(env.contact)):1);','state.serviceMinutes+=state.relayTraffic?0:minutes*scienceFraction*state.efficiency*(state.linkedRelay?(env.contactFraction??Number(env.contact)):1);'],
  ['sent=Math.min(state.storageGb,(h.instantDownlinkGbDay??h.downlinkGbDay/Math.max(0.05,state.profile.contact))/1440*minutes*(env.contactFraction??1));','sent=Math.min(state.storageGb,Math.max(0,(h.instantDownlinkGbDay??h.downlinkGbDay/Math.max(0.05,state.profile.contact))/1440*minutes*(env.contactFraction??1)-relayResult.sentGb));'],
  ['  state.environment={...env};','  if(state.relayTraffic)state.serviceMinutes=state.relayTraffic.receivedSeconds/60;\n  state.environment={...env};'],
  ['const coverage=clamp(', 'const coverage=state.relayTraffic?100*state.relayTraffic.receivedSeconds/Math.max(1,state.relayTraffic.offeredSeconds):clamp(']);
 edit('js/ui/missionControl.js',
  ['reduceRunCommand,advanceMissionRun,migrateMissionRun','reduceRunCommand,advanceMissionRun,advanceUntilDecision,migrateMissionRun'],
  ['import {missionGuide',"import {initializeOperations,synchronizeLifecycle} from '../unity/missionLifecycle.js';\nimport {relayPolicy} from '../unity/relayTraffic.js';\nimport {missionGuide"],
  ['{science:!training&&session.scoringVersion===SCIENCE_VERSION}', '{science:!training&&session.scoringVersion===SCIENCE_VERSION,relayTraffic:!training&&!!session.lifecycle}'],
  ['  session.operations=state;', '  if(!saved)initializeOperations(session,state);\n  session.operations=state;'],
  ['<div id="ops-objectives"></div>', '<div id="ops-objectives"></div>${state.relayTraffic?\'<label>Traffic policy <select id="relay-policy"><option value="urgent">Send urgent first</option><option value="batch">Batch every sixth interval</option></select></label><p id="relay-status"></p>\':\'\'}'],
  ['<div id="ops-objectives"></div>', '<div id="ops-objectives"></div>${state.evidence?.sourceEvidenceModel?\'<label>Source priorities <select id="source-policy"><option value="broad">Broad context · all valid cells</option><option value="priority">Prioritize flood classes / cold lunar / fire-confidence half</option></select></label><p>Priority cut and 10-minute useful-integration cap per source location are authored. Cold is not ice; confidence is not probability.</p>\':\'\'}'],
  ["    const objectives=operationObjectives(state);", "    const objectives=operationObjectives(state);\n    synchronizeLifecycle(session);\n    if(state.relayTraffic){const q=state.relayTraffic;find('relay-status').textContent='Source link '+Math.round(q.sourceVisibleFraction*100)+'% · Earth link '+Math.round(q.earthVisibleFraction*100)+'% · source queue '+q.source.length+' · onboard '+q.onboard.length+' · received '+q.received.length+' · expired '+q.expired.length;find('relay-policy').value=q.policy;find('relay-policy').onchange=e=>{relayPolicy(state,e.target.value);session.relayPolicyCommands??=[];session.relayPolicyCommands.push({tick:state.tick,policy:e.target.value});save();};}"],
  ["    synchronizeLifecycle(session);", "    synchronizeLifecycle(session);\n    if(state.evidence?.sourceEvidenceModel){find('source-policy').value=state.evidence.sourcePolicy;find('source-policy').onchange=e=>{state.evidence.sourcePolicy=e.target.value;session.sourcePolicyCommands??=[];session.sourcePolicyCommands.push({tick:state.tick,policy:e.target.value});save();};}"],
  ["find('mission-clock').textContent=", "find('mission-clock').title='Mission elapsed includes ascent. Phase elapsed '+(state.tick*4.5).toFixed(1)+' min';\n    find('mission-clock').textContent="],
  ['<span id="real-clock"></span>', '<span id="real-clock"></span><span id="phase-clock"></span>'],
  ['<button class="orbital-button" id="finish-ops">','<button class="orbital-button" id="skip-ops" title="Advance the same resource simulation until the next incident or window end. Failure is preserved.">Skip to next decision</button><button class="orbital-button" id="finish-ops">'],
  ["    find('finish-ops').hidden=training||state.finished;", "    find('skip-ops').hidden=training||state.finished;find('skip-ops').disabled=state.paused||!!state.pendingIncident;\n    find('finish-ops').hidden=training||state.finished;"],
  ["  find('finish-ops').onclick=", "  find('skip-ops').onclick=()=>{Object.assign(session,advanceUntilDecision(session));state=session.operations;accumulator=0;save();render();};\n  find('finish-ops').onclick="],
  ["    const objectives=operationObjectives(state);", "    find('phase-clock').textContent=' · Phase elapsed '+(state.tick*4.5).toFixed(1)+' min';\n    const objectives=operationObjectives(state);"],
  ['const missionMinutes=mins+Math.floor((state.orbit?.epochS??0)/60);', 'const missionMinutes=mins+Math.floor((session.lifecycle?.launch?.elapsedSec??state.orbit?.epochS??0)/60);']);
 edit('js/transfer/planning.js',
  ['import {BODIES',"import {datedTrajectory,NAV_VERSION,dateSeconds} from '../unity/navigation.js';\nimport {BODIES"],
  [' return plan;\n}\n\nexport function defaultPlan', " if(plan.navigationModel!==undefined){if(plan.navigationModel!==NAV_VERSION)throw Error('Unsupported navigation model');dateSeconds(plan.launchDateTDB);}\n return plan;\n}\n\nexport function defaultPlan"],
  [' const target=TRANSFER_TARGETS[mission.destination];', " if(plan.navigationModel===NAV_VERSION)return datedTrajectory(mission,design,plan,assumptions.parking);\n const target=TRANSFER_TARGETS[mission.destination];"],
  [' const {r1,r2,a}=trajectory;', ' if(trajectory.navigationVersion===NAV_VERSION)return navigationPosition(trajectory,fraction).slice(0,2);\n const {r1,r2,a}=trajectory;'],
  ["import {datedTrajectory,NAV_VERSION,dateSeconds}","import {datedTrajectory,NAV_VERSION,dateSeconds,navigationPosition}" ]);
 edit('js/transfer/cruise.js',
  ['import {createEvidence',"import {physicalCommand,stepPhysical,afterPhysicalStep} from '../unity/physicalCruise.js';\nimport {createEvidence"],
  [' const event={command,', ' const event={command,'],
  [" if(command==='depart'&&state.pending==='departure'){", " const handled=physicalCommand(state,command);\n if(handled!==null){if(handled&&state.evidence)state.experimentCommands.push(event);return handled;}\n if(command==='depart'&&state.pending==='departure'){"],
  [' const {hardware:h,trajectory:t}=state;\n if(state.phase', ' const {hardware:h,trajectory:t}=state;\n stepPhysical(state);\n if(state.phase'],
  [' return state;\n}\n\nexport function cruiseSummary', ' afterPhysicalStep(state);\n return state;\n}\n\nexport function cruiseSummary']);
 edit('js/ui/flightPlan.js',
  ['import {escapeHtml',"import {NAV_VERSION} from '../unity/navigation.js';\nimport {escapeHtml"],
  ['<label>Departure opportunity<select', '${[\'moon\',\'mars\'].includes(mission.destination)?\'<label><input id="plan-physical" type="checkbox"> Use dated circular-body / Lambert route (requires actual upper-stage reserve)</label><label>Launch calendar date / TDB <input id="plan-date" type="date" min="2026-11-01" max="2027-12-31" value="2026-11-11"></label><p>Moon dates use authored phase geometry. Earth/Mars longitudes start from a pinned Horizons reference and follow circular motion; no operational ephemeris accuracy. Legacy route remains explicitly simplified.</p>\':\'\'}<label>Departure opportunity<select'],
  [" if(mission.transfer){\n  const reference=", " if(mission.transfer){\n  if(find('physical')){find('physical').checked=plan.navigationModel===NAV_VERSION;find('date').value=plan.launchDateTDB??'2026-11-11';find('physical').onchange=()=>{if(find('physical').checked){plan.navigationModel=NAV_VERSION;plan.launchDateTDB=find('date').value;}else{delete plan.navigationModel;delete plan.launchDateTDB;}update();};find('date').onchange=()=>{if(plan.navigationModel){plan.launchDateTDB=find('date').value;update();}};}\n  const reference="]);
 edit('js/ui/cruise.js',
  ["import {OBSERVE_PLANS}","import {predictedCorrection} from '../unity/physicalCruise.js';\nimport {bodyState} from '../unity/navigation.js';\nimport {OBSERVE_PLANS}"],
  ['<div class="cruise-buttons"><button class="btn btn-primary" data-cruise-command="depart">', '<output id="cruise-navigation"></output><div class="cruise-buttons">${state.physical?\'<button class="btn" data-cruise-command="navigate">Track again (one interval)</button><button class="btn" data-cruise-command="wait-nav">Correct later (12 intervals)</button><button class="btn" data-cruise-command="abandon">Abandon encounter</button><button class="btn" data-cruise-command="flyby">Accept flyby; give up orbit</button>\':\'\'}<button class="btn btn-primary" data-cruise-command="depart">'],
  ['  const position=transferPosition(t,tick/120),[x,y]=map.xy(position);','  const position=state.physical?state.physical.craft.r:transferPosition(t,tick/120),[x,y]=map.xy(position);'],
  ['   const [tx,ty]=map.xy([t.r2*Math.cos(angle),t.r2*Math.sin(angle)]);','   const [tx,ty]=map.xy(state.physical?bodyState(t.lunar?\'moon\':\'mars\',t.epochTdbSec+state.elapsedSec).r:[t.r2*Math.cos(angle),t.r2*Math.sin(angle)]);'],
  ['[...map.coords.slice(0,Math.floor(tick)+1),[x,y]]', '(state.physical?state.physical.path.map(map.xy):[...map.coords.slice(0,Math.floor(tick)+1),[x,y]])'],
  ["  find('real').textContent=Math.floor(realMs/1000)+' s';", "  find('clock').title='Phase elapsed '+((state.elapsedSec-(state.physical?.phaseStartSec??0))/3600).toFixed(2)+' h · mission includes '+((session.lifecycle?.launch?.elapsedSec??0)/60).toFixed(1)+' min ascent';\n  find('clock').textContent=((state.elapsedSec+(session.lifecycle?.launch?.elapsedSec??0))/86400).toFixed(3)+' d mission · '+((state.elapsedSec-(state.physical?.phaseStartSec??0))/3600).toFixed(2)+' h phase';\n  if(state.physical&&state.pending==='correction'){try{const n=predictedCorrection(state);find('navigation').textContent='Predicted miss '+(n.errorM/1000).toFixed(1)+' km ± '+(n.uncertaintyM/1000).toFixed(1)+' km knowledge bound; correction '+n.dv.toFixed(2)+' m/s / '+n.fuelKg.toFixed(3)+' kg, available '+state.trimKg.toFixed(3)+' kg. Bounds are authored, not probabilities.';}catch(e){find('navigation').textContent=e.message;}}\n  find('real').textContent=Math.floor(realMs/1000)+' s';"],
  ["correction:['correct','coast'],encounter:['acquire']", "correction:state.physical?['correct','coast','navigate','wait-nav','abandon']:['correct','coast'],encounter:state.physical?['acquire','flyby']:['acquire']"],
  ["   b.disabled=state.paused;", "   b.disabled=state.paused||id==='navigate'&&state.physical?.observations>=3;"],
  ["  if(cruiseCommand(state,b.dataset.cruiseCommand)){carry=0;save();render();}", "  const accepted=cruiseCommand(state,b.dataset.cruiseCommand);carry=0;save();render();if(!accepted)find('brief').textContent='Command rejected: insufficient reserve or unavailable action. Inspect the event log; a flyby may remain possible.';"]);
}
