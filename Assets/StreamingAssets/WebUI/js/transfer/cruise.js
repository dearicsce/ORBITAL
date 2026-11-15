import {physicalCommand,stepPhysical,afterPhysicalStep} from '../unity/physicalCruise.js';
import {createEvidence,evidenceSummary,scienceObjectives,scienceCompletion,send,receive,note} from '../unity/scienceEvidence.js';
import {collectEncounter} from '../unity/scienceTransfer.js';
import {createSystems} from '../unity/spacecraftSystems.js';
import {systemsSummary} from '../unity/systemsOperations.js';
import {cruiseSystemsPower,queueCruiseTransmit} from '../unity/systemsCruise.js';
import {ARRIVAL_KITS} from './catalogue.js';
import {DAY_SEC,AU_M,transferTrajectory,cruiseHardware,transferPosition,generationAt,fuelForDv,serviceMass} from './planning.js';

const CRUISE_STEPS=120, CORRECTION_TICK=51, SCIENCE_HOURS=2, DOWNLINK_STEP_HOURS=6, DOWNLINK_TICKS=16;
const limit=(value,max)=>Math.min(max,Math.max(0,value));

export function createCruise(design,mission,data,evaluation,{science=true,assumptions,systems=mission.destination!=='proxima'}={}){
 const plan=design.flightPlan;
 const trajectory=transferTrajectory(mission,design,plan,assumptions);
 const hardware=cruiseHardware(plan,design,data,evaluation,trajectory,assumptions);
 return {
  ...(systems?{systems:createSystems(design,data),uplink:null,groundHold:false,usefulIntervalSec:0}:{}),
  evidence:createEvidence(mission.id,data.instruments.filter(p=>design.instrumentIds.includes(p.id)),hardware.batteryWh,science),observationPlan:design.evidencePlan==='focused'?'priority':'balanced',experimentCommands:[],
  version:1,missionId:mission.id,phase:'departure',pending:'departure',tick:0,downlinkTicks:0,elapsedSec:0,paused:false,finished:false,
  trajectory,hardware,arrivalType:mission.transfer.type,plan:structuredClone(plan),deliveredTarget:mission.profile.delivered,
  trimKg:hardware.trimFuelKg,brakingKg:serviceMass(plan,hardware.spacecraftKg).fuelKg,batteryWh:hardware.batteryWh,
  outageSec:0,collectedGb:0,deliveredGb:0,storageGb:0,lostGb:0,inFlight:[],corrected:false,arrived:false,transmit:false,
  log:[{tick:0,elapsedSec:0,text:'Spacecraft and transfer stage acquired in Earth parking orbit.'}]
 };
}

function record(state,text){
 state.log.push({tick:state.tick,elapsedSec:state.elapsedSec,text});
 if(state.log.length>250)state.log.shift();
}
function fail(state,text){
 state.phase='failed';state.pending=null;state.finished=true;record(state,text);
}

function powerInterval(state,seconds,sunAu,loadW){
 const generation=generationAt(state.hardware,sunAu,state.elapsedSec);
 if(state.systems)return cruiseSystemsPower(state,seconds,sunAu,loadW,generation);
 const net=(generation-loadW)*seconds/3600;
 if(net<0&&state.batteryWh+net<0){
  const missingWh=-(state.batteryWh+net);
  if(state.evidence){state.evidence.unservedWh+=missingWh;state.evidence.servedWh+=loadW*seconds/3600-missingWh;}
  state.outageSec+=seconds-state.batteryWh/(loadW-generation)*3600;
  state.batteryWh=0;
  if(state.evidence)state.evidence.minimumWh=0;
  note(state.evidence,'shed',state.elapsedSec,{loadW,generationW:generation});
  return false;
 }
 if(state.evidence){state.evidence.servedWh+=loadW*seconds/3600;state.evidence.spilledWh+=Math.max(0,state.batteryWh+net-state.hardware.batteryWh);}
 state.batteryWh=limit(state.batteryWh+net,state.hardware.batteryWh);
 if(state.evidence)state.evidence.minimumWh=Math.min(state.evidence.minimumWh,state.batteryWh);
 return true;
}

export function cruiseCommand(state,command){
 if(state.finished)return false;
 const {hardware:h,trajectory:t}=state;
 if(command==='pause'){state.paused=!state.paused;return true;}
 if(state.paused)return false;
 if(command==='observe'&&(!state.arrived||state.tick!==CRUISE_STEPS))return false;
 const event={command,phase:state.phase,tick:state.tick,downlinkTicks:state.downlinkTicks};
 const handled=physicalCommand(state,command);
 if(handled!==null){if(handled&&state.evidence)state.experimentCommands.push(event);return handled;}
 if(command==='depart'&&state.pending==='departure'){
  state.pending=null;state.phase='cruise';
  record(state,t.speculative?'Sail deployed. External beaming accelerates the probe to the cruise speed.':'Departure burn complete. The upper stage has separated.');
 }else if(command==='correct'&&state.pending==='correction'){
  const fuel=fuelForDv(t.correctionDv,h.stackKg);
  if(fuel>state.trimKg+1e-9)return false;
  state.trimKg=Math.max(0,state.trimKg-fuel);state.corrected=true;state.pending=null;
  record(state,'Mid-course correction complete. '+fuel.toFixed(2)+' kg trim propellant used.');
 }else if(command==='coast'&&state.pending==='correction'){
  state.pending=null;
  record(state,'Correction omitted. The remaining targeting error exceeds encounter limits.');
 }else if(command==='acquire'&&state.pending==='encounter'){
  if(t.arrivalDv>0){
   const kit=ARRIVAL_KITS[state.plan.arrivalKit];
   const wetKg=h.stackKg-(h.trimFuelKg-state.trimKg);
   const fuel=kit.isp?fuelForDv(t.arrivalDv,wetKg,kit.isp):Infinity;
   if(fuel>state.brakingKg+1e-9){fail(state,'Braking stage exhausted before capture.');return true;}
   state.brakingKg=Math.max(0,state.brakingKg-fuel);
   record(state,state.arrivalType==='rendezvous'?'Relative velocity matched. Rendezvous confirmed.':'Braking complete. Capture orbit confirmed.');
  }else record(state,state.arrivalType==='crossing'?'Boundary crossing confirmed.':'Flyby geometry confirmed. Payload pointed at the target.');
  state.arrived=true;state.pending='science';state.phase='encounter';
 }else if(command==='observe'&&state.pending==='science'){
  if(state.evidence){
   if(!collectEncounter(state,powerInterval)){fail(state,'No valid encounter integration completed.');return true;}
  }else{
  const seconds=SCIENCE_HOURS*3600;
  const powered=powerInterval(state,seconds,t.target.au||1,h.hotelW+h.payloadW);
  state.elapsedSec+=seconds;
  if(!powered){fail(state,'Power reserve failed during the observation window.');return true;}
  state.collectedGb=h.dataGbDay*(state.systems?state.usefulIntervalSec:seconds)/86400;
  state.storageGb=Math.min(state.collectedGb,h.recorderGb);
  state.lostGb=state.collectedGb-state.storageGb;
  }
  state.scienceEndSec=state.elapsedSec;
  state.pending='downlink';state.phase='return';
  record(state,'Observation complete. Recorder holds '+state.storageGb.toFixed(3)+' GB.');
 }else if(command==='transmit'&&state.phase==='return'){
  if(state.systems){
   if(!queueCruiseTransmit(state))return false;
  }else{
  state.transmit=!state.transmit;state.pending=null;
  record(state,state.transmit?'Earth downlink started.':'Earth downlink paused.');
  }
 }else return false;
 if(state.evidence&&state.experimentCommands.length<250)state.experimentCommands.push(event);
 return true;
}

export function stepCruise(state){
 if(state.finished||state.paused||state.pending)return state;
 const {hardware:h,trajectory:t}=state;
 stepPhysical(state);
 if(state.phase==='cruise'){
  const [x,y]=transferPosition(t,(state.tick+.5)/CRUISE_STEPS);
  const sunAu=t.lunar?1:Math.hypot(x,y)/AU_M;
  const seconds=t.travelSec/CRUISE_STEPS;
  const powered=powerInterval(state,seconds,sunAu,h.hotelW);
  state.tick++;state.elapsedSec=t.travelSec*state.tick/CRUISE_STEPS;
  if(!powered){fail(state,'Spacecraft lost cruise power.');return state;}
  if(state.evidence&&state.elapsedSec>h.lifetimeYears*365.25*86400){fail(state,'The spacecraft exceeded its assumed operating life before encounter.');return state;}
  if(state.tick===CORRECTION_TICK){state.pending='correction';record(state,'Tracking solution available. Approve the mid-course correction.');}
  if(state.tick===CRUISE_STEPS){
   if(!state.corrected)fail(state,'The uncorrected trajectory missed the encounter.');
   else{state.pending='encounter';record(state,'Target encounter. Awaiting navigation confirmation.');}
  }
 }else if(state.phase==='return'){
  const hours=t.downlinkStepHours||DOWNLINK_STEP_HOURS,seconds=hours*3600;
  if(state.evidence)state.evidence.contactSec+=seconds;
  const radioOn=state.transmit&&state.storageGb>0;
  const powered=powerInterval(state,seconds,t.target.au||1,h.hotelW+(radioOn?h.radioW:0));
  if(state.systems?state.usefulIntervalSec>0:powered&&radioOn){
   const sent=Math.min(state.storageGb,h.rateGbDay*(state.systems?state.usefulIntervalSec:seconds)/86400);
   state.storageGb-=sent;state.inFlight.push({amount:sent,...(state.evidence?{fragments:send(state.evidence,sent)}:{}),receivedAtSec:state.elapsedSec+seconds+t.lightMinutes*60});
  }
  state.elapsedSec+=seconds;state.downlinkTicks++;
  while(state.inFlight.length&&state.inFlight[0].receivedAtSec<=state.elapsedSec){
   const packet=state.inFlight.shift();state.deliveredGb+=packet.amount;
   receive(state.evidence,packet.fragments,packet.receivedAtSec,state.scienceEndSec+DOWNLINK_TICKS*seconds);
  }
  if((state.deliveredGb+1e-9>=state.deliveredTarget&&scienceObjectives(state.evidence).every(o=>o.passed))||state.downlinkTicks>=DOWNLINK_TICKS){
   state.phase='complete';state.finished=true;
   record(state,state.deliveredGb+1e-9>=state.deliveredTarget?'Science packet confirmed at Earth.':'Encounter downlink window closed.');
  }
 }
 afterPhysicalStep(state);
 return state;
}

export function cruiseSummary(state){
 const unconfirmed=(state.inFlight||[]).reduce((sum,packet)=>sum+packet.amount,0);
 const health=state.elapsedSec>0?Math.max(0,100*(1-state.outageSec/state.elapsedSec)):100;
 const objectives=[
  {id:'coverage',name:'Target encounter acquired',value:state.arrived?100:0,target:100,unit:'%',passed:state.arrived},
  {id:'delivery',name:'Science packet at Earth',value:state.deliveredGb,target:state.deliveredTarget,unit:'GB',passed:state.deliveredGb+1e-9>=state.deliveredTarget},
  {id:'health',name:'Powered mission time',value:health,target:90,unit:'%',passed:health>=90},
  ...scienceObjectives(state.evidence)
 ];
 const passed=state.finished&&state.phase==='complete'&&state.corrected&&objectives.every(o=>o.passed);
 return {...evidenceSummary(state.evidence),...systemsSummary(state.systems),missionId:state.missionId,finished:state.finished,windowCompleted:state.finished,passed,objectives,
  scienceFactor:state.evidence?scienceCompletion(state.evidence):Number(passed),deliveredGb:state.deliveredGb,collectedGb:state.collectedGb,lostGb:state.lostGb,storageGb:state.storageGb,unconfirmedGb:unconfirmed,batteryWh:state.batteryWh,
  fuelKg:state.trimKg,decisions:state.log.length-1,log:state.log.map(e=>({...e})),elapsedMinutes:state.elapsedSec/60};
}

export function validateCruise(state,design,mission){
 if(state?.version!==1||!mission?.transfer||state.missionId!==mission.id||state.plan?.id!==design.flightPlan?.id||
  !['departure','cruise','encounter','return','complete','failed'].includes(state.phase)||
  ![null,'departure','correction','encounter','science','downlink'].includes(state.pending))throw Error('Invalid transfer checkpoint');
 if(!Number.isInteger(state.tick)||state.tick<0||state.tick>CRUISE_STEPS||!Number.isInteger(state.downlinkTicks)||state.downlinkTicks<0||state.downlinkTicks>DOWNLINK_TICKS)throw Error('Invalid transfer tick');
 for(const key of ['trimKg','brakingKg','batteryWh','elapsedSec','outageSec','collectedGb','deliveredGb','storageGb','lostGb','deliveredTarget']){
  if(!Number.isFinite(state[key])||state[key]<0)throw Error('Invalid transfer resource '+key);
 }
 for(const key of ['paused','finished','corrected','arrived','transmit'])if(typeof state[key]!=='boolean')throw Error('Invalid transfer flag');
 if(!Array.isArray(state.log)||state.log.length>1000||state.log.some(event=>typeof event.text!=='string'||!Number.isFinite(event.elapsedSec)))throw Error('Invalid transfer log');
 if(state.systems&&(typeof state.groundHold!=='boolean'||!Number.isFinite(state.usefulIntervalSec)||state.usefulIntervalSec<0||
   (state.uplink!==null&&(typeof state.uplink?.transmit!=='boolean'||!Number.isFinite(state.uplink?.arrivesSec)||state.uplink.arrivesSec<state.elapsedSec))))throw Error('Invalid cruise uplink checkpoint');
 if(!Array.isArray(state.inFlight)||state.inFlight.length>DOWNLINK_TICKS||state.inFlight.some(p=>!Number.isFinite(p.amount)||p.amount<0||!Number.isFinite(p.receivedAtSec)||p.receivedAtSec<=state.elapsedSec))throw Error('Invalid in-transit science packet');
 const inTransit=state.inFlight.reduce((sum,p)=>sum+p.amount,0);
 if(!state.hardware||!state.trajectory||state.deliveredTarget!==mission.profile.delivered||state.batteryWh>state.hardware.batteryWh+1e-7||
  Math.abs(state.collectedGb-state.deliveredGb-state.storageGb-state.lostGb-inTransit)>1e-7||state.finished!==['complete','failed'].includes(state.phase)||
  state.arrived&&(!state.corrected||state.tick!==CRUISE_STEPS)||state.deliveredGb>0&&!state.arrived)throw Error('Inconsistent transfer resources');
 return state;
}
