import {datedTrajectory,NAV_VERSION,dateSeconds,navigationPosition} from '../unity/navigation.js';
import {BODIES,presetOrbit} from '../engine/orbitalGeometry.js';
import {TRANSFER_TARGETS,CRUISE_MODULES,ARRIVAL_KITS,WINDOW_OFFSETS} from './catalogue.js';

export const DAY_SEC=86400;
export const AU_M=149597870700;
const SUN_MU=1.32712440018e20,G0=9.80665,LIGHT_SPEED=299792458;
export const PLAN_VERSION=1;

export function validatePlan(plan){
 if(plan?.version!==PLAN_VERSION||typeof plan.id!=='string'||!/^[a-z0-9-]{1,80}$/i.test(plan.id)||typeof plan.missionId!=='string'||typeof plan.orbitId!=='string'||
   !Object.hasOwn(WINDOW_OFFSETS,plan.window)||!Object.hasOwn(CRUISE_MODULES,plan.powerModule)||!Object.hasOwn(ARRIVAL_KITS,plan.arrivalKit))throw Error('Invalid flight plan');
 if(plan.navigationModel!==undefined){if(plan.navigationModel!==NAV_VERSION)throw Error('Unsupported navigation model');dateSeconds(plan.launchDateTDB);}
 return plan;
}

export function defaultPlan(mission,orbitId='leo'){
 return {version:PLAN_VERSION,id:globalThis.crypto.randomUUID(),missionId:mission.id,orbitId,window:'nominal',powerModule:'solar',arrivalKit:'none'};
}

export function recommendedPlan(mission,orbitId,completed){
 const plan=defaultPlan(mission,orbitId);
 if(mission.transfer){
  if(['capture','rendezvous'].includes(mission.transfer.type))plan.arrivalKit=mission.transfer.type;
  if(['ceres','jupiter','europa','saturn','uranus','neptune'].includes(mission.destination)&&completed['mars-orbiter'])plan.powerModule='isotope';
  if(['frontier','precursor'].includes(mission.destination)&&completed['neptune-scout'])plan.powerModule='frontier';
  if(mission.id==='jupiter-orbiter')plan.arrivalKit='captureHeavy';
  if(mission.destination==='proxima'&&completed['interstellar-precursor'])plan.powerModule='beamed';
 }
 return plan;
}

export function transferTrajectory(mission,design,plan,assumptions={}){
 if(plan.navigationModel===NAV_VERSION)return datedTrajectory(mission,design,plan,assumptions.parking);
 const target=TRANSFER_TARGETS[mission.destination];
 const parking=design.orbitElements||presetOrbit(design.orbitId);
 if(!target||!parking||parking.body!=='earth')throw Error('Transfer requires an Earth parking orbit.');
 const lunar=mission.destination==='moon',centralMu=lunar?BODIES.earth.mu:SUN_MU;
 if(target.distanceLy){
  const speedFraction=assumptions.speedFraction??target.speedFraction;
  const distanceM=target.distanceLy*LIGHT_SPEED*365.25*DAY_SEC;
  return {target:{...target,au:distanceM/AU_M},lunar:false,speculative:true,r1:AU_M,r2:distanceM,centralMu,a:AU_M,
   travelSec:distanceM/(speedFraction*LIGHT_SPEED),departureDv:0,arrivalDv:0,arrivalRelative:speedFraction*LIGHT_SPEED,
   distanceM,lightMinutes:distanceM/LIGHT_SPEED/60,correctionDv:target.correction,synodicDays:365.25,
   departureDay:target.windowDay+WINDOW_OFFSETS[plan.window],phaseDeg:0,conditions:target.conditions,downlinkStepHours:2880};
 }
 const r1=lunar?parking.semiMajorAxisM:AU_M,r2=lunar?target.distanceM:target.au*AU_M;
 const parkingV=Math.sqrt(BODIES.earth.mu/parking.semiMajorAxisM);
 if(target.escapeSpeed){
  const a=centralMu/target.escapeSpeed**2,e=1+r1/a;
  const endH=Math.acosh((r2/a+1)/e),timeScale=Math.sqrt(a**3/centralMu);
  const travelSec=(e*Math.sinh(endH)-endH)*timeScale;
  const earthRelative=Math.sqrt(target.escapeSpeed**2+2*centralMu/r1)-Math.sqrt(centralMu/r1);
  const offset=WINDOW_OFFSETS[plan.window],departureDv=Math.hypot(Math.SQRT2*parkingV,earthRelative)-parkingV+Math.abs(offset)*19;
  const distanceM=r2+AU_M;
  return {target,lunar:false,r1,r2,centralMu,a,escape:{e,endH},travelSec,departureDv,arrivalDv:0,arrivalRelative:target.escapeSpeed,
   distanceM,lightMinutes:distanceM/LIGHT_SPEED/60,correctionDv:target.correction+Math.abs(offset)*2,synodicDays:365.256,
   departureDay:target.windowDay+offset,phaseDeg:0,conditions:target.conditions};
 }
 const a=(r1+r2)/2,travelSec=Math.PI*Math.sqrt(a**3/centralMu);
 const transferSpeed=r=>Math.sqrt(centralMu*(2/r-1/a));
 const circularSpeed=r=>Math.sqrt(centralMu/r);
 const vInfinity=Math.abs(transferSpeed(r1)-circularSpeed(r1));
 const departureDv=(lunar?vInfinity:Math.sqrt(2*parkingV**2+vInfinity**2)-parkingV)+Math.abs(WINDOW_OFFSETS[plan.window])*(lunar?8:19);
 const targetSpeed=target.semimajorAu?Math.sqrt(centralMu*(2/r2-1/(target.semimajorAu*AU_M))):circularSpeed(r2);
 const arrivalRelative=Math.abs(transferSpeed(r2)-targetSpeed);
 const periapsis=target.periapsisM??target.radiusM+(lunar?100000:300000);
 const captureAxis=(periapsis+(target.apoapsisM??periapsis))/2;
 const arrivalDv=mission.transfer.type==='capture'?Math.sqrt(arrivalRelative**2+2*target.mu/periapsis)-Math.sqrt(target.mu*(2/periapsis-1/captureAxis)):mission.transfer.type==='rendezvous'?arrivalRelative:0;
 const outerPeriod=2*Math.PI*Math.sqrt((target.semimajorAu?target.semimajorAu*AU_M:r2)**3/centralMu);
 const synodicDays=lunar?1/(1/27.321661-1/365.256):1/Math.abs(1/365.256-1/(outerPeriod/DAY_SEC));
 const distanceM=lunar?r2:(1+target.au)*AU_M;
 const correctionDv=target.correction+Math.abs(WINDOW_OFFSETS[plan.window])*2;
 const phaseDeg=((180-(travelSec/outerPeriod*360)%360+540)%360)-180;
 return {target,lunar,r1,r2,centralMu,a,travelSec,departureDv,arrivalDv,arrivalRelative,distanceM,lightMinutes:distanceM/LIGHT_SPEED/60,correctionDv,synodicDays,
  departureDay:target.windowDay+WINDOW_OFFSETS[plan.window],phaseDeg,conditions:target.conditions};
}

export function serviceMass(plan,spacecraftKg){
 const module=CRUISE_MODULES[plan.powerModule],kit=ARRIVAL_KITS[plan.arrivalKit];
 const captureFuelKg=(spacecraftKg+module.dryKg+kit.dryKg)*kit.propellantRatio;
 return {dryKg:module.dryKg+kit.dryKg,fuelKg:captureFuelKg,wetKg:module.dryKg+kit.dryKg+captureFuelKg,cost:module.cost+kit.cost};
}

export function cruiseHardware(plan,design,data,evaluation,trajectory,assumptions={}){
 const module=CRUISE_MODULES[plan.powerModule];
 const computer=data.parts.find(p=>p.id===design.computerId),radio=data.parts.find(p=>p.id===design.commsId);
 const instruments=design.instrumentIds.map(id=>data.instruments.find(p=>p.id===id)).filter(Boolean);
 const payloadW=instruments.reduce((sum,p)=>sum+(p.power||0),0);
 const spacecraftKg=evaluation.spacecraftMass??evaluation.launchMass;
 const service=serviceMass(plan,spacecraftKg);
 const hotelW=Math.max(12,(evaluation.averageLoad-payloadW-(radio?.power||0))*.42);
 const lifetimeYears=assumptions.lifetimeYears??module.lifetimeYears??(computer?.radTolerant?12:computer?.id==='computer_advanced'?6:2);
 const gain=radio?.id==='comms_ka_band'||radio?.id==='comms_dish_m'?1200:radio?.id==='comms_x_band'?170:1;
 const rateGbDay=trajectory.speculative&&module.opticalGbDayAt1Ly?(assumptions.receiverFactor??1)*module.opticalGbDayAt1Ly/trajectory.target.distanceLy**2:(radio?.baseDownlinkGbDay||0)*gain/(Math.max(.12,trajectory.distanceM/AU_M)**2)*.012;
 const dataGbDay=Math.min(computer?.maxDataGbDay||0,instruments.reduce((sum,p)=>sum+(p.dataPerDay||0),0));
 return {panelW:evaluation.panelPower,batteryWh:evaluation.batteryUsableWh,hotelW,payloadW,radioW:trajectory.speculative?26:radio?.transmitPowerW??radio?.power??0,
  recorderGb:computer?.recorderCapacityGb||0,dataGbDay,rateGbDay,lifetimeYears,isotopeW:module.powerW,spacecraftKg,
  stackKg:spacecraftKg+service.wetKg,trimFuelKg:evaluation.fuelKg,radHard:Boolean(computer?.radTolerant)};
}

export function generationAt(hardware,sunAu,elapsedSec){
 const years=elapsedSec/DAY_SEC/365.25;
 if(!Number.isFinite(sunAu)||sunAu<=0||!Number.isFinite(elapsedSec)||elapsedSec<0)throw Error('Invalid power interval');
 return hardware.panelW/sunAu**2*.85+hardware.isotopeW*2**(-years/45);
}

export function transferPosition(trajectory,fraction){
 if(trajectory.navigationVersion===NAV_VERSION)return navigationPosition(trajectory,fraction).slice(0,2);
 const {r1,r2,a}=trajectory;
 if(trajectory.speculative)return [r1+(r2-r1)*Math.max(0,Math.min(1,fraction)),0];
 if(trajectory.escape){
  const {e,endH}=trajectory.escape;
  const M=(e*Math.sinh(endH)-endH)*Math.max(0,Math.min(1,fraction));
  let H=Math.asinh(M/e);
  for(let i=0;i<18;i++)H-=(e*Math.sinh(H)-H-M)/(e*Math.cosh(H)-1);
  return [a*(e-Math.cosh(H)),a*Math.sqrt(e*e-1)*Math.sinh(H)];
 }
 const e=Math.abs(r2-r1)/(r2+r1),start=r2>r1?0:Math.PI;
 const M=start+Math.PI*Math.max(0,Math.min(1,fraction));
 let E=M;
 for(let i=0;i<12;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 return [a*(Math.cos(E)-e),a*Math.sqrt(1-e*e)*Math.sin(E)];
}

export function fuelForDv(deltaV,wetKg,isp=305){
 if(!Number.isFinite(deltaV)||deltaV<0||!Number.isFinite(wetKg)||wetKg<0||!Number.isFinite(isp)||isp<=0)throw Error('Invalid burn parameters');
 return wetKg*(-Math.expm1(-deltaV/(G0*isp)));
}

export function planChecks(plan,design,mission,data,evaluation,completed,{structured=false}={}){
 const issues=[];
 const issue=(code,message,limitLabel)=>structured?{code,message,...(limitLabel?{limitLabel}:{})}:message;
 const fail=(code,message,limitLabel)=>issues.push(issue(code,message,limitLabel));
 if(!mission.transfer)return issues;
 if(!plan)return [issue('transfer-plan','Confirm a transfer flight plan.')];
 try{
  validatePlan(plan);
  if(plan.missionId!==mission.id||plan.orbitId!==design.orbitId)return [issue('transfer-plan','The saved flight plan belongs to a different mission or orbit.')];
  if(design.orbitId!=='leo')return [issue('transfer-plan','Use the assigned low Earth departure orbit.')];
  if(design.orbitElements){
   const orbit=presetOrbit('leo');
   if(Math.abs(design.orbitElements.semiMajorAxisM-orbit.semiMajorAxisM)>1000||design.orbitElements.eccentricity>.001||Math.abs(design.orbitElements.inclinationRad-orbit.inclinationRad)>.005)fail('transfer-plan','Restore the published circular departure orbit.');
  }
  const t=transferTrajectory(mission,design,plan),h=cruiseHardware(plan,design,data,evaluation,t);
  const module=CRUISE_MODULES[plan.powerModule],kit=ARRIVAL_KITS[plan.arrivalKit];
  if(module.requires&&completed&&!completed[module.requires])fail('transfer-module',module.name+' unlocks after '+(data.missions.find(m=>m.id===module.requires)?.name||module.requires)+'.');
  if(t.speculative&&plan.powerModule!=='beamed')fail('transfer-module','The stellar flyby requires the speculative beamed-sail and optical system.');
  if(!t.speculative&&plan.powerModule==='beamed')fail('transfer-module','Reserve the experimental beamed-sail module for the stellar flyby.');
  if((t.travelSec+(t.downlinkStepHours||6)*3600*16)/DAY_SEC/365.25>h.lifetimeYears)fail('transfer-lifetime','The voyage exceeds the selected computer and autonomy lifetime.');
  if(t.target.jovian&&!h.radHard)fail('transfer-radiation','Jupiter operations require a radiation-hardened computer.');
  const farPower=generationAt(h,t.lunar?1:Math.max(1,t.target.au),t.travelSec);
  if(h.batteryWh+2*(farPower-h.hotelW-h.payloadW)<0)fail('transfer-science-power','Battery and generation cannot sustain the two-hour science window.');
  if(farPower<h.hotelW)fail('transfer-cruise-power','Cruise generation cannot support the bus at its farthest solar distance.');
  const interval=t.downlinkStepHours||6;
  const transmitDays=Math.max(0,Math.floor((16*interval-t.lightMinutes/60)/interval)*interval/24);
  if(h.rateGbDay*transmitDays+1e-9<mission.profile.delivered)fail('transfer-radio','The distance-limited radio cannot return enough data in the encounter window.');
  if(h.recorderGb<mission.profile.delivered||h.dataGbDay/12<mission.profile.delivered)fail('transfer-recorder','Recorder or payload output cannot satisfy the encounter target.');
  if(fuelForDv(t.correctionDv,h.stackKg)>h.trimFuelKg)fail('transfer-correction','Spacecraft propellant cannot cover the mid-course correction allowance.');
  const service=serviceMass(plan,h.spacecraftKg);
  const capability=kit.isp?G0*kit.isp*Math.log(h.stackKg/(h.stackKg-service.fuelKg)):0;
  if(capability<t.arrivalDv)fail('transfer-arrival','The selected braking stage cannot supply the required arrival delta-v.',Math.floor(capability).toLocaleString('en-US')+' m/s available');
  if(t.arrivalDv===0&&plan.arrivalKit!=='none')fail('transfer-flyby','Choose the flyby configuration for this encounter.');
  if(!design.rocketBlueprint&&!t.speculative){
   const preset=data.launchers.find(l=>l.id===design.launcherId);
   const available=preset?.departureCapability??({albatross:13100,roc:14400})[preset?.id]??0;
   const departureMass=preset?.capacity.tli||0;
   const required=9350+t.departureDv;
   const number=n=>Math.round(n).toLocaleString('en-US');
   if(required>available)fail('departure-energy',
     'Departure needs '+number(required)+' m/s. The selected launcher supplies '+number(available)+' m/s for this transfer.',
     available?number(available)+' m/s available':'Preset has no rated departure capability');
   if(departureMass<h.stackKg)fail('departure-mass',
     'The loaded stack is '+h.stackKg.toFixed(1)+' kg. This launcher is rated for '+number(departureMass)+' kg on departure.',
     number(departureMass)+' kg departure limit');
  }
 }catch(error){fail('transfer-plan',error.message);}
 return issues;
}
