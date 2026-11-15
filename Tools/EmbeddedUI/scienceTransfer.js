import {acquire, note} from './scienceEvidence.js';
import {OBSERVE_PLANS} from './scienceScenarios.js';

export function selectEncounterPlan(state, plan) {
  if (!state.evidence || !Object.hasOwn(OBSERVE_PLANS, plan) || state.finished ||
      !['departure','cruise','encounter'].includes(state.phase)) return false;
  state.observationPlan = plan;
  return true;
}

export function collectEncounter(state, powerInterval) {
  const {evidence: e, hardware: h, trajectory: t} = state;
  const {scenario: s} = e;
  const share = Math.min(.70, s.primaryShare + (state.observationPlan === 'priority' ? .14 : 0));
  const fractions = [share, 1 - share];
  let poweredAny = false;
  for (const [index, target] of s.targets.entries()) {
    // Failed capture can retain a finite flyby, with half the scheduled time.
    const seconds = s.hours * 3600 * fractions[index]*(state.physical?.arrivalKind==='flyby'&&state.arrivalType==='capture'?.5:1);
    const powered = powerInterval(state, seconds, t.target.au || 1, h.hotelW + h.payloadW);
    state.elapsedSec += seconds;
    if (!powered || !e.instrument) {
      note(e, powered ? 'instrument' : 'power', state.elapsedSec, {target, batteryWh: state.batteryWh});
      continue;
    }
    poweredAny = true;
    const rawGb = h.dataGbDay * seconds / 86400;
    const generatedGb = t.speculative ? Math.min(rawGb, state.deliveredTarget * 1.5 * fractions[index]) : rawGb;
    const storedGb = Math.min(generatedGb, Math.max(0, h.recorderGb - state.storageGb));
    acquire(e, target, state.elapsedSec, seconds, generatedGb, storedGb, (seconds / 60).toFixed(1) + ' min integration');
    state.collectedGb += generatedGb;
    state.storageGb += storedGb;
    state.lostGb += generatedGb - storedGb;
    if (generatedGb - storedGb > 1e-9) note(e, 'recorder', state.elapsedSec, {target});
  }
  return poweredAny;
}
