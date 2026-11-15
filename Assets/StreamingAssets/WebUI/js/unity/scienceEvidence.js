import {SCENARIOS, SCIENCE_VERSION} from './scienceScenarios.js';
import {sourceBundle,bundleIdentity,validateBundleIdentity,scenarioFromBundle} from './sourceData.js';

const EPS = 1e-9;

export function createEvidence(missionId, instruments, batteryWh, enabled, bundleId) {
  const scenario = enabled && scenarioFromBundle(missionId,SCENARIOS[missionId],bundleId);
  if (!scenario) return null;
  const instrument = instruments.find(p => p.id === scenario.instrument);
  return {
    version: SCIENCE_VERSION, scenario, ...(bundleId?{bundle:bundleIdentity(sourceBundle(bundleId).bundle)}:{}), instrument: instrument?.id ?? null,
    measurement: instrument?.name ?? scenario.instrument,
    observations: [], interruptions: {}, minimumWh: batteryWh,
    contactSec: 0, unservedWh: 0, spilledWh: 0, servedWh: 0, serviceSec: {}, sentGb: 0, usefulGb: 0, deliveredSeconds: {},
    cursor: 0
  };
}

export function note(e, reason, timeSec, context = {}) {
  if (!e) return;
  const key = context.target ? reason + '/' + context.target : reason;
  const entry = e.interruptions[key] ??= {reason, timeSec, count: 0, ...context};
  entry.count++;
}

export function acquire(e, target, acquiredSec, effectiveSec, generatedGb, storedGb, quality) {
  if (!e || generatedGb <= EPS) return;
  e.observations.push({
    id: e.observations.length + 1, target, acquiredSec, instrument: e.instrument,
    measurement: e.measurement, quality, effectiveSec, generatedGb, storedGb,
    discardedGb: generatedGb - storedGb, sentGb: 0, receivedGb: 0, usefulGb: 0
  });
}

// Retire recorder bytes once at transmission. Receipt references these exact
// fragments so late delivery or reload cannot credit a sample twice.
export function send(e, amount) {
  if (!e || amount <= EPS) return [];
  const fragments = [];
  while (amount > EPS && e.cursor < e.observations.length) {
    const sample = e.observations[e.cursor];
    const size = Math.min(sample.storedGb, amount);
    if (size > 0) {
      const offset = sample.sentGb;
      sample.storedGb -= size;
      sample.sentGb += size;
      e.sentGb += size;
      amount -= size;
      fragments.push({id: sample.id, size, offset});
    }
    if (sample.storedGb > EPS) break;
    e.cursor++;
  }
  return fragments;
}

export function receive(e, fragments, receivedSec, deadlineSec) {
  if (!e) return;
  for (const {id, size, offset} of fragments ?? []) {
    const sample = e.observations[id - 1];
    if (Math.abs(offset - sample.receivedGb) > EPS) continue;
    const fresh = Math.min(size, sample.sentGb - sample.receivedGb);
    if (fresh <= EPS) continue;
    sample.receivedGb += fresh;
    sample.receivedSec = receivedSec;
    if (!sample.effectiveSec) continue;
    if (receivedSec <= deadlineSec + EPS) {
      sample.usefulGb += fresh;
      e.usefulGb += fresh;
      // An authored inspection-priority decay, not an observed fire evolution
      // or a probability that an archived detection was a fire.
      const latencyWeight=e.bundle?.id.startsWith('rhodes-')?1/(1+Math.max(0,receivedSec-sample.acquiredSec)/7200):1;
      sample.receiptPriorityWeight=latencyWeight;
      e.deliveredSeconds[sample.target] = (e.deliveredSeconds[sample.target] ?? 0) +
        sample.effectiveSec * fresh / sample.generatedGb*latencyWeight;
    } else {
      note(e, 'late', receivedSec, {target: sample.target, deadlineSec});
    }
  }
}

export function discard(e) {
  if (!e) return;
  for (const sample of e.observations) {
    sample.discardedGb += sample.storedGb;
    sample.storedGb = 0;
  }
  e.cursor = e.observations.length;
}

export function scienceObjectives(e) {
  if (!e) return [];
  const {scenario} = e;
  const relay = scenario.instrument === 'transponder_s';
  const targets = scenario.targets ?? scenario.windows.map(([label]) => label);
  const minimum = scenario.targets ? scenario.hours * 3600 * .28 : scenario.minimum * 60;
  const sourceUnknown=e.bundle&&!sourceBundle(e.bundle.id).bundle.validityMask.some(Boolean);
  return targets.map((name, index) => {
    const value = (relay ? e.serviceSec[name] : e.deliveredSeconds[name]) ?? 0;
    return {id: 'product-' + index, name:sourceUnknown?name+' (source coverage unknown)':name, value: value / 60, target: minimum / 60,
      unit: 'min', ...(sourceUnknown?{status:'unknown'}:{}),passed: !sourceUnknown&&value + EPS >= minimum};
  });
}

export function scienceCompletion(e) {
  const products = scienceObjectives(e);
  return products.reduce((sum, p) => sum + Math.min(1, p.value / p.target), 0) / products.length;
}

export function evidenceSummary(e) {
  if (!e) return {};
  return {science: {version: e.version, question: e.scenario.question, product: e.scenario.product,
    user: e.scenario.user, ...(e.bundle?{bundle:e.bundle}:{}), minimumWh: e.minimumWh, contactSec: e.contactSec,
    sentGb: e.sentGb, usefulGb: e.usefulGb, unservedWh:e.unservedWh, spilledWh:e.spilledWh, servedWh:e.servedWh,
    interruptions: Object.values(e.interruptions).sort((a, b) => a.timeSec - b.timeSec)}};
}

export function validateEvidence(state, missionId, scoringVersion) {
  if (!state) return;
  const e = state.evidence;
  if (!e) {
    if (scoringVersion === SCIENCE_VERSION && SCENARIOS[missionId]) throw Error('Missing mission evidence');
    return;
  }
  if(e.bundle)validateBundleIdentity(e.bundle);
  if(e.sourceEvidenceModel!==undefined){
    if(e.sourceEvidenceModel!=='unique-target-1'||!['broad','priority'].includes(e.sourcePolicy)||!e.targetSeconds||Object.values(e.targetSeconds).some(x=>!Number.isFinite(x)||x<0||x>600+1e-8))throw Error('Invalid unique-source evidence model');
    const ids=new Set(validateBundleIdentity(e.bundle).bundle.targets.map(t=>t.id));if(Object.keys(e.targetSeconds).some(id=>!ids.has(id)))throw Error('Unknown source integration target');
  }
  if (e.version !== SCIENCE_VERSION || scoringVersion !== SCIENCE_VERSION || !SCENARIOS[missionId] ||
      JSON.stringify(e.scenario) !== JSON.stringify(scenarioFromBundle(missionId,SCENARIOS[missionId],e.bundle?.id)) || !Array.isArray(e.observations) ||
      e.observations.length > 120 || !Number.isInteger(e.cursor) || e.cursor < 0 || e.cursor > e.observations.length)
    throw Error('Invalid mission evidence envelope');
  const totals = {generatedGb:0,storedGb:0,discardedGb:0,sentGb:0,receivedGb:0,usefulGb:0};
  for (const [index, o] of e.observations.entries()) {
    if (o.id !== index + 1 || typeof o.target !== 'string' ||
        ![o.acquiredSec,o.effectiveSec].every(v => Number.isFinite(v) && v >= 0))
      throw Error('Invalid observation identity');
    for (const key of Object.keys(totals)) {
      if (!Number.isFinite(o[key]) || o[key] < -EPS) throw Error('Invalid observation quantity');
      totals[key] += o[key];
    }
    if (Math.abs(o.generatedGb-o.storedGb-o.discardedGb-o.sentGb)>1e-7 ||
        o.usefulGb>o.receivedGb+EPS || o.receivedGb>o.sentGb+EPS)
      throw Error('Observation accounting mismatch');
  }
  if ([[totals.generatedGb,state.collectedGb],[totals.storedGb,state.storageGb],
       [totals.discardedGb,state.lostGb],[totals.sentGb,e.sentGb],
       [totals.receivedGb,state.deliveredGb],[totals.usefulGb,e.usefulGb]]
       .some(([a,b]) => !Number.isFinite(b) || Math.abs(a-b)>1e-7))
    throw Error('Flight and observation totals disagree');
}
