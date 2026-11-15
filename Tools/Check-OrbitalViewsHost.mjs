import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {hostSession} from './HostSession.mjs';
const h=await hostSession(),out='Verification/OrbitalViews-2026-11-15/Host';
fs.mkdirSync(out,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const capture=async name=>fs.writeFileSync(`${out}/${name}.png`,Buffer.from((await h.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'));
try{
  await h.evaluate(`window.repairErrors=[];window.addEventListener('error',e=>repairErrors.push(e.message));window.addEventListener('unhandledrejection',e=>repairErrors.push(String(e.reason)));`);
  await h.evaluate(`(async()=>{
    const [{showScreen},{loadData},{starterDesign},{createOrbitOps},{presetOrbit,orbitalPeriod}]=await Promise.all([import('/js/ui/router.js'),import('/js/data.js'),import('/js/campaign.js'),import('/js/three/orbitOps.js'),import('/js/engine/orbitalGeometry.js')]);
    showScreen('menu');window.repairData=await loadData();window.repairDesign=starterDesign(repairData.missions.find(m=>m.id==='m1'),repairData);
    const host=document.createElement('div');host.id='repair-view';host.style.cssText='position:fixed;inset:0;z-index:9999;background:#030811';document.body.append(host);
    window.repairView=createOrbitOps(host,{orbitId:'leo',design:repairDesign,data:repairData});window.repairPeriod=orbitalPeriod(presetOrbit('leo'));repairView.setTime(0,{paused:true});
  })()`);
  await wait(2000);
  const positions=[];
  for(const fraction of [0,.25,.5,1]){
    positions.push(await h.evaluate(`(()=>{repairView.setTime(repairPeriod*${fraction},{paused:true});return repairView.craft.userData.orbitAnchor.toArray();})()`));
  }
  assert.ok(Math.hypot(...positions[0].map((v,i)=>v-positions[2][i]))>10);
  assert.ok(Math.hypot(...positions[0].map((v,i)=>v-positions[3][i]))<1e-7);
  for(const mode of ['inertial','follow','earth-moon','solar']){
    await h.evaluate(`repairView.setCamera('${mode}');`);await wait(500);
    assert.ok(await h.evaluate(`repairView.kit.scene.getObjectByName('ConnectedSolarSystem').visible`));
    await capture('earth-'+mode);
  }
  await h.evaluate(`repairView.focusTarget('mars')`);await wait(500);await capture('mars-focus');
  assert.ok(await h.evaluate(`(()=>{const labels=[...document.querySelectorAll('#repair-view .solar-body-label:not([hidden])')].map(e=>e.getBoundingClientRect());return labels.every((a,i)=>labels.slice(i+1).every(b=>a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top));})()`),'Focused planet labels do not overlap');
  await h.evaluate(`repairView.destroy();document.querySelector('#repair-view').remove();`);
  await h.evaluate(`(async()=>{
    const [{createMissionRun},{createOperations},{renderMissionControl}]=await Promise.all([import('/js/contracts/missionRun.js'),import('/js/engine/operations.js'),import('/js/ui/missionControl.js')]);
    window.repairRun=createMissionRun(repairDesign,repairData,123);repairRun.phase='operations';repairRun.operations=createOperations(repairDesign,repairData,repairRun.evalResult);repairRun.operations.paused=true;
    const host=document.querySelector('#app');
    window.repairCleanup=renderMissionControl(host,repairData,repairRun,()=>{},null,{persist:()=>true});
  })()`);
  await wait(1500);await capture('actual-mission-control');
  assert.ok(await h.evaluate(`(()=>{const e=document.querySelector('[data-flight-camera]'),r=e.getBoundingClientRect();return r.width>0&&r.top>=0&&r.bottom<innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()`),'Camera control is visible and clickable in the actual layout');
  for(const mode of ['follow','solar','earth-moon','inertial']){
    await h.evaluate(`(()=>{const e=document.querySelector('[data-flight-camera]');e.value='${mode}';e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait(500);
    assert.equal(await h.evaluate(`document.querySelector('#ops-canvas').dataset.orbitCamera`),mode);
    await capture('actual-controls-'+mode);
  }
  await h.evaluate(`document.querySelector('#pause-ops').click()`);await wait(1500);
  assert.ok(await h.evaluate(`repairRun.operations.tick>0`),'Actual operations clock advances');
  await h.evaluate(`document.querySelector('#pause-ops').click()`);
  const tick=await h.evaluate(`repairRun.operations.tick`);await wait(600);assert.equal(await h.evaluate(`repairRun.operations.tick`),tick);
  await h.evaluate(`repairCleanup();document.querySelector('#app').innerHTML='';`);
  for(const [destination,kind]of [['mars','orbit'],['saturn','orbit'],['mars','flyby']]){
    await h.evaluate(`(async()=>{
      const {createEncounterView}=await import('/js/three/encounterView.js');
      const host=document.createElement('div');host.id='repair-encounter';host.style.cssText='position:fixed;inset:0;z-index:9999;background:#030811';document.body.append(host);
      window.repairEncounter=createEncounterView(host,{mission:{destination:'${destination}'},design:repairDesign,data:repairData,captured:${kind==='orbit'},arrivalKind:'${kind}'});await repairEncounter.ready;
    })()`);await wait(1500);await capture(destination+'-'+kind);
    await h.evaluate(`repairEncounter.destroy();document.querySelector('#repair-encounter').remove();`);
  }
  assert.deepEqual(await h.evaluate('repairErrors'),[],'No browser errors during view changes');
  const manifest=await h.evaluate(`fetch('/dependency-manifest.json').then(r=>r.text())`);
  fs.writeFileSync(`${out}/checks.json`,JSON.stringify({positions,actualOperationsTick:tick,status:'passed',packageManifestSha256:crypto.createHash('sha256').update(manifest).digest('hex')},null,2));
  console.log('PASS: Windows WebView2 orbital motion, camera modes, actual operations play/pause, Mars/Saturn capture and flyby rendering.');
}finally{h.close();}
