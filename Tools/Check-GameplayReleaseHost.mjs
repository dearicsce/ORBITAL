import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// The debugger is provided by the real WebView2 host on a disposable profile.
const port=process.env.ORBITAL_TEST_PORT||'19329';
const evidence=path.resolve(process.env.ORBITAL_TEST_ARTIFACTS||'Verification/Campaign-2026-11-09/Host');
await mkdir(evidence,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let page;
for(let i=0;i<240&&!page;i++){
 try{
  const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  page=pages.find(p=>p.type==='page'&&p.url.startsWith('https://orbital.local/'));
 }catch{}
 if(!page)await sleep(250);
}
assert.ok(page,'Start the isolated Windows player before running this check');
const ws=new WebSocket(page.webSocketDebuggerUrl),pending=new Map(),errors=[];
let id=0;
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
ws.onmessage=event=>{
 const msg=JSON.parse(event.data),request=pending.get(msg.id);
 if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);
 if(!request)return;
 pending.delete(msg.id);clearTimeout(request.timer);
 if(msg.error)request.reject(Error(msg.error.message));else request.resolve(msg.result);
};
function send(method,params={}){
 return new Promise((resolve,reject)=>{
  const call=++id,timer=setTimeout(()=>{pending.delete(call);reject(Error(method+' timed out'));},25000);
  pending.set(call,{resolve,reject,timer});ws.send(JSON.stringify({id:call,method,params}));
 });
}
async function evaluate(expression){
 const reply=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
 if(reply.exceptionDetails)throw Error(reply.exceptionDetails.exception?.description||reply.exceptionDetails.text);
 return reply.result.value;
}
const selector=s=>'document.querySelector('+JSON.stringify(s)+')';
const available=s=>`(()=>{const e=${selector(s)};return !!e&&!e.disabled&&!e.hidden&&e.getClientRects().length>0})()`;
async function wait(expression,timeout=18000){
 const until=Date.now()+timeout;
 do{
  try{const value=await evaluate(expression);if(value)return value;}
  catch(error){if(!/execution context|Cannot find context|Access is denied for this document/i.test(error.message))throw error;}
  await sleep(130);
 }while(Date.now()<until);
 throw Error(expression+' timed out | '+await evaluate('document.body.innerText.slice(0,850)')+' | '+(errors.at(-1)||''));
}
async function click(s,timeout){await wait(available(s),timeout);await evaluate(selector(s)+'.click()');}
async function clickExport(s){
 await wait(available(s));
 const {x,y}=await evaluate(`(()=>{const button=${selector(s)};
  button.scrollIntoView({block:'center',behavior:'instant'});
  const bounds=button.getBoundingClientRect();
  return {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
 })()`);
 assert.ok(await evaluate(`${selector(s)}.contains(document.elementFromPoint(${x},${y}))`),'Export button must be visible at the click point');
 await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
}
async function change(s,value){
 await wait(available(s));
 await evaluate(`(()=>{const e=${selector(s)};e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
const flight=()=>evaluate("JSON.parse(localStorage.getItem('space_mission_flight_v1')||'null')");
const wallet=()=>evaluate("JSON.parse(localStorage.getItem('orbital_economy_v1')||'{\"claims\":{},\"coins\":0}')");
async function capture(name){
 const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(path.join(evidence,name+'.png'),Buffer.from(data,'base64'));
}

async function frameSample(label,ms=7000){
 const startUtc=new Date().toISOString();
 const frames=await evaluate(`new Promise(resolve=>{
  const gaps=[];let start,last;
  requestAnimationFrame(function frame(now){
   if(start===undefined)start=now;
   if(last!==undefined)gaps.push(now-last);
   last=now;
   if(now-start<${ms})requestAnimationFrame(frame);else resolve(gaps);
  });
 })`);
 const sorted=[...frames].sort((a,b)=>a-b);
 const percentile=q=>sorted[Math.ceil(q*sorted.length)-1];
 return {label,startUtc,endUtc:new Date().toISOString(),sampleMs:frames.reduce((a,b)=>a+b,0),
  count:frames.length,p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),
  max:sorted.at(-1),stalls100ms:frames.filter(value=>value>100).length,
  viewport:await evaluate('({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})')};
}

async function importBlueprint(filename){
 const imported=JSON.parse(await readFile(filename,'utf8'));
 assert.equal(imported.assembly.busId,'bus_micro');
 assert.ok(imported.assembly.components.some(c=>c.catalogId==='panel_s'));
 await click('#ws-library');await wait(available('#ws-import'));
 const {root}=await send('DOM.getDocument');
 const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'#ws-import'});
 await send('DOM.setFileInputFiles',{nodeId,files:[filename]});
 const outcome=await wait(`(()=>{
  const message=document.querySelector('#ws-notice')?.textContent;
  if(message?.startsWith('Import failed:')||message?.startsWith('Imported working draft'))return message;
  if(document.querySelector('#ws-modal-title')?.textContent==='Unsaved changes')return 'save-draft';
 })()`);
 if(outcome==='save-draft')await click('#ws-dialog [data-choice="0"]');
 else assert.ok(!outcome.startsWith('Import failed:'),outcome);
 await wait("document.querySelector('#ws-notice')?.textContent.includes('Imported working draft')");
 await capture('workshop-reimport');
 return {result:'pass',file:filename,bus:imported.assembly.busId,parts:imported.assembly.components.map(c=>c.catalogId)};
}

async function exportedFile(expected=''){
 const status=await wait(`(()=>{const text=document.querySelector('#orbital-export-status')?.textContent;
  return text?.startsWith('Saved to ')&&text.includes(${JSON.stringify(expected)})?text:null;})()`,60000);
 assert.match(status,/^Saved to /);
 const filename=path.resolve(status.slice('Saved to '.length));
 assert.equal(path.dirname(filename),path.resolve(process.env.ORBITAL_TEST_EXPORT_DIR));
 return filename;
}

async function launch({captureId,reload=false}={}){
 await wait(available('#launch'));
 const reviewed=await evaluate(`(async()=>{
  const [{getState},{resolveFlightDesign},{designFingerprint}]=await Promise.all(
   ['/js/state.js','/js/flightConfiguration.js','/js/contracts/missionRun.js'].map(name=>import(name)));
  return designFingerprint(resolveFlightDesign(getState().currentDesign));
 })()`);
 if(captureId)await capture(captureId+'-review');
 await click('#launch');
 await wait("Boolean(document.querySelector('#pause-launch'))");
 const launched=await evaluate(`(async()=>{
  const {designFingerprint}=await import('/js/contracts/missionRun.js');
  return designFingerprint(JSON.parse(localStorage.getItem('space_mission_flight_v1')).design);
 })()`);
 assert.equal(launched,reviewed,'review and flight use the same resolved configuration');
 if(reload){
  await click('#pause-launch');
  const saved=await flight();
  assert.equal(saved.phase,'launch');assert.ok(saved.launchCheckpoint.paused);
  await send('Page.reload');
  await wait("document.querySelector('#pause-launch')?.textContent==='Resume'");
  assert.deepEqual((await flight()).launchCheckpoint,saved.launchCheckpoint);
  await click('#pause-launch');
 }
 await click('#skip',35000); // Advance the calculated trajectory, preserving its success/failure.
 if(await evaluate(available('#continue-delivery')))await click('#continue-delivery');
 await wait("['missionControl','operations','cruise','report'].includes(document.querySelector('[data-screen]')?.dataset.screen) || !!document.querySelector('#pause-ops')",55000);
 if(captureId)await capture(captureId+'-flight');
}

async function operate({transfer,fail=false,reload=false}){
 if(transfer){
  await click('[data-cruise-command="depart"]',40000);
  await click('[data-cruise-speed="16"]');
  await wait(available('[data-cruise-command="correct"]'),30000);
  if(reload){
   const saved=(await flight()).cruise;
   await send('Page.reload');
   await wait(available('[data-cruise-command="correct"]'));
   assert.deepEqual((await flight()).cruise,saved);
  }
  await click(fail?'[data-cruise-command="coast"]':'[data-cruise-command="correct"]');
  if(!fail){
   await click('[data-cruise-command="acquire"]',35000);
   await click('[data-cruise-command="observe"]');await click('[data-cruise-command="transmit"]');
  }
  await click('#cruise-report',35000);
 }else{
  await wait(available('#pause-ops'),40000);
  if(fail){await click('[data-command="safe"]');await click('#finish-ops');return;}
  if(reload){
   await click('#pause-ops');
   const saved=(await flight()).operations;
   await send('Page.reload');
   await wait("document.querySelector('#pause-ops')?.textContent==='Resume'");
   assert.deepEqual((await flight()).operations,saved);
   await click('#pause-ops');
  }
  await click('[data-speed="4"]');
  await wait(`(()=>{const choice=document.querySelector('[data-choice]:not(:disabled)');if(choice)choice.click();return ${available('#report')};})()`,70000);
  await click('#report');
 }
}

async function report(mission,success){
 await wait("document.querySelector('[data-screen]')?.dataset.screen==='report'");
 const run=await flight(),summary=run.operationsSummary;
 assert.equal(run.design.missionId,mission);
 assert.equal(Boolean(summary?.passed&&run.launchResult.success),success);
 if(!success){assert.equal((await wallet()).claims[run.runId],undefined);return run;}
 await wait("Boolean(document.querySelector('.wallet-reward'))");
 assert.ok((await wallet()).claims[run.runId]?.amount>0,'First report should claim a reward');
 if(run.operations){
  const {collectedGb,deliveredGb,lostGb,storageGb,batteryWh,batteryCapacityWh}=run.operations;
  assert.ok(Math.abs(collectedGb-deliveredGb-lostGb-storageGb)<1e-7);
  assert.ok(batteryWh>=0&&batteryWh<=batteryCapacityWh);
  assert.equal(summary.deliveredGb,deliveredGb);
 }
 if(run.cruise){
  const {collectedGb,deliveredGb,lostGb,storageGb,inFlight,batteryWh,hardware}=run.cruise;
  const unconfirmed=inFlight.reduce((total,packet)=>total+packet.amount,0);
  assert.ok(Math.abs(collectedGb-deliveredGb-lostGb-storageGb-unconfirmed)<1e-7);
  assert.ok(batteryWh>=0&&batteryWh<=hardware.batteryWh);
  assert.equal(summary.deliveredGb,deliveredGb);
 }
 return run;
}

async function missionList(){
 return evaluate(`(async()=>{
  const [{loadData},{programOrder,starterDesign},{missionDestination,bodyById}]=await Promise.all(
   ['/js/data.js','/js/campaign.js','/js/campaignAtlas.js'].map(name=>import(name)));
  const data=await loadData();
  return programOrder(data).map(m=>({id:m.id,requires:m.requires||[],
   level:bodyById(missionDestination(m))?.level||'earth',transfer:m.transfer?.type||null,
   custom:m.transfer&&m.destination!=='moon',orbit:starterDesign(m,data).orbitId}));
 })()`);
}

async function openMission(m){
 if(await evaluate(available('#btn-report-roster')))await click('#btn-report-roster');
 if(await evaluate(available('#campaign')))await click('#campaign');
 const tile='[data-map-mission="'+m.id+'"]';
 if(!await evaluate(available(tile))){
  await click('[data-level="'+(m.level==='jupiter'?'solar':m.level)+'"]');
 }
 await click(tile);
 await click('#map-preset');
 await click('#ws-review-top');
 if(m.custom){
  await click('#custom-rocket');await click('#rocket-reference');await click('#rocket-use');
 }else await click('#next');
 if(await evaluate(available('[data-orbit="'+m.orbit+'"]')))await click('[data-orbit="'+m.orbit+'"]');
 await click('#confirm');await click('#plan-confirm');await click('#next');
}

async function checkExperiment(missionId) {
 const before=await wallet(), original=await flight();
 if(missionId==='m1'){
  assert.equal(await evaluate("document.querySelector('#technical-evidence table')===null"),true);
  await click('#technical-evidence > summary');
  await wait(available('#technical-evidence details summary'));
  assert.equal(await evaluate("document.querySelectorAll('#technical-evidence table').length"),2);
 }
 await click('#open-mission-experiment');
 await evaluate("document.querySelector('#trial-prediction').value='The changed schedule will alter the evidence returned.'");
 await click('#trial-run');
 await wait(available('#export-comparison'));
 const results=await evaluate("document.querySelector('#trial-results').innerText");
 assert.match(results,/Recorded inputs rerun/);
 assert.match(results,/Lowest reserve/);
 await capture(missionId+'-experiment');
 let hardwareResult=null;
 if(missionId==='m1'){
  const value=await evaluate("Array.from(document.querySelectorAll('#trial-hardware option')).find(o=>/battery/i.test(o.textContent))?.value");
  assert.ok(value,'Floodwatch exposes a fitted battery swap');
  await evaluate(`(()=>{const input=document.querySelector('#trial-input');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('change'));})()`);
  assert.match(await evaluate("document.querySelector('#trial-hardware-preview').innerText"),/Launch mass .*Mission cost/s);
  await click('#trial-run');
  await wait(available('#export-comparison'));
  hardwareResult=await evaluate("document.querySelector('#trial-results').innerText");
  assert.match(hardwareResult,/Changed component.*battery/is);
  await capture('m1-hardware-trial');
  if(process.env.ORBITAL_TEST_EXPORT_DIR){
   await clickExport('#export-comparison');
   const record=JSON.parse(await readFile(await exportedFile('orbital-mission-experiment'),'utf8'));
   assert.deepEqual(record.before.summary,original.operationsSummary);
   assert.equal(record.after.input.hardware,value.slice(9));
   assert.equal(record.after.initialSeed,original.initialSeed);
   assert.deepEqual(record.after.initialOrbit,original.operations.orbit);
   assert.equal(record.after.design.assembly.components.filter((c,index)=>c.catalogId!==original.design.assembly.components[index].catalogId).length,1);
   await writeFile(path.join(evidence,'m1-hardware-comparison.json'),JSON.stringify(record,null,2)+'\n');
  }
 }
 await click('#trial-robustness');
 await wait(available('#export-sensitivity'));
 assert.match(await evaluate("document.querySelector('#trial-results').innerText"),/Three reproducible/);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await wait("document.activeElement?.id==='open-mission-experiment' && !document.querySelector('dialog[open]')");
 assert.deepEqual(await wallet(),before);
 assert.deepEqual(await flight(),original);
 return {result:'pass',missionId,runId:original.runId,focus:'restored after Escape',results,hardwareResult};
}

const mode=process.argv[2]||'postflight',rows=[];
try{
 await send('Page.enable');await send('Runtime.enable');
 if(mode==='reports'){
  await send('Page.navigate',{url:'https://orbital.local/index.html'});await wait(available('#campaign'));
  const files=(await import('node:fs/promises')).readdir;
  const folder=path.resolve(process.argv[3]);
  const names=(await files(folder)).filter(n=>n.startsWith('orbital-flight-')&&n.endsWith('.json'));
  const originals=[];for(const n of names){const r=JSON.parse(await readFile(path.join(folder,n),'utf8'));if(r.format==='orbital-flight-record')originals.push(r);}
  assert.equal(new Set(originals.map(r=>r.run.design.missionId)).size,28);
  const paid=await wallet();
  for(const record of originals){
   await evaluate(`(async()=>{const f=await import('/js/flightSession.js'),s=await import('/js/state.js');s.clearDesign();s.setDesign(${JSON.stringify(record.run.design)});s.saveProgress();if(!f.importFlightSession(${JSON.stringify(record.run)}))throw Error('Reimport rejected');})()`);
   await send('Page.navigate',{url:'https://orbital.local/index.html?screen=report'});await wait(available('#export-flight-record'),30000);
   const current=await flight();assert.equal(current.design.missionId,record.run.design.missionId);assert.deepEqual(current.operationsSummary,record.run.operationsSummary);assert.deepEqual(await wallet(),paid,'Reimport report cannot reward twice');
   const layout=await evaluate(`(()=>{const shell=document.querySelector('[data-screen=report]'),panel=shell.querySelector('.mission-panel');return {left:shell.getBoundingClientRect().left,width:innerWidth,allInside:[...document.querySelectorAll('details.ops-report-summary')].every(d=>panel.contains(d)),overflow:document.documentElement.scrollWidth>innerWidth+1};})()`);
   assert.ok(layout.allInside&&!layout.overflow&&layout.left<layout.width*.2,'Report remains in its intended reading column');
   let historicalComparison=false;
   if(current.design.missionId==='ice'&&await evaluate("Boolean(document.querySelector('.mission-observations'))")){
    await click('.mission-observations > summary');
    await wait("document.querySelector('.mission-observations input[type=range]') && [...document.querySelectorAll('.mission-observations img')].every(img=>img.complete&&img.naturalWidth>0)");
    await evaluate("document.querySelector('.mission-observations input').scrollIntoView({block:'center'})");
    await capture('ice-debrief-observations');
    historicalComparison=true;
   }
   rows.push({id:current.design.missionId,result:'pass',summaryUnchanged:true,rewardUnchanged:true,layout,historicalComparison});
  }
  await capture('final-report-layout');
 }else if(mode==='end-dynamics'){
  const record=JSON.parse(await readFile(path.resolve(process.argv[3]),'utf8')),baseline=record.run;
  const outcomes=[];
  for(const choice of ['extend','disposal','passivate']){
   await send('Page.navigate',{url:'https://orbital.local/index.html'});await wait(available('#campaign'));
   await evaluate(`(async()=>{const f=await import('/js/flightSession.js'),s=await import('/js/state.js');s.clearDesign();s.setDesign(${JSON.stringify(baseline.design)});s.saveProgress();if(!f.importFlightSession(${JSON.stringify(baseline)}))throw Error('End-choice fixture rejected');})()`);
   await send('Page.navigate',{url:'https://orbital.local/index.html?screen=report'});await wait(available('#export-flight-record'));
   const original=await flight(),paid=await wallet();
   await evaluate("(()=>{const e=[...document.querySelectorAll('details')].find(d=>d.firstElementChild?.textContent.includes('Mission-end choice'));e.open=true;e.id='test-end';})()");
   const handler=event=>{const msg=JSON.parse(event.data);if(msg.method==='Page.javascriptDialogOpening'&&msg.params.message.includes('Commit this mission-end choice?'))send('Page.handleJavaScriptDialog',{accept:true});};ws.addEventListener('message',handler);
   await click('#test-end button[data-choice="'+choice+'"]');await wait("JSON.parse(localStorage.getItem('space_mission_flight_v1')).missionEnd?.version==='end-choice-2'");ws.removeEventListener('message',handler);
   const ended=await flight();assert.deepEqual(ended.operations,original.operations);assert.deepEqual(ended.operationsSummary,original.operationsSummary);assert.deepEqual(await wallet(),paid);
   if(choice==='extend'){assert.equal(ended.missionEnd.extension.steps,24);assert.equal(ended.missionEnd.finalMissionElapsedSec-ended.missionEnd.missionElapsedSec,6480);assert.equal(ended.missionEnd.costKg,1);assert.equal(ended.lifecycle.missionElapsedSec,ended.missionEnd.finalMissionElapsedSec);}
   if(choice==='disposal'){assert.ok(ended.missionEnd.orbit.semiMajorAxisM<original.operations.orbit.semiMajorAxisM);assert.ok(ended.missionEnd.disposal.passivated);}
   if(choice==='passivate')assert.equal(ended.missionEnd.active,false);
   await capture('end-'+choice);await writeFile(path.join(evidence,'end-'+choice+'-run.json'),JSON.stringify(ended,null,2));
   await send('Page.reload');await wait(available('#export-flight-record'));assert.deepEqual((await flight()).missionEnd,ended.missionEnd);assert.deepEqual(await wallet(),paid);
   outcomes.push({choice,result:'pass',outcome:ended.missionEnd,originalScoreUnchanged:true,rewardUnchanged:true});
  }
  rows.push({result:'pass',fixture:'Alternative choices from the same actual flown checkpoint; explicit backup reimport between branches',outcomes});
 }else if(mode==='stale-save'){
  await send('Page.reload',{ignoreCache:true});await wait(available('#export-flight-record'));
  const result=await evaluate(`(async()=>{const f=await import('/js/flightSession.js'),original=structuredClone(f.getFlightSession()),older=structuredClone(original),newer=structuredClone(original);older.runId='owned-stale-callback-fixture';newer.runId='owned-import-fixture';if(!f.importFlightSession(older)||!f.importFlightSession(newer))throw Error('Fixture activation failed');const before=localStorage.getItem('space_mission_flight_v1'),accepted=f.setFlightSession(older),after=localStorage.getItem('space_mission_flight_v1');if(!f.importFlightSession(original))throw Error('Could not restore original');return {staleRejected:accepted===false,unchanged:before===after,restored:f.getFlightSession().runId===original.runId};})()`);
  assert.ok(result.staleRejected&&result.unchanged&&result.restored);
  const sameId=await evaluate(`(async()=>{const f=await import('/js/flightSession.js'),old=f.getFlightSession(),replacement=structuredClone(old);replacement.wasCompleted=!old.wasCompleted;if(!f.importFlightSession(replacement))throw Error('Same-ID replacement rejected');const before=localStorage.getItem('space_mission_flight_v1'),rejected=f.setFlightSession(old)===false,unchanged=before===localStorage.getItem('space_mission_flight_v1');if(!f.importFlightSession(old))throw Error('Original restoration rejected');return {sameIdStaleRejected:rejected,sameIdUnchanged:unchanged};})()`);
  assert.ok(sameId.sameIdStaleRejected&&sameId.sameIdUnchanged);rows.push({result:'pass',...result,...sameId});
 }else if(mode==='full-experiment'){
  await send('Page.reload',{ignoreCache:true});await wait(available('#open-mission-experiment'));
  const original=await flight(),paid=await wallet();await click('#open-mission-experiment');
  const hardware=await evaluate("Array.from(document.querySelectorAll('#trial-hardware option')).find(o=>o.value.endsWith('/battery_compact'))?.value");assert.ok(hardware);
  await evaluate(`(()=>{const s=document.querySelector('#trial-scope');s.value='full-mission';s.dispatchEvent(new Event('change'));const h=document.querySelector('#trial-input');h.value=${JSON.stringify(hardware)};h.dispatchEvent(new Event('change'));})()`);
  assert.match(await evaluate("document.querySelector('#trial-hardware-preview').innerText"),/reruns numerical ascent/);
  await click('#trial-run');await wait(available('#export-comparison'));
  await evaluate("document.querySelector('#orbital-export-status')?.replaceChildren()");await clickExport('#export-comparison');
  const record=JSON.parse(await readFile(await exportedFile('orbital-mission-experiment'),'utf8'));
  assert.equal(record.before.scope,'full-mission');assert.equal(record.after.scope,'full-mission');assert.ok(record.before.launchResult.success);assert.notEqual(record.before.massKg,record.after.massKg);assert.equal(record.after.confounded,false);
  assert.deepEqual(await wallet(),paid);assert.deepEqual(await flight(),original);await capture('full-mission-hardware-comparison');
  assert.equal(record.before.summary.science.usefulGb,0);assert.equal(record.after.summary.science.usefulGb,0,'Larger battery cannot repair an Observe-only no-transmission policy');
  rows.push({result:'pass',treatment:'300 to 450 Wh rated battery; original Observe-only policy retained',scopes:[record.before.scope,record.after.scope],beforeMassKg:record.before.massKg,afterMassKg:record.after.massKg,beforeCostM:record.before.costM,afterCostM:record.after.costM,beforeUsefulGb:record.before.summary.science.usefulGb,afterUsefulGb:record.after.summary.science.usefulGb,rewardUnchanged:true,originalRunUnchanged:true,afterLaunch:record.after.launchResult});
 }else if(mode==='postflight'){
  await send('Page.reload',{ignoreCache:true});await wait("document.body.innerText.includes('Open last report') || !!document.querySelector('#export-flight-record')");await evaluate("([...document.querySelectorAll('button')].find(b=>b.textContent==='Open last report')||(document.body.innerText.includes('Open last report')?document.querySelector('#campaign'):null))?.click()");await wait(available('#export-flight-record'));
  const original=await flight(),paid=await wallet();assert.ok(original.operations.finished);
  await evaluate(`(()=>{const d=[...document.querySelectorAll('details')].find(d=>d.firstElementChild?.textContent.includes('Mission-end choice'));d.open=true;d.id='test-end';const l=[...document.querySelectorAll('details')].find(d=>d.firstElementChild?.textContent.includes('Optional local'));l.open=true;l.id='test-learning';})()`);
  const b='#test-end button[data-choice="extend"]';
  ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.method==='Page.javascriptDialogOpening'&&msg.params.message.includes('Commit this mission-end choice?'))send('Page.handleJavaScriptDialog',{accept:true});});
  await click(b);await wait("JSON.parse(localStorage.getItem('space_mission_flight_v1')).missionEnd?.id==='extend'");
  const ended=await flight();assert.equal(ended.missionEnd.remainingKg,original.operations.fuelKg-1);assert.deepEqual(ended.operationsSummary,original.operationsSummary);assert.deepEqual(await wallet(),paid);
  assert.ok(await evaluate("[...document.querySelectorAll('#test-end button')].every(b=>b.disabled)"),'Irreversible end choice locks');
  assert.ok(await evaluate("document.querySelector('#test-learning button').disabled"));await click('#test-learning input[type=checkbox]');
  await evaluate("document.querySelector('#orbital-export-status')?.replaceChildren()");await clickExport('#test-learning button');const notes=JSON.parse(await readFile(await exportedFile('orbital-learning-notes'),'utf8'));
  assert.ok(Object.values(notes.notes).every(v=>v===''),'Automated UI test exports blank notes, not invented participant responses');assert.equal(notes.seed,original.initialSeed);assert.deepEqual(notes.source,original.sourceBundle);
  await capture('end-choice-learning-controls');
  await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await send('Page.reload');await wait(available('#export-flight-record'));
  const snapshot={flight:await flight(),wallet:await wallet(),campaign:await evaluate("localStorage.getItem('space_mission_game_state_v1')")};assert.deepEqual(snapshot.flight,ended);assert.deepEqual(snapshot.wallet,paid);
  await writeFile(path.join(evidence,'restart-snapshot.json'),JSON.stringify(snapshot,null,2));await capture('offline-report');
  rows.push({result:'pass',automatedBlankNotes:true,endChoice:ended.missionEnd,receiptPreserved:true,offlineReload:true});
  await evaluate("window.chrome.webview.postMessage({protocol:1,type:'application.quit'})");
 }else if(mode==='restart-after'){
  const snapshot=JSON.parse(await readFile(path.join(evidence,'restart-snapshot.json'),'utf8'));await wait("document.body.innerText.includes('Open last report') || !!document.querySelector('#export-flight-record')",50000);await evaluate("([...document.querySelectorAll('button')].find(b=>b.textContent==='Open last report')||(document.body.innerText.includes('Open last report')?document.querySelector('#campaign'):null))?.click()");await wait(available('#export-flight-record'));
  assert.deepEqual(await flight(),snapshot.flight);assert.deepEqual(await wallet(),snapshot.wallet);assert.equal(await evaluate("localStorage.getItem('space_mission_game_state_v1')"),snapshot.campaign);
  await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await send('Page.reload');await wait(available('#export-flight-record'));assert.deepEqual(await flight(),snapshot.flight);await capture('restarted-offline-report');
  rows.push({result:'pass',processRestart:true,flightWalletCampaignPreserved:true,offlineReload:true});
 }else throw Error('Unknown mode');
 assert.deepEqual(errors,[]);
}catch(error){rows.push({result:'fail',error:String(error),errors});await capture(mode+'-failure').catch(()=>{});throw error;}
finally{await writeFile(path.join(evidence,mode+'.json'),JSON.stringify(rows,null,2));ws.close();}
console.log(mode,'PASS');
