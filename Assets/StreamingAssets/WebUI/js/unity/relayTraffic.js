import {propagate,toFixed,elevation} from '../engine/orbitalGeometry.js';
export function createRelayTraffic(){return {version:'two-link-traffic-1',policy:'urgent',source:[],onboard:[],received:[],expired:[],nextId:1,
  offeredSeconds:0,receivedSeconds:0,sourceVisibleFraction:0,earthVisibleFraction:0,
  assumptions:'Authored 1 MB dispatch per 270 s service opportunity. 36-minute urgent and 135-minute tolerant expiry. Spherical source elevation >= 10 degrees; Earth link uses existing contact model. Catalogue radio capacity is shared with science; no actual network protocol.'};}
export function relayPolicy(state,policy){if(!state.relayTraffic||!['urgent','batch'].includes(policy)||state.finished)return false;state.relayTraffic.policy=policy;return true;}
export const queuedRelayGb=s=>(s.relayTraffic?.onboard??[]).reduce((n,m)=>n+m.remainingGb,0);
export function relayAccess(state,startSec,seconds){
 if(!state.orbit)return 0;
 const source=state.orbit.body==='moon'?{latitudeDeg:-70,longitudeDeg:0}:{latitudeDeg:0,longitudeDeg:-14};
 let visible=0,n=0;for(let t=startSec+7.5;t<startSec+seconds;t+=15){n++;const pos=toFixed(propagate(state.orbit,t),state.orbit.body,t+(state.orbit.epochS??0));visible+=Number(elevation(pos,source,state.orbit.body)>=10);}
 return n?visible/n:0;
}
export function stepRelay(state,env,powered,mode,startSec,seconds,availability=null){
 const q=state.relayTraffic;if(!q)return {sentGb:0};
 const endSec=startSec+seconds,windows=state.evidence?.scenario.windows??[],target=windows.find(([,a,b])=>state.tick>=a&&state.tick<b)?.[0];
 const sourceFraction=relayAccess(state,startSec,seconds),earthFraction=env.contactFraction??Number(env.contact);
 q.sourceVisibleFraction=sourceFraction;q.earthVisibleFraction=earthFraction;
 if(target){
  const urgent=state.tick%2===0;
  q.source.push({id:q.nextId++,target,createdSec:startSec,expirySec:startSec+(urgent?8:30)*270,urgent,remainingGb:.001,totalGb:.001,serviceSeconds:seconds,receivedGb:0});q.offeredSeconds+=seconds;
 }
 for(const key of ['source','onboard'])q[key]=q[key].filter(m=>{if(m.expirySec<endSec){q.expired.push({...m,expiredSec:endSec,owner:key});return false;}return true;});
 // A transponder receives source traffic rather than creating instrument bytes.
 // The same catalogue link rate bounds each hop; half-duplex timing is averaged.
 let incoming=(state.hardware.instantDownlinkGbDay??state.hardware.downlinkGbDay)/86400*seconds*sourceFraction*(availability?.sourceFraction??Number(powered&&mode==='observe'));
 let free=Math.max(0,state.storageCapacityGb-state.storageGb-queuedRelayGb(state));
 for(const m of [...q.source]){
  if(m.remainingGb>incoming||m.remainingGb>free)break;
  incoming-=m.remainingGb;free-=m.remainingGb;q.source.splice(q.source.indexOf(m),1);m.pickupSec=endSec;q.onboard.push(m);
 }
 let sentGb=0,capacity=(state.hardware.instantDownlinkGbDay??state.hardware.downlinkGbDay)/86400*seconds*(availability?.earthFraction??(powered&&(mode==='observe'||mode==='downlink')?earthFraction:0));
 const held=q.policy==='batch'&&state.tick%6!==5&&mode!=='downlink';
 if(!held){
  q.onboard.sort((a,b)=>q.policy==='urgent'?(Number(b.urgent)-Number(a.urgent)||a.expirySec-b.expirySec):a.createdSec-b.createdSec);
  for(const m of [...q.onboard]){
   const amount=Math.min(capacity,m.remainingGb);m.remainingGb-=amount;capacity-=amount;sentGb+=amount;m.receivedGb+=amount;
   if(m.remainingGb<1e-12){q.onboard.splice(q.onboard.indexOf(m),1);m.receiptSec=endSec;q.received.push(m);q.receivedSeconds+=m.serviceSeconds;
    if(state.evidence)state.evidence.serviceSec[m.target]=(state.evidence.serviceSec[m.target]??0)+m.serviceSeconds;
   }
   if(capacity<=0)break;
  }
 }
 return {sentGb};
}
export function validateRelay(state){
 const q=state?.relayTraffic;if(!q)return;
 if(q.version!=='two-link-traffic-1'||!['urgent','batch'].includes(q.policy))throw Error('Invalid relay model/policy');
 const ids=new Set();for(const key of ['source','onboard','received','expired']){
  if(!Array.isArray(q[key])||q[key].length>120)throw Error('Invalid bounded relay queue');
  for(const m of q[key]){if(ids.has(m.id)||!Number.isFinite(m.remainingGb)||m.remainingGb< -1e-10||!Number.isFinite(m.receivedGb)||Math.abs(m.remainingGb+m.receivedGb-m.totalGb)>1e-9)throw Error('Relay ownership/conservation failure');ids.add(m.id);}
 }
 const seconds=q.received.reduce((n,m)=>n+m.serviceSeconds,0);if(Math.abs(seconds-q.receivedSeconds)>1e-8||queuedRelayGb(state)+state.storageGb>state.storageCapacityGb+1e-8)throw Error('Relay receipt/storage mismatch');
}
