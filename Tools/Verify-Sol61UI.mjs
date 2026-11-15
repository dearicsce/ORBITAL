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


const rows=[],mode='sol61-ui';
try{
 await send('Page.enable');await send('Runtime.enable');
 const exported=JSON.parse(await readFile(process.argv[2],'utf8'));
 await send('Page.navigate',{url:'https://orbital.local/index.html?screen=menu'});await wait(available('#campaign'),55000);
 await evaluate(`(async()=>{const [{setDesign},{setFlightSession},{showScreen}]=await Promise.all(['/js/state.js','/js/flightSession.js','/js/ui/router.js'].map(p=>import(p)));const run=${JSON.stringify(exported.run)};run.phase='operations';run.operations.paused=true;setDesign(run.design);if(!setFlightSession(run))throw Error('Source run migration failed');showScreen('simulation');})()`);
 await wait("!!document.querySelector('#pause-ops')");assert.equal(await evaluate("document.querySelector('#pause-ops').disabled"),true,'Completed operations correctly disable pause');await evaluate("document.querySelector('#ground-track').parentElement.open=true;document.querySelector('#ground-track').scrollIntoView({block:'start'})");
 await wait("!!document.querySelector('.source-evidence-panel')");
 const layout=await evaluate("(()=>{const p=document.querySelector('.source-evidence-panel'),r=p.getBoundingClientRect(),s=p.querySelector('svg').getBoundingClientRect();return {panelWidth:r.width,svgWidth:s.width,svgHeight:s.height,viewport:innerWidth,text:p.innerText};})()");
 assert.ok(layout.panelWidth>700&&layout.svgWidth>300&&layout.svgHeight>=200,'Source evidence map has its own readable row');await evaluate("document.querySelector('.source-evidence-panel').scrollIntoView({block:'start'})");await capture('source-map-readable');rows.push({case:'source map',layout});
 await evaluate(`(async()=>{const [{loadData},{makeBlueprint},{showScreen}]=await Promise.all(['/js/data.js','/js/workshop/blueprint.js','/js/ui/router.js'].map(p=>import(p)));showScreen('workshop',{mission:true,blueprint:makeBlueprint(${JSON.stringify(exported.run.design)},await loadData(),'Source context verification')});})()`);
 await wait("!!document.querySelector('#ws-consequences')");
 await evaluate("document.querySelector('#ws-consequences').parentElement.open=true;document.querySelector('#ws-consequences').scrollIntoView({block:'center'})");
 await wait("document.querySelector('#consequences-result table')?.rows.length>5");await capture('consequences-readable');
 const supersession=await evaluate(`(async()=>{const [{createConsequencesPanel},{evaluateDesign},{loadData}]=await Promise.all(['/js/unity/consequences.js','/js/engine.js','/js/data.js'].map(p=>import(p)));const data=await loadData(),base=${JSON.stringify(exported.run.design)};delete base.assembly;const host=document.createElement('div');host.hidden=true;document.body.append(host);const panel=createConsequencesPanel(host,data,base);panel.update({...base,batteryIds:['battery_s']});panel.update({...base,batteryIds:['battery_m']});const last={...base,batteryIds:['battery_l']};panel.update(last);await new Promise(r=>setTimeout(r,700));const expected=evaluateDesign(last,data).launchMass.toFixed(2),text=host.innerText;const cells=[...host.querySelectorAll('tbody tr')].find(r=>r.firstElementChild.textContent==='Launch mass')?.children;const actual=cells?.[2].textContent;panel.destroy();host.remove();return {expected,actual,text};})()`);
 assert.equal(supersession.actual,supersession.expected,'Rapid edits supersede stale consequences');rows.push({case:'consequence supersession',...supersession});
 const png=await evaluate(`new Promise(async(resolve,reject)=>{const {on,send}=await import('/js/unity/bridge.js');let stop;const timer=setTimeout(()=>{stop?.();reject(Error('Native thumbnail timeout'));},10000);stop=on('scene.thumbnail',p=>{clearTimeout(timer);stop();resolve(p.png);});send('scene.thumbnail.request');})`);
 await writeFile(path.join(evidence,'native-source-workshop.png'),Buffer.from(png,'base64'));rows.push({case:'native renderer',result:'actual Unity RenderTexture thumbnail acquired'});
 await evaluate("document.querySelector('#pin-consequences').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 const focus=await evaluate("(()=>{const e=document.activeElement,s=getComputedStyle(e);return {tag:e.tagName,text:e.textContent.slice(0,100),outline:s.outlineStyle,width:s.outlineWidth}})()");assert.notEqual(focus.outline,'none');rows.push({case:'keyboard focus',focus});
 assert.deepEqual(errors,[]);console.log('PASS: readable source map/consequences, superseded forecasts, native rendered craft and keyboard focus.');
}catch(error){rows.push({result:'fail',error:String(error),errors});await capture('sol61-ui-failure').catch(()=>{});throw error;}
finally{await writeFile(path.join(evidence,'sol61-ui.json'),JSON.stringify(rows,null,2)+'\n');ws.close();}
