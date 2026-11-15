import {escapeHtml as escape} from './html.js';
import {resolveFlightDesign} from '../flightConfiguration.js';
import {getState,setDesign,saveProgress} from '../state.js';
import {getUnlocked,evaluateDesign,checkLaunchGate} from '../engine.js';
import {launcherFor,requiredLaunchDv,rocketEngineering} from '../rocket/engineering.js';
import {recommendedPlan,transferTrajectory,cruiseHardware,serviceMass,DAY_SEC,generationAt} from '../transfer/planning.js';
import {CRUISE_MODULES,ARRIVAL_KITS,WINDOW_OFFSETS} from '../transfer/catalogue.js';
import {planLibrary} from '../transfer/library.js';
import {showScreen} from './router.js';

const duration=seconds=>seconds>=365.25*DAY_SEC?(seconds/DAY_SEC/365.25).toFixed(2)+' years':(seconds/DAY_SEC).toFixed(1)+' days';

export function renderFlightPlan(container,data){
 const state=getState(),selected=resolveFlightDesign(state.currentDesign),mission=data.missions.find(m=>m.id===selected.missionId);
 const orbit=data.orbits.find(o=>o.id===selected.orbitId),launcher=launcherFor(selected,data);
 const plan=selected.flightPlan?structuredClone(selected.flightPlan):recommendedPlan(mission,selected.orbitId,state.completedMissions);
 const access=getUnlocked(data,Object.keys(state.completedMissions)),allowed=[...access.parts,...access.instruments];
 container.innerHTML=`<section class="screen content-screen planning-screen" data-screen="flightPlan"><header class="screen-top"><button class="btn" id="plan-back">← Departure orbit</button><div><p class="orbital-eyebrow">ORBITAL / FLIGHT DYNAMICS</p><h1>Flight plan</h1></div></header>
 <h2>${mission.name}</h2><p>${escape(launcher?.name||'Select a launcher')} ·  ${escape(orbit?.name||'Choose an orbit')}</p>${selected.spacecraftName?`<p>Spacecraft · ${escape(selected.spacecraftName)}</p>`:''}
 <div class="plan-layout"><section class="glass" id="plan-options"><h3>${mission.transfer?'Transfer configuration':'Orbital insertion'}</h3>
 ${mission.transfer?`<label>Departure opportunity<select id="plan-window">${Object.entries(WINDOW_OFFSETS).map(([id,day])=>`<option value="${id}">${id==='nominal'?'Nominal opportunity':id==='early'?'Early window · '+day+' days':'Late window · +'+day+' days'}</option>`).join('')}</select></label>
 <label>Cruise power and autonomy<select id="plan-power">${Object.entries(CRUISE_MODULES).map(([id,m])=>`<option value="${id}" ${m.requires&&!state.completedMissions[m.requires]?'disabled':''}>${m.name}${m.requires&&!state.completedMissions[m.requires]?' · Locked':''}</option>`).join('')}</select></label>
 <label>Arrival hardware<select id="plan-arrival">${Object.entries(ARRIVAL_KITS).map(([id,m])=>`<option value="${id}">${m.name}</option>`).join('')}</select></label>
 <details open><summary>Transfer approximation</summary><p>Planetary transfers use circular, coplanar Hohmann approximations. The comet intercept uses its perihelion speed. Solar-frontier probes follow hyperbolic escape arcs. The speculative stellar mission assumes external beaming to 5% light speed, constant-speed cruise, and a future optical receiver. The scenario epoch schedules the launch opportunity. Early and late departures add a guidance allowance. Planetary encounters use a local impulsive burn estimate. Communications use a conservative maximum Earth–target distance, not live ephemerides. Europa uses a guided Jovian encounter abstraction; its moon-relative targeting is not integrated. Cruise advances in 120 fixed steps. Arrival uses sampled power, recorder and radio intervals.</p><p>Reference window values are educational scenario dates. NASA’s Trajectories chapter and JPL Horizons explain mission design and measured ephemerides.</p><p id="plan-reference"></p><a href="https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/" target="_blank" rel="noopener">NASA trajectories</a> · <a href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noopener">JPL Horizons</a></details>`:'<p>Review the parking orbit, launcher and spacecraft before certifying this flight. The operations window samples power, eclipse and ground passes.</p>'}
 </section><section class="glass" id="plan-telemetry" aria-label="Transfer and engineering checks"></section></div>
 <p id="plan-status" role="status"></p><footer class="screen-actions"><button class="btn" id="plan-rocket">Change launcher</button><button class="btn" id="plan-workshop">Change spacecraft</button><button class="btn btn-primary" id="plan-confirm">Confirm flight plan →</button></footer></section>`;
 const find=id=>container.querySelector('#plan-'+id);
 function update(){
  const design={...selected,planId:plan.id,flightPlan:plan};
  const evaluation=evaluateDesign(design,data);
  const failed=checkLaunchGate(design,data,allowed,state.completedMissions).filter(check=>!check.ok);
  let rows=[['Loaded spacecraft and service stack',evaluation.launchMass.toFixed(1)+' kg'],['Estimated mission cost','$'+evaluation.totalCost.toFixed(1)+'M']];
  if(mission.transfer){
   const t=transferTrajectory(mission,design,plan),h=cruiseHardware(plan,design,data,evaluation,t);
   const service=serviceMass(plan,h.spacecraftKg);
   const demand=requiredLaunchDv(orbit?.id,orbit?.launcherClass)+t.departureDv;
   const performance=design.rocketBlueprint?rocketEngineering(design.rocketBlueprint,evaluation.launchMass,{requirement:demand}):null;
   rows=rows.concat([
    ['Departure opportunity','Scenario day '+t.departureDay+' · phase '+t.phaseDeg.toFixed(1)+'°'],
    ['Opportunity recurrence',t.speculative?'Beaming alignment · scenario schedule':t.synodicDays.toFixed(0)+' days'],
    ['Departure burn',t.speculative?'External beamed sail · 5% of light speed':Math.round(t.departureDv)+' m/s from parking orbit'],
    ['Stack delta-v demand',Math.round(demand)+' m/s'+(performance?' · '+Math.round(performance.deltaV)+' available':'')],
    ['Cruise duration',duration(t.travelSec)],['Mid-course allowance',t.correctionDv+' m/s'],
    ['Arrival',mission.tag+' · '+Math.round(t.arrivalDv)+' m/s braking'],
    ['Conditions',t.conditions],['Planning link distance',t.speculative?t.target.distanceLy.toFixed(3)+' light-years':(t.distanceM/1e9).toFixed(2)+' million km'],
    ['One-way signal time',t.speculative?duration(t.lightMinutes*60):t.lightMinutes.toFixed(2)+' min'],
    ['Downlink at planning distance',h.rateGbDay.toFixed(3)+' GB/day'],
    ['Farthest generation / cruise draw',generationAt(h,t.lunar?1:Math.max(1,t.target.au),t.travelSec).toFixed(1)+' / '+h.hotelW.toFixed(1)+' W'],
    ['Equipment lifetime',h.lifetimeYears+' years'],['Trim / arrival propellant',h.trimFuelKg.toFixed(1)+' / '+service.fuelKg.toFixed(1)+' kg']
   ]);
  }
  find('telemetry').innerHTML=`<h3>Engineering and trajectory</h3><dl>${rows.map(([name,value])=>`<dt>${name}</dt><dd>${escape(value)}</dd>`).join('')}</dl>${failed.length?`<h4>Open checks</h4><ul class="text-red">${failed.map(c=>`<li>${escape(c.message)}</li>`).join('')}</ul>`:'<p class="text-green">All checks passed.</p>'}`;
  find('confirm').disabled=mission.transfer&&failed.length>0;
  return failed.length===0;
 }
 if(mission.transfer){
  const reference=find('reference');
  fetch(new URL('../../data/content/horizons-atlas-reference.json',import.meta.url)).then(response=>{
   if(!response.ok)throw Error('Reference unavailable');
   return response.json();
  }).then(record=>{
   const [earth,mars]=record.vectors.map(vector=>Math.atan2(vector.positionKm[1],vector.positionKm[0]));
   const phase=((mars-earth)*180/Math.PI+360)%360;
   reference.textContent='Bundled JPL Horizons reference, '+record.epochTDB+' TDB. Mars is '+phase.toFixed(1)+'° ahead of Earth in ecliptic longitude in this sample.';
  }).catch(()=>{reference.textContent='Reference ephemeris unavailable. The authored flight plan remains available.';});
  for(const [element,key] of [['window','window'],['power','powerModule'],['arrival','arrivalKit']]){
   find(element).value=plan[key];find(element).onchange=e=>{plan[key]=e.target.value;update();};
  }
 }
 find('back').onclick=()=>showScreen('orbitSelect');
 find('rocket').onclick=()=>showScreen('rocketSelect');
 find('workshop').onclick=()=>showScreen('workshop',{mission:true});
 find('confirm').onclick=()=>{
  if(!update()&&mission.transfer)return;
  try{planLibrary().save(plan);setDesign({planId:plan.id});saveProgress();showScreen('advisory');}
  catch(error){find('status').textContent=error.message;}
 };
 update();
}
