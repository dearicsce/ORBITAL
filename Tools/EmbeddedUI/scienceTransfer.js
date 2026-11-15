import {acquire, note} from './scienceEvidence.js';
import {OBSERVE_PLANS} from './scienceScenarios.js';

export function selectEncounterPlan(state, plan) {
  if (!state.evidence || !Object.hasOwn(OBSERVE_PLANS, plan) || state.finished ||
      !['departure','cruise','encounter'].includes(state.phase)) return false;
  state.observationPlan = plan;
  return true;
}

export function encounterAllocation(scenario, plan, shortened=false) {
  const primary = Math.min(.70, scenario.primaryShare + (plan === 'priority' ? .14 : 0));
  const duration = scenario.hours * 3600 * (shortened ? .5 : 1);
  return scenario.targets.map((target, index) => ({
    target, seconds: duration * (index === 0 ? primary : 1 - primary),
  }));
}

export function collectEncounter(state, powerInterval) {
  const {evidence: e, hardware: h, trajectory: t} = state;
  const shortened = state.physical?.arrivalKind === 'flyby' && state.arrivalType === 'capture';
  const allocation = encounterAllocation(e.scenario, state.observationPlan, shortened);
  if(state.missionId==='mars-scout')state.encounterAllocation=allocation;
  const total = allocation.reduce((sum, entry) => sum + entry.seconds, 0);
  let poweredAny = false;
  for (const {target, seconds} of allocation) {
    const powered = powerInterval(state, seconds, t.target.au || 1, h.hotelW + h.payloadW);
    const integration = state.systems ? state.usefulIntervalSec : powered ? seconds : 0;
    state.elapsedSec += seconds;
    if (integration<=0 || !e.instrument) {
      note(e, powered ? 'instrument' : 'power', state.elapsedSec, {target, batteryWh: state.batteryWh});
      continue;
    }
    poweredAny = true;
    const rawGb = h.dataGbDay * integration / 86400;
    const generatedGb = t.speculative ? Math.min(rawGb, state.deliveredTarget * 1.5 * seconds / total) : rawGb;
    const storedGb = Math.min(generatedGb, Math.max(0, h.recorderGb - state.storageGb));
    acquire(e, target, state.elapsedSec, integration, generatedGb, storedGb, (integration / 60).toFixed(1) + ' min integration');
    state.collectedGb += generatedGb;
    state.storageGb += storedGb;
    state.lostGb += generatedGb - storedGb;
    if (generatedGb - storedGb > 1e-9) note(e, 'recorder', state.elapsedSec, {target});
  }
  return poweredAny;
}
