const KEY='space_mission_flight_v1';
import {migrateMissionRun} from './contracts/missionRun.js';
let current=null;
let worldData=null;
export function configureFlightContracts(data){worldData=data;}

function stores(explicit){
 if(explicit!==undefined)return [explicit];
 const result=[];
 for(const key of ['sessionStorage','localStorage'])try{if(globalThis[key])result.push(globalThis[key]);}catch{}
 return result;
}
export function getFlightSession(storage){
 if(current)return current;
 for(const store of stores(storage))try{
  const saved=JSON.parse(store?.getItem(KEY)||'null');
  if(saved){current=migrateMissionRun(saved,worldData);break;}
 }catch{}
 return current;
}
export function setFlightSession(session,storage){
 try{if(session)migrateMissionRun(session,worldData);}catch{return false;}
 const previousId=current?.runId;
 current=session;
 for(const store of stores(storage))try{
  if(session)store?.setItem(KEY,JSON.stringify(session));
  else if(!previousId||JSON.parse(store?.getItem(KEY)||'null')?.runId===previousId)store?.removeItem(KEY);
 }catch{}
 return current;
}
export function clearFlightSession(storage){getFlightSession(storage);return setFlightSession(null,storage);}
export function importFlightSession(payload,storage){
 try{const run=migrateMissionRun(typeof payload==='string'?JSON.parse(payload):payload,worldData);return Boolean(setFlightSession(run,storage));}catch{return false;}
}
