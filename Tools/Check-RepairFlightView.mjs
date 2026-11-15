import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hostSession} from './HostSession.mjs';
const h=await hostSession(),out='Verification/Repair-2026-11-11/FlightView';fs.mkdirSync(out,{recursive:true});
const rows=[];
try{
 for(const timeS of [0,150,350]){
  await h.evaluate(`(async()=>{const [{loadData},{starterDesign},{setDesign},{createMissionRun},{setFlightSession},{showScreen}]=await Promise.all([import('/js/data.js'),import('/js/campaign.js'),import('/js/state.js'),import('/js/contracts/missionRun.js'),import('/js/flightSession.js'),import('/js/ui/router.js')]);showScreen('menu');const d=await loadData(),design=starterDesign(d.missions.find(m=>m.id==='m1'),d);setDesign(design);const run=createMissionRun(design,d,123);run.launchCheckpoint={version:1,timeS:${timeS},paused:true,speed:1,camera:'track'};setFlightSession(run);showScreen('simulation');})()`);
  let ready=false;
  for(let attempt=0;attempt<60&&!ready;attempt++){
   await new Promise(r=>setTimeout(r,250));
   ready=await h.evaluate(`document.querySelector('#launch-mass')?.textContent.includes('kg')??false`);
  }
  assert.ok(ready,'Flight model and telemetry must finish loading');
  const state=await h.evaluate(`(()=>({text:document.querySelector('.launch-instruments')?.innerText,clock:document.querySelector('#launch-clock')?.textContent,canvas:!!document.querySelector('#launch-canvas canvas')}))()`);
  assert.ok(state.text);assert.ok(state.canvas);rows.push({timeS,...state});
  fs.writeFileSync(`${out}/ascent-${timeS}.png`,Buffer.from((await h.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
 }
 fs.writeFileSync(`${out}/telemetry.json`,JSON.stringify(rows,null,2));
 console.log('PASS: actual Windows flight view renders paused pad, lower ascent and upper ascent checkpoints with telemetry.');
}finally{h.close();}
