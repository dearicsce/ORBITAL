import {validatePlan} from './planning.js';
const KEY='orbital_flight_plans_v1';

export function planLibrary(storage=globalThis.localStorage){
 function read(){
  const plans=JSON.parse(storage?.getItem(KEY)||'[]');
  if(!Array.isArray(plans)||plans.length>50)throw Error('Invalid flight plan library');
  return plans.map(validatePlan);
 }
 return {
  find:id=>read().find(plan=>plan.id===id),
  save(plan){
   const previous=read().filter(p=>p.id!==plan.id);
   const item=structuredClone(validatePlan(plan));
   storage.setItem(KEY,JSON.stringify([...previous.slice(-49),item]));
   return item;
  }
 };
}
