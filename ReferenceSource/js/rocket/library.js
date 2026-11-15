import {validateRocket} from './engineering.js';
const KEY='orbital_rocket_library_v1';

export function rocketLibrary(storage=globalThis.localStorage){
 const list=()=>{
  const items=JSON.parse(storage?.getItem(KEY)||'[]');
  if(!Array.isArray(items)||items.length>60)throw Error('Invalid rocket library');
  return items.map(validateRocket);
 };
 return {
  list,
  find:id=>list().find(item=>item.id===id),
  save(blueprint){
   const rocket=structuredClone(validateRocket(blueprint)),items=list(),index=items.findIndex(item=>item.id===rocket.id);
   if(index<0){if(items.length>=60)throw Error('Rocket library is full');items.push(rocket);}else items[index]=rocket;
   storage.setItem(KEY,JSON.stringify(items));
   return rocket;
  }
 };
}
