// Keep launch fixes reproducible when the browser reference is repackaged.
export function adaptAscent(edit) {
 edit('js/contracts/missionRun.js',
  ["simulationVersion:SCIENCE_VERSION,scoringVersion:SCIENCE_VERSION","launchModelVersion:'ascent-2',simulationVersion:SCIENCE_VERSION,scoringVersion:SCIENCE_VERSION"],
  ["  if(run.operations){", "  if(run.keplerAttempt&&(run.design.missionId!=='dip'||!run.ascentInsertion||run.launchResult.success!==true||run.keplerAttempt.id!==run.runId||run.keplerAttempt.plan?.window!==run.design.windowId||!['pointing','capture','filter','aggregate','prepare','downlink','complete'].includes(run.keplerAttempt.stage)||!Number.isFinite(run.keplerAttempt.energy)||run.keplerAttempt.energy<0||['stored','queue','ground','excluded','ledger'].some(key=>!Array.isArray(run.keplerAttempt[key]))))throw Error('Invalid Kepler observation checkpoint');\n  if(run.operations){"],
  ["else if(run.phase==='operations'&&!run.legacyOperations)", "else if(run.phase==='operations'&&!run.legacyOperations&&!(run.design.missionId==='dip'&&run.ascentInsertion&&run.launchResult.success===true))"],
  ["  assertSerializable(run);", "  assertSerializable(run);\n  if(run.launchModelVersion!==undefined&&!['ascent-1','ascent-2'].includes(run.launchModelVersion))throw Error('Unsupported launch model version');"],
  ['  if(run.ascentInsertion){\n    const insertion=run.ascentInsertion;', '  for(const insertion of [run.ascentInsertion,run.parkingAscent].filter(Boolean)){'],
  ["insertion.orbit.body!=='earth'||!['leo','sso'].includes(run.design.orbitId)", "insertion.orbit.body!=='earth'||(insertion===run.ascentInsertion&&!['leo','sso'].includes(run.design.orbitId))"]);
 edit('js/ui/report.js',
  ['const insertion=sim?.ascentInsertion;', 'const insertion=sim?.ascentInsertion||sim?.parkingAscent;'],
  ['<h2>Ascent and deployment</h2>', '<h2>Ascent and deployment</h2>${sim?.parkingAscent?\'<p>Calculated Earth parking orbit. Subsequent delivery to the destination uses the simplified mission handoff.</p>\':\'\'}']);
 edit('js/engine/ascent.js',
  [" if(!['leo','sso'].includes(design.orbitId))return null;", " if(!['leo','sso'].includes(design.orbitId))return {...presetOrbit('leo'),inclinationRad:0,parkingOnly:true};"],
  ['speedMps:mix(a.speedMps,b.speedMps,t)};', 'speedMps:mix(a.speedMps,b.speedMps,t),airSpeedMps:mix(a.airSpeedMps,b.airSpeedMps,t)};']);
 edit('js/ui/simulation.js',
  [" const target=(!session.launchCheckpoint||session.launchCheckpoint.version===1)?numericalTarget(design):null;", " // Animated checkpoints do not contain a physical state. Restart ascent safely.\n if(session.launchCheckpoint&&session.launchCheckpoint.version!==1)delete session.launchCheckpoint;\n const target=numericalTarget(design);"]);
 edit('js/ui/numericalAscent.js',
  ["import {createCruise}", "import {SCIENCE_VERSION} from '../unity/scienceScenarios.js';\nimport {createCruise}"],
  ['>Advance flight</button>', '>Skip to calculated result</button>'],
  ['<p id="launch-rate">Real time · 1×</p>', '<p id="launch-rate">Real time · 1×</p><small>${target.parkingOnly?\'Earth parking orbit first · Destination transfer is simplified.\':\'Numerical ascent · Gravity, atmospheric drag, thrust and fuel consumption.\'}</small>'],
  ['run.cruise=createCruise(design,mission,data,run.evalResult);', 'run.cruise=createCruise(design,mission,data,run.evalResult,{science:run.scoringVersion===SCIENCE_VERSION});'],
  ['   const continuation=launch.getOrbitView?.();', `   if(target.parkingOnly){
    launch.destroy();
    run.parkingAscent=result.insertion;
    run.launchCheckpoint={version:1,timeS:result.insertion.insertionTimeS+12,paused:true,speed:1};
    setFlightSession(run);
    container.innerHTML='<section class="screen parking-handoff" data-screen="delivery"><main class="parking-card"><p class="orbital-eyebrow">ORBITAL / ASCENT COMPLETE</p><h1>Earth parking orbit reached</h1><p>The ascent was calculated from thrust, fuel consumption, gravity and atmospheric drag.</p><div class="parking-transfer"><h2>Next: destination delivery</h2><p>Delivery from this parking orbit to your mission destination is a simplified mission step. Its burns and travel time are not simulated.</p></div><button class="orbital-button primary" id="continue-delivery">Continue to destination operations ↗</button></main></section>';
    cleanup=()=>{};
    container.querySelector('#continue-delivery').onclick=()=>{
     delete run.launchCheckpoint;
     run.phase='operations';setFlightSession(run);
     cleanup=renderOperations(container,data,run,report);
    };
    return;
   }
   const continuation=launch.getOrbitView?.();`]);
 edit('js/three/numericalLaunch.js',
  [' let time=Math.min(checkpoint?.timeS??0,total)', ' let time=Math.max(0,Math.min(Number.isFinite(checkpoint?.timeS)?checkpoint.timeS:0,total))']);
}
