import {migrateMissionRun} from './contracts/missionRun.js';
import {synchronizeLifecycle} from './unity/missionLifecycle.js';

const KEY='space_mission_flight_v1';
let current=null,worldData=null;
// A page-exit callback may still hold a flight that was replaced by an import
// or new launch. It must never overwrite the newly active durable checkpoint.
const supersededRuns=new Set();
const supersededObjects=new WeakSet();
let issue='';
export function configureFlightContracts(data){worldData=data;}
export function flightStorageIssue(){return issue;}

function report(message){
 issue=message;
 if(globalThis.window)window.dispatchEvent(new CustomEvent('orbital-storage-issue',{detail:message}));
}

export function getFlightSession(storage){
 if(current)return current;
 try{
  const durable=storage===undefined?globalThis.localStorage:storage;
  const raw=durable?.getItem(KEY);
  // Older builds kept both copies. Prefer the durable checkpoint after a restart.
  const saved=raw??(storage===undefined?globalThis.sessionStorage?.getItem(KEY):null);
  if(saved)current=migrateMissionRun(JSON.parse(saved),worldData);
 }catch{
  report('The saved flight could not be read. Preserve the profile to recover the checkpoint.');
 }
 return current;
}

export function setFlightSession(session,storage){
 try{
  if(session&&(supersededObjects.has(session)||session.runId&&supersededRuns.has(session.runId)))return false;
  synchronizeLifecycle(session);
  if(session)migrateMissionRun(session,worldData);
  const durable=storage===undefined?globalThis.localStorage:storage;
  if(!durable)throw Error('Storage unavailable');
  if(session){
   const previous=durable.getItem(KEY);
   if(previous&&!current)migrateMissionRun(JSON.parse(previous),worldData);
   durable.setItem(KEY,JSON.stringify(session));
  }else{
   const saved=durable.getItem(KEY);
   if(saved&&current?.runId&&JSON.parse(saved)?.runId!==current.runId)return false;
   durable.removeItem(KEY);
  }
  // Clear the obsolete session copy once a durable write has succeeded.
  if(storage===undefined)try{globalThis.sessionStorage?.removeItem(KEY);}catch{}
  if(current&&current!==session)supersededObjects.add(current);
  if(current?.runId&&current.runId!==session?.runId)supersededRuns.add(current.runId);
  current=session;
  if(issue)report('');
  return current;
 }catch{
  if(session&&storage===undefined&&current===session){
   report('Flight checkpoint could not be saved. Progress since the last successful save may be lost when you exit.');
  }else if(storage===undefined){
   report('Flight storage could not be updated. Check available disk space and preserve your profile before resetting.');
  }
  return false;
 }
}

export function clearFlightSession(storage){
 getFlightSession(storage);
 if(!current&&issue)return false;
 return setFlightSession(null,storage);
}
export function importFlightSession(payload,storage){
 try{
  const run=migrateMissionRun(typeof payload==='string'?JSON.parse(payload):payload,worldData);
  const wasSuperseded=supersededRuns.delete(run.runId);
  const imported=setFlightSession(run,storage);
  if(!imported&&wasSuperseded)supersededRuns.add(run.runId);
  return Boolean(imported);
 }
 catch{return false;}
}
