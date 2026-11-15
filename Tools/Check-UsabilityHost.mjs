import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hostSession} from './HostSession.mjs';
const record=path.resolve(process.env.ORBITAL_TEST_ARTIFACTS),host=await hostSession();
fs.mkdirSync(record,{recursive:true});
try {
 const results=await host.evaluate(`(async()=>{
  const [{loadData},{starterDesign},{createConsequencesPanel,designForecast},{getState,setDesign},{showScreen},{validationDestination,bindJourney}]=await Promise.all([
   import('/js/data.js'),import('/js/campaign.js'),import('/js/unity/consequences.js'),import('/js/state.js'),import('/js/ui/router.js'),import('/js/unity/journeyBar.js')]);
  const data=await loadData(),original=structuredClone(getState()),storage=Object.fromEntries(Object.entries(localStorage));
  const design=starterDesign(data.missions.find(m=>m.id==='m1'),data),fixture=document.createElement('section');document.body.append(fixture);
  const panel=createConsequencesPanel(fixture,data,design),wait=ms=>new Promise(r=>setTimeout(r,ms));
  const until=async predicate=>{for(let i=0;i<300;i++){if(predicate())return;await wait(20);}throw Error('UI state timeout');};
  const expect=(ok,message)=>{if(!ok)throw Error(message);};
  panel.update(design);expect(fixture.innerText.includes('outdated'),'Pending state must replace old numbers immediately');
  await until(()=>fixture.querySelector('[aria-busy]')?.getAttribute('aria-busy')==='false');
  expect(fixture.innerText.includes('operations only'),'Headline scope must be visible outside details');
  const alternate={...design,batteryIds:['battery_l']};
  panel.update(alternate);await wait(181);panel.update(design);panel.update(alternate);panel.update(design);
  await until(()=>fixture.querySelector('[aria-busy]')?.getAttribute('aria-busy')==='false');
  const text=fixture.innerText,expected=designForecast(design,data);
  expect(text.includes('Pinned '+expected.values.massKg.toFixed(2)+' → Current '+expected.values.massKg.toFixed(2)),'Newest forecast and original pin must win rapid updates');
  panel.update(alternate);panel.destroy();const destroyed=fixture.innerHTML;fixture.remove();await wait(500);expect(fixture.innerHTML===destroyed,'Destroyed panel must not receive stale completion');
  expect(JSON.stringify(getState())===JSON.stringify(original),'Forecast cannot change campaign');
  expect(JSON.stringify(Object.fromEntries(Object.entries(localStorage)))===JSON.stringify(storage),'Forecast cannot change storage or active flight');
  const journey=document.createElement('div');journey.innerHTML='<section data-screen="simulation"><header class="screen-top"></header></section>';document.body.append(journey);
  const stop=bindJourney(journey,data,'simulation',{},()=>{}, {design:getState().currentDesign,phase:'launch'});
  expect(journey.querySelector('.journey-bar'),'Campaign phase fixture requires a current mission');
  journey.innerHTML='<section data-screen="missionControl"><header class="screen-top"></header></section>';await wait(30);
  expect(journey.querySelector('[data-journey-current]').textContent==='Operations','Continuous flight transition updates phase');
  expect(journey.querySelector('[data-journey-flight]').textContent==='Flight · completed','Operations follows completed launch flight');
  expect(journey.querySelector('[data-journey-operations]').textContent==='Operations · current','Operations status must agree with current phase');
  stop();journey.innerHTML='<section data-screen="missionControl"></section>';await wait(30);expect(!journey.querySelector('.journey-bar'),'Disposed phase observer cannot reattach');journey.remove();
  const routing=['eclipse','power','flight-plan','transfer-0','launcher-blueprint','required_payload','radio_pointing'].map(id=>({id,...validationDestination(id)}));
  return {rapidChanges:true,pinPreserved:true,scopeVisible:true,destroyedPanelUnchanged:true,flightAndWalletUnchanged:true,continuousPhaseAndDisposal:true,routing};
 })()`);
 assert.ok(results.rapidChanges);fs.writeFileSync(path.join(record,'forecast-ui.json'),JSON.stringify(results,null,2));
 console.log('PASS: actual WebView2 forecast races, pin, scope, disposal and active-flight isolation');
}finally{host.close();}
