import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root=path.resolve('Assets/StreamingAssets/WebUI');
function inventory(dir=root){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?inventory(path.join(dir,e.name)):e.name.endsWith('.meta')?[]:[{file:path.relative(root,path.join(dir,e.name)).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,e.name))).digest('hex')}]);}
let before;
for(let i=0;i<2;i++){
 const p=spawnSync(process.execPath,['Tools/Pack-WebUI.mjs'],{encoding:'utf8'});if(p.status)throw Error(p.stderr||p.stdout);
 const current=inventory();if(before)assert.deepEqual(current,before,'Packaging must preserve every runtime byte deterministically');before=current;
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'dependency-manifest.json')));
for(const name of ['ascent','ascentLegacy','numericalLaunch','numericalAscent','flightFraming','launchSurroundings','earthMaterial','sourceData','sourceUI','consequences','missionGuide','nasaBundles'])assert.ok(manifest.adaptations.some(e=>e.file.endsWith('/'+name+'.js')),name+' survives packaging and is registered');
fs.writeFileSync((process.argv[2]||'Verification/Sol61-2026-11-10/packaged-final.json'),JSON.stringify({deterministic:true,files:before},null,2)+'\n');
console.log('PASS: two repacks are byte-identical; '+before.length+' runtime files and all owned modules accounted for.');
