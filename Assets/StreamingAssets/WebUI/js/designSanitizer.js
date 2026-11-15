import {validateAssembly,projectAssembly} from './workshop/blueprint.js';
import { getUnlocked } from './engine.js';
export function sanitizeDesign(design,data,completed=[]) {
  if(design.assembly){validateAssembly(design.assembly,data);return projectAssembly(design,data);}
  const clean={...design},unlocked=getUnlocked(data,completed),training=clean.missionId==='tutorial';
  const allowed=id=>unlocked.parts.includes(id)&&(!training||data.tutorial.allowedParts.includes(id));
  for(const [field,type] of [['busId','bus'],['commsId','comms'],['computerId','computer'],['pointingId','pointing']]) {
    if(!data.parts.some(p=>p.id===clean[field]&&p.type===type&&allowed(p.id)))clean[field]=null;
  }
  for(const [field,type]of [['panelIds','panel'],['batteryIds','battery'],['fuelIds','fuel']]) {
    clean[field]=(Array.isArray(clean[field])?clean[field]:[]).filter(id=>allowed(id)&&data.parts.some(p=>p.id===id&&p.type===type)).slice(0,2);
  }
  const slots=data.parts.find(p=>p.id===clean.busId)?.slots||0;
  clean.instrumentIds=(Array.isArray(clean.instrumentIds)?clean.instrumentIds:[]).filter(id=>unlocked.instruments.includes(id)&&(!training||data.tutorial.allowedParts.includes(id))).slice(0,slots);
  if(!unlocked.orbits.includes(clean.orbitId)||(training&&!data.tutorial.allowedOrbits.includes(clean.orbitId))){clean.orbitId=null;clean.orbitElements=null;}
  if(!data.difficulty[clean.difficulty])clean.difficulty='normal';
  return clean;
}
