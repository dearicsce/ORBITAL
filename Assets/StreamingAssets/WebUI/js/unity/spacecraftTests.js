import {createOperations} from '../engine/operations.js';
import {evaluateDesign} from '../engine/evaluate.js';
import {placementIssues,projectAssembly} from '../workshop/blueprint.js';
import {geometryIssues} from '../workshop/collision.js';
import {launcherFor} from '../rocket/engineering.js';
import {advancePointing,BATTERY_LIMIT_C,PAYLOAD_LIMIT_C,powerSlice,SYSTEM_STEP_SEC} from './spacecraftSystems.js';

export const TESTS = {
  eclipse:{label:'Eclipse test',fixture:'36 minutes in shadow. Starts at 60% charge and 12 °C. Payload and essential systems requested.'},
  radio:{label:'Radio test',fixture:'120-second clear Earth-orbit station pass in shadow. Starts Sun-facing with 60% charge. Send 1 MB after settling.'},
  deployment:{label:'Deployment test',fixture:'Fits and sampled solar-wing sweep from stowed to deployed. Fixed antennas and thermal hardware are fit checked.'}
};
export function testDesignIdentity(design,data) {
  const launcher=launcherFor(design,data), a=design.assembly;
  return JSON.stringify([a.busId,launcher?.fairingRadiusM??null,launcher?.fairingHeightM??null,
    a.components.map(c=>[c.instanceId,c.catalogId,c.attachmentSurfaceId,c.bayId,c.localPosition,c.localRotation,c.placementStatus,c.configuration.propulsionPort??null])]);
}
const result=(passed,message,route)=>({passed,message,route});

export function runSpacecraftTest(id,input,data) {
  const design=projectAssembly(structuredClone(input),data);
  const a=design.assembly;
  if(!a?.busId)return result(false,'Choose a bus to run this test.','bus');
  if(id==='deployment'){
    const issue=placementIssues(a,data)[0]??geometryIssues(a,data,launcherFor(design,data)).find(x=>x.step==='launcher');
    if(issue)return result(false,issue.message,issue.step==='launcher'?'launcher':issue.instanceId||'bus');
    return result(true,a.components.some(c=>c.catalogId.startsWith('panel_'))?
      'Fit checked. Modeled solar wings cleared the sampled sweep.':'Fit checked. No modeled deployable wings are fitted.','');
  }
  const fixture=data.missions.find(m=>m.id==='m1')||data.missions[0];
  const testDesign={...design,missionId:fixture.id,orbitId:'leo',orbitElements:null};
  const state=createOperations(testDesign,data,evaluateDesign(testDesign,data),{science:false});
  const {hardware:h,systems:s}=state;
  const dark={sunlit:false,contact:id==='radio',sun:[1,0,0],earth:[0,0,1],target:[0,-1,0]};
  state.batteryWh*=.60;
  if(id==='eclipse'){
    s.batteryC=12;s.payloadC=12;s.minBatteryC=12;s.peakPayloadC=12;
    let online=Boolean(design.computerId)&&state.batteryCapacityWh>0, lackedPower=false;
    let minWh=state.batteryWh, minPayload=12;
    for(let second=0;second<2160;second+=SYSTEM_STEP_SEC){
      const mode=s.batteryC<=BATTERY_LIMIT_C||s.payloadC>=PAYLOAD_LIMIT_C?'safe':'observe';
      const p=powerSlice(state,dark,mode,SYSTEM_STEP_SEC);
      lackedPower||=!p.powered;
      minWh=Math.min(minWh,state.batteryWh);
      minPayload=Math.min(minPayload,s.payloadC);
      online&&=p.powered&&mode==='observe';
    }
    const reason=!design.computerId?'A flight computer is required.':lackedPower||minWh<=.05?'Reserve could not support the required loads through the shadow.':
      s.minBatteryC<=BATTERY_LIMIT_C?'The battery became too cold.':'The payload exceeded its temperature limit.';
    const route=!design.computerId?'computer':lackedPower||minWh<=.05?'battery':'thermal';
    const summary=`Lowest reserve ${minWh.toFixed(1)} Wh · battery ${Math.round(s.minBatteryC)} °C min · payload ${Math.round(minPayload)} to ${Math.round(s.peakPayloadC)} °C.`;
    return result(online,`${summary} ${online?'Required loads stayed powered.':reason}`,online?'':route);
  }
  if(id!=='radio')throw Error('Unknown spacecraft test');
  if(!design.commsId)return result(false,'Install a radio to send the packet.','comms');
  if(!design.pointingId)return result(false,'Install attitude control to point the radio.','pointing');
  if(!design.computerId)return result(false,'Install a flight computer to send the packet.','computer');
  advancePointing(s,'charge',dark,1000);
  let sent=0, powerFailure=false;
  const rated=h.instantDownlinkGbDay??h.downlinkGbDay/Math.max(.05,state.profile.contact);
  for(let elapsed=0;elapsed<120;elapsed+=SYSTEM_STEP_SEC){
    const turn=advancePointing(s,'downlink',dark,SYSTEM_STEP_SEC);
    const useful=SYSTEM_STEP_SEC-turn;
    const p=powerSlice(state,dark,'downlink',SYSTEM_STEP_SEC,useful,s.pointingW*turn/SYSTEM_STEP_SEC);
    if(!p.powered){powerFailure=true;break;}
    sent+=rated*useful/86400;
    if(sent>=.001)return result(true,`1 MB received at the fixture station. Radio transmit draw ${h.radioTransmitW} W.`,'');
  }
  if(powerFailure)return result(false,`The battery could not support the ${h.radioTransmitW} W radio and spacecraft load.`,'battery');
  if(s.settleSec>0)return result(false,'The antenna did not finish turning before the fixture pass ended.','pointing');
  return result(false,'The fitted radio did not finish the packet during the pass.','comms');
}
