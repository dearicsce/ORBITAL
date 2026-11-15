import { getState,setDesign,saveProgress } from '../state.js';
import { evaluateDesign,checkLaunchGate,getUnlocked } from '../engine.js';
import { showScreen } from './router.js';
import { renderPartsMenu,handlePartClick,removePart } from './designPartsMenu.js';
import { renderResourceTable } from './resourceTable.js';
import { triggerBarRipple } from './designBars.js';
import { mountDesignView,refreshDesignView,destroyDesignView } from './designView.js';
import { dispatchDesignUpdated } from './designTutorialHooks.js';
import { mountTutorial,cleanupTutorial } from './tutorial.js';
import { mountDesignWarnings } from './designWarnings.js';
let activeTab='Bus';
export function renderDesign(container,data,params={}) {
 const state=getState(),design=state.currentDesign,training=design.missionId==='tutorial';
 const mission=data.missions.find(m=>m.id===design.missionId),budget=mission.budget*data.difficulty[design.difficulty].budgetMultiplier;
 const unlocked=getUnlocked(data,Object.keys(state.completedMissions));if(params.tab)activeTab=params.tab;else if(!design.busId)activeTab='Bus';
 container.innerHTML='<section class="builder screen" data-screen="design"><header class="screen-top"><button class="btn" id="back">← Orbit</button><div class="builder-route"><button class="btn" id="rocket-change"></button><button class="btn" id="orbit-change"></button></div><button class="btn btn-primary" id="btn-design-review">Next: Flight advisory →</button></header><div class="builder-top"><section class="glass resources"><h1>Spacecraft workbench</h1><div id="warning-toast" aria-live="polite"></div><div id="resource-table"></div><p id="gate-count"></p><button class="btn" id="edit-pointing"></button><p class="internal-equipment" id="internal-equipment"></p><div id="training-host"></div></section><section class="glass catalogue"><div id="parts-tabs-bar"></div><div id="parts-scroll-list"></div></section></div><div class="builder-view" id="craft-view"></div><div class="camera-presets">'+['Front','Top','Side','Free','Reset'].map(n=>'<button class="btn" data-camera="'+n+'">'+n+(n==='Reset'?' view':'')+'</button>').join('')+'</div></section>';
 const rocketButton=container.querySelector('#rocket-change');rocketButton.textContent=(data.launchers.find(l=>l.id===design.launcherId)?.name||'Choose rocket')+(training?' · Training':' · Change');rocketButton.disabled=training;
 container.querySelector('#orbit-change').textContent=(design.orbitId||'Choose orbit').toUpperCase()+' · Change';
 rocketButton.onclick=()=>showScreen('rocketSelect');container.querySelector('#orbit-change').onclick=container.querySelector('#back').onclick=()=>showScreen('orbitSelect');
 const view=mountDesignView(container.querySelector('#craft-view'),design,data,part=>{removePart(design,part.field,part.index);refresh(['mass','power','battery','data','fuel','budget']);});
 container.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>view.preset(b.dataset.camera));
 const stopWarnings=mountDesignWarnings(container.querySelector('#warning-toast'),data,budget,evaluateDesign(design,data));
 function refresh(affected=[]) {
  if(training)design.trainingStep=getState().currentDesign.trainingStep;
  setDesign(design);saveProgress();const result=evaluateDesign(design,data);renderResourceTable(container.querySelector('#resource-table'),result,budget,data);
  container.querySelector('#edit-pointing').textContent='Pointing: '+(data.parts.find(p=>p.id===design.pointingId)?.name||'None')+' · Change';
  container.querySelector('#internal-equipment').textContent='Inside bus: '+[design.computerId,design.pointingId].filter(Boolean).map(id=>data.parts.find(p=>p.id===id)?.name).filter(Boolean).join(', ');
  const checks=checkLaunchGate(design,data);container.querySelector('#gate-count').textContent=checks.filter(c=>c.ok).length+' of '+checks.length+' launch checks passed';
  renderPartsMenu(container,activeTab,data,unlocked,design,training);refreshDesignView(design,data);triggerBarRipple(container,affected);dispatchDesignUpdated(design,result);
 }
 container.querySelector('#parts-tabs-bar').onclick=e=>{const b=e.target.closest('[data-tab]');if(b){activeTab=b.dataset.tab;refresh();}};
 const choose=e=>{const card=e.target.closest('[data-part-id]');if(card)handlePartClick(card.dataset.partId,data,unlocked,design,refresh);};
 container.querySelector('#parts-scroll-list').onclick=choose;container.querySelector('#parts-scroll-list').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(e);}};
 container.querySelector('#edit-pointing').onclick=()=>{activeTab='Pointing';refresh();};
 container.querySelector('#btn-design-review').onclick=()=>showScreen('advisory');
 refresh();if(training){mountTutorial(container.querySelector('#training-host'),data);dispatchDesignUpdated(design,evaluateDesign(design,data));}
 if(params.highlight)container.querySelector('[data-bar="'+params.highlight+'"]').classList.add('ripple-active');
 return ()=>{stopWarnings();cleanupTutorial();destroyDesignView();};
}
