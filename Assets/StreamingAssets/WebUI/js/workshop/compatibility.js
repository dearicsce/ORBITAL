import {starterDesign} from '../campaign.js';
import {createLibrary} from './library.js';
import {placementIssues,projectAssembly} from './blueprint.js';
import {getUnlocked,checkLaunchGate} from '../engine.js';
import {referenceRocket} from '../rocket/reference.js';
import {rocketLibrary} from '../rocket/library.js';
import {recommendedPlan} from '../transfer/planning.js';

export function compatibleSavedBuilds(mission,data,state){
 try{
  const completed=state.completedMissions,u=getUnlocked(data,Object.keys(completed)),allowed=[...u.parts,...u.instruments];
  const baseline=starterDesign(mission,data,state.difficulty);
  const launchers=mission.launchers.filter(id=>u.launchers.includes(id));
  const plan=mission.transfer?recommendedPlan(mission,baseline.orbitId,completed):null;
  const deployment=plan?{...baseline,flightPlan:plan,planId:plan.id}:baseline;
  const rockets=mission.transfer?[referenceRocket(mission),...rocketLibrary().list()]:[];
  const configurations=[
   ...launchers.map(launcherId=>({...deployment,launcherId})),
   ...rockets.map(rocket=>({...deployment,rocketId:rocket.id,rocketBlueprint:rocket}))
  ];
  return createLibrary(data).list().filter(b=>!placementIssues(b.assembly,data,allowed).length&&
   configurations.some(config=>checkLaunchGate(projectAssembly({...config,assembly:b.assembly},data),data,allowed,completed).every(c=>c.ok)));
 }catch{return [];}
}
