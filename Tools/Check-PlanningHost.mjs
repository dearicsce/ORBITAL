import fs from 'node:fs';
import path from 'node:path';
import {hostSession} from './HostSession.mjs';
const host=await hostSession(),record=path.resolve(process.env.ORBITAL_TEST_ARTIFACTS);
try{
 const result=await host.evaluate(`(async()=>{
  const [{getState,setDesign},{showScreen},{loadData}]=await Promise.all([import('/js/state.js'),import('/js/ui/router.js'),import('/js/data.js')]);
  const data=await loadData(),original=structuredClone(getState().currentDesign);
  const flown=localStorage.getItem('space_mission_flight_v1'),wallet=localStorage.getItem('orbital_economy_v1');
  const expect=(value,message)=>{if(!value)throw Error(message);};
  showScreen('advisory');setDesign({flightPlan:null,planId:null});showScreen('advisory');
  const planFix=document.querySelector('[data-fix="flight-plan"]');expect(planFix,'Missing-plan validation is actionable');planFix.click();
  expect(document.querySelector('[data-screen="flightPlan"]'),'Plan validation must open flight-plan controls');
  setDesign(original);showScreen('review');
  const oldLaunch=document.querySelector('#launch');expect(oldLaunch&&!oldLaunch.disabled,'Original design is launchable');
  setDesign({difficulty:original.difficulty==='easy'?'normal':'easy'});oldLaunch.click();
  expect(document.querySelector('[data-screen="review"]')&&!document.querySelector('#pause-launch'),'Changed reviewed configuration must refresh review, not silently launch');
  setDesign(original);showScreen('workshop',{mission:true});
  const name=document.querySelector('#ws-name');name.value='Resume verification spacecraft';name.dispatchEvent(new Event('change',{bubbles:true}));
  const snapshot=structuredClone(getState().currentDesign);
  const bar=document.querySelector('.journey-bar');expect(bar,'Workshop has mission phase guidance');
  bar.querySelector('[data-journey="workshop"]').click();
  expect(document.querySelector('#ws-name').value==='Resume verification spacecraft','Returning to previous planning step retains draft name');
  showScreen('menu');const continueButton=document.querySelector('#campaign');continueButton.click();
  expect(document.querySelector('[data-screen="workshop"]'),'Continue must open the latest mission draft before the older report');
  expect(document.querySelector('#ws-name').value==='Resume verification spacecraft','Continue retains draft');
  expect(localStorage.getItem('space_mission_flight_v1')===flown,'Planning cannot overwrite immutable flown configuration/report');
  expect(localStorage.getItem('orbital_economy_v1')===wallet,'Planning cannot change rewards');
  return {passed:true,planFixRouted:true,staleReviewRefreshed:true,previousStepDraftRetained:true,continueDraft:true,flownAndWalletRetained:true,name:document.querySelector('#ws-name').value,missionId:snapshot.missionId};
 })()`);
 await host.send('Page.reload');
 for(let i=0;i<300;i++){if(await host.evaluate("document.querySelector('#ws-name')?.value==='Resume verification spacecraft'"))break;await new Promise(r=>setTimeout(r,100));}
 if(!await host.evaluate("document.querySelector('#ws-name')?.value==='Resume verification spacecraft'"))throw Error('Mission draft did not survive reload');
 result.reloadDraft=true;fs.mkdirSync(record,{recursive:true});fs.writeFileSync(path.join(record,'planning.json'),JSON.stringify(result,null,2));console.log('PASS: validation routing, stale-review rejection, draft return/Continue/reload and immutable report/reward');
}finally{host.close();}
