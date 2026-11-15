import {createReadStream} from 'node:fs';
import {readdir,stat,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const project=fileURLToPath(new URL('../',import.meta.url));
const player=path.resolve(process.argv[2]||path.join(project,'Verification/V03Parity/ManagedCheck-Final/Player'));
const output=path.resolve(process.argv[3]||path.join(project,'Verification/Campaign-2026-11-09/build-manifest.json'));
const unityData=path.join(player,'ORBITAL_Data','StreamingAssets');
const identity=JSON.parse(await readFile(path.join(unityData,'WebUI/data/build-identity.json'),'utf8'));
const files=[];
async function list(folder){
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const full=path.join(folder,entry.name);
  if(entry.isDirectory())await list(full);
  else if(entry.isFile()){
   const sha=createHash('sha256');
   for await(const chunk of createReadStream(full))sha.update(chunk);
   files.push({file:path.relative(player,full).replaceAll('\\','/'),bytes:(await stat(full)).size,sha256:sha.digest('hex')});
  }
 }
}
await list(player);
files.sort((a,b)=>a.file.localeCompare(b.file,'en'));
const total=prefix=>files.filter(f=>f.file.startsWith(prefix)).reduce((sum,f)=>sum+f.bytes,0);
const unityVersion=(await readFile(path.join(project,'ProjectSettings/ProjectVersion.txt'),'utf8')).split(/\r?\n/)[0].split(': ')[1];
const threeSource=await readFile(path.join(unityData,'WebUI/vendor/three/three.module.js'),'utf8');
const manifest={
 status:path.relative(project,player)==='Build-Display'
  ?'deployed copied-player baseline'
  :'verification player with preserved Unity asset data; distribution blocked',
 platform:'Windows x64, Mono',unityVersion,
 webView2Sdk:'1.0.3967.48',webView2RuntimeObserved:'157.0.4341.42',
 threeRevision:threeSource.match(/const REVISION = '(\d+)'/)?.[1],browser:identity,
 notices:['ORBITAL_Data/StreamingAssets/EmbeddedUI/LICENSE.txt','ORBITAL_Data/StreamingAssets/EmbeddedUI/NOTICE.txt',
  'ORBITAL_Data/StreamingAssets/WebUI/vendor/three/three.module.js','ORBITAL_Data/StreamingAssets/asset-manifest.json',
  'ORBITAL_Data/StreamingAssets/WebUI/models/manifest.json'],
 packageBytes:total(''),streamingBytes:total('ORBITAL_Data/StreamingAssets/'),
 webUiBytes:total('ORBITAL_Data/StreamingAssets/WebUI/'),files
};
await writeFile(output,JSON.stringify(manifest,null,2)+'\n');
console.log(`${files.length} files, ${manifest.packageBytes} bytes, ${manifest.streamingBytes} StreamingAssets bytes`);
