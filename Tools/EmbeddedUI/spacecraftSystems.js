import {catalog, panelItems} from '../workshop/blueprint.js';
import {surfaces} from '../workshop/structure.js';
import {geometryAt, surfacePoint, toInertial} from '../engine/orbitalGeometry.js';
import {validateRules,RULE_PRESETS} from '../workshop/autonomy.js';
export {validateRules,RULE_PRESETS,DEFAULT_RULES} from '../workshop/autonomy.js';

export const MODES = ['auto', 'observe', 'downlink', 'charge', 'safe'];
export const INTENTS = {observe:'Observe target', downlink:'Point to Earth', charge:'Charge', safe:'Safe · Sun-facing'};
export const SYSTEM_STEP_SEC = 15;
export const PAYLOAD_LIMIT_C = 74;
export const BATTERY_LIMIT_C = -12;
const SUN = [1, 0, 0];
const IDENTITY = [0, 0, 0, 1];
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const dot = (a, b) => a.reduce((n, x, i) => n + x * b[i], 0);
const unit = a => a.map(x => x / (Math.hypot(...a) || 1));
const cross = ([x,y,z], [a,b,c]) => [y*c-z*b,z*a-x*c,x*b-y*a];
const sub = (a, b) => a.map((x,i) => x-b[i]);
const radians = n => n * Math.PI / 180;
const render = ([x,y,z]) => [x,z,-y];

function rotationBetween(a, b) {
  const alignment = dot(a,b);
  if (alignment < -.999999) return [...unit(cross(a,Math.abs(a[0])<.8?[1,0,0]:[0,1,0])),0];
  return unit([...cross(a,b),1+alignment]);
}
function mixRotation(a,b,fraction) {
  let cosine = clamp(dot(a,b),-1,1);
  if (cosine<0) { b=b.map(x=>-x);cosine=-cosine; }
  if (cosine>.99995) return unit(a.map((x,i)=>x+(b[i]-x)*fraction));
  const angle=Math.acos(cosine), denominator=Math.sin(angle);
  return a.map((x,i)=>(x*Math.sin((1-fraction)*angle)+b[i]*Math.sin(fraction*angle))/denominator);
}
function rotate(q,v) {
  const axis=q.slice(0,3), uv=cross(axis,v), uuv=cross(axis,uv);
  return v.map((x,i)=>x+2*(q[3]*uv[i]+uuv[i]));
}

export function createSystems(design,data,{attitude=true}={}) {
  const components=design.assembly?.components;
  const pointing=catalog(data,design.pointingId);
  const radio=components?.find(c=>c.catalogId===design.commsId);
  const plannedPayload=data.missions.find(m=>m.id===design.missionId)?.payload;
  const payload=components?.find(c=>c.catalogId===plannedPayload)??components?.find(c=>design.instrumentIds?.includes(c.catalogId));
  const mounts=surfaces(design.busId);
  const panels=components?components.filter(c=>catalog(data,c.catalogId)?.type==='panel').map(c=>{
    const mount=mounts[c.attachmentSurfaceId]||mounts.right, angle=radians(c.localRotation[1]);
    return {w:(catalog(data,c.catalogId).power||0)/2,axis:mount.u.map((x,i)=>-x*Math.cos(angle)+mount.v[i]*Math.sin(angle))};
  }):panelItems(design,data).map(p=>({w:p.power,axis:[0,0,1]}));
  const thermalParts=(design.thermalIds||[]).map(id=>catalog(data,id)).filter(Boolean);
  return {
    version:1, rules:validateRules(design.assembly?.autonomy??design.autonomy), reserve:false, hot:false, recorder:false,
    batteryC:18, payloadC:24, minBatteryC:18, peakPayloadC:24, heaterOn:false, heaterWh:0,
    radiator:Math.min(2,thermalParts.reduce((n,p)=>n+(p.radiatorWPerK||0),0)),
    blanket:Math.min(.60,thermalParts.reduce((n,p)=>n+(p.insulationFraction||0),0)),
    heaterW:thermalParts.reduce((n,p)=>n+(p.heaterW||0),0), pointingW:pointing?.power||0,
    rateDegSec:{coarse:.65,fine:2.5,precision:1.8}[pointing?.quality]??.3,
    attitude, panels, payloadAxis:mounts[payload?.attachmentSurfaceId]?.normal??[0,0,1],
    radioAxis:mounts[radio?.attachmentSurfaceId]?.normal??[0,1,0],
    quaternion:[...IDENTITY], intent:'charge', settleSec:0, turnSec:0,
    lastReason:'', activeFault:null, faults:[], decisions:[], track:[]
  };
}

export function validateSystems(s) {
  if (s===undefined) return; // Historical runs retain their original resource model.
  if (s?.version!==1||!Object.hasOwn(INTENTS,s.intent)) throw Error('Invalid spacecraft systems checkpoint');
  validateRules(s.rules);
  for (const key of ['batteryC','payloadC','minBatteryC','peakPayloadC','heaterW','heaterWh','radiator','blanket','pointingW','rateDegSec','settleSec','turnSec']) {
    if (!Number.isFinite(s[key])) throw Error('Invalid spacecraft systems '+key);
  }
  const vector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite)&&Math.abs(Math.hypot(...v)-1)<.001;
  if (!vector(s.quaternion,4)||!vector(s.radioAxis,3)||!vector(s.payloadAxis,3)||!Array.isArray(s.panels)||
      s.panels.length>128||s.panels.some(p=>!vector(p.axis,3)||!Number.isFinite(p.w)||p.w<0)||
      s.rateDegSec<=0||s.settleSec<0||s.settleSec>12||s.heaterWh<0||s.turnSec<0||s.blanket<0||s.blanket>.60||
      ['reserve','hot','recorder','attitude','heaterOn'].some(key=>typeof s[key]!=='boolean')||
      typeof s.lastReason!=='string'||s.lastReason.length>240) throw Error('Invalid spacecraft systems state');
  for(const field of ['faults','decisions','track'])if(!Array.isArray(s[field])||s[field].length>240)throw Error('Invalid spacecraft systems '+field);
  if(s.track.some(frame=>!Number.isFinite(frame.second)||!vector(frame.quaternion,4)))throw Error('Invalid pointing history');
  for(const f of [...s.faults,...(s.activeFault?[s.activeFault]:[])]){
    if(!['thermal','storage','radio'].includes(f.id)||!Number.isFinite(f.openSec)||!Number.isFinite(f.remainingSec)||
        f.remainingSec<0||f.remainingSec>120||!Number.isFinite(f.downtimeSec)||f.downtimeSec<0||
        !Number.isFinite(f.lostGb)||f.lostGb<0||typeof f.inspected!=='boolean'||
        !Array.isArray(f.actions)||f.actions.some(a=>!['inspect','cool','restart','diagnose','clear'].includes(a)))throw Error('Invalid fault checkpoint');
  }
}

export function pointingEnvironment(state, second) {
  if (!state.orbit) {
    const phase=(state.tick%20+(second%270)/270)/20;
    return {sunlit:phase<1-state.profile.eclipse,contact:phase>=1-state.profile.contact&&state.contactOutage<=0,
      sun:SUN,earth:[0,0,1],target:[0,-1,0],visibleStations:[]};
  }
  const g=geometryAt(state.orbit,second,state.stations);
  const lunar=state.orbit.body==='moon';
  const station=state.stations?.find(s=>s.id===g.visibleStations[0]);
  const earthPoint=lunar?[384400000,0,0]:station?
    toInertial(surfacePoint('earth',station.latitudeDeg,station.longitudeDeg),'earth',second+(state.orbit.epochS??0)):[0,0,0];
  return {...g,contact:g.contact&&state.contactOutage<=0,sun:SUN,
    earth:unit(render(sub(earthPoint,g.positionM))),target:unit(render(g.positionM).map(n=>-n))};
}

export function advancePointing(s,intent,env,seconds) {
  if (!s.attitude) return 0;
  if (intent!==s.intent) { s.intent=intent; s.settleSec=12; }
  const desired=intent==='observe'?rotationBetween(s.payloadAxis,env.target):
    intent==='downlink'?rotationBetween(s.radioAxis,env.earth):rotationBetween(s.panels[0]?.axis??[0,0,1],env.sun);
  const angle=2*Math.acos(clamp(Math.abs(dot(s.quaternion,desired)),0,1));
  // Tracking corrections inside three degrees do not withdraw the settled state.
  if (angle<=radians(3)&&s.settleSec===0) { s.quaternion=desired; return 0; }
  const slew=angle/radians(s.rateDegSec);
  const used=Math.min(seconds,slew+s.settleSec);
  s.quaternion=mixRotation(s.quaternion,desired,slew?Math.min(1,seconds/slew):1);
  s.settleSec=Math.max(0,s.settleSec-Math.max(0,seconds-slew));
  s.turnSec+=used;
  return used;
}

export function solarOutput(s,nominalW,env) {
  if (!env.sunlit) return 0;
  if (!s.attitude||!s.panels.length) return nominalW;
  // The absorbed/collected fraction is applied once to raw wing nameplate power.
  return s.panels.reduce((sum,p)=>sum+p.w*(.65+.35*Math.abs(dot(rotate(s.quaternion,p.axis),env.sun))),0);
}

export function heaterDemand(s) {
  if (s.batteryC<=8) s.heaterOn=s.heaterW>0;
  else if (s.batteryC>=13) s.heaterOn=false;
  return s.heaterOn?s.heaterW:0;
}

export function advanceThermal(s,{seconds,sunlit,baseW,payloadW,heaterW,boundaryC}) {
  // Linearized effective heat rejection, exact update under constant input (J/K, W/K, W).
  const bath=boundaryC??(-32+31*Number(sunlit));
  const evolve=(current,capacity,conductance,watts)=>{
    const equilibrium=bath+watts/conductance;
    return clamp(equilibrium+(current-equilibrium)*Math.exp(-conductance*seconds/capacity),-80,120);
  };
  s.batteryC=evolve(s.batteryC,2700,.54*(1-s.blanket)+s.radiator*.20,.19*baseW+heaterW);
  s.payloadC=evolve(s.payloadC,3400,.79*(1-s.blanket)+s.radiator,.13*baseW+.59*payloadW);
  s.minBatteryC=Math.min(s.minBatteryC,s.batteryC);
  s.peakPayloadC=Math.max(s.peakPayloadC,s.payloadC);
  s.heaterWh+=heaterW*seconds/3600;
}

export function chooseIntent(state,env,second) {
  const s=state.systems, r=s.rules;
  const reserve=100*state.batteryWh/Math.max(1,state.batteryCapacityWh);
  const fill=100*state.storageGb/Math.max(.001,state.storageCapacityGb);
  const [low,recovered]=RULE_PRESETS.reserve[r.reservePreset];
  const [hot,cool]=RULE_PRESETS.hot[r.hotPreset];
  const [full,empty]=RULE_PRESETS.recorder[r.recorderPreset];
  s.reserve=r.reserve&&(s.reserve?reserve<recovered:reserve<=low);
  s.hot=r.hot&&(s.hot?s.payloadC>cool:s.payloadC>=hot);
  s.recorder=r.recorder&&(s.recorder?fill>empty:fill>=full);
  let intent=state.mode, reason='';
  if (state.cooldown>0) { intent='safe'; reason='Safe mode is helping a subsystem recover.'; }
  else if (s.batteryC<=BATTERY_LIMIT_C||reserve<=3||s.payloadC>=PAYLOAD_LIMIT_C&&intent!=='downlink') {
    intent='safe';reason='Safety override reduced load to protect the spacecraft.';
  } else if (intent==='auto') {
    if (s.reserve) { intent='safe';reason='Autopilot entered Safe mode to protect battery reserve.'; }
    else if (s.hot) { intent='charge';reason='Autopilot paused observation to cool the payload.'; }
    else if (!s.activeFault&&env.contact&&s.recorder) { intent='downlink';reason='Autopilot is returning data to free recorder space.'; }
    else if (!s.activeFault&&env.contact&&state.storageGb>.05&&!state.hardware.relay&&(!state.evidence?.scenario.windows.some(([,a,b])=>state.tick>=a&&state.tick<b)||fill<full)) { intent='downlink';reason='Autopilot is using this scheduled ground pass.'; }
    else { intent='observe';reason=state.hardware.relay?'Autopilot is listening for relay traffic.':'Autopilot is following the observation plan.'; }
  }
  if (reason!==s.lastReason) {
    s.lastReason=reason;
    if(reason&&s.decisions.length<240)s.decisions.push({second,intent,reason});
    if(reason)state.log.push({tick:state.tick,type:'autonomy',text:reason});
  }
  return intent;
}

export function powerSlice(state,env,intent,seconds,usableSec=seconds,turnW=0,previousPointing=null) {
  const h=state.hardware,s=state.systems;
  let generation=solarOutput(s,h.panelW,env);
  const hours=seconds/3600, useful=usableSec/seconds;
  const protectedMode=intent==='safe'||intent==='charge';
  let base=protectedMode?h.baseW*.4:h.baseW;
  const payload=intent==='observe'?h.payloadW*(h.directional===false?1:useful):0;
  const transmit=(intent==='downlink'||h.relay&&intent==='observe')&&env.contact;
  const standby=h.radioStandbyW||0;
  const radio=transmit?standby+((h.radioTransmitW||0)-standby)*useful:standby;
  let heater=heaterDemand(s);
  let available=state.batteryWh+generation*hours;
  let requested=base+payload+radio+turnW+heater;
  const powered=available+1e-9>=requested*hours;
  if (!powered) {
    if(previousPointing){
      Object.assign(s,previousPointing);
      generation=solarOutput(s,h.panelW,env);
      available=state.batteryWh+generation*hours;
    }
    base=h.baseW*.4;
    if(available<(base+standby+heater)*hours)heater=0;
    requested=base+standby+heater;
  }
  const energy=available-requested*hours;
  state.batteryWh=clamp(energy,0,state.batteryCapacityWh);
  if (state.evidence) {
    state.evidence.unservedWh+=Math.max(0,-energy);
    state.evidence.servedWh+=requested*hours-Math.max(0,-energy);
    state.evidence.spilledWh+=Math.max(0,energy-state.batteryCapacityWh);
    state.evidence.minimumWh=Math.min(state.evidence.minimumWh,state.batteryWh);
  }
  advanceThermal(s,{seconds,sunlit:env.sunlit,baseW:Math.min(requested-(powered?payload:0)-heater,available/hours),
    payloadW:powered?payload*(state.profile.heat||1):0,heaterW:heater});
  return {powered,essential:energy>=-1e-9,generation,requested};
}
