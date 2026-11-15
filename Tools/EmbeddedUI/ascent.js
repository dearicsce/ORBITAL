import {BODIES, RAD, TAU, presetOrbit, propagate} from './orbitalGeometry.js';
import {ADDED_ASCENT_PRESETS} from '../rocket/launcherAdditions.js';
import {rocketPart} from '../rocket/catalogue.js';

const {radiusM: R, mu, rotationSec} = BODIES.earth;
const spin = TAU / rotationSec;
const g0 = 9.80665;
const releaseS = 3;
export const ASCENT_STEP_S = .2;
export const ASCENT_LIMIT_S = 1500;
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
const mix = (a, b, t) => a + (b-a)*t;
const add = (a,b) => a.map((x,i)=>x+b[i]);
const sub = (a,b) => a.map((x,i)=>x-b[i]);
const scale = (a,s) => a.map(x=>x*s);
const dot = (a,b) => a.reduce((sum,x,i)=>sum+x*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm = a => Math.hypot(...a);
const unit = a => scale(a,1/norm(a));
const atmosphereVelocity = r => [-spin*r[1],spin*r[0],0];
const densityAt = altitude => 1.225*Math.exp(-Math.max(0,altitude)/7600);
const engine = (id,dryKg,propellantKg,thrustN,isp) => ({id,dryKg,propellantKg,thrustN,isp,
 propulsionType:id.startsWith('booster-')?'solid':'liquid',minThrottle:id.startsWith('booster-')?1:.4,
 maxIgnitions:id==='upper'?2:1,performanceStatus:'authored educational model; not real vehicle validation'});
const inert = (id,dryKg) => engine(id,dryKg,0,0,1);

// Authored educational performance for the schematic preset stacks. The names
// identify existing assets and capacity tiers, not real launch vehicle data.
const PRESETS = {
 ...ADDED_ASCENT_PRESETS,
 kestrel: {core:[2100,21000,385000,315],upper:[450,6200,48000,370],fairing:130,area:3,boosters:0},
 condor: {core:[4400,53000,920000,327],upper:[780,11900,85000,438],fairing:280,area:6,boosters:2},
 albatross: {core:[13000,139000,2600000,310],upper:[1600,28600,200000,445],fairing:580,area:11,boosters:0},
 roc: {core:[19000,232000,4340000,338],upper:[2850,57500,330000,450],fairing:850,area:14,boosters:4}
};

export function ascentVehicle(design, payloadKg) {
 const preset = PRESETS[design.launcherId];
 const blueprint = design.rocketBlueprint;
 if (!blueprint && !preset) throw Error('Launcher has no numerical performance model.');
 let core, upper, booster, boosterCount, fairingKg, area;
 if (blueprint) {
  const parts = Object.fromEntries(Object.entries(blueprint.parts).map(([slot,id])=>[slot,rocketPart(slot,id)]));
  const {coreTank,coreEngine,upperTank,upperEngine,separator,adapter,fairing,guidance,boosters} = parts;
  if (!coreTank || !coreEngine || !upperTank || !upperEngine || !separator || !adapter || !fairing || !guidance) throw Error('Launcher is missing a required assembly.');
  core = engine('core',coreTank.dryKg+coreEngine.dryKg+separator.dryKg,coreTank.propellantKg,coreEngine.thrustN,coreEngine.isp);
  upper = engine('upper',upperTank.dryKg+upperEngine.dryKg+adapter.dryKg+guidance.dryKg,upperTank.propellantKg,upperEngine.thrustN,upperEngine.isp);
  booster = boosters && [boosters.dryKg,boosters.propellantKg,boosters.thrustN,boosters.isp];
  boosterCount = boosters?.count ?? 0;
  fairingKg = fairing.dryKg;
  area = Math.PI*(coreTank.diameterM/2)**2;
 } else {
  core = engine('core',...preset.core);
  upper = engine('upper',...preset.upper);
  booster = preset.boosters===4 ? [960,9200,440000,265] : [430,3600,181000,259];
  boosterCount = preset.boosters;
  fairingKg = preset.fairing;
  area = preset.area;
 }
 // Selected physical transfers use a documented third-start educational upper
 // engine envelope. Historical two-start ascent models remain unchanged.
 if(design.flightPlan?.navigationModel==='dated-conics-1')upper.maxIgnitions=3;
 return {area,parts:[core,upper,inert('fairing-left',fairingKg/2),inert('fairing-right',fairingKg/2),inert('payload',payloadKg),
  ...Array.from({length:boosterCount},(_,i)=>engine('booster-'+i,...booster))]};
}

export function elementsFromState(r,v,timeS=0) {
 const radius = norm(r), speed = norm(v), h = cross(r,v), p = norm(h)**2/mu;
 const eVector = sub(scale(cross(v,h),1/mu),unit(r));
 const eccentricity = norm(eVector);
 const semiMajorAxisM = 1/(2/radius-speed**2/mu);
 const normal = unit(h);
 const inclinationRad = Math.acos(clamp(normal[2],-1,1));
 const node = [-h[1],h[0],0];
 const ascending = norm(node)>norm(h)*1e-9 ? unit(node) : [1,0,0];
 const periapsis = eccentricity>1e-10 ? unit(eVector) : ascending;
 const angle = (a,b) => Math.atan2(dot(cross(a,b),normal),dot(a,b));
 const anomaly = angle(periapsis,unit(r));
 const eccentricAnomaly = eccentricity<1 ? Math.atan2(Math.sqrt(1-eccentricity**2)*Math.sin(anomaly),eccentricity+Math.cos(anomaly)) : 0;
 return {body:'earth',semiMajorAxisM,eccentricity,inclinationRad,raanRad:Math.atan2(ascending[1],ascending[0]),
  argumentRad:angle(ascending,periapsis),meanAnomalyRad:eccentricAnomaly-eccentricity*Math.sin(eccentricAnomaly),
  periapsisM:p/(1+eccentricity)-R,apoapsisM:eccentricity<1?p/(1-eccentricity)-R:null,epochS:timeS};
}

const massOf = (vehicle,state) => vehicle.parts.reduce((mass,part)=>mass+(state.attachedPartIds.includes(part.id)?part.dryKg+state.propellantKgByTank[part.id]:0),0);
const flow = part => part.thrustN/(part.isp*g0);
const phaseText = {
 prelaunch:'Pad preparation',ignition:'Ignition · Thrust buildup',climb:'Core burn',upper:'Upper-stage burn',inserted:'Orbital insertion confirmed',failed:'Ascent terminated'
};

// Fixed-step midpoint propagation in the equatorial ECI convention used by
// orbitalGeometry.js. Vehicle attitude is a rate-limited guidance command.
// The equatorial fictional pad allows prograde, polar and retrograde planes.
export function simulateAscent(vehicle, target, {stepS=ASCENT_STEP_S}={}) {
 if (!Number.isFinite(stepS)||stepS<=0||stepS>.5) throw Error('Invalid ascent step.');
 if (!vehicle.parts.every(p=>[p.dryKg,p.propellantKg,p.thrustN,p.isp].every(Number.isFinite)&&p.dryKg>=0&&p.propellantKg>=0&&p.thrustN>=0&&p.isp>0)
  || new Set(vehicle.parts.map(p=>p.id)).size!==vehicle.parts.length || !(vehicle.area>0)||!Number.isFinite(vehicle.area)) throw Error('Invalid launcher mass or propulsion data.');
 if(vehicle.parts.some(p=>p.minThrottle!==undefined&&(!Number.isFinite(p.minThrottle)||p.minThrottle<=0||p.minThrottle>1)||p.maxIgnitions!==undefined&&(!Number.isInteger(p.maxIgnitions)||p.maxIgnitions<1||p.maxIgnitions>4)))throw Error('Invalid engine envelope.');
 const altitudeTarget = target?.semiMajorAxisM-R;
 if (target?.body!=='earth'||!Number.isFinite(altitudeTarget)||altitudeTarget<150000||altitudeTarget>1000000||!Number.isFinite(target.inclinationRad)||target.inclinationRad<0||target.inclinationRad>Math.PI||!Number.isFinite(target.raanRad)||!Number.isFinite(target.eccentricity)||target.eccentricity<0||target.eccentricity>.03) throw Error('Ascent guidance supports near-circular Earth orbits from 150 to 1,000 km.');
 const core = vehicle.parts.find(p=>p.id==='core'), upper = vehicle.parts.find(p=>p.id==='upper');
 if (!core || !upper || flow(core)<=0 || flow(upper)<=0) throw Error('Both stages need working propulsion.');
 const boost = vehicle.parts.filter(p=>p.id.startsWith('booster-'));
 const lon = target.raanRad-spin*releaseS;
 const normal = [Math.sin(target.raanRad)*Math.sin(target.inclinationRad),-Math.cos(target.raanRad)*Math.sin(target.inclinationRad),Math.cos(target.inclinationRad)];
 const initialR = [R*Math.cos(lon),R*Math.sin(lon),0];
 let state = {timeS:0,frame:'earth-inertial',positionM:initialR,velocityMps:atmosphereVelocity(initialR),direction:unit(initialR),
  pitchDeg:90,pitchRateDegS:0,phase:'prelaunch',attachedPartIds:vehicle.parts.map(p=>p.id),
  propellantKgByTank:Object.fromEntries(vehicle.parts.map(p=>[p.id,p.propellantKg])),engineStatesById:{}};
 const samples = [],events = [];
 let upperStart = 0, orbit = null, reason = '', guidance='pad';
 const ignitions=Object.fromEntries(vehicle.parts.map(p=>[p.id,0]));
 const wasBurning={},transitions=[];
 const transition=(next,why)=>{if(guidance!==next){guidance=next;state.guidancePhase=next;state.transitionReason=why;transitions.push({phase:next,reason:why,timeS:state.timeS});}};
 const event = (id,partIds=[])=>events.push({id,timeS:state.timeS,partIds,positionM:state.positionM,velocityMps:state.velocityMps,direction:state.direction});
 const detach = (id,partIds)=>{
  event(id,partIds);
  state.attachedPartIds=state.attachedPartIds.filter(part=>!partIds.includes(part));
 };
 function record(){
  const up=unit(state.positionM), relative=sub(state.velocityMps,atmosphereVelocity(state.positionM));
  const throttle=Object.values(state.engineStatesById);
  samples.push({...state,massKg:massOf(vehicle,state),altitudeM:norm(state.positionM)-R,
   verticalMps:dot(state.velocityMps,up),speedMps:norm(state.velocityMps),airSpeedMps:norm(relative),
   throttle:Math.max(0,...throttle),commandedThrottle:state.commandedThrottle??0,ignitions:{...ignitions},guidancePhase:guidance,osculatingOrbit:elementsFromState(state.positionM,state.velocityMps,state.timeS),eventCount:events.length,label:reason||phaseText[state.phase]});
 }
 const fail = message=>{reason=message;state.phase='failed';state.engineStatesById={};event('failure');};
 record();
 while (state.timeS<ASCENT_LIMIT_S && state.phase!=='inserted' && state.phase!=='failed') {
  const t=state.timeS;
  state={...state,propellantKgByTank:{...state.propellantKgByTank},engineStatesById:{}};
  const elapsed=t-releaseS, stage=state.attachedPartIds.includes('core')?core:upper;
  const onPad=elapsed<0;
  const altitude=norm(state.positionM)-R;
  if(onPad) state.phase=t>=2?'ignition':'prelaunch';
  else {
   if(state.phase==='prelaunch'||state.phase==='ignition'){
    const thrust=[core,...boost].reduce((sum,p)=>sum+(state.propellantKgByTank[p.id]>0?p.thrustN:0),0);
    if(thrust<=massOf(vehicle,state)*mu/R**2){fail('Available thrust cannot lift the stack.');record();break;}
    event('liftoff');
   }
   state.phase=stage===core?'climb':'upper';
  }
  const burning = [stage,...boost].filter(p=>state.attachedPartIds.includes(p.id)&&state.propellantKgByTank[p.id]>0);
  let thrustFraction = onPad ? clamp((t-2)+stepS/2,0,1) : 1;
  const up=unit(state.positionM), tangent=unit(cross(normal,up)), radial=dot(state.velocityMps,up);
  const crossTrack=dot(state.positionM,normal);
  const side=clamp((-dot(state.velocityMps,normal)/35-crossTrack/4900)/(stage.thrustN/massOf(vehicle,state)),-.42,.42);
  const airSpeed=norm(sub(state.velocityMps,atmosphereVelocity(state.positionM)));
  const q=.5*densityAt(altitude)*airSpeed**2;
  let command=90,integrationStepS=stepS;
  if(onPad||stage===core)transition(onPad?(t<2?'pad':'ignition'):(altitude<180?'vertical-clearance':'gravity-turn'),
   onPad?'Sequenced ignition':altitude<180?'Clear launch hardware':'Aerodynamic turn');
  if(!onPad&&stage===core){
   const turn=clamp((altitude-180)/24000,0,1)*clamp((airSpeed-35)/450,0,1);
   command=90-(65-12*clamp(q/45000,0,1))*turn**.56;
  } else if(stage===upper){
   const tangential=dot(state.velocityMps,tangent);
   const radius=norm(state.positionM), circular=Math.sqrt(mu/radius);
   const gravityLoss=mu/radius**2-tangential**2/radius;
   const available=stage.thrustN/massOf(vehicle,state);
   const predicted=elementsFromState(state.positionM,state.velocityMps,t);
   // Resolve the cutoff crossing to 10 ms: a coarse final impulse can move
   // periapsis kilometres even when the integrated trajectory has converged.
   if(predicted.periapsisM>altitudeTarget-Math.max(45000,altitudeTarget*.15)-30000)integrationStepS=Math.min(stepS,.01);
   const ap=predicted.apoapsisM??Infinity;
   // Osculating mean anomaly estimates time to apoapsis, rather than altitude error.
   const meanMotion=predicted.semiMajorAxisM>0?Math.sqrt(mu/predicted.semiMajorAxisM**3):0;
   const timeToAp=meanMotion?(Math.PI-predicted.meanAnomalyRad)/meanMotion:Infinity;
   const dv=Math.max(0,circular-tangential);
   const burnSeconds=stage.isp*g0/available*(1-Math.exp(-dv/(stage.isp*g0)));
   if(guidance!=='coast'&&guidance!=='circularization')transition('powered-ascent','Upper stage raises predicted coast apoapsis');
   if(guidance==='powered-ascent'&&ap>=altitudeTarget&&radial>0){
    transition('coast','Predicted coast apoapsis reached target; shut down instead of braking upward momentum');
   }
   if(guidance==='coast'&&timeToAp<=burnSeconds*.25+12){
    transition('circularization','Time to apoapsis matches remaining finite burn and attitude slew');
   }
   if(guidance==='powered-ascent'){
    const neededRadial=Math.sqrt(Math.max(0,2*gravityLoss*(altitudeTarget-altitude)));
    const required=gravityLoss+(neededRadial-radial)/65;
    command=Math.atan2(Math.max(0,required),available)/RAD;
   }else if(guidance==='coast'){
    thrustFraction=0;command=0;
   }else{
    // Local radial support about the apsis; this is not an altitude servo.
    const radialAcceleration=gravityLoss-radial/45;
    command=Math.atan2(radialAcceleration,available)/RAD;
    thrustFraction=1;
   }
  }
  state.commandedThrottle=thrustFraction;
  if(!onPad&&thrustFraction>0)thrustFraction=Math.max(stage.minThrottle??.4,thrustFraction);
  for(const part of burning){
   const on=thrustFraction>0;
   if(on&&!wasBurning[part.id]){
    if(ignitions[part.id]>=(part.maxIgnitions??(part.id==='upper'?2:1))){fail('Engine ignition limit exceeded: '+part.id);break;}
    ignitions[part.id]++;
   }
   wasBurning[part.id]=on;
  }
  if(state.phase==='failed'){record();break;}

  let dt=Math.min(integrationStepS,onPad?(t<2?2:3)-t:ASCENT_LIMIT_S-t);
  if(thrustFraction>0)for(const part of burning)if(flow(part)>0)dt=Math.min(dt,state.propellantKgByTank[part.id]/(flow(part)*(part.propulsionType==='solid'?1:thrustFraction)));
  const rate=clamp((command-state.pitchDeg)*1.6,-2.2,2.2);
  state.pitchRateDegS+=clamp(rate-state.pitchRateDegS,-1.7*dt,1.7*dt);
  const pitch=clamp(state.pitchDeg+state.pitchRateDegS*dt/2,-90,90)*RAD;
  state.pitchDeg=clamp(state.pitchDeg+state.pitchRateDegS*dt,-90,90);
  state.direction=unit(add(scale(up,Math.sin(pitch)),scale(add(tangent,scale(normal,side)),Math.cos(pitch))));
  let thrust=0,used=0;
  for(const part of burning){
   const partThrottle=part.propulsionType==='solid'&&thrustFraction>0?1:thrustFraction;
   const consumed=Math.min(state.propellantKgByTank[part.id],flow(part)*dt*partThrottle);
   state.propellantKgByTank[part.id]=Math.max(0,state.propellantKgByTank[part.id]-consumed);
   if(partThrottle>0){state.engineStatesById[part.id]=partThrottle;thrust+=part.thrustN*partThrottle;}
   used+=consumed;
  }
  const mass=massOf(vehicle,state)+used/2;
  if(!(mass>0)){fail('Stack mass is invalid.');record();break;}
  if(onPad&&t===2)event('ignition');
  state.timeS+=dt;
  if(onPad){
   const angle=lon+spin*state.timeS;
   state.positionM=[R*Math.cos(angle),R*Math.sin(angle),0];
   state.velocityMps=atmosphereVelocity(state.positionM);
  } else {
   const acceleration=(r,v)=>{
    const length=norm(r), relative=sub(v,atmosphereVelocity(r));
    const drag=scale(relative,-.5*densityAt(length-R)*norm(relative)*vehicle.area*.36);
    return add(scale(r,-mu/length**3),scale(add(scale(state.direction,thrust),drag),1/mass));
   };
   const midR=add(state.positionM,scale(state.velocityMps,dt/2));
   const midV=add(state.velocityMps,scale(acceleration(state.positionM,state.velocityMps),dt/2));
   state.positionM=add(state.positionM,scale(midV,dt));
   state.velocityMps=add(state.velocityMps,scale(acceleration(midR,midV),dt));
   const depleted=boost.filter(p=>state.attachedPartIds.includes(p.id)&&state.propellantKgByTank[p.id]<1e-7);
   if(depleted.length){
    detach('boosters',depleted.map(p=>p.id));
    for(const part of depleted)delete state.engineStatesById[part.id];
   }
   if(stage===core&&state.propellantKgByTank.core<1e-7){
    if(boost.some(p=>state.attachedPartIds.includes(p.id)))fail('Core depleted while boosters were still attached.');
    else {detach('core',['core']);delete state.engineStatesById.core;upperStart=state.timeS;state.phase='upper';}
   }
   if(altitude>=95000&&q<50&&state.attachedPartIds.includes('fairing-left'))detach('fairing',['fairing-left','fairing-right']);
   if(stage===upper&&t-upperStart>1){
    const candidate=elementsFromState(state.positionM,state.velocityMps,state.timeS);
    const tolerance=Math.max(45000,altitudeTarget*.15);
    if(!state.attachedPartIds.includes('fairing-left')&&candidate.apoapsisM!==null
     &&candidate.periapsisM>=altitudeTarget-tolerance&&candidate.apoapsisM<=altitudeTarget+tolerance
     &&Math.abs(candidate.inclinationRad-target.inclinationRad)<2*RAD){
     orbit=candidate;transition('cutoff','Calculated state meets target orbit tolerance');state.phase='inserted';state.engineStatesById={};event('insertion');
    } else if(state.propellantKgByTank.upper<1e-7)fail('Upper stage exhausted before reaching the requested orbit.');
   }
   // A failed insertion must not fly back into the atmosphere as a successful
   // launch animation. Stop at the descending 100 km boundary; reentry heating
   // and breakup are outside this ascent model.
   if(state.phase!=='failed'&&altitude>=100000&&norm(state.positionM)-R<100000)
    fail('Atmospheric reentry: the vehicle descended below 100 km before achieving a safe orbit.');
   if(state.phase!=='failed'&&norm(state.positionM)<R-1)fail('Trajectory intersected Earth.');
  }
  if(state.timeS>=ASCENT_LIMIT_S&&state.phase!=='inserted'&&state.phase!=='failed')fail('Ascent exceeded the guidance time limit.');
  record();
 }
 return {samples,events,transitions,modelVersion:'ascent-2',orbit,reason,end:samples.at(-1)};
}

export function sampleFlight(flight,timeS) {
 const {samples}=flight;
 let low=0,high=samples.length-1;
 while(low<high){
  const mid=Math.ceil((low+high)/2);
  if(samples[mid].timeS<=timeS)low=mid;
  else high=mid-1;
 }
 const a=samples[low],b=samples[low+1];
 if(!b||timeS<=a.timeS)return a;
 const t=(timeS-a.timeS)/(b.timeS-a.timeS);
 const blend=key=>a[key].map((v,i)=>mix(v,b[key][i],t));
 const fuel=Object.fromEntries(Object.entries(a.propellantKgByTank).map(([id,kg])=>[id,mix(kg,b.propellantKgByTank[id],t)]));
 const consumed=a.attachedPartIds.reduce((sum,id)=>sum+a.propellantKgByTank[id]-fuel[id],0);
 return {...a,timeS,propellantKgByTank:fuel,massKg:a.massKg-consumed,positionM:blend('positionM'),velocityMps:blend('velocityMps'),direction:unit(blend('direction')),
  altitudeM:mix(a.altitudeM,b.altitudeM,t),pitchDeg:mix(a.pitchDeg,b.pitchDeg,t),verticalMps:mix(a.verticalMps,b.verticalMps,t),speedMps:mix(a.speedMps,b.speedMps,t),airSpeedMps:mix(a.airSpeedMps,b.airSpeedMps,t)};
}

export function numericalTarget(design) {
 if(!['leo','sso'].includes(design.orbitId))return {...presetOrbit('leo'),inclinationRad:0,parkingOnly:true};
 const target=design.orbitElements||presetOrbit(design.orbitId);
 // Pass invalid custom targets to the numerical validator, never silently
 // fall back to the old scripted success animation.
 return target;
}

export function payloadDeployment(flight,payloadKg,releaseAfterS=3) {
 const positionM=propagate(flight.orbit,releaseAfterS);
 const epsilon=.025;
 const velocityMps=scale(sub(propagate(flight.orbit,releaseAfterS+epsilon),propagate(flight.orbit,releaseAfterS-epsilon)),1/(2*epsilon));
 const stageKg=flight.end.massKg-payloadKg;
 const axis=flight.end.direction;
 const relativeSpeedMps=1.2;
 const craftVelocity=add(velocityMps,scale(axis,relativeSpeedMps*stageKg/flight.end.massKg));
 const stageVelocity=sub(velocityMps,scale(axis,relativeSpeedMps*payloadKg/flight.end.massKg));
 const timeS=flight.end.timeS+releaseAfterS;
 return {
  payloadOrbit:elementsFromState(positionM,craftVelocity,timeS),upperOrbit:elementsFromState(positionM,stageVelocity,timeS),
  event:{id:'payload',timeS,partIds:['payload'],positionM,velocityMps,direction:axis},
  craftVelocity,stageVelocity,stageKg
 };
}




