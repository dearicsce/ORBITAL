import {escapeHtml} from './html.js';
import {resolveFlightDesign} from '../flightConfiguration.js';
import {playableLaunchChecks} from './launchChecks.js';
import {createSpacecraftView} from '../three/spacecraft.js';
import { getState } from '../state.js';
import { checkLaunchGate,rateDesign } from '../engine.js';
import { drawAvatar,getCharacter } from '../characters.js';
import { renderJudgeStars } from './reportJudges.js';
import { clearLines,queueLines,showLine } from './speech.js';
import { showScreen } from './router.js';
import { clearSimulationResults } from './simulation.js';
export function renderReview(container,data) {
 const design=resolveFlightDesign(getState().currentDesign),checks=playableLaunchChecks(design,data),ok=checks.every(c=>c.ok),rating=rateDesign(design,data);
 container.innerHTML='<section class="screen content-screen" data-screen="review"><header class="screen-top"><button class="btn" id="back">← Advisory</button><h1>Evaluation board</h1><button class="btn" id="replay">Replay</button></header><p>Performance preview (six-point scale) — final medals after flight</p><div class="board-grid">'+['engineer','scientist','accountant'].map(id=>'<article class="glass board-judge" id="judge-'+id+'">'+drawAvatar(id,160)+'<h2>'+getCharacter(id).name+'</h2><p>'+getCharacter(id).role+'</p><div>'+ (design.missionId==='tutorial'?'Training flight · no stars':ok?renderJudgeStars(rating[id],2):'Fix the red checks to get a rating')+'</div><p>'+rating.comments[id]+'</p></article>').join('')+'</div><details class="glass gate-details"><summary>'+checks.filter(c=>c.ok).length+' of '+checks.length+' checks passed · '+checks.map(c=>c.ok?'✓':'×').join(' ')+'</summary>'+checks.map(c=>'<p class="'+(c.ok?'text-green':'text-red')+'">'+c.id.replaceAll('_',' ')+': '+escapeHtml(c.message)+'</p>').join('')+'</details><footer class="screen-actions"><button class="btn btn-primary" id="launch" '+(ok?'':'disabled')+'>Launch →</button></footer></section>';
 let craftView=null;if(design.assembly){const preview=document.createElement('div');preview.style.cssText='height:340px;position:relative;margin:20px 0';container.querySelector('.board-grid').before(preview);craftView=createSpacecraftView(preview,{data});craftView.update(design,data);}
 const replay=()=>{clearLines();if(!ok){showLine('engineer','Fix the red checks to get a rating.');return;}queueLines(['engineer','scientist','accountant'].map(id=>({characterId:id,text:rating.comments[id],options:{pointAt:'#judge-'+id}})));};
 container.querySelector('#back').onclick=()=>showScreen('advisory');container.querySelector('#replay').onclick=replay;
 container.querySelector('#launch').onclick=()=>{if(!playableLaunchChecks(getState().currentDesign,data).every(c=>c.ok))return;clearSimulationResults();showScreen('simulation');};replay();
 return ()=>craftView?.destroy();
}
