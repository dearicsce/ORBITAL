import {evaluate as evaluateKepler} from './kepler/keplerMission.js';
import {cruiseSummary} from './transfer/cruise.js';
import {operationSummary} from './engine/operations.js';
// Shared award rule for reports and persistence. Historical records load separately.
export function canCompleteFlight(missionId, rating, passStars, flight) {
  if (missionId === 'dip') return Boolean(flight?.design?.missionId === 'dip' && flight.phase === 'report' &&
    flight.ascentInsertion && flight.launchResult?.success === true && flight.keplerAttempt?.stage === 'complete' &&
    Number.isFinite(rating?.total) && rating.total >= passStars && rating.total <= 6 &&
    evaluateKepler(flight.keplerAttempt.ground).discriminates);
  const ops = flight?.mission?.transfer?(flight.cruise?cruiseSummary(flight.cruise):null):(flight?.operations?operationSummary(flight.operations):flight?.operationsSummary);
  return Boolean(
    !flight?.experiment && missionId && missionId !== 'tutorial' &&
    Number.isFinite(passStars) && passStars >= 0 &&
    Number.isFinite(rating?.total) && rating.total >= passStars && rating.total <= 6 &&
    flight?.launchResult?.success === true &&
    ops?.missionId === missionId && ops.finished === true &&
    ops.windowCompleted === true && ops.passed === true &&
    Array.isArray(ops.objectives) &&
    ['coverage', 'health'].every(id => ops.objectives.some(o => o.id === id)) &&
    ops.objectives.every(o => o.passed === true && Number.isFinite(o.value) &&
      Number.isFinite(o.target) && o.value + 1e-9 >= o.target)
  );
}
