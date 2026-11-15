import {makeBlueprint, catalog, placementIssues, instance, projectAssembly} from './workshop/blueprint.js';
import {metadata} from './workshop/structure.js';
import {checkLaunchGate} from './engine/gate.js';

const KEY = 'orbital_academy_v1';
export const ACADEMY_KIT = ['bus_micro','bus_small','panel_m','battery_m','computer_basic','optical_camera','comms_x_band','fuel_s','pointing_reaction_wheels'];
export const LESSONS = [
  ['First spacecraft','Choose a bus and inspect any two faces using the camera buttons. The bus defines the mounting faces and bay capacity.'],
  ['Power','Install two independent medium solar wings. Move each wing using its U or V field or the Move handles. Toggle Stowed on and off to inspect deployment.'],
  ['Internal equipment','Install a medium battery and the basic flight computer. Their bays provide eclipse power and data processing.'],
  ['Purpose','Install the optical camera and X-band radio. The camera fills the recorder. The radio empties it during ground passes.'],
  ['Engineering review','The instructor installed a fuel pack and reaction wheels, then disconnected the radio. Select the radio and reset its placement. Clear launch blockers before continuing.'],
  ['First launch','Inspect the Falcon 9 training preset and its payload margin. Launch into the assigned low Earth orbit.'],
  ['First operations','Deploy the solar wings. Command Observe until data reaches the recorder, then command Transmit during a ground pass.'],
  ['First custom rocket','Build a two-stage ORBITAL launcher using the training hardware. Check its staging and launch margin.']
];

export function readAcademy(storage = globalThis.localStorage) {
  try {
    const state=JSON.parse(storage?.getItem(KEY)||'null');
    if(state?.version===1&&Number.isInteger(state.step)&&state.step>=0&&state.step<=LESSONS.length&&Number.isInteger(state.furthest)&&state.furthest>=state.step&&state.furthest<=LESSONS.length&&Array.isArray(state.faces)&&state.wings&&typeof state.wings==='object')return state;
  } catch {}
  return {version:1,step:0,furthest:0,faces:[],wings:{},folded:false,unfolded:false,blueprint:null,flight:null,skipped:false};
}

export function saveAcademy(state, storage = globalThis.localStorage) {
  try {storage?.setItem(KEY,JSON.stringify(state));return true;} catch {return false;}
}

export function advanceAcademy(state) {
  state.step=Math.min(LESSONS.length,state.step+1);
  state.furthest=Math.max(state.furthest,state.step);
  saveAcademy(state);
}

export function academyWorld(data){
  return {...data,
    parts:data.parts.map(p=>p.id==='bus_small'?{...p,name:'Small bus · training avionics',baseLoad:30,resources:{...p.resources,basePowerW:30}}:p),
    launchers:data.launchers.map(l=>l.id==='kestrel'?{...l,fairingRadiusM:1.95}:l)
  };
}

export function academyBlueprint(state,data) {
  return state.blueprint||makeBlueprint({busId:null},data,'Academy spacecraft');
}

export function academyDesign(assembly,data) {
  return projectAssembly({missionId:'tutorial',difficulty:'easy',orbitId:'leo',launcherId:'kestrel',assembly},data);
}

export function academyCheckpoint(state, assembly, data) {
  if(!assembly.busId)return false;
  const parts=type=>assembly.components.filter(c=>catalog(data,c.catalogId)?.category===type);
  const issues=placementIssues(assembly,data,ACADEMY_KIT);
  const valid=items=>items.every(c=>!issues.some(i=>i.instanceId===c.instanceId));
  if(state.step===0)return state.faces.length>=2;
  if(state.step===1){
    const wings=parts('panel');
    return wings.length===2&&valid(wings)&&wings.every(c=>{
      const first=state.wings[c.instanceId];
      return !c.symmetryId&&first&&first.some((v,i)=>v!==[c.attachmentSurfaceId,...c.localPosition][i]);
    })&&state.unfolded;
  }
  if(state.step===2)return parts('battery').length===1&&parts('computer').length===1&&valid([...parts('battery'),...parts('computer')]);
  if(state.step===3)return parts('instrument').length===1&&parts('comms').length===1&&valid([...parts('instrument'),...parts('comms')]);
  if(state.step===4)return checkLaunchGate(academyDesign(assembly,data),data,ACADEMY_KIT).every(c=>c.ok);
  return false;
}

export function introduceFault(assembly,data){
  const radio=assembly.components.find(c=>c.catalogId==='comms_x_band');
  if(radio)radio.localPosition[2]=.06;
  const occupied=new Set();
  for(const component of assembly.components.filter(c=>c.bayId)){
    const start=Number(component.bayId.slice(4));
    for(let i=0;i<metadata(catalog(data,component.catalogId)).bayUnits;i++)occupied.add(start+i);
  }
  for(const [id,type] of [['fuel_s','fuel'],['pointing_reaction_wheels','pointing']]){
    if(assembly.components.some(c=>catalog(data,c.catalogId)?.type===type))continue;
    let bay=0;while(occupied.has(bay))bay++;
    const component=instance(id,{bay:'bay-'+bay});
    if(type==='fuel')component.configuration.propulsionPort=0;
    assembly.components.push(component);occupied.add(bay);
  }
}

