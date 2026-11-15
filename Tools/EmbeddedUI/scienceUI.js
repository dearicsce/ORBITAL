import {escapeHtml as escape} from '../ui/html.js';
import {SCENARIOS, OBSERVE_PLANS, SCIENCE_VERSION} from './scienceScenarios.js';
import {ORBIT_PLANS, SAIL_ASSUMPTIONS, hardwareOptions, prepareHardwareTrial, rerunExperiment, robustnessTrials} from './missionExperiment.js';
import {transferChallenges} from './missionLessons.js';
import {sourceCard,sourceMap} from './sourceUI.js';
import {bundleForMission,scenarioFromBundle} from './sourceData.js';
import {missionGuide,bindMissionGuide} from './missionGuide.js';

const labels = {
  access:'No archived source priority was inside the modeled field of regard.',
  unknown:'Source coverage is unknown; no confident science credit was assigned.',
  instrument:'The planned measurement instrument was unavailable.',
  resolution:'The camera exceeded the allowable ground sample spacing.',
  power:'The scheduled acquisition could not be powered.',
  shed:'The requested load exceeded available interval energy.',
  safe:'Safe mode suspended a scheduled acquisition.',
  downlink:'Transmitting displaced a scheduled acquisition.',
  lighting:'The acquisition lacked the required illumination.',
  quality:'The payload efficiency fell below the comparability requirement.',
  contact:'Earth was below the modeled contact mask during scheduled service.',
  recorder:'The recorder filled and discarded newly generated data.',
  late:'A scheduled measurement arrived after the receipt deadline.'
};
const actions = {
  access:'Test a different orbit or observing schedule to reach the archived priorities.',
  unknown:'Choose a validated source subset; missing coverage cannot establish absence.',
  instrument:'Test the listed payload and inspect its mass and power draw.',
  resolution:'Compare a lower orbit. Contact and eclipse timing can change.',
  power:'Test more usable energy or schedule a lower load during eclipse.',
  shed:'Test a larger battery or a shorter duty cycle. Batteries add mass and cost.',
  safe:'Try rescheduling observations around the protective interval.',
  downlink:'Try moving a transmission to another contact. Later receipt may miss the deadline.',
  lighting:'Compare a different window or an orbit with suitable light.',
  quality:'Compare a cooldown with continued operation. Cooldown uses time.',
  contact:'Check the contact schedule against the service windows.',
  recorder:'Compare earlier downlink or a larger recorder. Either uses spacecraft resources.',
  late:'Compare earlier transmission. It can take time away from acquisition.'
};
const minutes = seconds => (seconds / 60).toFixed(1);
const gb = value => (value ?? 0).toFixed(3);
const header = (cells, tag = 'td') => '<tr>' + cells.map(c => '<' + tag + '>' + escape(String(c)) + '</' + tag + '>').join('') + '</tr>';

export function scienceQuestion(id,evidence) {
  return escape(evidence?.scenario?.question??SCENARIOS[id]?.question ?? '');
}

export function scienceBrief(id,identity) {
  const s = scenarioFromBundle(id,SCENARIOS[id],identity?.id);
  if (!s) return '';
  return '<p><strong>' + escape(s.question) + '</strong> ' + escape(s.user + ' needs ' + s.product.toLowerCase() + '.') +
    (s.sourceBundleId?' This plan uses archived context and simulates the follow-up.':
      bundleForMission(id)?' The guided approach uses authored targets. Choose archived NASA context to change the follow-up priorities.':
      ' The scenario uses authored targets and conditions.')+'</p>'+sourceCard(id,identity);
}

export function scheduleBrief(e) {
  if (!e) return '';
  const {scenario:s} = e;
  const windows = s.windows.map(([target, start, end]) => '<li>' + escape(target) + ' · T+' +
    (start * 4.5) + '–' + (end * 4.5) + ' min</li>').join('');
  return '<details><summary>Observation and service schedule</summary><ul>' + windows + '</ul>' +
    (s.deadline ? '<p>Receive by T+' + (s.deadline * 4.5) + ' min.</p>' : '') +
    '<p>Times are measured from deployment. Target opportunities are scripted. The contact and eclipse model uses the flown orbit.</p>'+(e.bundle?'<p>'+escape(s.approximation)+'</p>':'')+'</details>';
}

function traceTable(state) {
  if (!state.history?.length) return '';
  const rows = state.history.map(p => header([p.tick * 4.5, p.mode, p.batteryWh.toFixed(1),
    p.generationW.toFixed(1), p.loadW.toFixed(1), Math.round(p.sunlitFraction * 100), Math.round(p.contactFraction * 100)]));
  return '<details><summary>Power and contact timeline</summary><div class="science-table"><table>' +
    header(['T+ min','Mode','Wh','Generated W','Load W','Sunlit %','Contact %'],'th') + rows.join('') + '</table></div></details>';
}

export function scienceReport(run, summary) {
  const state = run?.operations ?? run?.cruise;
  const e = state?.evidence;
  if (!e || !summary?.science) return '';
  const {scenario:s} = e;
  const missed = summary.objectives.filter(o => !o.passed);
  const productMissing = missed.some(o => o.id.startsWith('product-'));
  const service = s.instrument === 'transponder_s';
  let reason;
  if (productMissing) {
    const order = ['access','unknown','instrument','resolution','power','shed','late','recorder','quality','lighting','safe','contact','downlink'];
    const failedTargets = new Set(missed.filter(o => o.id.startsWith('product-')).map(o => o.name));
    const observed = summary.science.interruptions;
    reason = order.map(key => observed.find(i => i.reason === key && failedTargets.has(i.target))).find(Boolean) ??
      observed.find(i => i.reason === 'shed');
  }
  let finding = summary.windowCompleted ? 'The schedule met all required objectives.' :
    'Operations ended before the full evaluation window.';
  if (missed.length) {
    if (run.cruise && (!state.arrived || state.phase === 'failed')) finding = state.log.at(-1).text;
    else if (!service && summary.storageGb > 1e-9 && summary.deliveredGb < 1e-9)
      finding = 'Samples were recorded. The recorder still held data at cutoff and Earth confirmed zero bytes.';
    else if (reason) finding = (labels[reason.reason]??reason.reason) + ' First recorded at T+' + minutes(reason.timeSec) +
      ' min' + (reason.target ? ' for ' + reason.target : '') + '.';
    else finding = 'The completed timeline fell short of ' + missed.map(o => o.name).join(', ') + '.';
  }
  const hypothesis = reason ? actions[reason.reason] : !service&&summary.storageGb>1e-9&&summary.deliveredGb<1e-9
    ? 'Plan a transmission during a ground pass before the receipt deadline.'
    : service
    ? 'Compare a protected interval with continuous relay service.'
    : 'Compare the observing schedule and check the trade between acquisition time and confirmed delivery.';
  const events = summary.science.interruptions.map(i => '<li>T+' + minutes(i.timeSec) + ' min · ' +
    escape(labels[i.reason] ?? i.reason) + (i.target ? ' ' + escape(i.target) + '.' : '') + ' ' + i.count + ' interval(s).' +
    (i.requestedWh != null ? ' First interval requested ' + i.requestedWh.toFixed(2) + ' Wh with ' +
      i.availableWh.toFixed(2) + ' Wh available.' : '') + '</li>').join('');
  const challenge = transferChallenges[state.missionId]?.[1];
  return '<section class="ops-report-summary mission-evidence" id="mission-evidence"><h2>Mission evidence</h2>' +missionGuide('report',state.missionId)+
    (e.bundle?'<p>'+escape(s.question)+' '+escape(s.approximation)+'</p>'+sourceCard(state.missionId,e.bundle):scienceBrief(state.missionId)+'<p>This run used its authored scenario; no numerical NASA source bundle was used for scoring.</p>') + '<p><strong>' + (summary.passed ? 'Objectives achieved' : 'Objectives missed') +
    '</strong> · ' + escape(finding) + '</p><p>' +
    (service ? (state.relayTraffic?'Service credits unique source messages received through both links before expiry. '+state.relayTraffic.received.length+' received; '+state.relayTraffic.expired.length+' expired.':'Legacy service is credited as powered contact minutes in each check-in.') :
      gb(e.usefulGb) + ' GB useful at Earth · ' + gb(e.sentGb) + ' GB transmitted · ' + gb(summary.deliveredGb) + ' GB confirmed') +
    ' · Lowest reserve ' + e.minimumWh.toFixed(1) + ' Wh.</p>' +
    (s.deadline ? '<p>Receipt cutoff at T+' + (s.deadline * 4.5) + ' min after deployment.</p>' : '') +
    '<p><strong>Next experiment.</strong> ' + escape(hypothesis) + '</p>' +
    (challenge ? '<details><summary>Apply the lesson</summary><p>' + escape(challenge) + '</p></details>' : '') +
    '<details><summary>Observed interruptions</summary><ul>' + (events || '<li>No scheduled interruptions recorded.</li>') + '</ul></details>' +
    (e.observations.length || state.history?.length ?
      '<details id="technical-evidence"><summary>Technical evidence</summary><div></div></details>' : '') + '</section>';
}

function populateTechnicalEvidence(host, state) {
  const details = host.querySelector('#technical-evidence');
  if (!details) return;
  details.addEventListener('toggle', () => {
    const body = details.lastElementChild;
    if (!details.open || body.childElementCount) return;
    const rows = state.evidence.observations.map(o => header([o.id,o.target,minutes(o.acquiredSec),o.measurement,o.quality,
      gb(o.generatedGb),gb(o.storedGb),gb(o.discardedGb),gb(o.sentGb),gb(o.receivedGb),gb(o.usefulGb),
      o.receivedSec == null ? '—' : minutes(o.receivedSec)]));
    body.innerHTML = (rows.length ? '<details><summary>Observation ledger</summary><div class="science-table"><table>' +
      header(['ID','Target','Acquired T+ min','Instrument','Quality','Generated GB','Still stored GB','Discarded GB','Sent GB','Received GB','Useful GB','Last receipt T+ min'],'th') +
      rows.join('') + '</table></div></details>' : '') + traceTable(state);
  });
}

function trialRows(trial) {
  const {summary:s,state} = trial;
  return [
    ['Outcome', s.passed ? 'Achieved' : 'Missed'],
    ['Useful received (GB)', gb(s.science.usefulGb)],
    ['Generated (GB)', gb(s.collectedGb)],
    ['Confirmed raw (GB)', gb(s.deliveredGb)],
    ['Remaining in recorder (GB)', gb(s.storageGb)],
    ['Still in flight (GB)', gb(s.unconfirmedGb)],
    ['Discarded (GB)', gb(s.lostGb)],
    ['Lowest reserve (Wh)', s.science.minimumWh.toFixed(1)],
    ['Loads served (Wh)', s.science.servedWh.toFixed(1)],
    ['Contact opportunities sampled (min)', minutes(s.science.contactSec)],
    ['Modeled time elapsed (min)', s.elapsedMinutes.toFixed(1)],
    ['Mass (kg)', trial.massKg.toFixed(1)], ['Cost ($M)', trial.costM.toFixed(2)],
    ['Propellant remaining (kg)', s.fuelKg.toFixed(2)],
    ...(state.trajectory ? [
      ['Arrival propellant remaining (kg)', state.brakingKg.toFixed(2)],
      ['Assumed operating life (years)', state.hardware.lifetimeYears.toFixed(1)],
      ['Travel time (days)', (state.trajectory.travelSec / 86400).toFixed(2)],
      ['One-way signal time (min)', state.trajectory.lightMinutes.toFixed(2)]
    ] : []),
    ...s.objectives.filter(o => o.id.startsWith('product-')).map(o =>
      [o.name + ' (' + o.unit + ')', o.value.toFixed(2) + ' / ' + o.target.toFixed(2)])
  ];
}

export function bindMissionExperiment(container, run, data) {
  bindMissionGuide(container);
  const host = container.querySelector('#report-compare-actions') || container.querySelector('#mission-evidence');
  if (!host || run?.simulationVersion !== SCIENCE_VERSION || !(run.operations ?? run.cruise)?.evidence) return;
  populateTechnicalEvidence(host, run.operations ?? run.cruise);
  const dialog = document.createElement('dialog');
  dialog.className = 'orbital-learning-dialog mission-experiment-dialog glass';
  dialog.setAttribute('aria-labelledby','experiment-heading');
  const orbit = Boolean(run.operations);
  const stellar = run.mission.destination === 'proxima';

  const manuallyCommanded = run.commands?.some(c => c.type === 'mode' && c.status === 'applied');
  const choices = orbit ? Object.fromEntries(Object.entries(ORBIT_PLANS).filter(([id]) =>
    (id !== 'protect' || run.operations.profile.relay) && (id !== 'auto' || manuallyCommanded))) : OBSERVE_PLANS;
  const current = orbit ? 'recorded' : run.cruise.observationPlan;
  dialog.innerHTML = '<form method="dialog"><button class="btn">Close</button></form><h2 id="experiment-heading">Controlled mission experiment</h2>' +
    '<label>Comparison scope <select id="trial-scope"><option value="deployment">Operations only · hold deployment fixed</option><option value="full-mission">Full mission · rerun numerical ascent and transfer</option></select></label><p>Operations-only trials cannot establish launch feasibility. Full-mission trials use the same launcher with the changed mass. Multiple simultaneous treatments are labeled confounded in exports.</p>' +
    '<p>Keep the seed, source identity and launcher fixed while changing a schedule, assumption or component. The selected scope determines whether deployment is held fixed or ascent is rerun.</p>' +
    '<label>Change one input <select id="trial-input">' +
    Object.entries(choices).filter(([id]) => id !== current).map(([id,name]) => '<option value="' + id + '">' + escape(name) + '</option>').join('') +
    (stellar ? '<option value="speed">Assume 4% of light speed</option><option value="life">Assume 80-year system life</option><option value="receiver">Assume 10% optical receiver throughput</option>' : '') +
    '<optgroup label="Replace one component" id="trial-hardware" hidden></optgroup></select></label><p id="trial-change" aria-live="polite"></p><div id="trial-hardware-preview"></div>' +
    '<label>Prediction (optional) <input id="trial-prediction" type="text" maxlength="240" placeholder="I expect … because …"></label>' +
    '<p><button class="btn btn-primary" id="trial-run">Compare</button> <button class="btn" id="trial-robustness">Run 3 sensitivity cases</button></p>' +
    '<div id="trial-results" aria-live="polite"></div>';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'btn';
  trigger.id = 'open-mission-experiment';
  trigger.textContent = 'Compare a design change';
  host.append(trigger, dialog);
  let hardware;
  trigger.onclick = () => {
    if (!hardware) {
      hardware = hardwareOptions(run.design, data);
      find('hardware').hidden = !hardware.length;
      find('hardware').innerHTML = hardware.map(option => '<option value="hardware/' + escape(option.id) + '">' +
        escape(option.from + ' → ' + option.to + ' (' + option.location + ')') + '</option>').join('');
    }
    dialog.showModal();
  };
  dialog.addEventListener('close', () => trigger.focus());
  const find = name => dialog.querySelector('#trial-' + name);
  const results = find('results');
  const change = () => {
    const selected = find('input');
    const name = selected.selectedOptions[0].textContent;
    const hardwareId = selected.value.startsWith('hardware/') ? selected.value.slice(9) : null;
    find('hardware-preview').replaceChildren();
    find('change').textContent = hardwareId ? 'Changed component: ' + name + '.' : Object.hasOwn(SAIL_ASSUMPTIONS, selected.value)
      ? 'Changed assumption: ' + name + '.'
      : 'Changed schedule: ' + choices[current] + ' → ' + name + '.';
    if (hardwareId) {
      const {evaluation, gateIssues} = prepareHardwareTrial(run, data, hardwareId);
      const preview = document.createElement('p');
      preview.textContent = 'Launch mass ' + run.evalResult.launchMass.toFixed(1) + ' → ' + evaluation.launchMass.toFixed(1) +
        ' kg. Mission cost $' + run.evalResult.totalCost.toFixed(2) + 'M → $' + evaluation.totalCost.toFixed(2) +
        'M. '+(find('scope').value==='full-mission'?'This trial reruns numerical ascent and the selected transfer.':'This trial assumes deployment. Catalogue access and ascent are outside the trial.');
      find('hardware-preview').append(preview);
      if (gateIssues.length) {
        const issues = document.createElement('details');
        issues.innerHTML = '<summary>Design review flags (' + gateIssues.length + ')</summary><ul>' +
          gateIssues.map(issue => '<li>' + escape(issue) + '</li>').join('') + '</ul>';
        find('hardware-preview').append(issues);
      }
    }
    find('results').replaceChildren();
  };
  if(orbit && run.operations.profile.relay) find('input').value = 'protect';
  find('input').onchange = change;
  find('scope').onchange = change;
  change();
  find('run').onclick = () => {
    try {
      const value = find('input').value;
      const scope=find('scope').value;
      const before = rerunExperiment(run, data,{scope});
      if (scope==='deployment'&&run.operationsSummary && JSON.stringify(before.summary) !== JSON.stringify(run.operationsSummary))
        throw Error('The recorded inputs did not reproduce the saved report. This comparison is unavailable.');
      const treatment=value.startsWith('hardware/') ? {hardware:value.slice(9)} : Object.hasOwn(SAIL_ASSUMPTIONS,value)
        ? {assumption:value} : orbit ? {schedule:value} : {plan:value};
      const after = rerunExperiment(run, data,{scope,...treatment});
      const prediction = find('prediction').value.trim();
      const changed = find('change').textContent;
      const a = trialRows(before), b = trialRows(after);
      results.innerHTML = '<p>' + escape(scope+' · '+changed) + '</p>' + (prediction ? '<p>Prediction · ' + escape(prediction) + '</p>' : '') +
        '<div class="science-table"><table>' + header(['Measurement','Recorded inputs rerun','One input changed'],'th') +
        a.map(([label,value],i) => header([label,value,b[i][1]])).join('') + '</table></div><button class="btn" id="export-comparison">Export comparison</button>';
      results.querySelector('button').onclick = () => downloadComparison({changed,prediction,before,after});
    } catch(error) {results.textContent = error.message;}
  };
  find('robustness').onclick = () => {
    try {
      const trials = robustnessTrials(run, data);
      results.innerHTML = '<p>Three reproducible sensitivity cases with an authored ' + (orbit ? '27-minute station outage' : 'weaker receiver') +
        '. Each case reruns resource and observation decisions.</p><div class="science-table"><table>' +
        header(['Seed',orbit ? 'Outage starts (min)' : 'Link multiplier','Outcome','Useful GB','Minimum Wh'],'th') +
        trials.map(t => header([t.input.perturbation.seed,orbit ? t.input.perturbation.outageTick * 4.5 : t.input.perturbation.rateFactor.toFixed(2),
          t.summary.passed ? 'Achieved' : 'Missed',gb(t.summary.science.usefulGb),t.summary.science.minimumWh.toFixed(1)])).join('') +
        '</table></div><button class="btn" id="export-sensitivity">Export sensitivity cases</button>';
      results.querySelector('button').onclick = () => downloadComparison({trials});
    } catch(error) {results.textContent = error.message;}
  };
}

function downloadComparison(record) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'orbital-mission-experiment.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url),60000);
}
