import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const base=process.env.ORBITAL_TEST_URL||'http://127.0.0.1:8785/';
const evidence=process.env.ORBITAL_TEST_ARTIFACTS||path.resolve('artifacts/flight-overhaul/after');
await mkdir(evidence,{recursive:true});
const executable=process.env.ORBITAL_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile=await mkdtemp(path.join(tmpdir(),'orbital-program-'));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const child=spawn(executable,[
 '--headless=new','--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding',
 '--enable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0',
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

  const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(path.join(evidence,name+'.png'),Buffer.from(result.data,'base64'));
 };
 await send('Page.enable');await send('Runtime.enable');await send('Page.bringToFront');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(target,...args){
   if(target===this.context.destination){
    const analyser=this.context.createAnalyser();
    connect.call(this,analyser);
    window.flightAudioProbe={context:this.context,analyser};
   }
   return connect.call(this,target,...args);
  };
 `});
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await route('missionSelect');
 await test(visible('[data-map-mission="m1"]'));
 const performanceSamples=async(label)=>{
   const result=await evaluate("(()=>{let intervals=[],old;return new Promise(resolve=>{const step=t=>{if(old)intervals.push(t-old);old=t;if(intervals.length<72)requestAnimationFrame(step);else{intervals.sort((a,b)=>a-b);resolve({median:intervals[36],p95:intervals[68],p99:intervals[71],heap:performance.memory?.usedJSHeapSize})}};requestAnimationFrame(step)})})()");
   console.log(label,JSON.stringify(result));
 };
 const recordingStart=()=>evaluate("(()=>{const stream=document.querySelector('#launch-canvas canvas').captureStream(20);const chunks=[];const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});recorder.ondataavailable=e=>chunks.push(e.data);window.recording={recorder,chunks};recorder.start();return true})()");
 const recordingStop=async(name)=>{
   await evaluate("new Promise(resolve=>{const {recorder,chunks}=window.recording;recorder.onstop=()=>{window.videoBlob=new Blob(chunks,{type:'video/webm'});resolve(videoBlob.size)};recorder.stop()})");
   const length=await evaluate("window.videoBlob.size");
   const slices=[];
   for(let offset=0;offset<length;offset+=160000){
     const encoded=await evaluate("new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(videoBlob.slice("+offset+","+(offset+160000)+"))})");
     slices.push(Buffer.from(encoded,'base64'));
   }
   await writeFile(path.join(evidence,name+'.webm'),Buffer.concat(slices));
 };
 await evaluate(`(async()=>{const s=await import('/js/state.js');const state=s.getState();state.completedMissions={m1:{stars:5},m2:{stars:5},m3:{stars:5}};s.importProgress(state);s.setDesign({difficulty:'easy'});s.saveProgress();})()`);
 await route('missionSelect');
 await test("document.body.innerText.includes('3 / 28 CONTRACTS COMPLETE')");
 const prepare=async custom=>{
  await click('[data-level="earth"]');
  await click('[data-map-mission="'+(custom?'m1':'night')+'"]');await click('#map-preset');
  await test("Boolean(document.querySelector('#ws-view canvas'))");await sleep(800);await capture(custom?'spacecraft-bay':'night-spacecraft-bay');
  await click('#ws-review');
  if(custom){await click('#custom-rocket');await click('#rocket-reference');await sleep(1200);await capture('rocket-bay');await click('#rocket-use');}
  else{await click('[data-rocket="condor"]');await click('#next');}
  await click('#confirm');await click('#plan-confirm');await click('#next');await click('#launch');
  await test(visible('#launch-warp'));
  assert.equal(await evaluate("document.querySelector('#launch-warp').value"),'1');
  await click('#toggle-trajectory');
  await test("document.querySelector('#trajectory-path').getAttribute('d')?.startsWith('M')");
  await capture(custom?'custom-trajectory-pad':'trajectory-pad');
  await click('#toggle-trajectory');
 };
 await prepare(false);
 await click('#pause-launch');
 await capture('review-pad');
 const before=(await send('Page.captureScreenshot',{format:'png'})).data;
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:650,y:350});
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:800,y:390});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',buttons:0,clickCount:1,x:800,y:390});
 await sleep(350);
 const after=(await send('Page.captureScreenshot',{format:'png'})).data;
 assert.notEqual(before,after,'Dragging must change the rendered view while physics is paused');
 await capture('review-drag-camera');
 await click('#reset-flight-camera');
 await click('#toggle-trajectory');await capture('review-map');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
 await sleep(400);await capture('review-mobile-map');
 const overlap=await evaluate("(()=>{const a=document.querySelector('#toggle-trajectory').getBoundingClientRect(),b=document.querySelector('#skip').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top})()");
 assert.equal(overlap,false,'Orbit map must not cover launch actions on mobile');
 await click('#toggle-trajectory');await capture('review-mobile-flight');
 await choose('#launch-warp','64');await click('#pause-launch');
 await test("JSON.parse(sessionStorage.getItem('space_mission_flight_v1')||'{}').launchCheckpoint?.timeS>300",35000);
 await click('#pause-launch');await click('#toggle-trajectory');await capture('review-suborbital-map');
 assert.ok((await evaluate("document.querySelector('#trajectory-path').getAttribute('d')")).length>100);
 await click('#toggle-trajectory');await click('#pause-launch');
 await test(visible('#pause-ops'),45000);await click('#pause-ops');
 assert.equal(await evaluate("document.querySelector('#ops-canvas').style.top"),'');
 await capture('review-mobile-operations');
 assert.deepEqual(errors,[]);
 console.log('PASS: mobile numerical insertion and continuous operations handoff');
 console.log('PASS: real pointer orbit camera, reset, live map, and mobile controls without overlap');
 await send('Browser.close').catch(()=>{});
}finally{
 socket?.close();child.kill();
 await sleep(500);
 if(path.dirname(path.resolve(profile))===path.resolve(tmpdir())&&path.basename(profile).startsWith('orbital-program-'))await rm(profile,{recursive:true,force:true,maxRetries:3}).catch(()=>{});
}
