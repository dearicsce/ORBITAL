import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {hostSession} from './HostSession.mjs';
const mode=process.argv[2],file=process.argv[3],host=await hostSession();
try{
 const value=await host.evaluate(`(async()=>({storage:Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)),manifest:await (await fetch('/dependency-manifest.json')).text()}))()`);
 const packageHash=crypto.createHash('sha256').update(value.manifest).digest('hex');
 const snapshot={packageHash,storage:value.storage};
 if(mode==='before'){fs.writeFileSync(file,JSON.stringify(snapshot,null,2));console.log('Captured '+snapshot.storage.length+' owned storage records before package update');}
 else{
  const before=JSON.parse(fs.readFileSync(file));assert.notEqual(packageHash,before.packageHash,'A different package must actually have been loaded');
  assert.deepEqual(snapshot.storage,before.storage,'A package update must preserve every durable campaign/draft/library/report/settings record byte-for-byte');
  fs.writeFileSync(file.replace(/\.json$/, '-result.json'),JSON.stringify({passed:true,beforePackage:before.packageHash,afterPackage:packageHash,records:before.storage.length,allStorageBytesUnchanged:true},null,2));
  console.log('PASS: all '+snapshot.storage.length+' storage records survived a real package/cache identity change');
 }
}finally{host.close();}
