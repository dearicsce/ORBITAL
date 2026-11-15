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
  return text?.startsWith('Saved to ')&&text.includes(${JSON.stringify(expected)})?text:null;})()`);
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
  await wait(`(()=>{const choice=document.querySelector('[data-choice]:not(:disabled)');if(choice)choice.click();${process.env.ORBITAL_TEST_SKIP_OPERATIONS==='1'?"const skip=document.querySelector('#skip-ops');if(skip&&!skip.disabled&&!skip.hidden)skip.click();":''}return ${available('#report')};})()`,70000);
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
 if(await evaluate(available('#campaign-map')))await click('#campaign-map');
 else if(await evaluate(available('#campaign')))await click('#campaign');
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

const mode=process.argv[2]||'floodwatch';
const rows=[];
try{
 await send('Page.enable');await send('Runtime.enable');
 if(mode==='floodwatch'){
  await click('#campaign');await capture('m1-map');
  await click('[data-map-mission="m1"]');await click('#map-preset');await capture('m1-design');
  await click('#ws-review-top');await capture('m1-launcher');
  await click('#next');await click('#confirm');await click('#plan-confirm');await click('#next');
  await launch({captureId:'m1',reload:true});await operate({reload:true});
  const run=await report('m1',true),paid=await wallet();
  await capture('m1-report');await send('Page.reload');
  await wait("Boolean(document.querySelector('.wallet-reward'))");assert.deepEqual(await wallet(),paid);
  rows.push({id:'m1',result:'pass',runId:run.runId,summary:run.operationsSummary,reward:paid.claims[run.runId]});
 }else if(mode==='floodwatch-failure'||mode==='pause-floodwatch'){
  await send('Page.navigate',{url:'https://orbital.local/index.html'});
  await wait(available('#campaign'));
  const mission=(await missionList()).find(m=>m.id==='m1');
  await openMission(mission);
  await launch({captureId:mode});
  await wait(available('#pause-ops'),40000);
  if(mode==='pause-floodwatch'){
   await click('[data-speed="4"]');
   await wait("JSON.parse(localStorage.getItem('space_mission_flight_v1')).operations.tick>=8");
   await click('#pause-ops');
   const run=await flight();
   assert.equal(run.phase,'operations');assert.ok(run.operations.paused);
   await writeFile(path.join(evidence,'paused-run.json'),JSON.stringify(run,null,2)+'\n');
   await evaluate("window.chrome.webview.postMessage({protocol:1,type:'application.quit'})");
   rows.push({id:'m1',result:'paused and requested native quit',runId:run.runId,tick:run.operations.tick});
  }else{
   await click('[data-command="safe"]');await click('[data-speed="4"]');
   await wait(`(()=>{const choice=document.querySelector('[data-choice]:not(:disabled)');if(choice)choice.click();return ${available('#report')};})()`,70000);
   await click('#report');
   const run=await report('m1',false);
   assert.ok(run.operationsSummary.windowCompleted);
   await capture('m1-failed-report');
   rows.push({id:'m1',result:'expected objective failure',runId:run.runId,summary:run.operationsSummary});
  }
 }else if(mode==='mission-evidence-demo'){
  await send('Page.navigate',{url:'https://orbital.local/index.html'});
  await wait(available('#campaign'));
  await openMission((await missionList()).find(m=>m.id==='m1'));
  await launch();
  await click('[data-command="observe"]');
  await operate({transfer:false});
  const original=await report('m1',false),before=await wallet();
  assert.ok(original.operationsSummary.collectedGb>0);
  assert.equal(original.operationsSummary.deliveredGb,0);
  assert.match(await evaluate("document.querySelector('#mission-evidence').innerText"),/Earth confirmed zero bytes/);
  await capture('arrived-no-delivery');
  await click('#open-mission-experiment');
  await evaluate("document.querySelector('#trial-prediction').value='Autopilot will return more useful data because it transmits during contact.'");
  assert.equal(await evaluate("document.querySelector('#trial-input').value"),'auto');
  await click('#trial-run');
  await wait(available('#export-comparison'));
  const results=await evaluate("document.querySelector('#trial-results').innerText");
  assert.match(results,/Missed\s+Achieved/);
  assert.match(results,/Useful received \(GB\)\s+0\.000\s+[1-9]/);
  await capture('one-change-compared');
  let record=null;
  if(process.env.ORBITAL_TEST_EXPORT_DIR){
   await clickExport('#export-comparison');record=await exportedFile('orbital-mission-experiment');
   const exported=JSON.parse(await readFile(record,'utf8'));
   assert.deepEqual(exported.before.summary,original.operationsSummary);
   assert.equal(exported.after.summary.passed,true);
  }
  assert.deepEqual(await wallet(),before);
  assert.deepEqual(await flight(),original);
  rows.push({id:'m1',result:'pass',runId:original.runId,results,record});
 }else if(mode==='resume-floodwatch'){
  const saved=JSON.parse(await readFile(path.join(evidence,'paused-run.json'),'utf8'));
  await wait("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Resume saved flight')");
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Resume saved flight').click()");
  await wait("document.querySelector('#pause-ops')?.textContent==='Resume'");
  const resumed=await flight();
  assert.equal(resumed.runId,saved.runId);assert.deepEqual(resumed.operations,saved.operations);
  await click('#pause-ops');await operate({transfer:false});
  const run=await report('m1',true),paid=await wallet();
  await capture('m1-native-restart-report');
  await send('Page.reload');await wait("Boolean(document.querySelector('.wallet-reward'))");
  assert.deepEqual(await wallet(),paid);
  let record=null;
  if(process.env.ORBITAL_TEST_EXPORT_DIR){
   await click('#export-flight-record');
   record=await exportedFile();
   const exported=JSON.parse(await readFile(record,'utf8'));
   assert.equal(exported.run.runId,run.runId);
   assert.deepEqual(exported.summary,run.operationsSummary);
  }
  rows.push({id:'m1',result:'pass',runId:run.runId,resumedTick:resumed.operations.tick,reward:paid.claims[run.runId],record});
 }else if(mode==='learning'){
  await click('#training');await wait(available('[data-add="bus_micro"]'));
  const before=await evaluate("localStorage.getItem('space_mission_game_state_v1')");
  await click('[data-add="bus_micro"]');
  assert.equal(await evaluate("localStorage.getItem('space_mission_game_state_v1')"),before);
  assert.equal((await wallet()).coins,0);
  await capture('academy-bus');
  await evaluate("(async()=>{(await import('/js/ui/router.js')).showScreen('menu');})()");
  await click('#settings');await click('a[href="docs/REALISM_AND_SPACE_APPS_AUDIT.md"]');
  await wait("document.querySelector('dialog[open] pre')?.textContent.length>500");
  await click('dialog[open] button');await click('#close-settings');
  assert.equal(await evaluate('document.activeElement.id'),'settings');
  await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Floodwatch power lab').click()");
  await click('dialog[open] #learning-body button');await click('dialog[open] #learning-body button');
  const result=await evaluate("document.querySelector('#lab-results').innerText");
  assert.match(result,/Small battery · Objectives missed/);
  assert.match(result,/Larger battery · Objectives achieved/);
  assert.equal((await wallet()).coins,0);
  await capture('floodwatch-power-lab');
  rows.push({result:'pass',academy:'isolated bus installation',lab:result});
 }else if(mode==='prepare-export'||mode==='roundtrip'){
  await send('Page.navigate',{url:'https://orbital.local/index.html?screen=workshop'});
  await click('[data-add="bus_micro"]');
  await click('[data-add="panel_s"]');
  await click('#ws-export');
  if(mode==='roundtrip')rows.push(await importBlueprint(await exportedFile()));
  else rows.push({result:'save requested'});
 }else if(mode==='reimport'){
  rows.push(await importBlueprint(path.resolve(process.argv[3])));
 }else if(mode==='workshop-stress'){
  await wait(available('#ws-interior'));
  const initial=await evaluate("document.querySelector('#ws-installed-count').textContent");
  for(let i=0;i<12;i++){
   await click('#ws-interior');await click('#ws-stowed');
   await click('[data-preview="bus_micro"]');await sleep(300);
   await click('.ws-modal-actions button:last-child');
   await click('#ws-installed [data-select]:not([data-select="bus"])');
   await click('[data-tool="remove"]');await sleep(100);
   await click('#ws-undo');await sleep(200);
   assert.equal(await evaluate("document.querySelector('#ws-installed-count').textContent"),initial);
  }
  await capture('workshop-stress-restored');
  rows.push({result:'pass',cycles:12,installed:initial});
 }else if(mode==='corrupt-campaign'){
  const key='space_mission_game_state_v1',broken='{"incomplete":';
  await send('Page.navigate',{url:'https://orbital.local/index.html'});
  await wait(available('#campaign'));
  const original=await evaluate(`localStorage.getItem(${JSON.stringify(key)})`);
  await evaluate(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(broken)})`);
  await send('Page.reload');
  await wait("document.querySelector('h1')?.textContent==='Campaign save needs attention'");
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(key)})`),broken);
  await capture('corrupt-campaign-recovery');
  await evaluate(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(original)})`);
  await send('Page.reload');await wait(available('#campaign'));
  rows.push({result:'pass',recovery:'visible and corrupt bytes preserved'});
 }else if(mode==='legacy-transition'){
  await wait(available('#campaign'));
  // Late scenario fixture. The separate full campaign starts at zero clears.
  await evaluate(`(async()=>{
   const state=await import('/js/state.js'),fixture=state.getState();
   fixture.completedMissions={m1:{stars:5}};
   if(!state.importProgress(fixture).ok||!state.saveProgress())throw Error('Could not load isolated relay prerequisite');
  })()`);
  const relay=(await missionList()).find(m=>m.id==='m2');
  await openMission(relay);
  await launch({captureId:'m2',reload:true});
  await operate({transfer:false,reload:true});
  const run=await report('m2',true);
  await capture('m2-after-renderer-reload');
  rows.push({result:'pass',id:'m2',runId:run.runId,reloadedIllustrativeLaunch:true,summary:run.operationsSummary});
 }else if(mode==='layout'){
  for(const [width,height,dpr] of [[1366,768,1],[1280,720,1],[1920,1080,1],[1024,576,1.25],[800,500,1]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:false});
   await send('Page.navigate',{url:'https://orbital.local/index.html'});
   await wait(available('#campaign'));
   assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"));
   await evaluate("document.querySelector('#settings').focus()");
   await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
   const focus=await evaluate(`(()=>{
    const e=document.activeElement,s=getComputedStyle(e);
    return {id:e.id,visible:e.matches(':focus-visible')&&(s.outlineStyle!=='none'||s.boxShadow!=='none')};
   })()`);
   assert.ok(focus.visible,'Keyboard focus is visible');
   await click('#settings');await click('#close-settings');
   await wait("document.activeElement.id==='settings'");
   assert.equal(await evaluate('document.activeElement.id'),'settings');
   await capture('home-'+width+'x'+height);
   await send('Page.navigate',{url:'https://orbital.local/index.html?screen=missionSelect'});await click('[data-map-mission="m1"]');await click('#map-preset');
   await wait(available('#ws-review-top'));
   assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth+1"));
   await capture('workshop-'+width+'x'+height);
   rows.push({result:'pass',width,height,dpr,focus,method:'WebView2 CSS viewport emulation'});
  }
  await send('Emulation.clearDeviceMetricsOverride');
 }else if(mode==='source-link'){
  await send('Page.navigate',{url:'https://orbital.local/index.html?screen=evidence'});
  const link='[data-screen="evidence"] a[href^="https://science.nasa.gov/"]';
  await wait(available(link));
  const point=await evaluate(`(()=>{
   const link=${selector(link)};
   link.scrollIntoView({block:'center'});
   const r=link.getBoundingClientRect();
   return {x:r.left+r.width/2,y:r.top+r.height/2,url:link.href};
  })()`);
  for(const type of ['mousePressed','mouseReleased'])
   await send('Input.dispatchMouseEvent',{type,x:point.x,y:point.y,button:'left',clickCount:1});
  assert.ok(await evaluate("location.origin==='https://orbital.local'"));
  rows.push({result:'user-activated source link requested',url:point.url});
 }else if(mode==='quit'){
  await wait("Boolean(document.querySelector('[data-screen]'))");
  await evaluate("window.chrome.webview.postMessage({protocol:1,type:'application.quit'})");
  rows.push({result:'requested native quit'});
 }else if(mode==='startup'){
  await wait(available('#campaign'),45000);
  rows.push({result:'ready',observedUtc:new Date().toISOString(),
   viewport:await evaluate('({width:innerWidth,height:innerHeight,dpr:devicePixelRatio})')});
 }else if(mode==='performance'){
  await send('Page.navigate',{url:'https://orbital.local/index.html'});
  await wait(available('#campaign'));
  rows.push(await frameSample('home'));
  await send('Page.navigate',{url:'https://orbital.local/index.html?screen=workshop'});
  await wait(available('[data-add="bus_micro"]'));
  rows.push(await frameSample('empty workshop'));
  await evaluate(`(async()=>{
   const [{loadData},{makeBlueprint},{showScreen}]=await Promise.all(
    ['/js/data.js','/js/workshop/blueprint.js','/js/ui/router.js'].map(name=>import(name)));
   const data=await loadData();
   const blueprint=makeBlueprint({busId:'bus_large',panelIds:['panel_m','panel_m','panel_s','panel_s'],
    batteryIds:['battery_m','battery_m'],fuelIds:['fuel_s','fuel_s'],
    instrumentIds:['optical_camera','thermal_imager','weather_imager','magnetometer'],
    computerId:'computer_basic',commsId:'comms_x_band',pointingId:'pointing_reaction_wheels'},data,'Performance assembly');
   showScreen('workshop',{mission:false,blueprint});
  })()`);
  await wait("document.querySelector('#ws-name')?.value==='Performance assembly'");
  rows.push(await frameSample('large workshop'));
  await capture('large-workshop');
  await click('[data-preview="bus_micro"]');
  rows.push(await frameSample('equipment preview'));
  await capture('equipment-preview');
  await click('.ws-modal-actions button:last-child');
  await send('Page.navigate',{url:'https://orbital.local/index.html?screen=rocketWorkshop'});
  await wait("Boolean(document.querySelector('[data-screen=rocketWorkshop]'))");
  rows.push(await frameSample('rocket workshop'));
  await capture('rocket-workshop');
  await send('Page.navigate',{url:'https://orbital.local/index.html'});
  const mission=(await missionList()).find(m=>m.id==='m1');
  await openMission(mission);
  await click('#launch');await wait(available('#launch-warp'));
  rows.push(await frameSample('numerical ascent'));
  await click('#skip');
  await wait(available('#pause-ops'),40000);
  rows.push(await frameSample('Earth operations'));
  await click('#pause-ops');
 }else if(mode==='verify-evidence-report'){
  await wait("Boolean(document.querySelector('[data-screen]'))");
  for(const filename of process.argv.slice(3)){
   const exported=JSON.parse(await readFile(filename,'utf8'));
   await evaluate(`(async()=>{
    const [{importFlightSession},{renderReport},{loadData}]=await Promise.all(['/js/flightSession.js','/js/ui/report.js','/js/data.js'].map(x=>import(x)));
    if(!importFlightSession(${JSON.stringify(exported.run)}))throw Error('Failed to import the verified flight record');
    renderReport(document.querySelector('#app'),await loadData());
   })()`);
   await wait(available('#open-mission-experiment'));
   const loaded=await flight();
   assert.deepEqual(loaded.operationsSummary,exported.summary);
   await wait("Boolean(document.querySelector('.wallet-reward'))");
   if(process.env.ORBITAL_TEST_EXPORT_DIR){
    await clickExport('#export-flight-record');
    const saved=JSON.parse(await readFile(await exportedFile('orbital-flight-'+loaded.design.missionId),'utf8'));
    assert.deepEqual(saved.summary,exported.summary);
   }
   rows.push(await checkExperiment(loaded.design.missionId));
  }
 }else if(mode==='ascent-repair'){
  await wait("Boolean(document.querySelector('[data-screen]'))",55000);
  const mission=(await missionList()).find(m=>m.id==='m2');
  await evaluate("(async()=>{const {showScreen}=await import('/js/ui/router.js');showScreen('missionSelect');})()");
  await wait(available('[data-level="earth"]'));
  await openMission(mission);
  await click('#launch');
  await wait(available('#launch-warp'));
  assert.equal(await evaluate("document.querySelector('#launch-warp').value"),'1');
  await wait("document.querySelector('#launch-clock')?.textContent==='T+00:02'",35000);
  const early=await evaluate("({clock:document.querySelector('#launch-clock').textContent,altitude:document.querySelector('#launch-altitude').textContent,rate:document.querySelector('#launch-rate').textContent})");
  assert.match(early.altitude,/m$/);assert.ok(parseFloat(early.altitude)<100);
  assert.equal(early.rate,'Real time · 1×');
  await click('#pause-launch');await capture('ascent-real-time');
  const paused=(await flight()).launchCheckpoint;
  await send('Page.reload');await wait("document.querySelector('#pause-launch')?.textContent==='Resume'");
  assert.deepEqual((await flight()).launchCheckpoint,paused);
  const legacyScript=await send('Page.addScriptToEvaluateOnNewDocument',{source:"const saved=JSON.parse(localStorage.getItem('space_mission_flight_v1'));saved.launchCheckpoint={elapsed:8,spaceElapsed:0,failureAt:10,paused:false};localStorage.setItem('space_mission_flight_v1',JSON.stringify(saved));"});
  await send('Page.reload');await wait(available('#launch-warp'));
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:legacyScript.identifier});
  assert.equal((await flight()).launchCheckpoint.version,1);
  assert.ok((await flight()).launchCheckpoint.timeS<5);
  await click('#skip');await wait(available('#continue-delivery'));await capture('parking-handoff');
  const parked=await flight();assert.ok(parked.parkingAscent);assert.equal(parked.ascentInsertion,undefined);
  await send('Page.reload');await wait(available('#continue-delivery'));
  await click('#continue-delivery');await wait(available('#pause-ops'));
  assert.equal((await flight()).phase,'operations');
  await click('#pause-ops');
  rows.push({result:'pass',early,paused,legacyRestart:true,parkingHandoffReload:true});
 }else if(mode==='campaign'){
  await wait("Boolean(document.querySelector('[data-screen]'))");
  await wait("Boolean(localStorage.getItem('space_mission_game_state_v1'))");
  const missions=await missionList();
  assert.equal(missions.length,28);
  const selected=process.argv.slice(3);
  const completed=()=>evaluate("Object.keys(JSON.parse(localStorage.getItem('space_mission_game_state_v1')).completedMissions)");
  const attempted=new Set();
  while(true){
   const done=await completed();
   const m=missions.find(m=>!attempted.has(m.id)&&!done.includes(m.id)&&
    (!selected.length||selected.includes(m.id))&&m.requires.every(id=>done.includes(id)));
   if(!m)break;
   attempted.add(m.id);
   const start=Date.now();
   try{
    await openMission(m);
    const captureId=(!rows.length||!rows.some(row=>row.transfer===m.transfer&&row.result==='pass'))?m.id:null;
    const reload=process.env.ORBITAL_TEST_RELOAD_EACH==='1';
    await launch({captureId,reload});await operate({transfer:m.transfer,reload});
    const run=await report(m.id,true);
    if(process.env.ORBITAL_TEST_MISSION_EVIDENCE==='1'){
     assert.equal(run.scoringVersion,'mission-evidence-1');
     assert.ok(run.operationsSummary.objectives.some(o=>o.id==='product-0'&&o.passed));
     assert.ok(await evaluate(available('#mission-evidence')));
     if(process.env.ORBITAL_TEST_EXPORT_DIR){
      await click('#export-flight-record');
      const exported=JSON.parse(await readFile(await exportedFile(),'utf8'));
      assert.deepEqual(exported.summary,run.operationsSummary);
      assert.equal(exported.run.runId,run.runId);
     }
     if(m.id==='m1'||m.id==='relay'||m.id==='lunar-capture'||m.id==='proxima-sail')await checkExperiment(m.id);
    }
    if(captureId)await capture(m.id+'-report');
    const paid=await wallet();
    await send('Page.reload');await wait("Boolean(document.querySelector('.wallet-reward'))");
    assert.deepEqual(await wallet(),paid);
    rows.push({id:m.id,result:'pass',transfer:m.transfer,reloadedFlightPhases:reload,seconds:(Date.now()-start)/1000,
     ascent:run.parkingAscent?'numerical parking orbit':run.ascentInsertion?'numerical':'illustrative',runId:run.runId,summary:run.operationsSummary,reward:paid.claims[run.runId]});
   }catch(error){
    rows.push({id:m.id,result:'fail',error:String(error)});
    await capture(m.id+'-failure').catch(()=>{});
    await send('Page.navigate',{url:'https://orbital.local/index.html'});
    await wait(available('#campaign'));
   }
   console.log(m.id,rows.at(-1).result,rows.at(-1).error||'');
   await writeFile(path.join(evidence,mode+'.json'),JSON.stringify(rows,null,2)+'\n');
  }
  const done=await completed();
  const missing=missions.filter(m=>(!selected.length||selected.includes(m.id))&&!done.includes(m.id));
  assert.deepEqual(missing.map(m=>m.id),[],'Campaign still has uncompleted missions');
  assert.ok(rows.every(row=>row.result==='pass'),'One or more campaign checks failed');
 }else{
  throw Error('Unknown scenario: '+mode);
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify(rows,null,2));
}catch(error){
 rows.push({result:'fail',error:String(error),errors});
 await capture(mode+'-failure').catch(()=>{});
 throw error;
}finally{
 await writeFile(path.join(evidence,mode+'.json'),JSON.stringify(rows,null,2)+'\n');
 ws.close();
}
