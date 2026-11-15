import { queueLines } from './speech.js';
export function animateReport(container,rating,eventSentence) {
  const ids=['engineer','scientist','accountant'];
  container.querySelectorAll('.judge-card').forEach((card,i)=>{card.id='report-'+ids[i];card.querySelectorAll('.judge-star').forEach((star,j)=>{star.style.animation=`star-reveal .5s ${i*1.2+j*.3}s both`;});});
  queueLines(ids.map(id=>({characterId:id,text:rating.comments[id]+(id==='engineer'?eventSentence:''),options:{pointAt:'#report-'+id}})));
  if(rating.total>=5.5){const confetti=document.createElement('div');confetti.className='confetti';confetti.setAttribute('aria-hidden','true');for(let i=0;i<50;i++){const particle=document.createElement('i');particle.style.cssText=`left:${Math.random()*100}%;background:${['#65dcea','#f5c972','#a1e4bf'][i%3]};animation-delay:${Math.random()*2}s`;confetti.append(particle);}container.append(confetti);}
}
