import {completedFlight} from './flight-fixture.js';
import { loadData } from '../js/data.js';
import { initRouter,showScreen } from '../js/ui/router.js';
import { resetState,getState,setDesign,completeMission,markTutorialDone,saveProgress,loadProgress } from '../js/state.js';
import { evaluateDesign,checkLaunchGate,rateDesign,getUnlocked } from '../js/engine.js';
import { loadManifest,getModel,getHardpoints } from '../js/three/models.js';
import { disposeObject } from '../js/three/sceneKit.js';
import { createAssembly } from '../js/three/spacecraftParts.js';
import { loadCutscenes,playCutscene } from '../js/media/cutscene.js';
import { clearLines } from '../js/ui/speech.js';
import * as THREE from 'three';
const app=document.querySelector('#app'),output=document.querySelector('#results');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const A={missionId:'m1',difficulty:'normal',busId:'bus_micro',panelIds:['panel_m'],batteryIds:['battery_s'],commsId:'comms_x_band',computerId:'computer_basic',pointingId:'pointing_reaction_wheels',fuelIds:['fuel_s'],instrumentIds:['optical_camera'],launcherId:'kestrel',orbitId:'sso'};
document.querySelector('#run').onclick=async()=>{
  const previous=localStorage.getItem('space_mission_game_state_v1');let passed=0,failed=0;
  output.textContent='';const check=(name,value)=>{value?passed++:failed++;output.textContent+=(value?'PASS ':'FAIL ')+name+'\n';};
  try{
    const data=await loadData();resetState();initRouter(app,data);
    check('Empty design has no bus',getState().currentDesign.busId===null);
    check('Tutorial cannot unlock rewards',completeMission('tutorial',{total:6,medal:'Gold'})===false);
    check('Blocked storage handled',saveProgress({setItem(){throw Error('blocked');}})===false&&loadProgress({getItem(){throw Error('blocked');}})===false);
    markTutorialDone();setDesign(A);showScreen('review');
    check('Design A passes all ten checks',checkLaunchGate(A,data).length===10&&checkLaunchGate(A,data).every(c=>c.ok));
    check('Design A remains 4.5 / Silver',rateDesign(A,data).total===4.5&&rateDesign(A,data).medal==='Silver');
    check('Launch enabled',!app.querySelector('#launch').disabled);
    setDesign({launcherId:'roc'});showScreen('design');check('Unqualified rocket routes back to selection',!!app.querySelector('[data-screen="rocketSelect"]')&&getState().currentDesign.launcherId==='kestrel');
    setDesign(A);showScreen('missionSelect');app.querySelector('[data-mission="m1"]').click();check('Same mission keeps design',getState().currentDesign.busId==='bus_micro');
    completeMission('m1', {total:4.5,medal:'Silver'}, 3, completedFlight);showScreen('missionSelect');app.querySelector('[data-mission="m2"]').click();check('New mission clears spacecraft',getState().currentDesign.busId===null);
    check('Mission 1 unlocks Condor and Medium bus',getUnlocked(data,['m1']).launchers.includes('condor')&&getUnlocked(data,['m1']).parts.includes('bus_medium'));
    resetState();markTutorialDone();setDesign(A);showScreen('design');
    const baseline=document.querySelectorAll('canvas').length;
    for(let i=0;i<20;i++){showScreen('orbitSelect');await pause(20);showScreen('design');await pause(20);}
    check('20 screen changes leave one live canvas',baseline===1&&document.querySelectorAll('canvas').length===1);
    showScreen('missionSelect');await pause(50);check('Leaving 3D removes every canvas',document.querySelectorAll('canvas').length===0);
    const manifest=await loadManifest();let valid=true;
    for(const id of Object.keys(manifest)){const model=await getModel(id);const box=new THREE.Box3().setFromObject(model);const finite=!box.isEmpty()&&Number.isFinite(box.max.y);if(!finite)output.textContent+='Invalid bounds: '+id+'\n';valid=valid&&finite;disposeObject(model);}
    check('Every GLB or fallback loads with finite bounds',valid);
    check('Bus hardpoints available',(await getHardpoints('bus_micro')).panelPairs.length===2);
    const group=new THREE.Group(),assembly=createAssembly(group);await assembly.update(A,data);
    check('One panel item produces exactly two wings',assembly.instances.get('panel0').children.length===2);
    check('Panel M remains 150 W',evaluateDesign(A,data).panelPower===150);
    assembly.destroy();check('Assembly disposal removes instances',group.children.length===0);
    await loadCutscenes();check('Empty video slot returns false',playCutscene(app,'deploy')===false);
    showScreen('menu');showScreen('missionSelect');clearLines();
  }catch(error){check(error.stack,false);}finally{
    if(previous===null)localStorage.removeItem('space_mission_game_state_v1');else localStorage.setItem('space_mission_game_state_v1',previous);
    output.textContent+='\n'+passed+' passed, '+failed+' failed.\nGPU heap stability still requires a profiler; canvas cleanup is not a heap measurement.';
  }
};
