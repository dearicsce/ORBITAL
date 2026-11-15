import {escapeHtml} from './html.js';
import {playableLaunchChecks} from './launchChecks.js';
import { getState } from '../state.js';
import { evaluateDesign,checkLaunchGate } from '../engine.js';
import { showScreen } from './router.js';
import { showLine } from './speech.js';
import { getLearnExplanation } from './learnTexts.js';
export const checkRows={launch_mass:'mass',budget:'budget',power:'power',eclipse:'battery',slots:'mass',computer:'data',pointing:'data',fuel:'fuel',comms:'data',reach:'mass'};
export const fixTabs={pointing:'Pointing',computer:'Computer',comms:'Comms',eclipse:'Battery',power:'Power',fuel:'Fuel',slots:'Bus'};
export function renderAdvisory(container,data) {
  const design=getState().currentDesign,checks=playableLaunchChecks(design,data),bad=checks.filter(c=>!c.ok);
  container.innerHTML=`<section class="screen content-screen" data-screen="advisory"><header class="screen-top"><button class="btn" id="back">← Design</button><h1>Flight advisory</h1><button class="btn" id="why">Why?</button></header><p class="installed-pointing">Installed pointing: <strong>${data.parts.find(p=>p.id===design.pointingId)?.name||'None'}</strong></p><div class="advisory-list">${bad.length?bad.map(c=>`<article class="glass advisory-item"><div><h2>${c.id.replaceAll('_',' ')}</h2><p>${escapeHtml(c.message)}</p><p>${c.value} / ${c.limit}</p></div><button class="btn" data-fix="${c.id}">Fix it</button></article>`).join(''):'<article class="glass all-clear"><h2>All checks passed</h2><p>Your spacecraft is ready for the evaluation board.</p></article>'}</div><footer class="screen-actions"><button class="btn btn-primary" id="next">Go to evaluation board →</button></footer></section>`;
  container.querySelector('#back').onclick=()=>showScreen('design');
  container.querySelector('#next').onclick=()=>showScreen('review');
  container.querySelectorAll('[data-fix]').forEach(b=>b.onclick=()=>showScreen('design',{highlight:checkRows[b.dataset.fix],tab:fixTabs[b.dataset.fix]}));
  container.querySelector('#why').onclick=()=>showLine('nova',getLearnExplanation(design,evaluateDesign(design,data),checks,data).text);
  showLine('engineer',bad.length?`${bad.length} checks need attention. ${bad[0].message}`:'All checks passed. Your spacecraft is ready for launch review.');
}
