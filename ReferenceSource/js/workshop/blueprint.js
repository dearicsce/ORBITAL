import {assertSerializable} from '../contracts/serializable.js';
import {geometryIssues} from './collision.js';
import {structure,surfaces,metadata} from './structure.js';
export const BLUEPRINT_VERSION=1;
export const uid=()=>globalThis.crypto?.randomUUID?.()||`part-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const copy=value=>structuredClone(value);
export const catalog=(data,id)=>[...data.parts,...data.instruments].find(p=>p.id===id);
export function instance(catalogId,{surface='front',bay=null,position=[0,0,0],rotation=[0,0,0]}={}){
 return {instanceId:uid(),catalogId,parentInstanceId:'bus',attachmentSurfaceId:bay?null:surface,bayId:bay,localPosition:[...position],localRotation:[...rotation],configuration:{},placementStatus:'placed'};
}
export function migrateAssembly(design,data){
 if(design.assembly)return validateAssembly(copy(design.assembly),data);
 const components=[];
 for(const [field,type]of [['batteryIds','battery'],['fuelIds','fuel'],['instrumentIds','instrument'],['commsId','comms'],['computerId','computer'],['pointingId','pointing']]){
  const values=Array.isArray(design[field])?design[field]:design[field]?[design[field]]:[];
  for(const [index,id]of values.entries()){const p=catalog(data,id);if(!p)continue;const internal=metadata(p).internal;
   const installed=instance(id,internal?{bay:`bay-${components.filter(c=>c.bayId).reduce((sum,c)=>sum+metadata(catalog(data,c.catalogId)).bayUnits,0)}`}:{surface:type==='comms'?'top':'front',position:[(values.length>1?(index%2-.5)*.3:0),index>=2?.3:0,0]});if(type==='fuel')installed.configuration.propulsionPort=components.filter(c=>catalog(data,c.catalogId)?.type==='fuel').length;components.push(installed);}
 }
 (design.panelIds||[]).forEach((id,i)=>{for(const surface of ['left','right'])components.push(instance(id,{surface,position:[(design.panelIds||[]).length>1?(i?-.18:.18):0,(i?-.4:.4)*((design.panelIds||[]).length>1?surfaces(design.busId)[surface].size[1]:0),0]}));});
 return {schemaVersion:BLUEPRINT_VERSION,units:{position:'m',rotation:'degrees'},busInstanceId:'bus',busId:design.busId||null,components};
}
export function validateAssembly(a,data){
 assertSerializable(a);
 if(!a||a.units?.position!=='m'||a.units?.rotation!=='degrees'||a.schemaVersion!==1||a.busInstanceId!=='bus'||!Array.isArray(a.components)||a.components.length>128)throw Error('Unsupported assembly or more than 128 components');
 if(a.busId!==null&&(typeof a.busId!=='string'||!a.busId||a.busId.length>100||data?.parts.some(p=>p.id===a.busId&&p.type!=='bus')))throw Error('Invalid bus identity');
 const seen=new Set(['bus']);
 for(const c of a.components){
  if(typeof c.instanceId!=='string'||!c.instanceId||seen.has(c.instanceId))throw Error('Duplicate or invalid component identity');seen.add(c.instanceId);
  const p=catalog(data,c.catalogId);if(typeof c.catalogId!=='string'||!c.catalogId||c.catalogId.length>100||p?.type==='bus')throw Error('Invalid component '+c.catalogId);
  if(!c.configuration||typeof c.configuration!=='object'||Array.isArray(c.configuration))throw Error('Invalid component configuration');
  if(c.configuration.propulsionPort!==undefined&&(!Number.isSafeInteger(c.configuration.propulsionPort)||c.configuration.propulsionPort<0||c.configuration.propulsionPort>64))throw Error('Invalid propulsion port');
  if(c.symmetryId!==undefined&&(typeof c.symmetryId!=='string'||!c.symmetryId||c.symmetryId.length>100))throw Error('Invalid symmetry identity');
  if(c.parentInstanceId!=='bus')throw Error('Components must attach directly to bus; invalid parent or cycle');
  for(const key of ['localPosition','localRotation'])if(!Array.isArray(c[key])||c[key].length!==3||c[key].some(n=>!Number.isFinite(n)||Math.abs(n)>10000))throw Error('Invalid '+key);
  if(c.attachmentSurfaceId!==null&&!Object.hasOwn(surfaces(a.busId),c.attachmentSurfaceId))throw Error('Unknown attachment surface');
  if(c.bayId!==null&&(typeof c.bayId!=='string'||!/^bay-\d+$/.test(c.bayId)||!Number.isSafeInteger(Number(c.bayId.split('-')[1]))||Number(c.bayId.split('-')[1])>1000))throw Error('Invalid equipment bay');
  if(!['placed','needs-placement'].includes(c.placementStatus))throw Error('Invalid placement status');
 }
 for(const c of a.components)if(c.symmetryId&&a.components.filter(v=>v.symmetryId===c.symmetryId).length!==2)throw Error('A linked symmetry group must contain exactly two components');
 return a;
}
// Legacy arrays are a derived adapter for the existing mission simulator, never editable in Workshop.
export function projectAssembly(design,data){
 if(!design.assembly)return design;
 const a=design.assembly,result={...design,busId:a.busId,panelIds:[],batteryIds:[],fuelIds:[],instrumentIds:[],commsId:null,computerId:null,pointingId:null};
 for(const c of a.components){const p=catalog(data,c.catalogId);if(!p)continue;
  const field={panel:'panelIds',battery:'batteryIds',fuel:'fuelIds',comms:'commsId',computer:'computerId',pointing:'pointingId'}[p.type]||'instrumentIds';
  if(Array.isArray(result[field]))result[field].push(c.catalogId);else result[field]=c.catalogId;
 }
 return result;
}
export function panelItems(design,data){
 if(!design.assembly)return (design.panelIds||[]).map(id=>catalog(data,id)).filter(Boolean);
 return design.assembly.components.filter(c=>catalog(data,c.catalogId)?.type==='panel').map(c=>{
  const p=catalog(data,c.catalogId);
  // Each legacy catalogue panel represented two wings. A wing carries half its mass, cost and output.
  // Guided Sun tracking: yaw away from the nominal wing plane reduces collection conservatively.
  const efficiency=.65+.35*Math.abs(Math.cos(c.localRotation[1]*Math.PI/180));
  return {...p,mass:p.mass/2,cost:p.cost/2,power:p.power/2*efficiency};
 });
}
export function placementIssues(a,data,allowed=null){
 const issues=[],spec=structure(a.busId),occupied=new Map(),ports=new Set(),external=[];
 const error=(c,message)=>issues.push({instanceId:c?.instanceId||'bus',message,severity:'error'});
 if(!a.busId)error(null,'Choose a bus.');
 else if(!data.parts.some(p=>p.id===a.busId&&p.type==='bus'))error(null,'Unknown bus '+a.busId+' is unresolved. Choose a catalogue bus.');
 if(a.busId&&allowed&&!allowed.includes(a.busId))error(null,'The selected bus is locked.');
 for(const c of a.components){const p=catalog(data,c.catalogId),m=metadata(p),label=p?.name||c.catalogId;
  if(!p){error(c,'Unknown catalogue component.');continue;}
  if(allowed&&!allowed.includes(c.catalogId))error(c,label+' is locked.');
  if(c.placementStatus!=='placed'||c.parentInstanceId!=='bus')error(c,label+' needs placement.');
  if(p.type==='fuel'){const port=c.configuration.propulsionPort;if(!Number.isSafeInteger(port)||port<0||port>=spec.propulsionPorts)error(c,label+' needs a valid thruster port (0–'+(spec.propulsionPorts-1)+').');else if(ports.has(port))error(c,label+' overlaps an occupied thruster port.');else ports.add(port);}
  if(m.internal){
   if(c.localPosition.some(n=>Math.abs(n)>.001)||c.localRotation.some(n=>Math.abs(n)>.001))error(c,label+' uses a fixed internal bay; reset its numeric transform.');
   const index=Number(c.bayId?.split('-')[1]);
   if(!c.bayId||index+m.bayUnits>spec.bays)error(c,label+' exceeds the internal bay capacity.');
   else for(let n=index;n<index+m.bayUnits;n++){if(occupied.has(n))error(c,label+' overlaps an occupied bay.');occupied.set(n,c.instanceId);}
  }else{
   const s=surfaces(a.busId)[c.attachmentSurfaceId];
   if(!s||c.bayId){error(c,label+' requires an exterior mounting face.');continue;}
   if(c.attachmentSurfaceId==='bottom')error(c,'Bottom is reserved for the launch adapter.');
   if(Math.abs(c.localPosition[2])>.001)error(c,label+' is disconnected: mount offset must be zero.');
   if(Math.abs(c.localRotation[0])>.001||Math.abs(c.localRotation[2])>.001)error(c,'Tilt disconnects the mounting base; rotate about the surface normal.');
   if(Math.abs(c.localPosition[0])+m.span/2>s.size[0]/2||Math.abs(c.localPosition[1])+m.span/2>s.size[1]/2)error(c,label+' mounting base extends beyond the surface.');
   for(const other of external)if(other.attachmentSurfaceId===c.attachmentSurfaceId){
    const separation=Math.hypot(other.localPosition[0]-c.localPosition[0],other.localPosition[1]-c.localPosition[1]);
    const bothPanels=p.type==='panel'&&catalog(data,other.catalogId)?.type==='panel';
    const clearance=bothPanels?Math.max(m.wingLength,metadata(catalog(data,other.catalogId)).wingLength)*.38+.08:(m.span+metadata(catalog(data,other.catalogId)).span)/2;
    if(separation<clearance){error(c,bothPanels?'Solar wing deployment envelopes intersect.':label+' overlaps another mounting or obstructs its deployment.');break;}
   }
   external.push(c);
  }
 }
 for(const type of ['comms','computer','pointing'])if(a.components.filter(c=>catalog(data,c.catalogId)?.type===type).length>1)error(null,'This bus supports one '+type+' system.');
 const payloads=a.components.filter(c=>!data.parts.some(p=>p.id===c.catalogId)).length;
 if(payloads>(data.parts.find(p=>p.id===a.busId)?.slots||0))error(null,'Payload capacity exceeded.');
 return [...issues,...geometryIssues(a,data)];
}
export function makeBlueprint(design,data,name='Untitled satellite'){
 const now=new Date().toISOString();return {schemaVersion:1,id:uid(),name,description:'',tags:[],createdAt:now,updatedAt:now,assembly:migrateAssembly(design,data)};
}
export function validateBlueprint(b,data){
 assertSerializable(b);
 if(b?.schemaVersion!==1)throw Error('Unsupported blueprint schema version; expected version 1.');
 if(!b||typeof b.id!=='string'||!b.id||typeof b.name!=='string'||!b.name.trim()||b.name.length>100)throw Error('Invalid blueprint identity or name');
 for(const key of ['createdAt','updatedAt'])if(typeof b[key]!=='string'||!Number.isFinite(Date.parse(b[key])))throw Error('Invalid blueprint timestamp');
 if(typeof b.description!=='string'||b.description.length>10000||!Array.isArray(b.tags)||b.tags.length>20||b.tags.some(t=>typeof t!=='string'||t.length>100))throw Error('Invalid description or tags');
 if(b.thumbnail!=null&&(typeof b.thumbnail!=='string'||!/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(b.thumbnail)||b.thumbnail.length>300000))throw Error('Invalid thumbnail');
 validateAssembly(b.assembly,data);return copy(b);
}
