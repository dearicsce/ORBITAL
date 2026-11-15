import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const base=process.env.ORBITAL_TEST_URL||'http://127.0.0.1:8785/';
const executable=process.env.ORBITAL_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile=await mkdtemp(path.join(tmpdir(),'orbital-program-'));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const child=spawn(executable,[
 '--headless=new','--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding',
 '--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--remote-debugging-port=0',
 '--no-first-run','--no-default-browser-check','--user-data-dir='+profile,'about:blank'
],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let socket,next=0;
const pending=new Map(),errors=[];
try{
 const debugUrl=await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Chrome debugger did not start')),12000);
  child.stderr.on('data',chunk=>{const match=String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timeout);resolve(new URL(match[1]));}});
  child.once('error',error=>{clearTimeout(timeout);reject(error);});
 });
 const pages=await(await fetch('http://'+debugUrl.host+'/json/list')).json();
 socket=new WebSocket(pages.find(page=>page.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 socket.onmessage=event=>{
  const message=JSON.parse(event.data);
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
  if(!pending.has(message.id))return;
  const {resolve,reject,timer}=pending.get(message.id);
  clearTimeout(timer);pending.delete(message.id);
  if(message.error)reject(Error(message.error.message));else resolve(message.result);
 };
 function send(method,params={}){
  return new Promise((resolve,reject)=>{
   const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser command timeout: '+method));},18000);
   pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
  });
 }
 async function evaluate(expression){
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
 }
 const test=async(expression,timeout=12000)=>{
  const until=Date.now()+timeout;
  do{
   const value=await evaluate(expression);
   if(value)return value;
   await sleep(100);
  }while(Date.now()<until);
  const screen=await evaluate("document.querySelector('[data-screen]')?.dataset.screen+' '+document.body.innerText.slice(0,700)");
  throw Error('Timed out: '+expression+' | '+screen+' | '+errors.at(-1));
 };
 const visible=selector=>`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e&&!e.hidden&&!e.disabled&&e.getClientRects().length>0})()`;
 const click=async(selector,timeout)=>{
  await test(visible(selector),timeout);
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 };
 const choose=(selector,value)=>evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const focus=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
 const route=screen=>send('Page.navigate',{url:new URL('?screen='+screen,base).href});
 const stage=()=>evaluate("JSON.parse(localStorage.getItem('orbital_academy_v1')||'{}').step");
 const flight=()=>evaluate("JSON.parse(sessionStorage.getItem('space_mission_flight_v1')||'null')");
 const capture=async name=>{
  if(!process.env.ORBITAL_TEST_ARTIFACTS)return;
  const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(path.join(process.env.ORBITAL_TEST_ARTIFACTS,name+'.png'),Buffer.from(result.data,'base64'));
 };
 await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await route('missionSelect');
 await test(visible('[data-map-mission="m1"]'));
 await focus('[data-map-mission="m1"]');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 assert.notEqual(await evaluate('document.activeElement.dataset.mapMission'),'m1');
 await click('#map-list');await test("Boolean(document.querySelector('.list-mode'))");
 await click('#map-list');await capture('program-map-desktop');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await click('[data-map-mission="m1"]');
 await test("getComputedStyle(document.querySelector('#program-panel')).position==='fixed' && document.querySelector('#program-panel').dataset.open==='true'");
 assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'mobile page stays in viewport');
 await capture('program-map-mobile');
 await click('#panel-close');
 assert.equal(await evaluate('document.activeElement.dataset.mapMission'),'m1');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await click('.atlas-body-list [data-body="earth-orbit"]');
 await test("Boolean(document.querySelector('#atlas-globe canvas'))",20000);
 await choose('#atlas-earth-layer','night');
 await test("document.querySelector('#atlas-globe-credit').textContent.includes('night-lights')");
 await send('Network.enable');
 await send('Network.setBlockedURLs',{urls:['https://api.nasa.gov/*']});
 await click('#atlas-media summary');
 await evaluate("document.querySelector('#atlas-media input[type=password]').value='test-api-failure'");
 await click('#atlas-media form button');
 await test("document.querySelector('[data-media-status]').textContent.includes('unavailable')");
 assert.ok(await evaluate("document.querySelector('.program-apod').hidden"));
 await send('Network.setBlockedURLs',{urls:[]});
 await click('#map-academy');
 await click('[data-add="bus_micro"]');await click('[data-view="Front"]');await click('[data-view="Right"]');await click('#academy-next');
 assert.equal(await stage(),1);
 await click('[data-add="panel_m"]');await click('[data-add="panel_m"]');
 const wings=await evaluate("JSON.parse(localStorage.getItem('orbital_academy_v1')).blueprint.assembly.components.map(c=>c.instanceId)");
 for(const id of wings){
  await click('[data-select="'+id+'"]');
  await choose('[data-coordinate="0"]','.05');
 }
 await click('#ws-stowed');await click('#ws-stowed');await click('#academy-next');
 assert.equal(await stage(),2);
 await send('Page.reload');await test(visible('[data-add="battery_m"]'));
 assert.equal(await stage(),2);
 await click('[data-add="battery_m"]');await click('[data-add="computer_basic"]');await click('#academy-next');
 await click('[data-add="optical_camera"]');await click('[data-add="comms_x_band"]');await click('#academy-next');
 assert.equal(await stage(),4);
 assert.ok(await evaluate("document.querySelector('#academy-next').disabled"));
 const radio=await evaluate("JSON.parse(localStorage.getItem('orbital_academy_v1')).blueprint.assembly.components.find(c=>c.catalogId==='comms_x_band').instanceId");
 await click('[data-select="'+radio+'"]');await click('[data-tool="reset"]');await click('#academy-next');
 await click('#academy-preset');await click('#academy-next');
 await test(visible('#academy-deploy'),95000);
 await click('#academy-deploy');await click('[data-speed="4"]');await click('[data-command="observe"]');
 await test("Number(document.querySelector('#storage-live')?.textContent.split(' / ')[0])>0",16000);
 await click('[data-command="downlink"]');
 await click('#academy-next',35000);
 assert.equal(await stage(),7);
 for(const [slot,id] of Object.entries({coreTank:'core-18',coreEngine:'core-k1',upperTank:'upper-18',upperEngine:'upper-k1',separator:'sep-18',adapter:'adapter-18',fairing:'fairing-18',guidance:'guidance-1'}))await choose('[data-rocket-slot="'+slot+'"]',id);
 await click('#rocket-stage');await click('[data-move-stage="1"]');
 assert.ok(await evaluate("document.querySelector('#academy-next').disabled"));
 await click('#rocket-stage');await capture('program-academy-rocket');await click('#academy-next');
 assert.equal(await stage(),8);
 assert.equal(await evaluate("localStorage.getItem('orbital_rocket_library_v1')"),null);
 assert.equal(await evaluate("localStorage.getItem('orbital_economy_v1')"),null);
 console.log('PASS: map keyboard, mobile bottom sheet, eight Academy lessons, reload, and isolated training hardware.');

 await evaluate(`(async()=>{const state=await import('/js/state.js'),current=state.getState();current.completedMissions={m1:{stars:5},m2:{stars:5},m3:{stars:5}};state.importProgress(current);state.setDesign({difficulty:'easy'});state.saveProgress();})()`);
 await click('#academy-map');
 await click('[data-level="solar"]');
 await click('.atlas-body-list [data-body="sun"]');
 await test("Boolean(document.querySelector('#atlas-globe canvas'))",20000);
 await capture('program-sun');
 await click('[data-map-mission="mars-scout"]');await click('#map-preset');await click('#ws-review');
 await click('#custom-rocket');await click('#rocket-reference');await choose('#rocket-name','Pathfinder verification');
 await click('#rocket-use');await click('#confirm');await test(visible('#plan-confirm'));
 await capture('program-flight-plan');
 await click('#plan-confirm');await click('#next');await click('#launch');
 await test(visible('#launch-warp'));
 await choose('#launch-warp','16');
 await test("document.querySelector('#launch-clock')?.textContent.startsWith('T+')",25000);
 await click('#pause-launch');
 const launch=await flight();assert.ok(launch.launchCheckpoint.paused);
 await send('Page.reload');await test("document.querySelector('#pause-launch')?.textContent==='Resume'",20000);
 assert.ok((await flight()).launchCheckpoint.timeS>=launch.launchCheckpoint.timeS-.01);
 await click('#pause-launch');
 await choose('#launch-warp','64');
 await click('[data-cruise-command="depart"]',95000);
 assert.equal((await flight()).design.rocketBlueprint.name,'Pathfinder verification');
 await click('[data-cruise-speed="16"]');await test(visible('[data-cruise-command="correct"]'),25000);
 const transfer=await flight();assert.equal(transfer.cruise.tick,51);
 await send('Page.reload');await test(visible('[data-cruise-command="correct"]'));
 assert.equal((await flight()).cruise.elapsedSec,transfer.cruise.elapsedSec);
 await click('[data-cruise-command="correct"]');await click('[data-cruise-command="acquire"]',30000);
 await click('[data-cruise-command="observe"]');await click('[data-cruise-command="transmit"]');
 await capture('program-transfer');await click('#cruise-report',22000);
 await test("Boolean(document.querySelector('.wallet-reward'))");
 assert.equal(await evaluate("JSON.parse(localStorage.getItem('orbital_economy_v1')).coins"),100);
 await send('Page.reload');await test("Boolean(document.querySelector('.wallet-reward'))");
 assert.equal(await evaluate("JSON.parse(localStorage.getItem('orbital_economy_v1')).coins"),100);
 await click('#btn-report-roster');
 console.log('PASS: full custom Mars flight, ascent pause/reload, correction checkpoint, confirmed data and idempotent rewards.');

 await click('[data-level="earth"]');await click('[data-map-mission="m1"]');await click('#map-preset');await click('#ws-review');
 await click('#custom-rocket');await click('#rocket-reference');await click('#rocket-use');await click('#confirm');await click('#plan-confirm');
 await click('#next');await click('#launch');await click('#skip');
 await test(visible('#pause-ops'));
 await click('#pause-ops');const paused=await flight();
 await choose('[data-flight-camera]','follow');await click('[data-flight-north]');await choose('[data-flight-camera]','fixed');
 await sleep(650);const after=await flight();
 assert.deepEqual(after.operations,paused.operations);assert.deepEqual(after.playback,paused.playback);
 assert.deepEqual(after.camera,{mode:'fixed',north:true});
 assert.deepEqual(await evaluate("JSON.parse(localStorage.getItem('space_mission_flight_v1')).camera"),after.camera);
 await send('Page.reload');await test("document.querySelector('#pause-ops')?.textContent==='Resume'");
 assert.equal(await evaluate("document.querySelector('[data-flight-camera]').value"),'fixed');
 assert.equal((await flight()).operations.tick,after.operations.tick);
 await click('[data-speed="4"]');await click('#pause-ops');
 await test("document.querySelector('#ops-canvas canvas')?.width>500");await sleep(850);await capture('program-earth-ops');
 await click('#report',55000);await test("Boolean(document.querySelector('.wallet-reward'))");
 assert.equal(await evaluate("JSON.parse(localStorage.getItem('orbital_economy_v1')).coins"),125);
 assert.deepEqual(errors,[]);
 console.log('PASS: custom Earth flight, all camera modes, pause and reload consistency, accelerated operations, and replay reward.');
 await send('Browser.close').catch(()=>{});
}finally{
 socket?.close();child.kill();
 await sleep(500);
 if(path.dirname(path.resolve(profile))===path.resolve(tmpdir())&&path.basename(profile).startsWith('orbital-program-'))await rm(profile,{recursive:true,force:true,maxRetries:3}).catch(()=>{});
}
