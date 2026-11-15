import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),out=path.resolve(process.argv[2]||'Verification/Cleanup-2026-11-11');
fs.mkdirSync(out,{recursive:true});
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);return e.isDirectory()?(['node_modules','bin','obj','Dependencies'].includes(e.name)?[]:walk(p)):[p];});}
const files=[...walk('Assets/Orbital'),...walk('Assets/Editor'),...walk('Tools'),...walk('Assets/StreamingAssets/WebUI/js')].filter(p=>/\.(cs|js|mjs|css|ps1)$/.test(p));
// Pass 1: every owned source/tool plus the assembled runtime, with identities.
const code=new Map(files.map(p=>[p,fs.readFileSync(p,'utf8')]));
const inventory=[...code].map(([file,text])=>({file,lines:text.split('\n').length,bytes:Buffer.byteLength(text),sha256:crypto.createHash('sha256').update(text).digest('hex')}));
fs.writeFileSync(path.join(out,'pass-1-inventory.json'),JSON.stringify(inventory,null,2));
// Pass 2: dependency reachability, including literal dynamic imports.
const base=path.resolve('Assets/StreamingAssets/WebUI'),seen=new Set(),missing=[];
function visit(file){if(seen.has(file))return;seen.add(file);if(!fs.existsSync(file)){missing.push(file);return;}const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.{1,2}\/[^'"]+)['"]/g))visit(path.resolve(path.dirname(file),m[1].split(/[?#]/)[0]));}
visit(path.join(base,'js/main.js'));
const unreachable=walk(path.join(base,'js')).filter(p=>p.endsWith('.js')&&!seen.has(p)).map(p=>path.relative(base,p).replaceAll('\\','/'));
fs.writeFileSync(path.join(out,'pass-2-dependencies.json'),JSON.stringify({reachable:seen.size,missing,unreachableCandidates:unreachable,caution:'Candidates require manual string/asset/test/save review before removal.'},null,2));
// Pass 3: whole-source identifier/reference scan. Singleton declarations are
// candidates only: Unity callbacks, serialization and public APIs may use them.
const joined=[...code.values()].join('\n');
const counts=new Map();for(const m of joined.matchAll(/\b[A-Za-z_$][\w$]*\b/g))counts.set(m[0],(counts.get(m[0])||0)+1);
const singletons=[];for(const [file,text]of code)if(!file.includes('StreamingAssets'))for(const m of text.matchAll(/\b(?:function|const|let|(?:public|private|static|readonly)\s+(?:\w+\s+)?)\s+([A-Za-z_$][\w$]*)\s*(?:[=(;])/g))if(counts.get(m[1])===1)singletons.push({file,name:m[1],line:text.slice(0,m.index).split('\n').length});
fs.writeFileSync(path.join(out,'pass-3-reference-candidates.json'),JSON.stringify(singletons,null,2));
console.log(JSON.stringify({files:files.length,lines:inventory.reduce((n,f)=>n+f.lines,0),reachable:seen.size,missing,unreachable,singletons},null,2));
