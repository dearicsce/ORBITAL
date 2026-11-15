import {readFile,readdir,writeFile} from 'node:fs/promises';
const record=new URL('../Verification/Campaign-2026-11-09/',import.meta.url);
const models=JSON.parse(await readFile(new URL('models.json',record),'utf8'));
const families=new Map(models.map(m=>[m.id,m.family]));
const windows=(await readFile(new URL('verified-webview-frames.jsonl',record),'utf8')).trim().split('\n').map(line=>JSON.parse(line));
const groups=new Map();
for(const w of windows){
 if(!['simulation','operations','cruise'].includes(w.screen)||!w.mission)continue;
 const family=families.get(w.mission);
 if(!family)continue;
 const key=w.screen+' / '+family;
 if(!groups.has(key))groups.set(key,{screen:w.screen,family,frames:[],missions:new Set()});
 const group=groups.get(key);
 group.frames.push(...w.frames);group.missions.add(w.mission);
}
const result=[...groups.values()].map(({screen,family,frames,missions})=>{
 frames.sort((a,b)=>a-b);
 const at=q=>frames[Math.ceil(q*frames.length)-1];
 return {screen,family,missions:[...missions],seconds:frames.reduce((a,b)=>a+b,0)/1000,
  frameCount:frames.length,p50:at(.5),p95:at(.95),p99:at(.99),max:frames.at(-1),over100ms:frames.filter(x=>x>100).length};
});
await writeFile(new URL('verified-webview-performance.json',record),JSON.stringify(result,null,2)+'\n');
for(const r of result)console.log(r.screen,r.family,r.missions.length+' mission(s)',r.p95.toFixed(1)+' ms p95',r.p99.toFixed(1)+' ms p99');

// Recover mission labels for the Unity sampler from timestamped WebView2
// navigation snapshots. The preceding two navigations are ascent and phase
// checkpoint reloads. Filter by phase to include the pre-reload interval too.
const profile=new URL('Candidate-final-campaign/',record);
const metricFile=(await readdir(profile)).find(name=>name.startsWith('embedded-performance-')&&name.endsWith('.csv'));
const [header,...lines]=(await readFile(new URL(metricFile,profile),'utf8')).trim().split(/\r?\n/);
const metrics=lines.map(line=>Object.fromEntries(line.split(',').map((v,i)=>[header.split(',')[i],v])));
const log=(await readFile(new URL('embedded-ui.log',profile),'utf8')).trim().split(/\r?\n/);
const byName=new Map(models.map(model=>[model.name,model]));
const unityGroups=new Map();
for(let i=0;i<log.length;i++){
 const marker=log[i].match(/^(\S+) "ORBITAL \/ (LIVE OPERATIONS|TRANSFER CONTROL)\\n\\n([^\\]+)\\n/);
 if(!marker)continue;
 const [,utc,phase,name]=marker,model=byName.get(name);
 if(!model)continue;
 const reloads=log.slice(0,i).filter(line=>line.includes('Navigation completed'));
 const start=Date.parse(reloads.at(-2)?.split(' ')[0]||utc);
 const navigation=log.slice(i+1).find(line=>line.includes('Navigation completed'));
 const end=navigation?Date.parse(navigation.split(' ')[0]):start+35000;
 const screen=phase==='LIVE OPERATIONS'?'operations':'cruise';
 const available=metrics.filter(w=>w.screen===screen&&Date.parse(w.utc)-Number(w.seconds)*1000>=start&&Date.parse(w.utc)<end);
 if(!available.length)continue;
 if(!unityGroups.has(model.family))unityGroups.set(model.family,{windows:[],missions:[]});
 const group=unityGroups.get(model.family);group.windows.push(...available);group.missions.push(model.id);
}
const unityResult=[...unityGroups.entries()].map(([family,{windows,missions}])=>{
 const values=key=>windows.map(w=>Number(w[key]));
 const sum=key=>values(key).reduce((a,b)=>a+b,0);
 const max=key=>Math.max(...values(key));
 return {family,missions,windows:windows.length,seconds:sum('seconds'),frames:sum('frames'),
  meanMs:1000*sum('seconds')/sum('frames'),worstWindowP95Ms:max('p95_frame_ms'),
  worstWindowP99Ms:max('p99_frame_ms'),maxMs:max('max_frame_ms'),bridgeMessages:sum('bridge_messages'),
  bridgeBytes:sum('bridge_bytes'),thumbnailMs:sum('thumbnail_ms')};
});
await writeFile(new URL('verified-unity-performance-by-family.json',record),JSON.stringify(unityResult,null,2)+'\n');
for(const r of unityResult)console.log('Unity',r.family,r.missions.length+' mission(s)',r.worstWindowP95Ms.toFixed(1)+' ms worst-window p95');
