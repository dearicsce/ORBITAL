import {mountPanel} from '../presentation/mountPanel.js';
import {scienceObjectives} from './scienceEvidence.js';
import {buildTimeline} from '../kepler/keplerInvestigation.js';
import {BATTERIES, CASES} from '../kepler/keplerConfig.js';

const fixed = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : '—';
const gb = value => fixed(value, 3) + ' GB';
const metric = (label, value) => ({label, value});

export function keplerEvidence(attempt) {
  const {plan, design, stage, queue, ground, stored} = attempt;
  const {cadences} = buildTimeline(attempt, plan, plan.caseId);
  const acquired = new Set(stored.map(row => row.id));
  return {
    metrics: [
      metric('Usable battery', fixed(attempt.energy) + ' / ' + BATTERIES[design.battery].wh + ' Wh'),
      metric('Raw cadences onboard', stored.length),
      metric(stage === 'complete' ? 'Packets held onboard' : 'Packets queued', queue.length),
      metric('Earth receipts', ground.length + ' / ' + CASES[plan.caseId].capacity + ' packets'),
    ],
    rows: cadences.filter(cadence => cadence.planned.status === 'planned').map(cadence => {
      const {id, time, recorded, received} = cadence;
      const status = received.status === 'received_earth' ? 'passed' :
        received.status === 'held_onboard' && stage === 'complete' ? 'pending' : undefined;
      const onboard = acquired.has(id) ? 'Stored cadence' :
        received.status === 'received_earth' ? 'Transmitted' :
        received.status === 'held_onboard' ? 'Queued onboard' :
        recorded.status === 'excluded_quality' ? 'Quality flag ' + recorded.quality :
        stage === 'complete' && !attempt.failed ? 'Omitted by return policy' : 'Awaiting acquisition or preparation';
      return {
        id, label: 'Cadence ' + id, planned: fixed(time, 6) + ' BKJD',
        recorded: onboard,
        received: received.flux == null ? '—' : fixed(received.flux, 6) + ' normalized flux',
        status,
      };
    }),
    notes: ['NASA Kepler Q1 · KIC 11446443. Flux is revealed when a packet reaches Earth.'],
  };
}

function relayRows(state, targets) {
  const {evidence, relayTraffic: queue} = state;
  const scored = scienceObjectives(evidence);
  return targets.map((target, index) => {
    const objective = scored[index];
    const count = key => queue[key].filter(message => message.target === target.label).length;
    const service = fixed(objective.value) + ' / ' + fixed(objective.target) + ' min served';
    return {
      id: objective.id, label: target.label, planned: target.timing,
      recorded: queue ? count('onboard') + ' onboard · ' + count('expired') + ' expired' : service,
      received: queue ? count('received') + ' messages · ' + service : service,
      status: objective.passed ? 'passed' : state.finished ? 'failed' : 'pending',
    };
  });
}

export function campaignEvidence(state) {
  const evidence = state?.evidence;
  if (!evidence) return { rows: [], metrics: [] };
  const scenario = evidence.scenario;
  const transfer = Boolean(state.trajectory);
  const relay = Boolean(state.profile?.relay ?? state.hardware?.relay);
  const targets = transfer
    ? scenario.targets.map(label => ({label, timing: 'Encounter window'}))
    : scenario.windows.map(([label, start, end]) => ({label, timing: (start * 4.5) + '–' + (end * 4.5) + ' min'}));
  const queue = state.relayTraffic;
  const metrics = relay && queue ? [
    metric('Source contact', Math.round(queue.sourceVisibleFraction * 100) + '%'),
    metric('Earth contact', Math.round(queue.earthVisibleFraction * 100) + '%'),
    metric('Earth receipts', queue.received.length + ' messages'),
  ] : relay ? [
    metric('Earth contact sampled', fixed(evidence.contactSec / 60) + ' min'),
    metric('Powered service', fixed(state.serviceMinutes) + ' min'),
  ] : [
    metric('Recorded onboard', gb(state.storageGb)),
    ...(transfer ? [metric('In transit', gb(state.inFlight.reduce((total, packet) => total + packet.amount, 0)))] : []),
    metric('Earth receipts', gb(state.deliveredGb)),
    metric('Useful receipt', gb(evidence.usefulGb)),
  ];
  const objectives = scienceObjectives(evidence);
  const rows = relay ? relayRows(state, targets) : targets.map((target, index) => {
    const samples = evidence.observations.filter(sample => sample.target === target.label);
    const sum = key => samples.reduce((total, sample) => total + sample[key], 0);
    const objective = objectives[index];
    return {
      id: objective.id, label: target.label, planned: target.timing,
      recorded: samples.length ? gb(sum('generatedGb')) + ' acquired · ' + gb(sum('storedGb')) + ' onboard' : '—',
      received: gb(sum('receivedGb')) + ' · ' + fixed(objective.value) + ' / ' + fixed(objective.target) + ' useful min',
      status: objective.passed ? 'passed' : state.finished ? 'failed' : 'pending',
    };
  });
  const notes = scenario.deadline ? ['Receipt cutoff · T+' + scenario.deadline * 4.5 + ' min after deployment.'] : [];
  return {metrics, rows, notes};
}

export function mountEvidenceTimeline(host, readState) {
  const details = document.createElement('details');
  details.className = 'campaign-live-evidence';
  const summary = document.createElement('summary');
  summary.textContent = 'Evidence timeline and Earth receipts';
  const content = document.createElement('div');
  details.append(summary, content);
  host.append(details);
  let panel;
  let revision = '';
  function refresh() {
    if (!details.open) return;
    const state = readState();
    const current = [state.tick, state.elapsedSec, state.finished, state.pending, state.evidence.observations.length].join('|');
    if (panel && revision === current) return;
    revision = current;
    const snapshot = {...campaignEvidence(state), name:'Mission evidence'};
    if (panel) panel.update(snapshot);
    else panel = mountPanel(content, 'evidence', snapshot);
  }
  details.addEventListener('toggle', refresh);
  return {
    refresh,
    destroy() {
      details.removeEventListener('toggle', refresh);
      panel?.destroy();
      details.remove();
    },
  };
}
