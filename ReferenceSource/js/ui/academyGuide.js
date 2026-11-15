import {LESSONS,saveAcademy} from '../academy.js';

export function academyGuide(state,{nextLabel='Continue lesson →',next=false}={}){
 const [title,instruction]=LESSONS[state.step]||['Academy complete','Your training flight and launcher review are complete.'];
 return `<aside class="academy-guide" aria-label="Flight Academy instruction"><div><small>TRAINING SCENARIO · ${Math.min(state.step+1,LESSONS.length)} / ${LESSONS.length}</small><h2>${title}</h2><p id="academy-instruction" aria-live="polite">${instruction}</p><small>Dedicated training hardware · No campaign purchases or rewards</small></div><div class="academy-actions"><button class="btn" id="academy-back" ${state.step===0?'disabled':''}>Back</button><button class="btn" id="academy-replay">Replay instruction</button><button class="btn" id="academy-skip">Skip tutorial</button><button class="btn btn-primary" id="academy-next" ${next?'':'disabled'}>${nextLabel}</button></div></aside>`;
}

export function bindAcademyGuide(container,state,{back,skip,next}){
 const find=id=>container.querySelector('#academy-'+id);
 find('back').onclick=()=>{state.step=Math.max(0,state.step-1);saveAcademy(state);back();};
 find('skip').onclick=()=>{state.skipped=true;saveAcademy(state);skip();};
 find('next').onclick=next;
 const instructions=find('instruction');
 const text=instructions.textContent;
 find('replay').onclick=()=>{instructions.textContent='';requestAnimationFrame(()=>{instructions.textContent='Instruction replay · '+text;});instructions.scrollIntoView({block:'nearest'});};
}
