import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {inventory,publishPackage,sha256} from './WebUIPackage.mjs';
const record=path.resolve(process.argv[2]||'Verification/UsabilityRelease-2026-11-11');
const root=fs.mkdtempSync(path.join(record,'package-fixture-')),target=path.join(root,'output');
function stage(files){
 const dir=fs.mkdtempSync(path.join(root,'stage-'));
 for(const [name,content]of Object.entries(files)){const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}
 fs.writeFileSync(path.join(dir,'dependency-manifest.json'),JSON.stringify({schemaVersion:2,outputInventory:inventory(dir)}));
 return dir;
}
const cases=[];
try{
 publishPackage(stage({'js/old.js':'old','data/a.json':'{}'}),target);
 fs.writeFileSync(path.join(target,'data/a.json.meta'),'guid: retained');
 publishPackage(stage({'js/renamed.js':'old','data/a.json':'{}'}),target);
 assert.ok(!fs.existsSync(path.join(target,'js/old.js')));
 assert.equal(fs.readFileSync(path.join(target,'data/a.json.meta'),'utf8'),'guid: retained');
 cases.push('Removed/renamed upstream output is absent after replacement; surviving Unity GUID retained');
 fs.writeFileSync(path.join(target,'js/renamed.js'),'unique local edit');
 const before=inventory(target);
 assert.throws(()=>publishPackage(stage({'new.txt':'new'}),target),/Locally modified/);
 assert.deepEqual(inventory(target),before);cases.push('Local modification refuses entire replacement and preserves all bytes');
 fs.writeFileSync(path.join(target,'js/renamed.js'),'old');fs.writeFileSync(path.join(target,'unique.json'),'recovery');
 assert.throws(()=>publishPackage(stage({'new.txt':'new'}),target),/Unowned/);
 assert.equal(fs.readFileSync(path.join(target,'unique.json'),'utf8'),'recovery');cases.push('Unknown output retained and packaging refused');
 fs.unlinkSync(path.join(target,'unique.json'));
 const manifestPath=path.join(target,'dependency-manifest.json'),modified=JSON.parse(fs.readFileSync(manifestPath));modified.localNote='Unique recovery note';fs.writeFileSync(manifestPath,JSON.stringify(modified));
 const oldHash=sha256(manifestPath),recovery=path.join(root,'manifest-history');
 publishPackage(stage({'js/renamed.js':'old','data/a.json':'{}'}),target,{manifestRecovery:recovery});
 assert.equal(JSON.parse(fs.readFileSync(path.join(recovery,oldHash+'.json'))).localNote,'Unique recovery note');cases.push('Modified manifest notes preserved byte-for-byte outside the new runtime');
 fs.writeFileSync(path.join(record,'packaging-ownership.json'),JSON.stringify({passed:true,cases},null,2));
 console.log('PASS: '+cases.length+' packaging ownership/regeneration boundaries');
}finally{fs.rmSync(root,{recursive:true});}
