import {planLibrary} from './transfer/library.js';
import {rocketLibrary} from './rocket/library.js';

export function resolveFlightDesign(design){
 const snapshot=structuredClone(design);
 if(snapshot.rocketId&&!snapshot.rocketBlueprint){
  try{snapshot.rocketBlueprint=rocketLibrary().find(snapshot.rocketId)||null;}catch{snapshot.rocketBlueprint=null;}
 }
 if(snapshot.planId&&!snapshot.flightPlan){
  try{
   const plan=planLibrary().find(snapshot.planId);
   snapshot.flightPlan=plan?.missionId===snapshot.missionId&&plan.orbitId===snapshot.orbitId?plan:null;
  }catch{snapshot.flightPlan=null;}
 }
 return snapshot;
}
