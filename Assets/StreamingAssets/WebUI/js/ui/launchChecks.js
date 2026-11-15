import {resolveFlightDesign} from '../flightConfiguration.js';
import {getState} from '../state.js';
import {getUnlocked,checkLaunchGate} from '../engine.js';
export function playableLaunchChecks(design,data){
 const completed=getState().completedMissions;
 const access=getUnlocked(data,Object.keys(completed));
 return checkLaunchGate(resolveFlightDesign(design),data,[...access.parts,...access.instruments],completed);
}
