import {canCompleteFlight} from '../flightCompletion.js';
// A dedicated ledger avoids stale game-state writes overwriting purchases/rewards.
// All mutations use Web Locks; browsers without it fail explicitly rather than race across tabs.
export const ECONOMY_KEY='orbital_economy_v1';
export const REWARDS=[[0,0],[100,25],[200,50],[350,90],[550,140],[800,200]];
export function missionDifficulty(m){return m?.missionDifficulty||({tutorial:1,m1:1,wildfire:2,ocean:2,ice:3,m2:2,storm:3,night:3,solar:4,m3:3,relay:4,mapping:4,observatory:5}[m?.id]||3);}
export function difficultyLabel(m){const n=missionDifficulty(m);return 'Difficulty: '+'★'.repeat(n)+'☆'.repeat(5-n);}
export function readEconomy(storage=globalThis.localStorage){
 const raw=storage?.getItem(ECONOMY_KEY);if(!raw)return {schemaVersion:1,coins:0,unlocked:[],claims:{}};
 const e=JSON.parse(raw);if(e.schemaVersion!==1||!Number.isSafeInteger(e.coins)||e.coins<0||!Array.isArray(e.unlocked)||e.unlocked.some(id=>typeof id!=='string')||!e.claims||Array.isArray(e.claims)||typeof e.claims!=='object')throw Error('Invalid progression ledger');for(const [id,claim]of Object.entries(e.claims))if(!id||!claim||typeof claim.missionId!=='string'||!Number.isSafeInteger(claim.amount)||claim.amount<0)throw Error('Invalid reward claim ledger');return e;
}
export async function transactEconomy(change,storage=globalThis.localStorage,locks=globalThis.navigator?.locks){
 if(!locks?.request)throw Error('This browser cannot safely update the wallet. Use a browser with Web Locks.');
 return locks.request('orbital-wallet',()=>{const e=readEconomy(storage),result=change(e);storage.setItem(ECONOMY_KEY,JSON.stringify(e));return result;});
}
export function purchase(id,price,storage,locks){return transactEconomy(e=>{
 if(typeof id!=='string'||!id||id.length>100)throw Error('Invalid equipment identity');
 if(!Number.isSafeInteger(price)||price<=0)throw Error('Invalid unlock price');if(e.unlocked.includes(id))return {charged:0,coins:e.coins};
 if(e.coins<price)throw Error('Insufficient coins');e.coins-=price;e.unlocked.push(id);return {charged:price,coins:e.coins};
 },storage,locks);}
export function claimReward(run,mission,rating,passStars=3,storage,locks){
 if((mission.transfer&&(!run?.mission?.transfer||!run.cruise))||!canCompleteFlight(mission.id,rating,passStars,run))return Promise.reject(Error("Flight has not completed its authoritative objectives."));
 return transactEconomy(e=>{
 if(!run?.runId)throw Error('Historical flight has no reward identity; start a new run.');
 if(e.claims[run.runId])return {amount:0,coins:e.coins};
 const first=!Object.values(e.claims).some(c=>c.missionId===mission.id)&&!run.wasCompleted;
 const amount=REWARDS[missionDifficulty(mission)][first?0:1];
 e.coins+=amount;e.claims[run.runId]={missionId:mission.id,amount};return {amount,coins:e.coins};
 },storage,locks);}
