import {readFile,readdir,writeFile} from 'node:fs/promises';

const stamp=process.argv[2];
if(!/^perf-\d{8}-\d{6}$/.test(stamp??''))throw Error('Pass the paired run name from Measure-CampaignHosts.ps1');
const project=new URL('../',import.meta.url);
const evidence=new URL('Verification/Campaign-2026-11-09/',project);
const read=(dir,file)=>readFile(new URL(file,dir),'utf8');
const json=async(dir,file)=>JSON.parse(await read(dir,file));
const n=value=>value.toFixed(2);
const mib=bytes=>bytes/1048576;
function csv(content){
 const [header,...rows]=content.trim().split(/\r?\n/);
 const keys=header.replaceAll('"','').split(',');
 return rows.map(row=>Object.fromEntries(row.replaceAll('"','').split(',').map((v,i)=>[keys[i],v])));
}
async function load(role){
 const folder=role+'-'+stamp;
 const dir=new URL(folder+'/',evidence);
 const launch=await json(dir,'launch.json'),warm=await json(dir,'warm-launch.json');
 const frames=await json(dir,'performance.json');
 const log=(await read(dir,'embedded-ui.log')).trim().split(/\r?\n/);
 function readiness(run){
  const start=Date.parse(run.StartedUtc);
  const time=event=>{
   const line=log.find(line=>line.includes(event)&&Date.parse(line.split(' ')[0])>=start);
   if(!line)throw Error(role+' missing '+event);
   return (Date.parse(line.split(' ')[0])-start)/1000;
  };
  return {composition:time('Composition host ready'),bridge:time('Presentation bridge ready')};
 }
 const process=csv(await read(dir,'processes.csv'));
 const bySnapshot=Map.groupBy(process,row=>row.utc);
 const names=Map.groupBy(process,row=>row.process);
 const groups=[...names.keys()];
 const peaks=Object.fromEntries(groups.map(name=>[name,Math.max(...[...bySnapshot.values()].map(rows=>
  mib(rows.filter(row=>row.process===name).reduce((sum,row)=>sum+Number(row.private_bytes),0))))]));
 const cpu={};
 const snapshots=[...bySnapshot.values()];
 const operations=frames.find(frame=>frame.label==='Earth operations');
 const sampledOperations=Boolean(operations&&Date.parse(snapshots.at(-1)[0].utc)>=Date.parse(operations.startUtc)+5000);
 const duration=(Date.parse(snapshots.at(-1)[0].utc)-Date.parse(snapshots[0][0].utc))/1000;
 for(let i=1;i<snapshots.length;i++){
  const previous=new Map(snapshots[i-1].map(row=>[row.pid,row]));
  for(const row of snapshots[i])if(previous.has(row.pid))cpu[row.process]=(cpu[row.process]??0)+
    Math.max(0,Number(row.cpu_seconds)-Number(previous.get(row.pid).cpu_seconds))/duration;
 }
 const unityFile=(await readdir(dir)).filter(name=>name.startsWith('embedded-performance-')&&name.endsWith('.csv')).sort()[0];
 const unity=csv(await read(dir,unityFile));
 const sum=key=>unity.reduce((acc,row)=>acc+Number(row[key]??0),0);
 return {folder,executable:launch.Executable,fresh:readiness(launch),warm:readiness(warm),frames,
  peaks,cpu,snapshots:snapshots.length,sampledOperations,unityFile,unity:{
   firstFrameMs:Number(unity[0].max_frame_ms),messages:sum('bridge_messages'),bytes:sum('bridge_bytes'),
   thumbnailMs:sum('thumbnail_ms'),maxWindowThumbnailMs:Math.max(...unity.map(row=>Number(row.thumbnail_ms??0)))
  }};
}
const [a,b]=await Promise.all([load('Baseline'),load('Candidate')]);
if(!b.executable.includes('ManagedCheck-MissionEvidence'))throw Error('Expected the exact mission evidence player');
if(!a.sampledOperations||!b.sampledOperations)throw Error('Both process samplers must cover Earth operations');
const lines=['# Paired performance evidence','',
 'Same Windows workstation with Intel Core i5-1135G7, Intel Iris Xe driver 31.0.101.5522, Direct3D 11 and WebView2 157.0.4341.42. The test used 1366 × 768 at DPR 1 and matched seven-second browser samples. Baseline and candidate ran sequentially, with separate fresh profiles and one warm relaunch each. Filesystem caches were left intact.','',
 '| WebView2 scene | Baseline p95 / p99 | Candidate p95 / p99 | Longest gap, baseline → candidate | Gaps over 100 ms |',
 '| --- | --- | --- | --- | --- |'];
for(const before of a.frames){
 const after=b.frames.find(row=>row.label===before.label);
 if(!after)throw Error('Missing paired scene '+before.label);
 const pct=r=>n(r.p95)+' / '+n(r.p99)+' ms';
 lines.push('| '+before.label+' | '+pct(before)+' | '+pct(after)+' | '+n(before.max)+' → '+n(after.max)+' ms | '+before.stalls100ms+' → '+after.stalls100ms+' |');
}
lines.push('','| Process/startup metric | Deployed baseline | Mission evidence candidate |','| --- | --- | --- |',
 ...['fresh','warm'].flatMap(kind=>['composition','bridge'].map(event=>
   '| '+kind+' process start to '+event+' readiness | '+n(a[kind][event])+' s | '+n(b[kind][event])+' s |')),
 '| First Unity frame interval | '+n(a.unity.firstFrameMs)+' ms | '+n(b.unity.firstFrameMs)+' ms |',
 '| Process snapshots | '+a.snapshots+' | '+b.snapshots+' |');
for(const name of new Set([...Object.keys(a.cpu),...Object.keys(b.cpu)]))
 lines.push('| '+name+' average logical-core equivalents | '+n(a.cpu[name]??0)+' | '+n(b.cpu[name]??0)+' |');
for(const name of new Set([...Object.keys(a.peaks),...Object.keys(b.peaks)]))
 lines.push('| '+name+' peak private memory | '+n(a.peaks[name]??0)+' MiB | '+n(b.peaks[name]??0)+' MiB |');
lines.push('','Private memory for child processes is summed within each observation before taking the peak. Browser frame intervals come from requestAnimationFrame, separate from Unity frame instrumentation. The short runs do not establish GPU timing, driver sensitivity or long-session memory stability. Bridge and thumbnail counters are recorded where the Unity build exposes them.','',
 'An earlier 90-second process probe stopped before baseline operations. Its startup and frame readings are retained separately. [Short-sample run](performance-short-sample.md)','','The collapsed map change removes per-tick SVG computation. A matched Node probe measured the component work separately from browser frame timing. The report renderer probe took p95 2.38 ms to build 36.8 kB of evidence markup with 115 observations. DOM layout, localStorage write timing and paint are outside that probe. [Ground-track CPU probe](ground-track-cost.json) · [Report markup CPU probe](report-markup-cost.json)','');
for(const [role,row] of [['Baseline',a],['Candidate',b]]){
 const dir='../Campaign-2026-11-09/'+row.folder+'/';
 lines.push('- '+role+' evidence. [Browser frame samples]('+dir+'performance.json) · [Startup phases]('+dir+'embedded-ui.log) · [CPU and memory]('+dir+'processes.csv) · [Unity frame and bridge trace]('+dir+row.unityFile+')');
}
const output=new URL('Verification/MissionExperiments/',project);
await writeFile(new URL('performance.md',output),lines.join('\n')+'\n');
await writeFile(new URL('performance-summary.json',output),JSON.stringify({baseline:a,candidate:b},null,2)+'\n');
