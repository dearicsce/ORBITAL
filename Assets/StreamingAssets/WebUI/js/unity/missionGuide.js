import {getState,setSettings,saveProgress} from '../state.js';
const steps={
 launch:'Flight starts at real time. Pause to inspect the vehicle, reset the camera if needed, and choose an explicit time rate or Skip to calculated result. Skipping preserves the calculated success or failure.',
 workshop:'Open Power & design forecast. Pin your design, then compare how a battery or array change affects reserve, mass, cost and expected delivery.',
 orbit:'Compare altitude and contact time. Confirm a valid orbit, then use Review / launch. Camera sample spacing and useful observations are different from total bytes.',
 operations:'Watch the battery in Wh and recorder in GB. At a contact, decide whether to transmit stored evidence or keep observing. Safe mode saves energy while suspending science.',
 report:'Check the objectives and the first recorded interruption. Use Compare a design change to test one factor against the flown inputs. Analytical runs earn no reward.'
};
export function missionGuide(stage,id){
 if(id!=='m1'||getState().settings.missionGuide===false)return '';
 return '<details class="mission-guide" open><summary>First mission · next decision</summary><p>'+steps[stage]+'</p><button class="btn" data-dismiss-mission-guide>Skip guidance on future screens</button></details>';
}
export function bindMissionGuide(container){
 for(const button of container.querySelectorAll('[data-dismiss-mission-guide]'))button.onclick=()=>{setSettings({missionGuide:false});saveProgress();for(const panel of container.querySelectorAll('.mission-guide'))panel.remove();};
}
