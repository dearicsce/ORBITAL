import {ROCKET_PARTS,rocketPart,rocketPartUnlocked,ORBITAL_DECAL,STANDARD_STAGING,BOOSTER_STAGING} from './catalogue.js';
import {assertSerializable} from '../contracts/serializable.js';

const G0=9.80665;
const ORBIT_DV={leo:9350,gto:11550,tli:12350};
const burn=(isp,wet,dry)=>G0*isp*Math.log(wet/dry);

export function newRocket(){
 return {version:1,id:globalThis.crypto.randomUUID(),name:'Untitled launcher',parts:Object.fromEntries(Object.keys(ROCKET_PARTS).map(slot=>[slot,null])),staging:[],decals:[{...ORBITAL_DECAL}]};
}

export function validateRocket(rocket){
 assertSerializable(rocket);
 if(rocket?.version!==1||typeof rocket.id!=='string'||!/^[a-z0-9-]{1,80}$/i.test(rocket.id)||typeof rocket.name!=='string'||!rocket.name.trim()||rocket.name.length>70||!rocket.parts||Object.keys(rocket.parts).length!==Object.keys(ROCKET_PARTS).length)throw Error('Invalid launcher blueprint');
 for(const slot of Object.keys(ROCKET_PARTS)){
  if(!Object.hasOwn(rocket.parts,slot)||rocket.parts[slot]!==null&&!rocketPart(slot,rocket.parts[slot]))throw Error('Unknown part in '+slot);
 }
 if(!Array.isArray(rocket.staging)||rocket.staging.length>BOOSTER_STAGING.length||rocket.staging.some(step=>!BOOSTER_STAGING.includes(step)))throw Error('Invalid staging commands');
 if(!Array.isArray(rocket.decals)||rocket.decals.length!==1||Object.entries(ORBITAL_DECAL).some(([key,value])=>rocket.decals[0]?.[key]!==value))throw Error('Invalid launcher decal metadata');
 return rocket;
}

export function rocketEngineering(rocket,payloadKg=0,{completed=null,requirement=ORBIT_DV.leo}={}){
 const issues=[];
 try{validateRocket(rocket);}catch(error){return {issues:[error.message],stages:[],deltaV:0,wetKg:0,dryKg:0,twr:0,cost:0};}
 if(!Number.isFinite(payloadKg)||payloadKg<0)throw Error('Invalid payload mass');
 const p=Object.fromEntries(Object.entries(rocket.parts).map(([slot,id])=>[slot,rocketPart(slot,id)]));
 for(const [slot,part] of Object.entries(p)){
  if(slot!=='boosters'&&!part)issues.push('Install '+slot.replace(/[A-Z]/g,c=>' '+c.toLowerCase())+'.');
  if(part&&completed&&!rocketPartUnlocked(part,completed))issues.push(part.name+' unlocks after '+part.requires+'.');
 }
 const {coreTank,coreEngine,upperTank,upperEngine,separator,adapter,fairing,guidance,boosters}=p;
 const staging=boosters?BOOSTER_STAGING:STANDARD_STAGING;
 if(rocket.staging.length!==staging.length||staging.some((step,i)=>step!==rocket.staging[i]))issues.push('Set a valid staging sequence from ignition through payload release.');
 if(!coreTank||!coreEngine||!upperTank||!upperEngine||!separator||!adapter||!fairing||!guidance)return {issues,stages:[],deltaV:0,wetKg:0,dryKg:0,twr:0,cost:0};
 if(coreTank.propellant!==coreEngine.propellant||upperTank.propellant!==upperEngine.propellant)issues.push('Engine and tank propellants must match in each stage.');
 if(coreTank.port!==coreEngine.port||upperTank.port!==upperEngine.port||separator.corePort!==coreTank.port||separator.upperPort!==upperTank.port||adapter.port!==upperTank.port||fairing.port!==upperTank.port||boosters&&boosters.port!==coreTank.port)issues.push('One or more stage flanges, engines or booster mounts are incompatible.');
 const boosterWet=boosters?(boosters.dryKg+boosters.propellantKg)*boosters.count:0;
 const upperDry=upperTank.dryKg+upperEngine.dryKg+adapter.dryKg+guidance.dryKg;
 const upperWet=upperDry+upperTank.propellantKg+payloadKg;
 const coreDry=coreTank.dryKg+coreEngine.dryKg+separator.dryKg;
 const dryKg=coreDry+upperDry+fairing.dryKg+(boosters?.dryKg||0)*(boosters?.count||0);
 const wetKg=upperWet+coreDry+coreTank.propellantKg+fairing.dryKg+boosterWet;
 const twr=(coreEngine.thrustN+(boosters?.thrustN||0)*(boosters?.count||0))/(wetKg*G0);
 const upperTwr=upperEngine.thrustN/(upperWet*G0);
 let coreWet=wetKg,remaining=coreTank.propellantKg,boostDelta=0;
 if(boosters){
  const boosterFlow=boosters.thrustN/(boosters.isp*G0),coreFlow=coreEngine.thrustN/(coreEngine.isp*G0);
  const sharedBurn=boosters.propellantKg/boosterFlow;
  const usedCore=sharedBurn*coreFlow;
  if(usedCore>=remaining)issues.push('Core would run dry before booster separation.');
  remaining-=Math.min(remaining,usedCore);
  const expended=boosters.propellantKg*boosters.count+Math.min(coreTank.propellantKg,usedCore);
  const effectiveIsp=(coreEngine.thrustN+boosters.thrustN*boosters.count)/(G0*(coreFlow+boosterFlow*boosters.count));
  boostDelta=burn(effectiveIsp,wetKg,wetKg-expended);
  coreWet-=expended+boosters.dryKg*boosters.count;
 }
 const coreDelta=burn(coreEngine.isp,coreWet,coreWet-remaining);
 const upperDelta=burn(upperEngine.isp,upperWet,upperDry+payloadKg);
 const deltaV=boostDelta+coreDelta+upperDelta;
 if(twr<1.2)issues.push('Liftoff thrust-to-weight must be at least 1.20.');
 if(upperTwr<.35)issues.push('Upper stage thrust-to-weight must be at least 0.35 at ignition.');
 if(deltaV<requirement)issues.push('Stack needs '+Math.ceil(requirement-deltaV)+' m/s more delta-v for this flight.');
 const cost=3+Object.values(p).reduce((sum,part)=>sum+(part?.cost||0),0);
 const stages=[...(boosters?[{label:'Parallel boost',deltaV:boostDelta,twr}]:[]),
  {label:'Core burn',deltaV:coreDelta,twr:coreEngine.thrustN/(coreWet*G0)},
  {label:'Upper-stage burn',deltaV:upperDelta,twr:upperTwr}];
 return {issues,stages,deltaV,wetKg,dryKg,twr,cost,fairingRadiusM:fairing.radiusM,fairingHeightM:fairing.heightM};
}

export function requiredLaunchDv(orbitId,launcherClass='LEO'){
 return orbitId==='sso'?9600:ORBIT_DV[launcherClass.toLowerCase()]??ORBIT_DV.leo;
}

function payloadCapacity(rocket,requirement){
 if(rocketEngineering(rocket,0,{requirement}).issues.length)return 0;
 let low=0,high=80000;
 for(let i=0;i<20;i++){
  const middle=(low+high)/2;
  if(rocketEngineering(rocket,middle,{requirement}).issues.length)high=middle;else low=middle;
 }
 return Math.floor(low);
}

const performanceCache=new Map(),capacityCache=new Map();
export function customCapacity(rocket,requirement){
 const key=JSON.stringify([rocket.parts,rocket.staging,requirement]);
 if(!capacityCache.has(key)){
  if(capacityCache.size>=96)capacityCache.delete(capacityCache.keys().next().value);
  capacityCache.set(key,payloadCapacity(rocket,requirement));
 }
 return capacityCache.get(key);
}
export function launcherFor(design,data){
 const rocket=design.rocketBlueprint;
 if(!rocket)return data.launchers.find(l=>l.id===design.launcherId);
 const key=JSON.stringify(rocket.parts)+JSON.stringify(rocket.staging);
 if(!performanceCache.has(key)){
  const spec=rocketEngineering(rocket,0,{requirement:0});
  if(performanceCache.size>=32)performanceCache.delete(performanceCache.keys().next().value);
  performanceCache.set(key,{cost:spec.cost,reliability:.97,fairingRadiusM:spec.fairingRadiusM,fairingHeightM:spec.fairingHeightM,
   capacity:Object.fromEntries(Object.entries(ORBIT_DV).map(([id,dv])=>[id,customCapacity(rocket,dv)]))});
 }
 return {...performanceCache.get(key),id:'orbital-custom',name:rocket.name+' · ORBITAL custom vehicle'};
}
