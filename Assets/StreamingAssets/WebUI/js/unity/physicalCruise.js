import {datedTrajectory,NAV_VERSION,bodyState,lambert,propagateState,norm,sub,add,mul} from './navigation.js';
import {fuelForDv} from '../transfer/planning.js';
import {ARRIVAL_KITS} from '../transfer/catalogue.js';
const G0=9.80665;
export function attachPhysicalCruise(state,run){
 if(run.design.flightPlan?.navigationModel!==NAV_VERSION)return state;
 const launch=run.lifecycle?.launch;
 if(!launch)throw Error('Dated flight requires achieved launch checkpoint; no ideal-orbit fallback');
 const t=datedTrajectory(run.mission,run.design,run.design.flightPlan,launch);
 state.trajectory=t;
 state.batteryWh=Math.min(state.batteryWh,launch.batteryWh);
 if(state.evidence)state.evidence.minimumWh=Math.min(state.evidence.minimumWh,state.batteryWh);
 state.physical={version:NAV_VERSION,frame:'J2000 ecliptic',center:t.center,craft:structuredClone(t.initial),
  path:[structuredClone(t.initial.r)],phaseStartSec:0,launch:structuredClone(launch),upperKg:launch.upperPropellantKg,upperIgnitions:launch.upperIgnitions,
  uncertaintyM:t.lunar?60000:4000000,observations:0,departed:false,arrivalKind:null,burns:[],assumptions:structuredClone(t.provenance)};
 state.log.push({tick:0,elapsedSec:0,text:'Dated circular-body / Lambert route. Actual insertion, upper-stage reserve and launch battery retained. No silent simplified fallback.'});
 return state;
}
const log=(s,text)=>s.log.push({tick:s.tick,elapsedSec:s.elapsedSec,text});
const fail=(s,text)=>{s.phase='failed';s.pending=null;s.finished=true;log(s,text);};
export function predictedCorrection(s){
 const p=s.physical,t=s.trajectory,remaining=t.travelSec-s.elapsedSec;
 const coast=propagateState(p.craft,remaining,t.centralMu,t.lunar?60:3600);
 const errorM=norm(sub(coast.r,t.targetState.r));
 const solution=lambert(p.craft.r,t.targetState.r,remaining,t.centralMu);
 const dv=norm(sub(solution.v1,p.craft.v));
 return {errorM,uncertaintyM:p.uncertaintyM,dv,fuelKg:fuelForDv(dv,s.hardware.stackKg-(s.hardware.trimFuelKg-s.trimKg)),solution};
}
// Returns null for legacy command handling, true/false for a physical command.
export function physicalCommand(s,command){
 const p=s.physical,t=s.trajectory;if(!p||s.finished||s.paused)return null;
 if(command==='depart'&&s.pending==='departure'){
  const fuel=fuelForDv(t.departureDv,p.launch.massKg,p.launch.upperIsp);
  if(p.upperIgnitions>=p.launch.upperMaxIgnitions||fuel>p.upperKg+1e-8){fail(s,'Departure infeasible from achieved insertion: insufficient remaining upper-stage fuel or ignition. No resources granted.');return true;}
  p.upperKg-=fuel;p.upperIgnitions++;p.departed=true;
  p.burns.push({kind:'departure',deltaV:t.departureDv,fuelKg:fuel,massBeforeKg:p.launch.massKg,massAfterKg:p.launch.massKg-fuel,upperRemainingKg:p.upperKg});
  // Reproducible execution error, separate from knowledge uncertainty. Navigation
  // observations never alter this true state; correction must spend propellant.
  p.craft.v=add(p.craft.v,[t.lunar?.12:.025,t.lunar?-.08:.015,0]);
  s.pending=null;s.phase='cruise';p.phaseStartSec=s.elapsedSec;
  log(s,'Departure consumed '+fuel.toFixed(2)+' kg; upper stage separated with '+p.upperKg.toFixed(2)+' kg unused propellant. Impulsive burn; burn duration omitted.');return true;
 }
 if(['navigate','wait-nav','correct','coast','abandon'].includes(command)&&s.pending==='correction'){
  if(command==='abandon'){fail(s,'Director abandoned the encounter; remaining resources preserved.');return true;}
  if(command==='navigate'){
   if(p.observations>=3)return false;
   // One existing resource step is genuinely flown while tracking takes place.
   p.observations++;p.uncertaintyM*=.5;s.pending=null;p.observeUntil=s.tick+1;
   log(s,'Navigation observation requested. One cruise interval passes; uncertainty halves under an authored independent tracking-error model. True trajectory unchanged.');return true;
  }
  if(command==='wait-nav'){
   if(s.tick>=90)return false;
   s.pending=null;p.observeUntil=Math.min(90,s.tick+12);log(s,'Correction deferred by 12 simulation intervals; less remaining time increases correction demand.');return true;
  }
  if(command==='correct'){
   const estimate=predictedCorrection(s);
   if(estimate.fuelKg>s.trimKg+1e-9)return false;
   s.trimKg-=estimate.fuelKg;p.craft.v=estimate.solution.v1;s.corrected=true;
   p.burns.push({kind:'correction',deltaV:estimate.dv,fuelKg:estimate.fuelKg});
   log(s,'Correction used '+estimate.fuelKg.toFixed(3)+' kg; predicted miss before burn '+(estimate.errorM/1000).toFixed(1)+' km.');
  }else log(s,'Uncorrected coast selected. Actual encounter state will determine access.');
  s.pending=null;delete p.observeUntil;return true;
 }
 if((command==='acquire'||command==='flyby')&&s.pending==='encounter'){
  const target=bodyState(s.trajectory.lunar?'moon':'mars',t.epochTdbSec+s.elapsedSec);
  const error=norm(sub(p.craft.r,target.r));
  const corridor=t.lunar?150000:1500000;
  if(error>corridor){fail(s,'Encounter missed: '+(error/1000).toFixed(1)+' km centre-target error exceeds the authored '+corridor/1000+' km patch corridor.');return true;}
  const speed=norm(sub(p.craft.v,target.v)),r=t.periapsis;
  let dv=0,arrival='flyby';
  if(command!=='flyby'&&s.arrivalType==='capture'){dv=Math.sqrt(speed*speed+2*t.target.mu/r)-Math.sqrt(t.target.mu/r);arrival='orbit';}
  if(command!=='flyby'&&s.arrivalType==='rendezvous'){dv=speed;arrival='rendezvous';}
  const kit=ARRIVAL_KITS[s.plan.arrivalKit],wet=s.hardware.stackKg-(s.hardware.trimFuelKg-s.trimKg);
  const fuel=dv?fuelForDv(dv,wet,kit.isp??1):0;
  if(fuel>s.brakingKg+1e-9){p.captureFailed=true;log(s,'Capture reserve insufficient. Choose a flyby to preserve a shorter science opportunity.');return false;}
  s.brakingKg-=fuel;p.arrivalKind=arrival;p.arrivalSpeedMps=speed;p.encounterErrorM=error;
  p.burns.push({kind:arrival,deltaV:dv,fuelKg:fuel});
  if(arrival==='orbit')p.capturedOrbit={body:t.lunar?'moon':'mars',radiusM:r,eccentricity:0,speedMps:Math.sqrt(t.target.mu/r),specificEnergy:-t.target.mu/(2*r)};
  if(arrival==='rendezvous')p.relativeSpeedMps=0;
  s.arrived=true;s.corrected=true;s.pending='science';s.phase='encounter';p.phaseStartSec=s.elapsedSec;
  log(s,arrival==='orbit'?'Negative-energy circular capture established.':arrival==='rendezvous'?'Relative velocity matched.':'Flyby accepted; no bound orbit.');return true;
 }
 return null;
}
export function stepPhysical(s){
 const p=s.physical,t=s.trajectory;
 if(!p||s.phase!=='cruise'||s.paused||s.finished||s.pending)return;
 p.craft=propagateState(p.craft,t.travelSec/120,t.centralMu,t.lunar?30:1800);
 if(p.path.length<121)p.path.push([...p.craft.r]);
}
export function afterPhysicalStep(s){
 const p=s.physical;if(!p)return;
 if(s.phase==='cruise'&&s.tick===p.observeUntil){s.pending='correction';delete p.observeUntil;}
 if(s.tick===120&&s.phase==='failed'&&!s.corrected){s.phase='cruise';s.finished=false;s.pending='encounter';log(s,'Uncorrected coast reached the encounter test; acquisition depends on true miss distance.');}
}
export function validatePhysical(s){
 const p=s?.physical;if(!p)return;
 if(p.version!==NAV_VERSION||!['earth','sun'].includes(p.center)||!p.craft?.r?.every(Number.isFinite)||!p.craft?.v?.every(Number.isFinite)||p.craft.r.length!==3||p.craft.v.length!==3||p.upperKg<0||!Number.isFinite(p.upperKg)||p.upperIgnitions>p.launch.upperMaxIgnitions)throw Error('Invalid physical cruise checkpoint');
}
