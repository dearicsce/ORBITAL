import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),record=path.resolve(process.argv[2]||'Verification/UsabilityRelease-2026-11-11');
const files=[],cacheRoots=[],reparse=[];
function walk(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,e.name);
  if(e.isSymbolicLink()){reparse.push(file);continue;}
  if(e.isDirectory()){
   const relative=path.relative(root,file).replaceAll('\\','/');
   if(relative.startsWith('Verification/')&&relative.includes('/EBWebView/')&&['Cache','Code Cache','GPUCache','DawnCache','GrShaderCache','ShaderCache','GraphiteDawnCache'].includes(e.name))cacheRoots.push(file);
   walk(file);
  }else files.push({path:file,bytes:fs.statSync(file).size});
 }
}
walk(root);
const sizes=new Map();for(const f of files){if(f.bytes<1048576)continue;if(!sizes.has(f.bytes))sizes.set(f.bytes,[]);sizes.get(f.bytes).push(f);}
const duplicates=[];
for(const group of sizes.values())if(group.length>1){
 const hashes=new Map();for(const f of group){const hash=crypto.createHash('sha256').update(fs.readFileSync(f.path)).digest('hex');if(!hashes.has(hash))hashes.set(hash,[]);hashes.get(hash).push(f.path);}
 for(const [sha256,paths]of hashes)if(paths.length>1)duplicates.push({bytesEach:group[0].bytes,sha256,paths});
}
const plans=cacheRoots.filter(p=>!cacheRoots.some(other=>other!==p&&p.startsWith(other+path.sep))).map(p=>({path:p,classification:'D',bytes:files.filter(f=>f.path.startsWith(p+path.sep)).reduce((s,f)=>s+f.bytes,0),reason:'Regenerable WebView2 compiled/GPU/HTTP cache only; no Local Storage, IndexedDB or exports',dependencyEvidence:'Under explicit verification EBWebView profile, known cache name; process ownership must be rechecked immediately before removal',recovery:'WebView2 regenerates from retained candidate runtime on next isolated launch',action:'pending process check'}));
fs.writeFileSync(path.join(record,'duplicate-groups.json'),JSON.stringify(duplicates,null,2));
fs.writeFileSync(path.join(record,'cleanup-plan.json'),JSON.stringify(plans,null,2));
fs.writeFileSync(path.join(record,'reparse-points.json'),JSON.stringify(reparse,null,2));
console.log(JSON.stringify({files:files.length,duplicateGroups:duplicates.length,cacheDirectories:plans.length,cacheBytes:plans.reduce((s,p)=>s+p.bytes,0),reparsePoints:reparse.length}));
