import {operationsElapsedSec,OPERATION_STEP_SEC} from '../engine/flightClock.js';
import {observeInterval,recordOperationsAcquisition,recordOperationsReceipt,discard} from './scienceOperations.js';
import {queuedRelayGb,stepRelay} from './relayTraffic.js';
import {note} from './scienceEvidence.js';
import {advancePointing,chooseIntent,pointingEnvironment,powerSlice,SYSTEM_STEP_SEC} from './spacecraftSystems.js';

export const SYSTEM_INCIDENTS = {
  thermal:{name:'Payload overheating',description:'The payload has suspended observations.',choices:[
    {id:'inspect',label:'Inspect telemetry',cost:'60 s · identify the heat source'},
    {id:'cool',label:'Reduce load and cool',cost:'Payload stays offline until it reaches 51 °C'}]},
  radio:{name:'Radio needs a restart',description:'The radio controller stopped responding.',choices:[
    {id:'inspect',label:'Inspect telemetry',cost:'60 s · check radio status and line of sight'},
    {id:'restart',label:'Restart radio',cost:'90 s without radio · observations stay stored'}]},
  storage:{name:'Recorder needs attention',description:'A memory controller error interrupted recorder access.',choices:[
    {id:'inspect',label:'Inspect telemetry',cost:'60 s · identify the error'},
    {id:'diagnose',label:'Diagnose and restart',cost:'120 s without the recorder · observations stay stored'},
    {id:'clear',label:'Clear recorder',cost:'30 s · all undelivered observations are deleted'}]}
};

export function incidentOptions(state,definitions) {
  const f=state.systems?.activeFault;
  if(!f||state.pendingIncident?.id!==f.id)return definitions[state.pendingIncident?.id];
  const definition=SYSTEM_INCIDENTS[f.id];
  return {...definition,choices:definition.choices.filter(c=>c.id!=='inspect'||!f.inspected)};
}

export function forecastIncidentChoice(state,definitions) {
  return incidentOptions(state,definitions)?.choices.find(c=>c.id!=='inspect'&&(state.fuelKg>=3||!['burn','maneuver'].includes(c.id)))?.id;
}

export function incidentEvidence(state) {
  const f=state.systems?.activeFault;
  if(!f)return '';
  if(f.id==='thermal')return `Payload ${Math.round(state.temperature)} °C. `+(f.inspected?'Sustained payload draw exceeded heat rejection. Cooling restores operation below 51 °C.':'Payload protection is latched.');
  if(f.id==='radio')return 'Radio controller offline. '+(f.inspected?'Controller watchdog timeout. A restart clears the latch. Ground visibility still controls the link.':'Last sampled station status: '+(state.contact?'in view.':'out of view.'));
  return `Recorder holds ${state.storageGb.toFixed(2)} GB. `+(f.inspected?'The controller is stalled. A restart can retain stored observations.':'Read/write status: controller error.');
}

export function startSystemFault(state,id,second) {
  const s=state.systems;
  if(!SYSTEM_INCIDENTS[id]||s.activeFault||s.faults.some(f=>f.id===id)||state.tick>=state.totalTicks)return false;
  s.activeFault={id,openSec:second,remainingSec:0,downtimeSec:0,lostGb:0,missedContactSec:0,missedObservationSec:0,inspected:false,actions:[],action:null};
  state.pendingIncident={id,tick:state.tick};
  state.log.push({tick:state.tick,type:'incident',text:SYSTEM_INCIDENTS[id].name});
  return true;
}

export function commandSystemFault(state,choice) {
  const f=state.systems?.activeFault;
  if(!f||state.pendingIncident?.id!==f.id)return null;
  const option=SYSTEM_INCIDENTS[f.id].choices.find(c=>c.id===choice);
  if(!option||choice==='inspect'&&f.inspected)return false;
  f.action=choice;
  f.actions.push(choice);
  f.remainingSec={inspect:60,restart:90,diagnose:120,clear:30,cool:0}[choice];
  state.pendingIncident=null;
  if(choice==='clear'){
    f.lostGb=state.storageGb;
    state.lostGb+=state.storageGb;
    discard(state.evidence);
    state.storageGb=0;
    // A relay recorder also owns undelivered source packets.
    const q=state.relayTraffic;
    if(q){for(const m of q.onboard)q.expired.push({...m,expiredSec:operationsElapsedSec(state.tick),owner:'onboard'});q.onboard=[];}
  }
  state.log.push({tick:state.tick,type:'decision',text:SYSTEM_INCIDENTS[f.id].name+' · '+option.label});
  return true;
}

function stepFault(state,env,intent,seconds,endSec) {
  const s=state.systems, f=s.activeFault;
  if(!f)return;
  f.downtimeSec+=seconds;
  if(env.contact&&f.id!=='thermal')f.missedContactSec+=seconds;
  const planned=state.evidence?.scenario.windows.some(([,a,b])=>state.tick>=a&&state.tick<b)??true;
  if(planned&&f.id!=='radio'&&(intent==='observe'||f.id==='thermal'))f.missedObservationSec+=seconds;
  if(!f.action)return;
  f.remainingSec=Math.max(0,f.remainingSec-seconds);
  if(f.action==='cool'&&s.payloadC>51||f.remainingSec>0)return;
  if(f.action==='inspect'){
    f.action=null;f.inspected=true;
    return;
  }
  f.recoveredSec=endSec;
  s.faults.push(f);s.activeFault=null;
  state.resolvedIncidents.push({id:f.id,choice:f.action,tick:state.tick});
  state.log.push({tick:state.tick,type:'recovery',text:SYSTEM_INCIDENTS[f.id].name+' resolved · '+f.downtimeSec+' s offline. '+(f.lostGb?f.lostGb.toFixed(2)+' GB deleted.':'Stored observations retained.')});
}

export function stepSpacecraftOperations(state,env,incidentDefinitions) {
  const s=state.systems,h=state.hardware, start=operationsElapsedSec(state.tick), end=start+OPERATION_STEP_SEC;
  let observeSec=0,litObserveSec=0,contactObserveSec=0,linkSec=0,sourceSec=0,generation=0,load=0,active='safe',outage=0;
  let observationStart=null,observationEnd=null;
  for(let offset=0;offset<OPERATION_STEP_SEC;offset+=SYSTEM_STEP_SEC){
    const seconds=SYSTEM_STEP_SEC, second=start+offset;
    const sample=pointingEnvironment(state,second+seconds/2);
    const intent=chooseIntent(state,sample,second),fault=s.activeFault;
    const radioReady=!fault||!['radio','storage'].includes(fault.id);
    const payloadReady=!fault||!['thermal','storage'].includes(fault.id);
    const attitude=intent==='observe'&&h.relay&&sample.contact&&radioReady?'downlink':intent;
    const demand=intent==='observe'&&!payloadReady?'charge':intent;
    const checkpoint={quaternion:s.quaternion,intent:s.intent,settleSec:s.settleSec,turnSec:s.turnSec};
    const turn=advancePointing(s,attitude,sample,seconds);
    const usable=seconds-turn;
    const power=powerSlice(state,{...sample,contact:sample.contact&&radioReady},demand,seconds,usable,s.pointingW*turn/seconds,checkpoint);
    if(!power.powered){
      if(!outage)note(state.evidence,'shed',second,{batteryWh:state.batteryWh});
      outage+=seconds;
    }
    generation+=power.generation*seconds;load+=power.requested*seconds;
    active=power.powered?demand:'safe';
    if(power.powered&&active==='observe'){
      // Broad-field magnetometers and relay receivers do not require optical lock.
      const integration=h.directional===false?seconds:usable;
      observeSec+=integration;
      litObserveSec+=integration*Number(sample.sunlit);
      contactObserveSec+=integration*Number(sample.contact&&radioReady);
      if(integration>0){observationStart??=second+seconds-integration;observationEnd=second+seconds;}
      if(radioReady)sourceSec+=seconds;
    }
    if(power.powered&&radioReady&&sample.contact&&(active==='downlink'||h.relay&&active==='observe'))linkSec+=usable;
    stepFault(state,sample,intent,seconds,second+seconds);
  }
  const minutes=OPERATION_STEP_SEC/60;
  const scienceSec=state.profile.nightScience?observeSec-litObserveSec:observeSec;
  const sample=observeInterval(state,{...env,sunlitFraction:observeSec?litObserveSec/observeSec:env.sunlitFraction,
    contactFraction:observeSec?contactObserveSec/observeSec:env.contactFraction},observeSec?'observe':active,observeSec>0||outage===0,
    observeSec||OPERATION_STEP_SEC,observationStart??start);
  // observeInterval counts only the instrument sample here. Restore the time
  // the station was physically visible outside that sample.
  if(state.evidence)state.evidence.contactSec+=OPERATION_STEP_SEC*(env.contactFraction??Number(env.contact))-
    (observeSec?contactObserveSec:OPERATION_STEP_SEC*(env.contactFraction??Number(env.contact)));
  const relay=stepRelay(state,env,true,active,start,OPERATION_STEP_SEC,{sourceFraction:sourceSec/OPERATION_STEP_SEC,earthFraction:linkSec/OPERATION_STEP_SEC});
  const sendable=state.storageGb;
  if(h.relevant&&h.orbitFit>0&&scienceSec>0&&(!state.sampling||state.sampling.meetsBenchmark)){
    state.observedMinutes+=scienceSec/60*state.efficiency*h.orbitFit;
    if(h.relay&&!state.relayTraffic)state.serviceMinutes+=Math.min(scienceSec,linkSec)/60*state.efficiency;
    const produced=h.dataGbDay/86400*scienceSec*state.efficiency;
    const accepted=Math.min(produced,Math.max(0,state.storageCapacityGb-state.storageGb-queuedRelayGb(state)));
    state.storageGb+=accepted;state.collectedGb+=produced;state.lostGb+=produced-accepted;
    recordOperationsAcquisition(state,sample,observationEnd??end,produced,accepted);
  }
  const rate=h.instantDownlinkGbDay??h.downlinkGbDay/Math.max(.05,state.profile.contact);
  // The aggregate interval cannot send observations acquired after its pass.
  const sent=Math.min(sendable,Math.max(0,rate/86400*linkSec-relay.sentGb));
  state.storageGb-=sent;state.deliveredGb+=sent;
  if(sent>0)recordOperationsReceipt(state,sent,end,OPERATION_STEP_SEC);
  if(state.relayTraffic)state.serviceMinutes=state.relayTraffic.receivedSeconds/60;
  state.environment={...env};state.sunlit=env.sunlit;state.contact=env.contact;
  state.generationW=generation/OPERATION_STEP_SEC;state.loadW=load/OPERATION_STEP_SEC;
  state.temperature=s.payloadC;state.activeMode=active;state.intervalDeliveredGb=sent;state.transmitting=sent>0;
  state.outageMinutes+=outage/60;
  if(state.cooldown>0)state.cooldown--;
  if(state.contactOutage>0)state.contactOutage--;
  state.tick++;
  s.track.push({second:end,quaternion:s.quaternion});
  state.history.push({tick:state.tick,battery:state.batteryCapacityWh?100*state.batteryWh/state.batteryCapacityWh:0,
    data:state.storageGb,delivered:state.deliveredGb,temperature:state.temperature,batteryC:s.batteryC,
    batteryWh:state.batteryWh,generationW:state.generationW,loadW:state.loadW,
    mode:active,sunlitFraction:env.sunlitFraction??Number(env.sunlit),contactFraction:env.contactFraction??Number(env.contact)});
  if(state.tick>=state.totalTicks){state.finished=true;return state;}
  if(s.activeFault?.inspected&&!s.activeFault.action){state.pendingIncident={id:s.activeFault.id,tick:state.tick};return state;}
  if(state.difficulty!=='easy'&&!s.activeFault){
    const index=state.tick===32?0:state.tick===78?1:-1;
    const id=state.profile.incidents?.[index];
    if(s.payloadC>=69&&h.payloadW>0){startSystemFault(state,'thermal',end);}
    if(!s.activeFault&&id!=='thermal'){
      // Floodwatch uses its former abstract battery-warning slot for a
      // reproducible radio controller fault. Ground outages remain separate.
      const event=id==='battery'?(state.missionId==='m1'?'radio':null):id;
      if(!startSystemFault(state,event,end)&&incidentDefinitions[event]&&!SYSTEM_INCIDENTS[event]){
        state.pendingIncident={id:event,tick:state.tick};
        state.log.push({tick:state.tick,type:'incident',text:incidentDefinitions[event].name});
      }
    }
  }
  return state;
}

export function systemsSummary(s) {
  if(!s)return {};
  return {spacecraftSystems:{batteryC:s.batteryC,payloadC:s.payloadC,minBatteryC:s.minBatteryC,peakPayloadC:s.peakPayloadC,
    heaterWh:s.heaterWh,turnSec:s.turnSec,decisions:s.decisions,faults:[...s.faults,...(s.activeFault?[s.activeFault]:[])]}};
}
