import {advancePointing,advanceThermal,heaterDemand,RULE_PRESETS,PAYLOAD_LIMIT_C,BATTERY_LIMIT_C} from './spacecraftSystems.js';

const directions={sun:[1,0,0],earth:[0,0,1],target:[0,0,-1]};

export function cruiseSystemsPower(state,seconds,sunAu,loadW,generation) {
  const s=state.systems,h=state.hardware,start=state.elapsedSec;
  const flux=1/Math.max(.35,sunAu)**2, encounter=state.phase==='encounter', returning=state.phase==='return';
  // Cruise uses a shielded equipment bay and constant midpoint solar flux.
  const boundaryC=-9+8*Math.min(1.7,flux);
  let usableSec=0, missingSec=0;
  for(let elapsed=0;elapsed<seconds;){
    const steady=!encounter&&!returning&&elapsed>=43200;
    let dt=Math.min(seconds-elapsed,steady?seconds:60);
    const command=state.uplink;
    if(command&&command.arrivesSec>start+elapsed)dt=Math.min(dt,command.arrivesSec-start-elapsed);
    if(command&&command.arrivesSec<=start+elapsed){
      state.transmit=command.transmit;
      state.groundHold=!command.transmit;
      state.uplink=null;
      state.log.push({tick:state.tick,elapsedSec:start+elapsed,text:state.transmit?'Earth command received. Downlink enabled.':'Earth command received. Downlink paused.'});
    }
    const reserve=100*state.batteryWh/Math.max(1,h.batteryWh);
    const [low,high]=RULE_PRESETS.reserve[s.rules.reservePreset];
    s.reserve=s.rules.reserve&&(s.reserve?reserve<high:reserve<=low);
    const [hot,cool]=RULE_PRESETS.hot[s.rules.hotPreset];
    s.hot=s.rules.hot&&(s.hot?s.payloadC>cool:s.payloadC>=hot);
    const [full,empty]=RULE_PRESETS.recorder[s.rules.recorderPreset];
    const fill=100*state.storageGb/h.recorderGb;
    s.recorder=s.rules.recorder&&(s.recorder?fill>empty:fill>=full);
    const protectedMode=s.reserve||s.batteryC<=BATTERY_LIMIT_C||reserve<=3;
    const canObserve=encounter&&!s.hot&&s.payloadC<PAYLOAD_LIMIT_C;
    const tx=returning&&state.storageGb>0&&(state.transmit||s.recorder&&!state.groundHold);
    const intent=protectedMode?'safe':canObserve?'observe':tx?'downlink':'charge';
    const reason=protectedMode?'Autopilot reduced cruise loads to protect the battery.':encounter&&!canObserve?
      'Autopilot paused encounter science to cool the payload.':tx&&!state.transmit?
      'Autopilot is returning data to free recorder space.':'';
    if(reason!==s.lastReason){
      s.lastReason=reason;
      if(reason&&s.decisions.length<240){
        s.decisions.push({second:start+elapsed,intent,reason});
        state.log.push({tick:state.tick,elapsedSec:start+elapsed,text:reason});
      }
    }
    const checkpoint={quaternion:s.quaternion,intent:s.intent,settleSec:s.settleSec,turnSec:s.turnSec};
    const slew=advancePointing(s,intent,directions,dt), activity=dt-slew;
    const base=protectedMode?h.hotelW*.65:h.hotelW;
    const nominalPayload=encounter?Math.max(0,loadW-h.hotelW):0;
    const payload=intent==='observe'?nominalPayload*activity/dt:0;
    const radio=intent==='downlink'?h.radioW*activity/dt:0;
    let heater=heaterDemand(s);
    if(steady&&s.heaterW>0){
      // For the long remainder of a constant-input coast segment, average
      // the experienced thermostat cycle across the 8–13 °C band.
      const k=.54*(1-s.blanket)+s.radiator*.20;
      const off=boundaryC+.19*base/k,on=off+s.heaterW/k;
      if(off<8&&on>13){
        const coolTime=Math.log((13-off)/(8-off)),warmTime=Math.log((on-8)/(on-13));
        heater=s.heaterW*warmTime/(warmTime+coolTime);
      }else heater=off>=13?0:on<=13?s.heaterW:heater;
    }
    let load=base+payload+radio+heater+s.pointingW*slew/dt;
    const available=state.batteryWh+generation*dt/3600;
    const ready=available+1e-9>=load*dt/3600;
    if(!ready){
      Object.assign(s,checkpoint);
      if(available<(base+heater)*dt/3600)heater=0;
      load=base+heater;
    }
    const missing=Math.max(0,load*dt/3600-available);
    const energy=available-load*dt/3600;
    state.batteryWh=Math.max(0,Math.min(h.batteryWh,energy));
    if(state.evidence){
      state.evidence.unservedWh+=missing;
      state.evidence.servedWh+=load*dt/3600-missing;
      state.evidence.spilledWh+=Math.max(0,energy-h.batteryWh);
      state.evidence.minimumWh=Math.min(state.evidence.minimumWh,state.batteryWh);
    }
    if(missing>0){
      missingSec+=Math.min(dt,missing*3600/(load-generation));
    }
    advanceThermal(s,{boundaryC,seconds:dt,baseW:Math.min(available*3600/dt,base+(ready?radio:0)),payloadW:ready?payload:0,heaterW:heater});
    if(ready&&(intent==='observe'||intent==='downlink'))usableSec+=activity;
    elapsed+=dt;
  }
  state.outageSec+=missingSec;
  state.usefulIntervalSec=usableSec;
  return missingSec===0;
}

export function queueCruiseTransmit(state) {
  if(state.uplink)return false;
  const transmit=state.pending==='downlink'||!state.transmit&&!state.systems.recorder||Boolean(state.groundHold);
  const arrivesSec=state.elapsedSec+state.trajectory.lightMinutes*60;
  state.uplink={transmit,arrivesSec};
  state.pending=null;
  state.log.push({tick:state.tick,elapsedSec:state.elapsedSec,text:'Earth sent the '+(transmit?'downlink':'pause')+' command. Arrival in '+state.trajectory.lightMinutes.toFixed(1)+' min.'});
  return true;
}
