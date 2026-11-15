import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hostSession} from './HostSession.mjs';
const h=await hostSession(),out='Verification/Repair-2026-11-11/Highlights';
fs.mkdirSync(out,{recursive:true});
const rows=[];
try {
 for(const [width,height] of [[1366,768],[800,600],[390,844]]){
  await h.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  for(const [screen,selector] of [['rocketSelect','#rocket-info'],['orbitSelect','#orbit-info'],['review','#judge-engineer']]){
   await h.evaluate(`(async()=>{const [{loadData},{starterDesign},{setDesign,setSettings},{showScreen}]=await Promise.all([import('/js/data.js'),import('/js/campaign.js'),import('/js/state.js'),import('/js/ui/router.js')]);const d=await loadData();setSettings({audio:false});setDesign({...starterDesign(d.missions.find(m=>m.id==='m1'),d),flightWorkflow:false});showScreen('${screen}');})()`);
   await new Promise(r=>setTimeout(r,500));
   const result=await h.evaluate(`(async()=>{const {showLine,clearLines}=await import('/js/ui/speech.js');const target=document.querySelector('${selector}');if(!target)throw Error('Missing target ${selector}');showLine('nova','Inspect the selected spacecraft and mission details before continuing.',{pointAt:'${selector}'});const before=target.getBoundingClientRect();target.style.marginTop='73px';target.style.minHeight='350px';target.scrollIntoView({block:'center'});await new Promise(requestAnimationFrame);const style=getComputedStyle(target),after=target.getBoundingClientRect();const result={attached:target.classList.contains('guide-target'),outline:style.outlineWidth,offset:style.outlineOffset,overlay:!!document.querySelector('.guide-pointer'),before:{top:before.top,height:before.height},after:{top:after.top,height:after.height}};return result;})()`);
   assert.ok(result.attached);assert.equal(result.outline,'2px');assert.equal(result.offset,'-2px');assert.equal(result.overlay,false);
   fs.writeFileSync(`${out}/${screen}-${width}.png`,Buffer.from((await h.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
   assert.equal(await h.evaluate(`(async()=>{(await import('/js/ui/speech.js')).clearLines();return document.querySelectorAll('.guide-target').length;})()`),0);
   rows.push({screen,width,height,...result});
  }
 }
 fs.writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2));
 console.log('PASS: nine panel/viewport highlights survive layout changes and scrolling; dismissal removes the highlight.');
}finally{await h.send('Emulation.clearDeviceMetricsOverride');h.close();}
