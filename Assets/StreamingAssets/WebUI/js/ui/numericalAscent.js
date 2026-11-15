import {SCIENCE_VERSION} from '../unity/scienceScenarios.js';
import {initializeFromLaunch} from '../unity/missionLifecycle.js';
import {attachPhysicalCruise} from '../unity/physicalCruise.js';
import {missionGuide,bindMissionGuide} from '../unity/missionGuide.js';
import {createCruise} from '../transfer/cruise.js';
import {operatingLocation} from '../unity/missionRoute.js';
import {renderCruise} from './cruise.js';
import {formatAltitude,trajectoryPreview} from '../engine/trajectoryPreview.js';
import {createNumericalLaunch} from '../three/numericalLaunch.js';
import {launcherFor} from '../rocket/engineering.js';
import {setFlightSession} from '../flightSession.js';
import {renderOperations} from './operations.js';
import {renderKeplerOperations} from './keplerOperations.js';
import {mountPanel} from '../presentation/mountPanel.js';
import {escapeHtml} from './html.js';

export function renderNumericalAscent(container,data,run,target,report){
 const {design,mission}=run;
 container.innerHTML=`<section class="screen scene-screen orbital-launch numerical-launch" data-screen="simulation">
 <div class="scene-canvas" id="launch-canvas"></div>
 <header class="screen-top"><div><p class="orbital-eyebrow">ORBITAL / ASCENT CONTROL</p><h1>${escapeHtml(mission.name)}</h1></div>
 <div class="launch-actions" id="ascent-actions"></div></header>
 <aside class="launch-instruments"><p class="orbital-eyebrow">${escapeHtml(launcherFor(design,data)?.name||'Launch vehicle')}</p>
 <strong id="launch-clock">T−00:03</strong><p id="launch-rate">Real time · 1×</p><small>${target.parkingOnly?'Earth parking orbit first · Destination transfer is simplified.':'Numerical ascent · Gravity, atmospheric drag, thrust and fuel consumption.'}</small>
 <dl><dt>Altitude · mean Earth</dt><dd id="launch-altitude">—</dd><dt tabindex="0" title="Speed relative to the nonrotating Earth center, in metres per second. Orbit speed includes sideways motion.">Speed · Earth inertial</dt><dd id="launch-speed">—</dd><dt>Vertical speed</dt><dd id="launch-vertical">—</dd>
 <dt tabindex="0" title="Vehicle attitude above the local horizon. Velocity direction and camera direction can differ.">Pitch · above horizon</dt><dd id="launch-pitch">—</dd><dt>Attached mass</dt><dd id="launch-mass">—</dd><dt>Launcher propellant</dt><dd id="launch-fuel">—</dd>
 <dt>Throttle</dt><dd id="launch-throttle">—</dd><dt>Guidance</dt><dd id="launch-guidance">Pad</dd><dt>Active stage</dt><dd id="launch-stage">—</dd></dl>
 <output id="launch-orbit"></output>${missionGuide('launch',mission.id)}
 <label>Time rate <select id="launch-warp">${[1,4,16,64].map(rate=>`<option value="${rate}">${rate}×</option>`).join('')}</select></label>
 <label>Camera <select id="launch-camera"><option value="track">Tracking</option><option value="wide">Wide</option></select></label><button class="orbital-button subtle" id="reset-flight-camera">Reset view</button><small class="flight-camera-hint">Drag to orbit · Scroll to zoom</small></aside>
 <aside class="trajectory-panel"><button class="orbital-button" id="toggle-trajectory" aria-expanded="false">Orbit map</button><div id="trajectory-detail" hidden>
 <svg id="trajectory-map" viewBox="-150 -150 300 300" role="img" aria-label="Live unpowered trajectory in the orbital plane"><circle id="trajectory-earth" fill="#163c55" stroke="#5189a3"/><circle id="trajectory-target" fill="none" stroke="#8b9cad" stroke-dasharray="3 4"/><path id="trajectory-path" fill="none" stroke="#a4f3cf" stroke-width="2"/><circle id="trajectory-craft" r="4" fill="#ffffff"/></svg>
 <strong id="trajectory-status">On the launch pad</strong><p id="trajectory-apsides"></p><small>Green: coast if engines stop now. Dashed: target altitude. True distance scale; view follows the orbital plane. Prediction excludes drag and future burns.</small></div></aside>
 <div class="launch-caption glass" id="phase" aria-live="polite">Preparing launch pad</div>
 <div class="launch-timeline"><span>PAD</span><progress id="launch-progress" value="0" max="1" aria-label="Flight playback"></progress><span>FLIGHT RESULT</span></div></section>`;
 const find=id=>container.querySelector('#'+id);
 bindMissionGuide(container);
 const screen=container.querySelector('.numerical-launch'),instruments=container.querySelector('.launch-instruments'),header=container.querySelector('.screen-top');
 const layout=()=>{
  const canvas=find('launch-canvas');if(!canvas)return;
  if(screen.clientWidth<=660){
   const root=screen.getBoundingClientRect(),top=header.getBoundingClientRect().bottom-root.top+8;
   const height=Math.max(120,instruments.getBoundingClientRect().top-root.top-top-8);
   canvas.style.top=top+'px';canvas.style.height=height+'px';canvas.style.bottom='auto';
  }else{canvas.style.top='';canvas.style.height='';canvas.style.bottom='';}
 };
 const viewLayout=new ResizeObserver(layout);viewLayout.observe(screen);viewLayout.observe(instruments);viewLayout.observe(header);layout();
 let cleanup=()=>{},flightPanel=null,savedBucket=-1,mapBucket=-1;
 const save=()=>{if(run.phase==='launch'){run.launchCheckpoint=launch.getCheckpoint();setFlightSession(run);}};
 const launch=createNumericalLaunch(find('launch-canvas'),{
  design,data,target,payloadKg:run.evalResult.launchMass,checkpoint:run.launchCheckpoint,launchModelVersion:run.launchModelVersion??'ascent-1',
  onPhase:text=>{find('phase').textContent=text;},
  onTelemetry:t=>{
   const bucket=Math.floor(t.elapsed/5);
   if(bucket!==savedBucket){savedBucket=bucket;save();}
   const seconds=t.elapsed<3?Math.ceil(3-t.elapsed):Math.floor(t.elapsed-3);
   find('launch-clock').textContent=(t.elapsed<3?'T−':'T+')+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
   find('launch-altitude').textContent=formatAltitude(t.altitudeKm*1000);
   find('launch-speed').textContent=(t.speedMps??0).toFixed(0)+' m/s';
   const rate=launch.getCheckpoint();
   find('launch-rate').textContent=rate.paused?'Paused':rate.speed===1?'Real time · 1×':'Time accelerated · '+rate.speed+'×';
   find('launch-vertical').textContent=t.verticalMps.toFixed(0)+' m/s';
   find('launch-pitch').textContent=t.pitchDeg.toFixed(1)+'°';
   find('launch-mass').textContent=t.massKg.toFixed(0)+' kg';
   find('launch-fuel').textContent=t.fuel.toFixed(0)+' kg · '+t.fuelPercent+'%';
   find('launch-throttle').textContent=Math.round(100*t.throttle)+'%';
   find('launch-guidance').textContent=(t.guidancePhase??t.phase).replaceAll('-',' ');
   find('launch-stage').textContent=t.phase==='failed'?'Cutoff':t.phase==='inserted'?'Coast':t.attachedPartIds.includes('core')?(t.attachedPartIds.some(id=>id.startsWith('booster'))?'Core + boosters':'Core'):'Upper';
   if(!find('trajectory-detail').hidden&&Math.floor(t.elapsed*2)!==mapBucket){
    mapBucket=Math.floor(t.elapsed*2);
    const preview=trajectoryPreview(t.positionM,t.velocityMps),{elements,points,radiusM}=preview;
    const extent=Math.max(target.semiMajorAxisM,...points.map(p=>Math.hypot(...p)))*1.12;
    const scale=140/extent;
    find('trajectory-earth').setAttribute('r',radiusM*scale);
    find('trajectory-target').setAttribute('r',target.semiMajorAxisM*scale);
    find('trajectory-path').setAttribute('d',points.map(([x,y],i)=>(i?'L':'M')+(x*scale).toFixed(2)+','+(-y*scale).toFixed(2)).join(' '));
    find('trajectory-craft').setAttribute('cx',points[0][0]*scale);find('trajectory-craft').setAttribute('cy',-points[0][1]*scale);
    find('trajectory-status').textContent=t.elapsed<=3?'On the launch pad':preview.status;
    find('trajectory-apsides').textContent=t.elapsed<=3?'Awaiting liftoff':'Apoapsis '+(elements.apoapsisM===null?'escape':(elements.apoapsisM/1000).toFixed(1)+' km')+' · Periapsis '+(elements.periapsisM/1000).toFixed(1)+' km';
   }
   if(!t.orbit&&t.osculatingOrbit){const o=t.osculatingOrbit;find('launch-orbit').textContent='Coast prediction: '+(o.periapsisM<0?'Earth-intersecting · ':'')+'Ap '+(o.apoapsisM===null?'escape':(o.apoapsisM/1000).toFixed(0)+' km')+' / Pe '+(o.periapsisM/1000).toFixed(0)+' km';}
   if(t.orbit)find('launch-orbit').textContent=`${Math.round(t.orbit.periapsisM/1000)} × ${Math.round(t.orbit.apoapsisM/1000)} km · ${(t.orbit.inclinationRad*180/Math.PI).toFixed(1)}°`;
   container.querySelectorAll('[data-altitude]').forEach(tick=>tick.classList.toggle('passed',t.altitudeKm>=Number(tick.dataset.altitude)));
   find('launch-progress').value=t.progress;
  },
  onDone:result=>{
   flightPanel?.destroy();flightPanel=null;
   viewLayout.disconnect();
   const host=find('launch-canvas');if(host){host.style.top='';host.style.height='';host.style.bottom='';}
   run.launchResult=result.success?{success:true}:{success:false,reason:result.reason};
   delete run.launchCheckpoint;
   if(!result.success){launch.destroy();report();return;}
   initializeFromLaunch(run,result.insertion);
   if(mission.transfer){
    launch.destroy();run.ascentInsertion=result.insertion;
    run.cruise=attachPhysicalCruise(createCruise(design,mission,data,run.evalResult,{science:run.scoringVersion===SCIENCE_VERSION}),run);run.phase='cruise';setFlightSession(run);
    cleanup=renderCruise(container,run,report);return;
   }
   if(target.parkingOnly){
    launch.destroy();
    run.parkingAscent=result.insertion;
    run.launchCheckpoint={version:1,timeS:result.insertion.insertionTimeS+12,paused:true,speed:1};
    setFlightSession(run);
    const destination=operatingLocation(design.orbitId);
    container.innerHTML=`<section class="screen parking-handoff" data-screen="delivery"><main class="parking-card"><p class="orbital-eyebrow">ORBITAL / ASCENT COMPLETE</p><h1>Earth parking orbit reached</h1><div class="parking-transfer"><h2>Next: ${destination}</h2><p>A guided delivery step takes the spacecraft to its operating location. The mission runs from there.</p></div><button class="orbital-button primary" id="continue-delivery">Continue to ${destination} ↗</button></main></section>`;
    cleanup=()=>{};
    container.querySelector('#continue-delivery').onclick=()=>{
     delete run.launchCheckpoint;
     run.phase='operations';setFlightSession(run);
     cleanup=renderOperations(container,data,run,report);
    };
    return;
   }
   if (mission.id === 'dip') {
    launch.destroy();
    run.ascentInsertion=result.insertion;
    run.phase='operations';
    if (!setFlightSession(run)) {
     container.innerHTML='<section class="screen content-screen"><h1>Could not save the flight checkpoint</h1><p>Free up profile storage and reopen the attempt to continue from the last saved point.</p></section>';
     return;
    }
    cleanup=renderKeplerOperations(container,run,report)??(()=>{});
    return;
   }
   const continuation=launch.getOrbitView?.();
   if(!continuation)launch.destroy();
   run.ascentInsertion=result.insertion;
   run.phase='operations';
   run.camera??={mode:'inertial',north:false};
   cleanup=renderOperations(container,data,run,report,continuation);
  }
 });
 cleanup=()=>launch.destroy();
 find('toggle-trajectory').onclick=()=>{const detail=find('trajectory-detail');detail.hidden=!detail.hidden;find('toggle-trajectory').setAttribute('aria-expanded',String(!detail.hidden));mapBucket=-1;};
 let effects=false;
 const controls=()=>({actions:[
  {id:'pause-launch',label:launch.getCheckpoint().paused?'Resume':'Pause'},
  {id:'launch-audio',label:effects?'Effects enabled':'Enable effects',disabled:effects},
  {id:'skip',label:'Skip to calculated result',primary:true},
 ]});
 flightPanel=mountPanel(find('ascent-actions'),'flight',controls(),{
  'pause-launch':()=>{launch.togglePause();flightPanel.update(controls());save();},
  'launch-audio':()=>{launch.unlockAudio();effects=true;flightPanel.update(controls());},
  skip:()=>{launch.skip();},
 });
 find('launch-warp').value=launch.getCheckpoint().speed;
 find('launch-warp').onchange=event=>{launch.setSpeed(Number(event.target.value));save();};
 find('launch-camera').value=launch.getCheckpoint().camera??'track';
 find('reset-flight-camera').onclick=()=>launch.resetCamera();
 find('launch-camera').onchange=event=>{launch.setCamera(event.target.value);save();};
 window.addEventListener('pagehide',save);
 return ()=>{viewLayout.disconnect();window.removeEventListener('pagehide',save);flightPanel?.destroy();save();cleanup();};
}
