import {tutorialGoal} from '../tutorialGoals.js';
import { getState,setDesign,saveProgress } from '../state.js';
import { checkLaunchGate } from '../engine.js';
import { showLine } from './speech.js';
import { showScreen } from './router.js';
let cleanup=()=>{};
export function cleanupTutorial(){cleanup();cleanup=()=>{};}
export function mountTutorial(host,data) {
 cleanupTutorial();let index=Math.max(1,Math.min(4,getState().currentDesign.trainingStep||1)),last=null;
 const steps=data.tutorial.steps;
 function goal(design,e){return tutorialGoal(steps[index].id,design,e,data);}
 function draw(){const step=steps[index];host.innerHTML='<div class="training-card"><span>Training · '+(index+1)+' of '+steps.length+'</span><h2>'+step.title+'</h2><p>'+step.instruction+'</p><button class="btn" id="btn-tutorial-next" disabled>'+(index===4?'Continue to advisory':'Next step')+'</button></div>';showLine('nova',step.instruction,{pointAt:step.highlight});host.querySelector('button').onclick=()=>{if(!last||!goal(last.design,last.evalResult))return;if(index===4){showScreen('advisory');return;}index++;setDesign({trainingStep:index});saveProgress();draw();update(last);};}
 function update(detail){last=detail;const ready=goal(detail.design,detail.evalResult);host.querySelector('button').disabled=!ready;const next=document.querySelector('#btn-design-review');if(next)next.disabled=index!==4||!ready;}
 const listener=e=>update(e.detail);document.addEventListener('design-updated',listener);draw();cleanup=()=>{document.removeEventListener('design-updated',listener);host.innerHTML='';};
}
