import {bindJourney} from '../unity/journeyBar.js';
import {rememberCampaignDraft} from '../unity/campaignResume.js';
import {renderFlightPlan} from './flightPlan.js';
import {renderRocketWorkshop} from './rocketWorkshop.js';
import {renderAcademy} from './academy.js';
import {renderWorkshop} from './workshop.js';
import { renderMenu } from '../unity/menu.js';
import { renderMissionSelect } from './missionSelect.js';
import { renderBrief } from './brief.js';
import { renderRocketSelect } from './rocketSelect.js';
import { renderOrbitSelect } from './orbitSelect.js';
import { renderDesign } from './design.js';
import { renderAdvisory } from './advisory.js';
import { renderReview } from './review.js';
import { renderSimulation,getSimulationResults } from './simulation.js';
import { renderReport } from './report.js';
import { clearLines } from './speech.js';
import { getState,setDesign,saveProgress } from '../state.js';
import { getUnlocked,checkLaunchGate } from '../engine.js';
import {tutorialGoal} from '../tutorialGoals.js';
import {isMissionUnlocked} from '../campaign.js';
import {renderEvidence} from '../unity/observations.js';
const renderers={flightPlan:renderFlightPlan,rocketWorkshop:renderRocketWorkshop,academy:renderAcademy,workshop:renderWorkshop,menu:renderMenu,evidence:renderEvidence,missionSelect:renderMissionSelect,brief:renderBrief,rocketSelect:renderRocketSelect,orbitSelect:renderOrbitSelect,design:renderDesign,advisory:renderAdvisory,review:renderReview,simulation:renderSimulation,report:renderReport};
export const SCREENS=Object.keys(renderers);
let currentScreenName='menu',currentScreenParams={},appContainer,worldData,cleanup=null;
export function initRouter(container,data){appContainer=container;worldData=data;window.addEventListener('popstate',()=>showScreen(new URLSearchParams(location.search).get('screen')||'menu',{},true));}
export function getCurrentScreen(){return {name:currentScreenName,params:{...currentScreenParams}};}
export function showScreen(name,params={},fromHistory=false) {
 if(!SCREENS.includes(name))name='menu';
 const state=getState(),design=state.currentDesign;
 const mission=worldData.missions.find(m=>m.id===design.missionId);
 if(name==='design'&&design.missionId!=='tutorial'){name='workshop';params={...params,mission:true};}
 const activeTraining=design.missionId==='tutorial'&&!state.tutorialDone&&design.launcherId;
 if(activeTraining&&['brief','rocketSelect'].includes(name))name='orbitSelect';
 if(activeTraining&&['advisory','review','simulation'].includes(name)&&((design.trainingStep||1)<4||!tutorialGoal('orbit',design,null,worldData)||!checkLaunchGate(design,worldData).every(c=>c.ok)))name='design';
 if(name==='report'&&getSimulationResults()?.phase!=='report')name=mission?'design':'menu';
 const savedReport=name==='report';
 if(!savedReport&&!['menu','missionSelect','evidence','workshop','academy','rocketWorkshop'].includes(name)&&!mission)name='menu';
 if(!savedReport&&!state.practiceMode&&mission&&mission.id!=='tutorial'){
  if(!isMissionUnlocked(mission,state.completedMissions)&&!['menu','missionSelect','evidence','workshop','academy','rocketWorkshop'].includes(name))name='missionSelect';
 }
 if(!savedReport&&!state.practiceMode&&mission&&!['menu','missionSelect','brief','evidence','workshop','academy','rocketWorkshop'].includes(name)){
  const u=getUnlocked(worldData,Object.keys(state.completedMissions));
  if(!mission.launchers.includes(design.launcherId)||!u.launchers.includes(design.launcherId)){setDesign({launcherId:mission.launchers.find(id=>u.launchers.includes(id))||null});if(mission.id!=='tutorial')name='rocketSelect';}
  if(!['rocketSelect','orbitSelect'].includes(name)&&!design.orbitId)name='orbitSelect';
 }
 if(name==='rocketWorkshop'&&params.mission===undefined)params={...params,mission:new URLSearchParams(location.search).get('rocketMode')==='mission'};
 if(name==='workshop'&&params.mission===undefined)params={...params,mission:new URLSearchParams(location.search).get('workshopMode')==='mission'};
 cleanup?.();cleanup=null;clearLines();
 currentScreenName=name;currentScreenParams=params;
 try{const url=new URL(location.href);url.searchParams.set('screen',name);if(name==='rocketWorkshop'&&params.mission)url.searchParams.set('rocketMode','mission');else url.searchParams.delete('rocketMode');if(name==='workshop'&&params.mission)url.searchParams.set('workshopMode','mission');else url.searchParams.delete('workshopMode');const method=fromHistory||!history.state?.game?'replaceState':'pushState';if(!fromHistory)history[method]({game:true},'',url);}catch{}
 window.scrollTo(0,0);
 if(saveProgress())rememberCampaignDraft(name,params,getState().currentDesign);
 const nextCleanup=renderers[name](appContainer,worldData,params);const journeyCleanup=bindJourney(appContainer,worldData,name,params,showScreen,getSimulationResults());cleanup=()=>{journeyCleanup();if(typeof nextCleanup==='function')nextCleanup();};
}
