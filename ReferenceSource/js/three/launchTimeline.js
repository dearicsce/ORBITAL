// Presentation timing only. Launch success is supplied by the existing rules engine.
export const ASCENT_SECONDS = 18;
export const STAGING = {boosters:.43, core:.62, fairing:.78};
export const LIFTOFF_SECONDS = 3;
export const PAD_DECK_Y = 1.35;
const clamp = n => Math.max(0, Math.min(1, n));
export function sampleAscent(seconds, { success = true, failureAt = 10 } = {}) {
  const failed = !success && seconds >= failureAt;
  const flight = clamp(((failed ? failureAt : seconds) - LIFTOFF_SECONDS) / (ASCENT_SECONDS - LIFTOFF_SECONDS));
  const height = 100 * flight * flight * (3 - 2 * flight);
  const turn = clamp((flight - .18) / .82);
  const downrange = 70 * turn ** 3;
  const riseRate = 600 * flight * (1 - flight);
  const travelRate = 210 * turn ** 2 / .82;
  const pitch = Math.atan2(travelRate, riseRate);
  return {
    flight, height, pitch, downrange,
    altitudeKm: height,
    ignition: seconds >= 2 && !failed,
    failed, finishedFailure: failed && seconds >= failureAt + 2.5,
    reachedSpace: success && seconds >= ASCENT_SECONDS,
    phase: failed ? 'Launch failure · Vehicle lost during ascent'
      : seconds < 3 ? `T−0${Math.max(1, Math.ceil(3 - seconds))}s · ${seconds >= 2 ? 'Main engine ignition' : 'Launch sequence'}`
      : flight < .15 ? 'Liftoff · Clearing the launch platform'
      : flight < .4 ? 'Atmospheric climb · Building downrange speed'
      : flight < .75 ? 'Gravity turn · Climbing downrange'
      : 'Upper atmosphere · Approaching space'
  };
}
