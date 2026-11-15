import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function inventory(root, {skipDirectories = []} = {}) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry => {
    const file=path.join(root,entry.name);
    if(entry.isSymbolicLink()) throw Error('Package trees cannot contain reparse points: '+file);
    if(entry.isDirectory()&&skipDirectories.includes(entry.name))return [];
    return entry.isDirectory()?inventory(file,{skipDirectories}).map(e=>({...e,file:entry.name+'/'+e.file})):
      entry.name.endsWith('.meta')?[]:[{file:entry.name,bytes:fs.statSync(file).size,sha256:sha256(file)}];
  });
}
function safeFile(root, relative) {
  const file=path.resolve(root,relative);
  if(!file.startsWith(path.resolve(root)+path.sep)) throw Error('Unsafe package inventory path: '+relative);
  return file;
}
// Validate the entire old output before touching any of it. Unknown files and
// modified generated files remain in place for deliberate recovery by the owner.
export function publishPackage(staging, target, {manifestRecovery}={}) {
  const current=inventory(target), manifestFile=path.join(target,'dependency-manifest.json');
  if(current.length) {
    if(!fs.existsSync(manifestFile)) throw Error('Existing output has no ownership manifest; preserve it before packaging.');
    const previous=JSON.parse(fs.readFileSync(manifestFile));
    const expected=new Map((previous.outputInventory||[
      ...(previous.files||[]).map(e=>({file:e.file,sha256:e.packagedSha256})),
      ...(previous.adaptations||[]).map(e=>({file:e.file,sha256:e.packagedSha256}))
    ]).map(e=>[e.file,e.sha256]));
    const present=new Set(current.map(e=>e.file));
    for(const file of expected.keys())if(!present.has(file))throw Error('Locally removed generated file must be reviewed before packaging: '+file);
    for(const entry of current) {
      if(entry.file==='dependency-manifest.json') continue;
      if(!expected.has(entry.file)) throw Error('Unowned output must be preserved before packaging: '+entry.file);
      if(entry.sha256!==expected.get(entry.file)) throw Error('Locally modified generated file must be preserved before packaging: '+entry.file);
    }
    // A manifest cannot carry its own checksum. Preserve its complete previous
    // bytes outside runtime output, including any locally added notes/metadata.
    if(manifestRecovery){
      fs.mkdirSync(manifestRecovery,{recursive:true});
      const saved=path.join(manifestRecovery,sha256(manifestFile)+'.json');
      if(!fs.existsSync(saved))fs.copyFileSync(manifestFile,saved);
    }
  }
  // Carry Unity GUIDs for surviving generated assets and folders into the swap.
  function carryMeta(dir=target) {
    if(!fs.existsSync(dir)) return;
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const file=path.join(dir,entry.name);
      if(entry.isSymbolicLink()) throw Error('Reparse point in generated output: '+file);
      if(entry.isDirectory()) carryMeta(file);
      else if(entry.name.endsWith('.meta')) {
        const relative=path.relative(target,file), dest=safeFile(staging,relative);
        if(fs.existsSync(dest.slice(0,-5))) fs.copyFileSync(file,dest);
      }
    }
  }
  carryMeta();
  const rollback=target+'.previous-package';
  if(fs.existsSync(rollback)) throw Error('Previous interrupted package requires recovery: '+rollback);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const existed=fs.existsSync(target);
  if(existed) fs.renameSync(target,rollback);
  try { fs.renameSync(staging,target); }
  catch(error) { if(existed) fs.renameSync(rollback,target); throw error; }
  // Only the validated old generated tree is removed, after the complete swap.
  if(existed) fs.rmSync(rollback,{recursive:true,maxRetries:5,retryDelay:200});
  return {previousFiles:current.length,currentFiles:inventory(target).length};
}
