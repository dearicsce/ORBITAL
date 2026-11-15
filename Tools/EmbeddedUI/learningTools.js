import {starterDesign} from '../campaign.js';
import {evaluateDesign} from '../engine.js';
import {createOperations,operationSummary,stepOperations,resolveIncident,INCIDENTS,MINUTES_PER_TICK} from '../engine/operations.js';
import {forecastIncidentChoice} from './systemsOperations.js';

export function powerExperiment(data){
 const mission=data.missions.find(m=>m.id==='m1');
 const baseline={...starterDesign(mission,data),panelIds:['panel_s'],autonomy:{reservePreset:'Late'}};
 return ['battery_minimal','battery_m'].map(battery=>{
  const design={...baseline,batteryIds:[battery]},evaluation=evaluateDesign(design,data);
  const state=createOperations(design,data,evaluation);
  let firstOutage=null,minimumWh=state.batteryWh;
  while(!state.finished){
   if(state.pendingIncident)resolveIncident(state,forecastIncidentChoice(state,INCIDENTS));
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

export function openSharedScreenRoles(container, data, currentMissionId = null) {
  const existing = container.querySelector('.team-roles-modal-backdrop');
  if (existing) existing.remove();
  const mission = data.missions.find(m => m.id === currentMissionId) || data.missions[0];
  const modal = document.createElement('div');
  modal.className = 'stage-practice-modal-backdrop team-roles-modal-backdrop';
  modal.innerHTML = `
    <div class="stage-practice-modal" role="dialog" aria-modal="true" aria-labelledby="roles-modal-title" style="max-width: 820px;">
      <div class="practice-modal-header">
        <div>
          <h2 id="roles-modal-title">Shared-Screen Team Roles — ${mission.name}</h2>
          <p>Collaborative classroom & team mode on a single screen. Divide these 4 operational responsibilities across your team:</p>
        </div>
        <button type="button" class="practice-modal-close" id="btn-close-roles-modal" aria-label="Close dialog">&times;</button>
      </div>

      <div class="team-roles-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 12px 0;">
        <!-- Role 1: Science Lead -->
        <div class="team-role-card" style="background: rgba(255,255,255,0.04); border: 1px solid #385363; border-top: 3px solid #7fe0f8; border-radius: 6px; padding: 14px;">
          <h3 style="margin: 0 0 6px; color: #7fe0f8; font-size: 0.95rem;">🔬 Science Lead</h3>
          <p style="font-size: 0.8rem; color: #a7b7c4; margin: 0 0 8px;">Responsible for scientific inquiry, payload selection, target encounter windows, and qualifying evidence.</p>
          <ul style="font-size: 0.8rem; color: #e8f0f4; margin: 0; padding-left: 18px; line-height: 1.45;">
            <li><strong>Objective:</strong> Verify payload matches scientific inquiry.</li>
            <li><strong>Encounter:</strong> Coordinate observation window with flight planner.</li>
            <li><strong>Evidence Gate:</strong> Track valid integration minutes and quality flags.</li>
          </ul>
        </div>

        <!-- Role 2: Spacecraft Engineer -->
        <div class="team-role-card" style="background: rgba(255,255,255,0.04); border: 1px solid #385363; border-top: 3px solid #86cfaa; border-radius: 6px; padding: 14px;">
          <h3 style="margin: 0 0 6px; color: #86cfaa; font-size: 0.95rem;">⚙ Spacecraft Engineer</h3>
          <p style="font-size: 0.8rem; color: #a7b7c4; margin: 0 0 8px;">Responsible for power generation, battery Wh margin during eclipse, structural mounting, and mass budget.</p>
          <ul style="font-size: 0.8rem; color: #e8f0f4; margin: 0; padding-left: 18px; line-height: 1.45;">
            <li><strong>Power Reserve:</strong> Solar panel W must exceed payload load W.</li>
            <li><strong>Eclipse Endurance:</strong> Battery Wh must survive darkness without brownout.</li>
            <li><strong>Structural Fit:</strong> Verify flush component mounts (0 mm) and stowed clearance.</li>
          </ul>
        </div>

        <!-- Role 3: Flight Planner -->
        <div class="team-role-card" style="background: rgba(255,255,255,0.04); border: 1px solid #385363; border-top: 3px solid #f1bd74; border-radius: 6px; padding: 14px;">
          <h3 style="margin: 0 0 6px; color: #f1bd74; font-size: 0.95rem;">🚀 Flight Planner</h3>
          <p style="font-size: 0.8rem; color: #a7b7c4; margin: 0 0 8px;">Responsible for orbit selection, target track alignment (RAAN), rocket lift capacity, and propulsion delta-V.</p>
          <ul style="font-size: 0.8rem; color: #e8f0f4; margin: 0; padding-left: 18px; line-height: 1.45;">
            <li><strong>Ground Track:</strong> Align ascending node over target event area.</li>
            <li><strong>Launcher Lift:</strong> Rocket payload capacity must exceed total spacecraft mass.</li>
            <li><strong>Transfer & Capture:</strong> Ensure adequate braking ΔV for orbital capture.</li>
          </ul>
        </div>

        <!-- Role 4: Communications Lead -->
        <div class="team-role-card" style="background: rgba(255,255,255,0.04); border: 1px solid #385363; border-top: 3px solid #d4a5ff; border-radius: 6px; padding: 14px;">
          <h3 style="margin: 0 0 6px; color: #d4a5ff; font-size: 0.95rem;">📡 Communications Lead</h3>
          <p style="font-size: 0.8rem; color: #a7b7c4; margin: 0 0 8px;">Responsible for ground contact passes, downlink scheduling, relay queue policies, and deadline delivery.</p>
          <ul style="font-size: 0.8rem; color: #e8f0f4; margin: 0; padding-left: 18px; line-height: 1.45;">
            <li><strong>Downlink Schedule:</strong> Transmit data during station contacts to avoid recorder overflow.</li>
            <li><strong>Relay Traffic:</strong> Set urgent (expiring) vs batch policy to serve dispatchers.</li>
            <li><strong>Briefing Deadline:</strong> Ensure science products reach Earth before delivery cutoff.</li>
          </ul>
        </div>
      </div>
      <div style="text-align: right; margin-top: 8px;">
        <button type="button" class="btn btn-primary" id="btn-roles-ok">Understood — Continue Flight</button>
      </div>
    </div>
  `;
  container.appendChild(modal);
  modal.querySelector('#btn-close-roles-modal').onclick = () => modal.remove();
  modal.querySelector('#btn-roles-ok').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}
