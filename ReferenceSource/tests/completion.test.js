import {loadData} from '../js/data.js';
import {resetState,setDesign,getState,markTutorialDone} from '../js/state.js';
import {setFlightSession} from '../js/flightSession.js';
import {clearSimulationResults} from '../js/ui/simulation.js';
import {renderReport} from '../js/ui/report.js';
import {initRouter,showScreen} from '../js/ui/router.js';
import {evaluateDesign,rateDesign,getUnlocked,checkLaunchGate} from '../js/engine.js';
import {runEvents} from '../js/events.js';
import {clearLines} from '../js/ui/speech.js';
const saved=localStorage.getItem('space_mission_game_state_v1'),savedFlight=sessionStorage.getItem('space_mission_flight_v1');
const data=await loadData(),app=document.querySelector('#app'),out=document.querySelector('#results');let pass=0,fail=0;out.textContent='';
const check=(name,ok)=>{ok?pass++:fail++;out.textContent+=(ok?'PASS ':'FAIL ')+name+'\n';};
const A={missionId:'m1',difficulty:'normal',busId:'bus_micro',panelIds:['panel_m'],batteryIds:['battery_s'],commsId:'comms_x_band',computerId:'computer_basic',pointingId:'pointing_reaction_wheels',fuelIds:['fuel_s'],instrumentIds:['optical_camera'],launcherId:'kestrel',orbitId:'sso'};
function flight(design,success=true){clearSimulationResults();setFlightSession({design,mission:data.missions.find(m=>m.id===design.missionId),evalResult:evaluateDesign(design,data),launchResult:{success},eventResults:runEvents(design,data),phase:'report'});}
try {
 initRouter(app,data);resetState();markTutorialDone();setDesign(A);flight(A);renderReport(app,data);
 check('29 Design A report remains 4.5 Silver',getState().completedMissions.m1?.stars===4.5&&getState().completedMissions.m1?.medal==='Silver');
 check('29 Next mission available after passing',!!app.querySelector('#btn-report-next'));
 check('29 M1 unlocks Condor and radar',getUnlocked(data,Object.keys(getState().completedMissions)).launchers.includes('condor')&&getUnlocked(data,['m1']).instruments.includes('radar_imager'));
 app.querySelector('#btn-report-retry').click();check('29 Retry keeps spacecraft',getState().currentDesign.busId==='bus_micro');
 resetState();markTutorialDone();setDesign(A);flight(A,false);renderReport(app,data);
 check('29 Failed launch does not unlock mission',!getState().completedMissions.m1);
 check('29 Failure stars capped',Number.parseFloat(app.querySelector('.report-total-stars').textContent)<=.5);
 check('29 No next-mission button after failure',!app.querySelector('#btn-report-next'));
 resetState();const training={...A,missionId:'tutorial',trainingStep:4,trainingOrbits:['leo','sso']};setDesign(training);flight(training);renderReport(app,data);
 check('30 Training marks completion',getState().tutorialDone);
 check('30 Training unlocks no campaign missions',Object.keys(getState().completedMissions).length===0);
 check('30 Training has no star rating',!app.querySelector('.report-total-stars')&&!app.querySelector('.judge-card'));
 app.querySelector('#continue').click();check('30 Training returns to menu',!!app.querySelector('#btn-menu-play'));
 resetState();setDesign({...training,trainingStep:1,trainingOrbits:['leo']});showScreen('review');check('30 Unfinished training cannot bypass into review',!!app.querySelector('[data-screen="design"]'));
 for(const difficulty of Object.keys(data.difficulty)){const d={...A,difficulty};const evaluation=evaluateDesign(d,data);check('32 '+difficulty+' budget multiplier applied',Math.abs(evaluation.budgetUsedFraction-evaluation.totalCost/(data.missions.find(m=>m.id==='m1').budget*data.difficulty[difficulty].budgetMultiplier))<1e-9);check('32 '+difficulty+' checks are finite',checkLaunchGate(d,data).filter(c=>typeof c.value==='number').every(c=>Number.isFinite(c.value)));}
 showScreen('menu');clearLines();
}catch(error){check(error.stack,false);}finally{clearLines();clearSimulationResults();if(saved===null)localStorage.removeItem('space_mission_game_state_v1');else localStorage.setItem('space_mission_game_state_v1',saved);if(savedFlight===null)sessionStorage.removeItem('space_mission_flight_v1');else sessionStorage.setItem('space_mission_flight_v1',savedFlight);out.textContent+='\n'+pass+' passed, '+fail+' failed';}
