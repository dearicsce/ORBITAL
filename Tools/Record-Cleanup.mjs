import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {inventory,sha256} from './WebUIPackage.mjs';
const record='Verification/Cleanup-2026-11-11';
const before=JSON.parse(fs.readFileSync(record+'/pass-1-inventory.json'));
const candidates=JSON.parse(fs.readFileSync(record+'/pass-2-dependencies.json')).unreachableCandidates;
const removed=candidates.map(file=>{
 const prior=before.find(e=>e.file.replaceAll('\\','/')==='Assets/StreamingAssets/WebUI/'+file);
 assert.ok(prior);assert.ok(!fs.existsSync('Assets/StreamingAssets/WebUI/'+file));
 return {...prior,reason:'No runtime entry point or import; manually checked dynamic/string references. Superseded menus or authoring-only helpers.',recovery:'Exact original retained in F:/space-mission-gaame_v_0.3/'+file};
});
const source=inventory('Assets/StreamingAssets'),player=inventory('Build-Current');
for(const entry of source){const copy=player.find(p=>p.file==='ORBITAL_Data/StreamingAssets/'+entry.file);assert.equal(copy?.sha256,entry.sha256,'Player/source match: '+entry.file);}
fs.writeFileSync(record+'/cleanup-manifest.json',JSON.stringify({removed,payloadBytesRemoved:removed.reduce((n,e)=>n+e.bytes,0),note:'Runtime payload reduction only; backup retention and new build mean no net disk-space saving claim.'},null,2));
fs.writeFileSync(record+'/player-manifest.json',JSON.stringify({launcher:{path:'Orbital.exe',sha256:sha256('Orbital.exe')},sourceStreamingAssetsMatches:source.length,player},null,2));
console.log(JSON.stringify({removedModules:removed.length,payloadBytesRemoved:removed.reduce((n,e)=>n+e.bytes,0),playerFiles:player.length,sourceMatches:source.length}));
