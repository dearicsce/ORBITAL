import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {inspectAsset, fetchAsset, MAX_PREVIEW_BYTES} from '../js/content/inspectAsset.js';
let assertions=0;
const check=(value,message)=>{assert.ok(value,message);assertions++;};
const rejects=async(fn,pattern)=>{await assert.rejects(fn,pattern);assertions++;};
const bad=(fn,pattern)=>{assert.throws(fn,pattern);assertions++;};
const array=buffer=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
function glb(json,bin=Buffer.alloc(0)){
  const text=JSON.stringify(json),payload=Buffer.from(text+' '.repeat((4-text.length%4)%4));
  const bytes=Buffer.alloc(20+payload.length+(bin.length?8+bin.length:0));
  bytes.write('glTF');bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(payload.length,12);bytes.writeUInt32LE(0x4e4f534a,16);payload.copy(bytes,20);
  if(bin.length){const offset=20+payload.length;bytes.writeUInt32LE(bin.length,offset);bytes.writeUInt32LE(0x004e4942,offset+4);bin.copy(bytes,offset+8);}
  return array(bytes);
}
check(inspectAsset(glb({asset:{version:'2.0'}})).kind==='glb','Valid minimal GLB recognized');
bad(()=>inspectAsset(new ArrayBuffer(0)),/Empty/);
bad(()=>inspectAsset(new ArrayBuffer(MAX_PREVIEW_BYTES+1)),/limit/);
bad(()=>inspectAsset(array(Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:123'))),/Missing Git LFS/);
bad(()=>inspectAsset(array(Buffer.from('solid a\nfacet normal 0 0 1'))),/Unsupported file signature/);
bad(()=>inspectAsset(glb({asset:{version:'1.0'}})),/Unsupported glTF/);
bad(()=>inspectAsset(glb({asset:{version:'2.0'},buffers:[{uri:'https://example.com/external.bin',byteLength:4}]})),/External/);
bad(()=>inspectAsset(glb({asset:{version:'2.0'},images:[{uri:'local.jpg'}]})),/External/);
bad(()=>inspectAsset(glb({asset:{version:'2.0'},buffers:[{byteLength:8}]})),/incomplete/);
bad(()=>inspectAsset(glb({asset:{version:'2.0'},buffers:[{byteLength:4}],bufferViews:[{byteOffset:2,byteLength:4}]},Buffer.alloc(4))),/outside/);
const truncated=glb({asset:{version:'2.0'}});new DataView(truncated).setUint32(12,999,true);
bad(()=>inspectAsset(truncated),/chunk length/);
const registry=JSON.parse(fs.readFileSync(new URL('../data/content/source-registry.json',import.meta.url)));
check(new Set(registry.assets.map(a=>a.id)).size===registry.assets.length,'Unique catalog IDs');
check(registry.assets.filter(a=>a.availability==='missing-lfs-payload').length===26,'All missing LFS payloads represented');
check(registry.missingInputs['gaia-leo'].length===6,'Gaia missing inputs explicit');
check(registry.sources.find(s=>s.id==='pioneer').decision.includes('No executable'),'Pioneer has no runnable game');
check(registry.assets.filter(a=>a.sourceId==='star-system'&&a.previewUrl?.endsWith('.glb')).length===6,'Six Star System GLBs available for inspection');
const KNOWN_UNAVAILABLE_EXTERNAL_SOURCES=new Set(['additional-0','additional-1','additional-2']);
const verifiedSources=[],unavailableSources=[];
for(const entry of registry.assets){
  check(Boolean(entry.credit&&entry.declaredLicense&&entry.factualVerification&&entry.intendedUse&&entry.conversionRequirement&&entry.runtimeDecision),'Review fields: '+entry.id);
  if(entry.previewUrl){
    const previewUrl=new URL('../'+entry.previewUrl,import.meta.url);
    check(fs.existsSync(previewUrl),'Preview exists locally: '+entry.id);
    const bytes=fs.readFileSync(previewUrl);
    check(crypto.createHash('sha256').update(bytes).digest('hex')===entry.sha256,'Preview matches declared hash: '+entry.id);
    check(['glb','image'].includes(inspectAsset(array(bytes)).kind),'Preview signature: '+entry.id);
  }
  if(fs.existsSync(entry.sourcePath)){
    check(crypto.createHash('sha256').update(fs.readFileSync(entry.sourcePath)).digest('hex')===entry.sha256,'Source hash: '+entry.id);
    verifiedSources.push(entry.id);
  }else if(KNOWN_UNAVAILABLE_EXTERNAL_SOURCES.has(entry.id)){
    check(typeof entry.sourcePath==='string'&&entry.sourcePath.length>0,'Original sourcePath preserved: '+entry.id);
    check(typeof entry.sha256==='string'&&entry.sha256.length===64,'Original sha256 preserved: '+entry.id);
    unavailableSources.push({id:entry.id,sourcePath:entry.sourcePath,sha256:entry.sha256});
  }else{
    check(false,'Required local source missing: '+entry.id+' at '+entry.sourcePath);
  }
  if(entry.sourceId!=='connected-earth')check(!entry.runtimeApproved,'No unreviewed runtime promotion: '+entry.id);
}
const bytes=Buffer.from([255,216,255,217]);
const entry={previewUrl:'fixture.jpg',availability:'available',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
const mock=async()=>new Response(bytes);
check((await fetchAsset(entry,{fetcher:mock})).inspection.mime==='image/jpeg','Hash-verified response accepted');
await rejects(()=>fetchAsset({...entry,availability:'missing-lfs-payload'},{fetcher:mock}),/unavailable/);
await rejects(()=>fetchAsset({...entry,previewUrl:'https://example.com/x'},{fetcher:mock}),/same-origin/);
await rejects(()=>fetchAsset({...entry,bytes:MAX_PREVIEW_BYTES+1},{fetcher:mock}),/budget/);
await rejects(()=>fetchAsset({...entry,sha256:'0'.repeat(64)},{fetcher:mock}),/checksum/);
await rejects(()=>fetchAsset({...entry,bytes:3},{fetcher:mock}),/exceeds/);
await rejects(()=>fetchAsset({...entry,bytes:5},{fetcher:mock}),/Incomplete/);
await rejects(()=>fetchAsset(entry,{fetcher:async()=>new Response('missing',{status:404})}),/HTTP 404/);
const controller=new AbortController();controller.abort();
await rejects(()=>fetchAsset(entry,{signal:controller.signal,fetcher:async(_url,{signal})=>{signal.throwIfAborted();}}),/aborted/i);
const summary={date:'2026-11-03',assertions,catalogEntries:registry.assets.length,previews:registry.assets.filter(a=>a.previewUrl).length,verifiedLocalSources:verifiedSources.length,unavailableExternalSources:unavailableSources.length,unavailableSourceAudit:'BLOCKED_MISSING_ORIGINAL_ON_NEW_PC',unavailableSources:unavailableSources.map(s=>s.id)};
fs.writeFileSync(new URL('./content-inspector-results.json',import.meta.url),JSON.stringify(summary,null,2));
console.log('PASS: '+JSON.stringify(summary));
