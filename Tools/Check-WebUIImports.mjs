import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../Assets/StreamingAssets/WebUI/',import.meta.url));
const missing=[];
let count=0;
function visit(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){visit(file);continue;}
  if(!file.endsWith('.js'))continue;
  const code=fs.readFileSync(file,'utf8');
  for(const match of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.{1,2}\/[^'"]+)['"]/g)){
   count++;
   const target=path.resolve(path.dirname(file),match[1].split(/[?#]/)[0]);
   if(!fs.existsSync(target))missing.push({file:path.relative(root,file),import:match[1]});
  }
 }
}
visit(root);
assert.deepEqual(missing,[],'Packaged JavaScript dependencies must exist');
console.log(`PASS: ${count} relative module imports resolve in the packaged game.`);
