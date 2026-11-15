import {createRelayTraffic,queuedRelayGb,stepRelay} from '../unity/relayTraffic.js';
import {floodwatchSampling} from '../unity/floodwatch.js';
import {createEvidence,evidenceSummary,scienceObjectives,scienceCompletion,note} from '../unity/scienceEvidence.js';
import {observeInterval,recordOperationsAcquisition,recordOperationsReceipt,discard} from '../unity/scienceOperations.js';
import {projectAssembly} from '../workshop/blueprint.js';
// Fixed-step educational operations model. Time is simulated minutes; energy Wh;
// data GB; power W. No browser, randomness, renderer or wall clock dependencies.
import {presetOrbit,intervalEnvironment,geometryAt,EARTH_STATIONS} from './orbitalGeometry.js';
import {operationsElapsedSec,OPERATION_STEP_SEC,OPERATION_TICKS} from './flightClock.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export {OPERATION_TICKS};
export const MINUTES_PER_TICK=OPERATION_STEP_SEC/60;
export const INCIDENTS={
  contact:{name:'Ground station outage',description:'The next scheduled ground pass is unavailable. Protect the recorder or spend propellant to improve the link geometry.',choices:[{id:'buffer',label:'Store and wait',cost:'Lose 8 ticks of ground contact'},{id:'maneuver',label:'Adjust the orbit',cost:'Use 3 kg propellant; restore contact'}]},
  battery:{name:'Battery performance warning',description:'Cell temperatures are rising. Reduce loads for a short recovery, or accept a smaller usable energy reserve.',choices:[{id:'recover',label:'Thermal recovery',cost:'Safe mode for 5 ticks'},{id:'continue',label:'Continue observations',cost:'Usable battery capacity falls 20%'}]},
  thermal:{name:'Instrument overheating',description:'Continuous observations are warming the payload. A cooldown protects it; pushing through reduces measurement quality.',choices:[{id:'cool',label:'Cool the instrument',cost:'Safe mode for 5 ticks'},{id:'push',label:'Keep collecting',cost:'Science efficiency falls 20%'}]},
  storage:{name:'Recorder integrity check',description:'A memory bank needs a reset. Preserve the stored observations while a diagnostic runs, or clear the recorder immediately.',choices:[{id:'diagnose',label:'Run diagnostic',cost:'Safe mode for 4 ticks; stored data retained'},{id:'clear',label:'Reset the recorder',cost:'Discard all undelivered data'}]},
  radiation:{name:'Space-weather alert',description:'An energetic particle event is approaching. Hardened computers reduce risk; ordinary systems need a protective shutdown.',choices:[{id:'shield',label:'Enter protected mode',cost:'Safe mode for 5 ticks'},{id:'risk',label:'Continue the watch',cost:'Without hardened computer: science efficiency −25%'}]},
  debris:{name:'Conjunction alert',description:'A predicted close approach requires a response. A small burn preserves the observing schedule; a conservative reorientation interrupts it.',choices:[{id:'burn',label:'Avoidance maneuver',cost:'Use 3 kg propellant'},{id:'hold',label:'Protect and reorient',cost:'Safe mode for 7 ticks'}]}
};

export function createOperations(design,data,evaluation,{science=true,relayTraffic=false}={}) {
  design=projectAssembly(design,data);
  const mission=data.missions.find(m=>m.id===design.missionId);
  const instruments=(design.instrumentIds||[]).map(id=>data.instruments.find(p=>p.id===id)).filter(Boolean);
  const orbit=data.orbits.find(o=>o.id===design.orbitId);
  const computer=data.parts.find(p=>p.id===design.computerId);
  const radio=data.parts.find(p=>p.id===design.commsId);
  const instrumentPower=instruments.reduce((s,p)=>s+(p.power||0),0);
  const rawData=instruments.reduce((s,p)=>s+(p.dataPerDay||0),0);
  const relevant=instruments.some(p=>(mission.relevance?.[p.id]??mission.relevance?.[p.roleId]??0)>0);
  const relay=instruments.some(p=>p.kind==='relay'&&(mission.relevance?.[p.id]??mission.relevance?.[p.roleId]??0)>0);
  const elements=design.orbitElements||presetOrbit(design.orbitId);
  return {
    ...(relayTraffic&&relay?{relayTraffic:createRelayTraffic()}:{}),
    evidence:createEvidence(mission.id,instruments,evaluation.batteryUsableWh,science,design.scienceBundleId),
    sampling:floodwatchSampling(mission.id,elements),linkedRelay:true,
    version:1,geometryVersion:1,orbit:structuredClone(elements),stations:structuredClone(EARTH_STATIONS.filter(s=>!design.stationIds||design.stationIds.includes(s.id))),missionId:mission.id,tick:0,totalTicks:OPERATION_TICKS,mode:'auto',activeMode:'observe',paused:false,finished:false,
    batteryWh:evaluation.batteryUsableWh,batteryCapacityWh:evaluation.batteryUsableWh,
    storageGb:0,storageCapacityGb:computer?.recorderCapacityGb??2,
    collectedGb:0,deliveredGb:0,lostGb:0,observedMinutes:0,serviceMinutes:0,outageMinutes:0,
    fuelKg:Math.max(0,evaluation.fuelKg-(orbit?.insertionFuel||0)),temperature:24,efficiency:1,
    cooldown:0,contactOutage:0,pendingIncident:null,resolvedIncidents:[],log:[],history:[],
    profile:{coverage:45,delivered:1,contact:0.25,eclipse:0.25,...mission.profile,...(evaluation.orbitForecast?{contact:evaluation.orbitForecast.contactFraction,eclipse:1-evaluation.orbitForecast.sunlitFraction}:{})},
    hardware:{modelVersion:2,panelW:evaluation.panelPower,baseW:Math.max(5,evaluation.averageLoad-instrumentPower-(radio?.power||0)),radioTransmitW:radio?.transmitPowerW??radio?.power??0,radioStandbyW:radio?.standbyPowerW??0,payloadW:instrumentPower,dataGbDay:Math.min(rawData,computer?.maxDataGbDay||0),downlinkGbDay:evaluation.downlinkPerDay,...((design.orbitElements||presetOrbit(design.orbitId))?{instantDownlinkGbDay:evaluation.instantDownlinkGbDay??(radio?.baseDownlinkGbDay||0)*(orbit?.distanceFactor??1)*24}:{}),relevant,relay,orbitFit:mission.orbitFit?.[design.orbitId]||0,radHard:Boolean(computer?.radTolerant)},
    difficulty:design.difficulty||'normal',sunlit:(design.orbitElements||presetOrbit(design.orbitId))?geometryAt(design.orbitElements||presetOrbit(design.orbitId),0).sunlit:true,contact:(design.orbitElements||presetOrbit(design.orbitId))?geometryAt(design.orbitElements||presetOrbit(design.orbitId),0,EARTH_STATIONS.filter(s=>!design.stationIds||design.stationIds.includes(s.id))).contact:false,generationW:evaluation.panelPower,loadW:evaluation.averageLoad
  };
}

export function operationEnvironment(state) {
  if(state.geometryVersion===1&&state.orbit){const g=intervalEnvironment(state.orbit,operationsElapsedSec(state.tick),OPERATION_STEP_SEC,state.stations);return {...g,contact:g.contact&&state.contactOutage<=0,contactFraction:state.contactOutage>0?0:g.contactFraction,phase:(state.tick%20)/20};}
  const phase=(state.tick%20)/20;
  return {sunlit:phase<1-state.profile.eclipse,contact:phase>=1-state.profile.contact&&state.contactOutage<=0,phase};
}

export function chooseMode(state,mode) {
  if(!['auto','observe','downlink','safe'].includes(mode)||state.finished)return false;
  state.mode=mode;
  state.log.push({tick:state.tick,type:'command',text:'Command: '+mode});
  return true;
}

export function resolveIncident(state,choiceId) {
  const incident=state.pendingIncident;if(!incident)return false;
  if(!INCIDENTS[incident.id]?.choices.some(c=>c.id===choiceId))return false;
  if(['maneuver','burn'].includes(choiceId)&&state.fuelKg<3)return false;
  if(['maneuver','burn'].includes(choiceId))state.fuelKg-=3;
  if(choiceId==='buffer')state.contactOutage=8;
  if(['recover','cool','shield'].includes(choiceId))state.cooldown=5;
  if(choiceId==='diagnose')state.cooldown=4;
  if(choiceId==='hold')state.cooldown=7;
  if(choiceId==='continue'){state.batteryCapacityWh*=0.8;if(state.evidence)state.evidence.spilledWh+=Math.max(0,state.batteryWh-state.batteryCapacityWh);state.batteryWh=Math.min(state.batteryWh,state.batteryCapacityWh);}
  if(choiceId==='push')state.efficiency*=0.8;
  if(choiceId==='risk'&&!state.hardware.radHard)state.efficiency*=0.75;
  if(choiceId==='clear'){state.lostGb+=state.storageGb;discard(state.evidence);state.storageGb=0;}
  const definition=INCIDENTS[incident.id],choice=definition.choices.find(c=>c.id===choiceId);
  state.resolvedIncidents.push({id:incident.id,choice:choiceId,tick:state.tick});
  state.log.push({tick:state.tick,type:'decision',text:definition.name+' — '+choice.label});
  state.pendingIncident=null;
  return true;
}

export function stepOperations(state) {
  if(state.paused||state.pendingIncident||state.finished)return state;
  const env=operationEnvironment(state),h=state.hardware,minutes=MINUTES_PER_TICK;
  let mode=state.mode;
  if(mode==='auto') {
    if(state.batteryWh<state.batteryCapacityWh*0.22||state.temperature>64)mode='safe';
    else if((env.contactFraction??Number(env.contact))>0&&state.storageGb>0.05)mode='downlink';
    else mode='observe';
  }
  if(state.cooldown>0)mode='safe';
  const generation=h.panelW*(env.sunlitFraction??Number(env.sunlit));
  const radioLoad=mode==='downlink'||h.relay&&mode==='observe'?(h.radioTransmitW||0):(h.radioStandbyW||0);
  let load=(mode==='safe'?h.baseW*0.4:h.baseW+(mode==='observe'?h.payloadW:0))+radioLoad;
  const availableWh=state.batteryWh+generation*minutes/60;
  const requestedWh=load*minutes/60;
  const powered=availableWh>=requestedWh;
  if(!powered){mode='safe';load=h.baseW*0.4+(h.radioStandbyW||0);state.outageMinutes+=minutes;}
  const energy=state.batteryWh+(generation-load)*minutes/60;
  if(state.evidence){
    state.evidence.unservedWh+=Math.max(0,-energy);
    state.evidence.servedWh+=load*minutes/60-Math.max(0,-energy);
    state.evidence.spilledWh+=Math.max(0,energy-state.batteryCapacityWh);
  }
  state.batteryWh=clamp(energy,0,state.batteryCapacityWh);
  state.temperature=clamp(state.temperature+(mode==='observe'?0.42*(state.profile.heat||1):-0.85)+(env.sunlit?0.12:-0.2),8,95);
  // Night science uses the dark fraction of the same integration interval as power.
  const scienceFraction=state.profile.nightScience?1-(env.sunlitFraction??Number(env.sunlit)):1;
  const startSec=operationsElapsedSec(state.tick),endSec=startSec+OPERATION_STEP_SEC;
  const relayResult=stepRelay(state,env,powered,mode,startSec,OPERATION_STEP_SEC);
  const sample=observeInterval(state,env,mode,powered,OPERATION_STEP_SEC,startSec);
  if(!powered)note(state.evidence,'shed',startSec,{batteryWh:state.batteryWh,sunlight:env.sunlitFraction??Number(env.sunlit),requestedWh,availableWh});
  const useful=powered&&mode==='observe'&&h.relevant&&h.orbitFit>0&&scienceFraction>0&&(!state.sampling||state.sampling.meetsBenchmark);
  if(useful){
    state.observedMinutes+=minutes*scienceFraction*state.efficiency*h.orbitFit;
    if(h.relay)state.serviceMinutes+=state.relayTraffic?0:minutes*scienceFraction*state.efficiency*(state.linkedRelay?(env.contactFraction??Number(env.contact)):1);
    const produced=h.dataGbDay/1440*minutes*scienceFraction*state.efficiency;
    const accepted=Math.min(produced,Math.max(0,state.storageCapacityGb-state.storageGb-queuedRelayGb(state)));
    state.storageGb+=accepted;state.collectedGb+=produced;state.lostGb+=produced-accepted;
    recordOperationsAcquisition(state,sample,endSec,produced,accepted);
  }
  let sent=0;
  if(powered&&(env.contactFraction??Number(env.contact))>0&&(mode==='downlink'||(h.relay&&mode==='observe'))){
    sent=Math.min(state.storageGb,Math.max(0,(h.instantDownlinkGbDay??h.downlinkGbDay/Math.max(0.05,state.profile.contact))/1440*minutes*(env.contactFraction??1)-relayResult.sentGb));
    state.storageGb-=sent;state.deliveredGb+=sent;
    recordOperationsReceipt(state,sent,endSec,OPERATION_STEP_SEC);
  }
  if(state.relayTraffic)state.serviceMinutes=state.relayTraffic.receivedSeconds/60;
  state.environment={...env};state.sunlit=env.sunlit;state.contact=env.contact;state.generationW=generation;state.loadW=load;state.activeMode=mode;
  state.intervalDeliveredGb=sent;
  state.transmitting=Boolean(powered&&(sent>0||(state.storageGb>0&&(env.contactFraction??Number(env.contact))>0&&(mode==='downlink'||(h.relay&&mode==='observe')))));
  if(state.cooldown>0)state.cooldown--;
  if(state.contactOutage>0)state.contactOutage--;
  state.tick++;
  state.history.push({tick:state.tick,battery:state.batteryCapacityWh?state.batteryWh/state.batteryCapacityWh*100:0,data:state.storageGb,delivered:state.deliveredGb,temperature:state.temperature,...(state.evidence?{batteryWh:state.batteryWh,generationW:generation,loadW:load,mode,sunlitFraction:env.sunlitFraction??Number(env.sunlit),contactFraction:env.contactFraction??Number(env.contact)}:{})});
  if(state.difficulty!=='easy'){
    const index=state.tick===32?0:state.tick===78?1:-1;
    const id=state.profile.incidents?.[index];
    if(id&&INCIDENTS[id]){state.pendingIncident={id,tick:state.tick};state.log.push({tick:state.tick,type:'incident',text:INCIDENTS[id].name});}
  }
  if(state.tick>=state.totalTicks)state.finished=true;
  return state;
}

export function operationObjectives(state) {
  const duration=state.totalTicks*MINUTES_PER_TICK;
  const opportunity=duration*(state.profile.nightScience?Math.max(0.05,state.profile.eclipse):1);
  const coverage=state.relayTraffic?100*state.relayTraffic.receivedSeconds/Math.max(1,state.relayTraffic.offeredSeconds):clamp((state.profile.relay?state.serviceMinutes:state.observedMinutes)/(state.profile.relay?duration:opportunity)*100,0,100);
  const result=[{id:'coverage',name:state.profile.relay?'Service availability':'Effective observing time',value:coverage,target:state.profile.coverage,unit:'%',passed:coverage>=state.profile.coverage}];
  if(state.profile.delivered>0)result.push({id:'delivery',name:'Raw data returned',value:state.deliveredGb,target:state.profile.delivered,unit:'GB',passed:state.deliveredGb+1e-9>=state.profile.delivered});
  result.push({id:'health',name:'Powered operations',value:100-state.outageMinutes/duration*100,target:90,unit:'%',passed:state.outageMinutes/duration<=0.1});
  return [...result,...scienceObjectives(state.evidence)];
}

export function operationSummary(state) {
  const objectives=operationObjectives(state);
  const windowCompleted=state.tick>=state.totalTicks&&!state.pendingIncident;
  return {...evidenceSummary(state.evidence),missionId:state.missionId,windowCompleted,finished:state.finished,passed:state.finished&&windowCompleted&&objectives.every(o=>o.passed),objectives,
    scienceFactor:state.evidence?scienceCompletion(state.evidence):clamp(objectives[0].value/Math.max(1,state.profile.coverage),0,1),
    deliveredGb:state.deliveredGb,collectedGb:state.collectedGb,lostGb:state.lostGb,storageGb:state.storageGb,
    batteryWh:state.batteryWh,fuelKg:state.fuelKg,decisions:state.resolvedIncidents.length,
    log:state.log.map(e=>({...e})),elapsedMinutes:state.tick*MINUTES_PER_TICK};
}
