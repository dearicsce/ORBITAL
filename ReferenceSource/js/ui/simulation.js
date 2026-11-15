import {escapeHtml} from './html.js';
import {createCruise} from '../transfer/cruise.js';
import {renderCruise} from './cruise.js';
import {resolveFlightDesign} from '../flightConfiguration.js';
import {launcherFor} from '../rocket/engineering.js';
import {playableLaunchChecks} from './launchChecks.js';
import {placementIssues} from '../workshop/blueprint.js';
import {getUnlocked} from '../engine.js';
import {uid} from '../workshop/blueprint.js';
import {getFlightSession,setFlightSession,clearFlightSession} from '../flightSession.js';
import { getState } from '../state.js';
import { showScreen } from './router.js';
import { createLaunchScene } from '../three/launchScene.js';
import {renderNumericalAscent} from './numericalAscent.js';
import {numericalTarget} from '../engine/ascent.js';
import { renderOperations } from './operations.js';
import {createMissionRun,designFingerprint} from '../contracts/missionRun.js';
let session=null;
export function getSimulationResults(){return session||getFlightSession();}
export function clearSimulationResults(){session=null;clearFlightSession();}
export function renderSimulation(container,data) {
 const selected=getState().currentDesign;
 const previous=getFlightSession();
 const fingerprint=designFingerprint(selected);
 const resume=previous?.design.missionId===selected.missionId&&(previous.phase!=='report'||(previous.selectionFingerprint||designFingerprint(previous.design))===fingerprint);
 const design=resume?previous.design:resolveFlightDesign(selected);
 const access=getUnlocked(data,Object.keys(getState().completedMissions));if(!resume&&design.assembly&&placementIssues(design.assembly,data,[...access.parts,...access.instruments]).length){showScreen('workshop',{mission:true});return;}if(!resume&&!playableLaunchChecks(design,data).every(c=>c.ok)){showScreen('advisory');return;}
 const mission=data.missions.find(m=>m.id===design.missionId);
 const seed=globalThis.crypto?.getRandomValues(new Uint32Array(1))[0]||0x6d2b79f5;
 session=resume?previous:createMissionRun(design,data,seed);
 session.selectionFingerprint??=fingerprint;
 if(!session.runId&&session!==previous){session.runId=uid();session.wasCompleted=Boolean(getState().completedMissions[design.missionId]);}
 setFlightSession(session);
 if(session.phase==='report'){showScreen('report');return;}
 const report=()=>{session.phase='report';setFlightSession(session);showScreen('report');};
 if(session.phase==='cruise'&&session.cruise)return renderCruise(container,session,report);
 if(session.phase==='operations'&&(session.operations||session.legacyOperations)){return renderOperations(container,data,session,()=>{session.phase='report';setFlightSession(session);showScreen('report');});}
 const target=(!session.launchCheckpoint||session.launchCheckpoint.version===1)?numericalTarget(design):null;
 if(target)return renderNumericalAscent(container,data,session,target,report);
 container.innerHTML=`<section class="screen scene-screen orbital-launch" data-screen="simulation"><div class="scene-canvas" id="launch-canvas"></div><header class="screen-top"><div><p class="orbital-eyebrow">ORBITAL / LAUNCH CONTROL</p><h1>${mission.name}</h1></div><div class="launch-actions"><button class="orbital-button" id="pause-launch">Pause</button><button class="orbital-button" id="skip">Skip launch</button></div></header><aside class="launch-instruments"><p class="orbital-eyebrow">${escapeHtml(launcherFor(design,data)?.name||'Launch vehicle')}</p><strong id="launch-clock">T−03</strong><dl><dt>PAYLOAD MASS</dt><dd>${session.evalResult.launchMass} kg</dd><dt>DESTINATION</dt><dd>${design.orbitId.toUpperCase()}</dd><dt>ANIMATION PROGRESS</dt><dd id="launch-altitude">0%</dd><dt>PITCH ABOVE HORIZON</dt><dd id="launch-pitch">90.0°</dd><dt>FLIGHT PHASE</dt><dd id="launch-stage">Prelaunch</dd></dl><p>Illustrative sequence · not flight telemetry. This destination uses a compressed animation; its timing does not represent an actual launch.</p></aside><div class="launch-caption glass" id="phase" aria-live="polite">Preparing launch pad</div><div class="launch-timeline"><span>IGNITION</span><progress max="1" value="0" id="launch-progress"></progress><span>MISSION HANDOFF</span></div></section>`;
 let cleanup=()=>{},lastSavedSecond=-1;
 const saveLaunch=()=>{if(session.phase==='launch'){session.launchCheckpoint=launch.getCheckpoint();setFlightSession(session);}};
 const launch=createLaunchScene(container.querySelector('#launch-canvas'),{launcherId:design.launcherId,design,data,launchResult:session.launchResult,checkpoint:session.launchCheckpoint,transferCoast:Boolean(mission.transfer),onTelemetry:t=>{if(Math.floor(t.elapsed)!==lastSavedSecond){lastSavedSecond=Math.floor(t.elapsed);saveLaunch();}const clock=container.querySelector('#launch-clock');if(clock){clock.textContent=t.elapsed<3?'T−'+String(Math.ceil(3-t.elapsed)).padStart(2,'0'):'Animation '+String(Math.floor(t.elapsed-3)).padStart(2,'0')+'s';if(t.altitudeKm!=null){container.querySelector('#launch-altitude').textContent=Math.round(t.progress*100)+'%';container.querySelector('#launch-pitch').textContent=t.pitchDeg.toFixed(1)+'°';}container.querySelector('#launch-stage').textContent=t.stage;container.querySelector('#launch-progress').value=t.progress;}},onPhase:text=>{const label=container.querySelector('#phase');if(label&&label.textContent!==text)label.textContent=text;},onDone:result=>{if(!result.success){session.phase='report';setFlightSession(session);launch.destroy();showScreen('report');return;}if(mission.transfer){launch.destroy();session.cruise=createCruise(session.design,session.mission,data,session.evalResult);session.phase='cruise';setFlightSession(session);cleanup=renderCruise(container,session,report);return;}const continuation=launch.getOrbitView();if(!continuation)launch.destroy();session.phase='operations';setFlightSession(session);cleanup=renderOperations(container,data,session,()=>{session.phase='report';setFlightSession(session);showScreen('report');},continuation);}});
 let paused=Boolean(session.launchCheckpoint?.paused);const pause=container.querySelector('#pause-launch');pause.textContent=paused?'Resume':'Pause';pause.onclick=()=>{paused=!paused;launch.togglePause();saveLaunch();pause.textContent=paused?'Resume':'Pause';};
 window.addEventListener('pagehide',saveLaunch);
 cleanup=()=>launch.destroy();container.querySelector('#skip').onclick=()=>launch.skip();return ()=>{window.removeEventListener('pagehide',saveLaunch);saveLaunch();cleanup();};
}
