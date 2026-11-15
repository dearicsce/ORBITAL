import {presetOrbit} from './orbitalGeometry.js';

export const OPERATION_STEP_SEC = 270;
export const OPERATION_TICKS = 120;
export const OPERATION_WINDOW_SEC = OPERATION_TICKS * OPERATION_STEP_SEC;

export function operationsElapsedSec(tick) {
  return tick * OPERATION_STEP_SEC;
}

// T=0 is insertion. Negative times belong to the compressed launch sequence.
// Physical +Z north maps to render +Y, so both positive rotations are right-handed.
export {bodyAngle} from './orbitalGeometry.js';

export function centralBody(orbitId, orbit) {
  return orbit?.body || presetOrbit(orbitId)?.body || 'earth';
}
