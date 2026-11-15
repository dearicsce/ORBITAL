import {starterDesign} from '../campaign.js';
import {evaluateDesign} from '../engine.js';
import {createOperations,operationSummary,stepOperations,resolveIncident,INCIDENTS,MINUTES_PER_TICK} from '../engine/operations.js';

export function powerExperiment(data){
 const mission=data.missions.find(m=>m.id==='m1');
 const baseline={...starterDesign(mission,data),panelIds:['panel_s']};
 return ['battery_minimal','battery_m'].map(battery=>{
  const design={...baseline,batteryIds:[battery]},evaluation=evaluateDesign(design,data);
  const state=createOperations(design,data,evaluation);
  let firstOutage=null,minimumWh=state.batteryWh;
  while(!state.finished){
   if(state.pendingIncident)resolveIncident(state,INCIDENTS[state.pendingIncident.id].choices[0].id);
   stepOperations(state);
   minimumWh=Math.min(minimumWh,state.batteryWh);
   if(state.outageMinutes&&firstOutage===null)firstOutage=(state.tick-1)*MINUTES_PER_TICK;
  }
  return {battery,minimumWh,firstOutage,massKg:evaluation.launchMass,costM:evaluation.totalCost,
   summary:operationSummary(state)};
 });
}

export function bindPreparedExercise(container,data){
 const root=container.firstElementChild;
 if(!root)return;
 const button=document.createElement('button');
 button.className='btn academy-power-exercise';
 button.textContent='Prepared in-orbit exercise';
 (root.querySelector('.academy-actions')??root).append(button);
 const dialog=document.createElement('dialog');
 dialog.className='orbital-learning-dialog';
 dialog.setAttribute('aria-labelledby','prepared-title');
 dialog.innerHTML='<form method="dialog"><button class="btn" autofocus>Close</button></form><h2 id="prepared-title">Prepared in-orbit exercise</h2><p>Predict how a larger battery changes reserve and returned data. Both prepared spacecraft start in the same orbit with charged batteries and the same contact schedule. The comparison excludes launch and earns no campaign rewards.</p><button type="button" class="btn btn-primary">Compare the two batteries</button><div aria-live="polite"></div>';
 root.append(dialog);
 button.onclick=()=>dialog.showModal();
 dialog.addEventListener('close',()=>button.focus());
 dialog.querySelector('button[type=button]').onclick=()=>{
  const trials=powerExperiment(data);
  const rows=[
   ['Outcome',t=>t.summary.passed?'Objectives achieved':'Objectives missed'],
   ['First power shortage',t=>t.firstOutage===null?'None':`T+${t.firstOutage.toFixed(1)} min`],
   ['Minimum energy',t=>t.minimumWh.toFixed(1)+' Wh'],
   ['Confirmed at Earth',t=>t.summary.deliveredGb.toFixed(2)+' GB'],
   ['Launch mass',t=>t.massKg.toFixed(1)+' kg'],
   ['Mission cost',t=>'$'+t.costM.toFixed(2)+'M']
  ];
  dialog.querySelector('[aria-live]').innerHTML='<div class="science-table"><table><thead><tr><th>Measure</th><th>Small battery</th><th>Larger battery</th></tr></thead><tbody>'+rows.map(([label,value])=>'<tr><th scope="row">'+label+'</th>'+trials.map(t=>'<td>'+value(t)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p>Compare the added mass and cost with the change in reserve and received data. During daylight a larger solar array can improve generation. During eclipse the battery must supply the shortfall.</p>';
 };
}
