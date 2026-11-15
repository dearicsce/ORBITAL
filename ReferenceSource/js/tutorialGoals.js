import {checkLaunchGate} from './engine.js';
export function tutorialGoal(id,design,e,data) {
  if(id==='orbit')return ['leo','sso'].every(o=>(design.trainingOrbits||[]).includes(o));
  if(id==='mass')return Boolean(design.busId&&design.fuelIds?.length);
  if(id==='power')return Boolean(design.instrumentIds?.includes('optical_camera')&&e.panelPower>=e.averageLoad*data.settings.powerMargin);
  if(id==='budget'){
    const mission=data.missions.find(m=>m.id==='tutorial');
    return design.commsId==='comms_x_band'&&e.totalCost<=mission.budget*data.difficulty[design.difficulty].budgetMultiplier;
  }
  if(id==='launch')return checkLaunchGate(design,data).every(c=>c.ok);
  return false;
}
