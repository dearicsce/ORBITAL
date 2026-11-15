import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hostSession} from './HostSession.mjs';
const out=path.resolve(process.env.ORBITAL_TEST_ARTIFACTS||'Verification/UIVideo-2026-11-11/Layout');
fs.mkdirSync(out,{recursive:true});
let h;for(let i=0;i<100&&!h;i++){try{h=await hostSession();}catch{await new Promise(r=>setTimeout(r,250));}}
assert.ok(h,'Isolated game must expose its test debugger');const results=[];
try {
 for(const [width,height] of [[1366,768],[1280,720],[1920,1080],[800,600],[390,844]]) {
  await h.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  for(const screen of ['menu','missionSelect','workshop','rocketWorkshop']) {
   await h.evaluate(`(async()=>{const {showScreen}=await import('/js/ui/router.js');showScreen('${screen}',{mission:false});})()`);
   await new Promise(r=>setTimeout(r,700));
   const result=await h.evaluate(`(()=>{
    const rect=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom};};
    return {scrollWidth:document.documentElement.scrollWidth,width:innerWidth,height:innerHeight,
     footer:rect('.ws-actions'),layout:rect('.ws-layout,.rocket-layout'),preview:rect('.ws-view,.rocket-hangar'),
     controls:rect('.program-launch-controls'),build:rect('#map-build'),rocketStage:rect('#rocket-stage'),
     rocketReview:rect('.rocket-engineering'),inspector:rect('.ws-inspector')};})()`);
   assert.ok(result.scrollWidth<=width,`${screen} horizontal overflow at ${width}`);
   if(width>1100) {
    if(screen==='workshop') {assert.ok(result.footer.b<=height,`Workshop actions below ${height}`);assert.ok(result.preview.h>=150);assert.ok(result.inspector.b<=height);}
    if(screen==='rocketWorkshop') {assert.ok(result.layout.b<=height,`Rocket columns below ${height}`);assert.ok(result.preview.h>=180);}
    if(screen==='missionSelect')assert.ok(result.build.b<=height,`Build action below ${height}`);
   }
   results.push({screen,width,height,...result});
   const shot=await h.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
   fs.writeFileSync(path.join(out,`${screen}-${width}x${height}.png`),Buffer.from(shot.data,'base64'));
  }
 }
 for(const [width,height] of [[1280,720],[1366,768],[1920,1080]]) {
  await h.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await h.evaluate(`(async()=>{const [{loadData},{starterDesign},{setDesign},{makeBlueprint},{showScreen}]=await Promise.all([import('/js/data.js'),import('/js/campaign.js'),import('/js/state.js'),import('/js/workshop/blueprint.js'),import('/js/ui/router.js')]);const d=await loadData(),design={...starterDesign(d.missions.find(m=>m.id==='m1'),d),flightWorkflow:true};setDesign(design);showScreen('workshop',{mission:true,blueprint:makeBlueprint(design,d,'Floodwatch mission spacecraft')});})()`);
  await new Promise(r=>setTimeout(r,700));
  const metrics=await h.evaluate(`(()=>{const f=document.querySelector('.ws-actions').getBoundingClientRect(),v=document.querySelector('.ws-view').getBoundingClientRect();return {footerBottom:f.bottom,previewHeight:v.height,hasJourney:!!document.querySelector('.journey-bar'),scrollWidth:document.documentElement.scrollWidth};})()`);
  assert.ok(metrics.hasJourney);assert.ok(metrics.footerBottom<=height);assert.ok(metrics.previewHeight>=150);assert.ok(metrics.scrollWidth<=width);
  results.push({screen:'workshop-mission',width,height,...metrics});
  fs.writeFileSync(path.join(out,`workshop-mission-${width}x${height}.png`),Buffer.from((await h.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
 }
 fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify(results,null,2));
 console.log(`PASS: ${results.length} screen/viewport layouts, horizontal overflow, desktop action visibility and preview bounds`);
}finally{await h.send('Emulation.clearDeviceMetricsOverride');h.close();}
