import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hostSession} from './HostSession.mjs';
const host=await hostSession(),record=path.resolve(process.env.ORBITAL_TEST_ARTIFACTS),trace=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(expression){for(let i=0;i<450;i++){if(await host.evaluate(expression))return;await sleep(100);}throw Error('Timed out: '+expression);}
async function key(key,code,vk){await host.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});await host.send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});}
async function activate(selector){
 await wait(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
 for(let tabs=0;tabs<240;tabs++){
  if(await host.evaluate(`document.activeElement?.matches(${JSON.stringify(selector)})`)){
   const focus=await host.evaluate(`(()=>{const e=document.activeElement,s=getComputedStyle(e);return {text:e.innerText,focusVisible:e.matches(':focus-visible')&&(s.outlineStyle!=='none'||s.boxShadow!=='none'),tag:e.tagName};})()`);
   assert.ok(focus.focusVisible,'Keyboard focus must remain visible: '+selector);
   await key('Enter','Enter',13);trace.push({selector,tabs,...focus});return;
  }
  await key('Tab','Tab',9);
 }
 throw Error('Tab navigation could not reach '+selector);
}
try{
 await host.send('Page.navigate',{url:'https://orbital.local/index.html'});
 await activate('#campaign');await activate('[data-map-mission="m1"]');await activate('#map-preset');
 await activate('#ws-review-top');await activate('#next');await activate('#confirm');await activate('#plan-confirm');await activate('#next');await activate('#launch');
 await wait("Boolean(document.querySelector('#pause-launch'))");await activate('#skip');
 for(let i=0;i<600;i++){
  if(await host.evaluate("Boolean(document.querySelector('#continue-delivery'))")){await activate('#continue-delivery');break;}
  if(await host.evaluate("Boolean(document.querySelector('#skip-ops'))"))break;
  await sleep(100);
 }
 for(let i=0;i<35;i++){
  if(await host.evaluate("Boolean(document.querySelector('#report:not(:disabled)')?.getClientRects().length)&&!document.querySelector('#report').hidden"))break;
  if(await host.evaluate("Boolean(document.querySelector('[data-choice]:not(:disabled)'))"))await activate('[data-choice]:not(:disabled)');
  else await activate('#skip-ops');
  await sleep(200);
 }
 await activate('#report');await wait("Boolean(document.querySelector('#export-flight-record'))");
 const run=await host.evaluate("JSON.parse(localStorage.getItem('space_mission_flight_v1'))");assert.ok(run.operationsSummary.passed);
 await activate('#open-mission-experiment');await wait("Boolean(document.querySelector('dialog[open]'))");
 const dialogFocus=await host.evaluate("document.querySelector('dialog[open]').contains(document.activeElement)");assert.ok(dialogFocus);
 for(let i=0;i<8;i++){await key('Tab','Tab',9);assert.ok(await host.evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"),'Dialog must contain keyboard focus');}
 for(let i=0;i<8;i++){for(const type of ['keyDown','keyUp'])await host.send('Input.dispatchKeyEvent',{type,key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});assert.ok(await host.evaluate("document.querySelector('dialog[open]').contains(document.activeElement)"),'Dialog must contain reverse keyboard focus');}
 await key('Escape','Escape',27);await wait("document.activeElement?.id==='open-mission-experiment'");
 fs.mkdirSync(record,{recursive:true});fs.writeFileSync(path.join(record,'keyboard-mission.json'),JSON.stringify({passed:true,method:'WebView2 trusted keyboard events only; no mouse or programmatic focus',trace,runId:run.runId,summary:run.operationsSummary,dialogEntryContainmentAndRestore:true,limits:'Not a real-human learner or screen-reader session; native window focus inspected separately'},null,2));
 console.log('PASS: complete first mission with keyboard only; visible focus and comparison dialog entry/restore');
}catch(error){fs.mkdirSync(record,{recursive:true});fs.writeFileSync(path.join(record,'keyboard-failure.json'),JSON.stringify({error:String(error),trace},null,2));throw error;}
finally{host.close();}
