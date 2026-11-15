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
  if(message.method==='Log.entryAdded'&&message.params.entry.level==='error')errors.push(message.params.entry.text+' '+(message.params.entry.url||''));
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

 await send('Log.enable');
 await route('menu');await test(visible('#campaign'));await sleep(1800);await capture('realism-home');
 await click('#campaign');await test(visible('[data-map-mission="m1"]'));await capture('realism-campaign');
 for(const level of ['solar','jupiter','stars','galaxy']){
  if(level==='jupiter'){await click('.atlas-body-list [data-body="jupiter"]');await click('#body-zoom');}
  else {if(level==='stars')await click('[data-level="solar"]');await click('[data-level="'+level+'"]');}
  await evaluate("document.querySelector('.atlas-diagram')?.scrollIntoView({block:'center'})");await sleep(300);await capture('realism-'+level);
 }
 await click('[data-level="earth"]');await click('.atlas-body-list [data-body="earth-orbit"]');await sleep(1200);await capture('realism-earth');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await click('[data-map-mission="m1"]');await capture('realism-mobile');
 assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
 assert.deepEqual(errors,[]);console.log('PASS: realism views render without browser or shader errors.');
 await send('Browser.close').catch(()=>{});
}finally{
 socket?.close();child.kill();
 await sleep(500);
 if(path.dirname(path.resolve(profile))===path.resolve(tmpdir())&&path.basename(profile).startsWith('orbital-program-'))await rm(profile,{recursive:true,force:true,maxRetries:3}).catch(()=>{});
}
