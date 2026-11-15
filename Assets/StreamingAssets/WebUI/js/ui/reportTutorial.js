import { drawAvatar } from '../characters.js';
import { showLine } from './speech.js';
export function renderTutorialReport(container,onReplay,onContinue) {
 container.innerHTML='<section class="screen content-screen training-complete" data-screen="report">'+drawAvatar('nova',180)+'<h1>Training complete</h1><p>You are ready to design your first independent mission.</p><div class="training-tiles">'+['Mass limits','Power balance','Budget','Orbit choice'].map((t,i)=>'<article class="glass"><svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="currentColor"/><path d="m12 20 6 6 11-13" fill="none" stroke="currentColor" stroke-width="2"/></svg><h2>'+t+'</h2></article>').join('')+'</div><button class="btn btn-primary" id="continue">Back to main menu</button></section>';
 container.querySelector('#continue').onclick=onContinue;showLine('nova','Training complete. You balanced mass against lift, generation against power needs, equipment against budget, and orbit choice against mission needs. Your first independent mission awaits.');
}
