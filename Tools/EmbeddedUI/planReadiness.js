import {escapeHtml as escape} from '../ui/html.js';

const fixes = {
  launch_mass:['mass','Reduce the carried mass or choose a launcher that can lift this stack.','rockets'],
  budget:['cost','Choose a less expensive launcher or remove expensive nonessential equipment.','workshop'],
  power:['solar','Install larger or additional solar wings.','workshop'],
  eclipse:['reserve','Install a higher-capacity battery or reduce the spacecraft draw.','workshop'],
  slots:['slots','Remove an extra instrument or choose a bus with enough payload slots.','workshop'],
  computer:['processing','Install a computer that can process the payload’s daily data rate.','workshop'],
  pointing:['pointing','Fit attitude control that meets the payload’s pointing requirement.','workshop'],
  radio_pointing:['pointing','Upgrade attitude control to the radio’s required precision.','workshop'],
  fuel:['trim','Fit a larger propellant pack or an additional compatible pack.','workshop'],
  comms:['radio','Install a radio suitable for this destination.','workshop'],
  reach:['mass','Select a launcher that reaches the selected orbit.','rockets'],
  lifetime:['lifetime','Increase the spacecraft’s propellant reserve.','workshop'],
  required_payload:['payload','Install the instrument named in the mission briefing.','workshop'],
  fairing:['mass','Choose a wider or taller fairing, or reduce the spacecraft’s stowed size.','rockets'],
  'mission-orbit':['','Select the orbit assigned to this mission.','orbit'],
  'launcher-blueprint':['','Choose a launcher or load a vehicle in the Rocket Workshop.','custom'],
  'flight-plan':['','Confirm the plan, then continue to readiness.',''],
  'transfer-plan':['','Restore this mission’s flight plan and departure orbit.','orbit'],
  'transfer-module':['','Choose an unlocked cruise module suited to this destination.','plan-power'],
  'transfer-lifetime':['lifetime','Choose a longer-life cruise module or upgrade the onboard computer.','plan-power'],
  'transfer-radiation':['processing','Install a radiation-hardened computer.','workshop'],
  'transfer-science-power':['reserve','Increase usable battery reserve or solar generation for the encounter.','workshop'],
  'transfer-cruise-power':['farPower','Choose an available cruise power module or fit larger solar wings.','plan-power'],
  'transfer-radio':['radio','Install a higher-gain deep-space radio.','workshop'],
  'transfer-recorder':['processing','Choose a larger recorder and check that the required payload produces enough data.','workshop'],
  'transfer-correction':['trim','Fit more spacecraft propellant for the mid-course burn.','workshop'],
  'transfer-arrival':['arrival','Select a braking stage with enough delta-v.','plan-arrival'],
  'transfer-flyby':['arrival','Select the flyby configuration under Arrival hardware.','plan-arrival'],
  'departure-energy':['stackDv','Open Rocket Workshop, load the reference vehicle, and check the available delta-v against the requirement.','custom'],
  'departure-mass':['mass','Choose a launcher with enough departure capacity, or reduce the loaded mass.','custom']
};
const actions = {
  rockets:'Change launcher', custom:'Open Rocket Workshop', workshop:'Open Satellite Workshop',
  orbit:'Choose operating orbit', 'plan-power':'Change cruise module', 'plan-arrival':'Change arrival hardware'
};

function presentation(check) {
  const id = check.code || check.id;
  if (fixes[id]) return fixes[id];
  if (id.startsWith('placement-')) return ['', 'Open the workshop and correct the placement named above.', 'workshop'];
  if (id.startsWith('rocket-')) {
    const metric = check.message.includes('delta-v') ? 'stackDv' : '';
    return [metric, 'Open Rocket Workshop and resolve this item in Engineering review.', 'custom'];
  }
  return ['', 'Review the selected hardware and mission configuration.', 'workshop'];
}

export function renderPlanReadiness({status,telemetry,rows,failed,onFix}) {
  const issues = failed.map(check=>({check,fix:presentation(check)}));
  status.classList.toggle('is-blocked',issues.length>0);
  status.innerHTML=issues.length?'<h3>'+issues.length+' '+(issues.length===1?'check needs':'checks need')+' attention</h3><ul>'+
    issues.map(({check,fix:[,recommendation,action]})=>`<li class="plan-issue"><div><strong>${escape(check.message)}</strong>
      <p><b>Recommended:</b> ${escape(recommendation)}</p></div>${action?`<button type="button" class="btn" data-plan-fix="${action}">${actions[action]}</button>`:''}</li>`).join('')+'</ul>':
    '<h3>Flight readiness</h3><p class="text-green">All checks passed.</p>';
  status.querySelectorAll('[data-plan-fix]').forEach(button=>button.onclick=()=>onFix(button.dataset.planFix));
  telemetry.innerHTML='<h3>Engineering and trajectory</h3><dl>'+
    rows.map(([key,name,value])=>{
      const failures=key?issues.filter(({fix})=>fix[0]===key):[];
      const limits=[...new Set(failures.flatMap(({check})=>check.limitLabel?[check.limitLabel]:[]))];
      const state=failures.length?' class="plan-metric-failed"':'';
      return `<dt${state}>${escape(name)}</dt><dd${state}>${escape(value)}${limits.map(limit=>`<small class="plan-metric-limit">${escape(limit)}</small>`).join('')}</dd>`;
    }).join('')+'</dl>';
}
