import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {inventory,sha256} from './WebUIPackage.mjs';
const record='Verification/UsabilityRelease-2026-11-11',root=record+'/Candidate Player/ORBITAL_Data/StreamingAssets/WebUI';
const manifest=JSON.parse(fs.readFileSync(root+'/models/manifest.json'));
const missing=[],checked=[];
for(const [id,entry]of Object.entries(manifest))if(entry.file){assert.ok(fs.existsSync(path.join(root,entry.file)),id+' runtime model exists');checked.push({id,file:entry.file,sha256:sha256(path.join(root,entry.file))});}
for(const name of ['mobile-launcher','cygnss','cloudsat','cassini'])assert.ok(!fs.existsSync(root+'/models/supplied/'+name+'.glb'),'Unresolved mesh excluded: '+name);
assert.equal(manifest.launch_tower.file,null,'Launch tower uses existing procedural fallback');
for(const e of Object.values(manifest))if(e.externalReference)assert.equal(e.externalReference.shipped,false);
let glbCount=0,cssReferences=0;
for(const entry of inventory(root)){
 const file=path.join(root,entry.file);
 if(entry.file.endsWith('.glb')){
  const bytes=fs.readFileSync(file);assert.equal(bytes.toString('utf8',0,4),'glTF');
  assert.equal(bytes.readUInt32LE(8),bytes.length,'GLB declared size must match '+entry.file);
  const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)).trim());
  for(const value of [...(json.buffers||[]),...(json.images||[])])if(value.uri&&!value.uri.startsWith('data:')){
   if(/^[a-z]+:/i.test(value.uri))missing.push({file:entry.file,uri:value.uri,reason:'External runtime dependency'});
   else if(!fs.existsSync(path.resolve(path.dirname(file),decodeURIComponent(value.uri))))missing.push({file:entry.file,uri:value.uri});
  }
  glbCount++;
 }
 if(entry.file.endsWith('.css'))for(const match of fs.readFileSync(file,'utf8').matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)){
  const uri=match[1];if(/^(data:|https?:|#)/.test(uri))continue;
  cssReferences++;const target=uri.startsWith('/')?path.join(root,uri):path.resolve(path.dirname(file),uri.split(/[?#]/)[0]);
  if(!fs.existsSync(target))missing.push({file:entry.file,uri});
 }
}
assert.deepEqual(missing,[],'Bundled runtime model and CSS references must resolve offline');
fs.writeFileSync(record+'/asset-integrity.json',JSON.stringify({passed:true,runtimeManifestModels:checked,glbCount,cssReferences,omitted:['mobile-launcher','cygnss','cloudsat','cassini'],limits:'Static runtime model/GLB/CSS checks plus existing import checks; not a complete redistribution-rights audit or proof every dynamic path is used'},null,2));
console.log('PASS: runtime model paths, '+glbCount+' GLBs, CSS references and unresolved-mesh exclusions');
