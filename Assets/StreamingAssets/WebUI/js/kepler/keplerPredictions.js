// ORBITAL - Catch the Next Dip: Scientific Predictions & Ephemerides
// Ported from Catch the Next Dip src/model/predictions.ts

import { ANCHOR, DURATION_HOURS, PERIOD } from "./keplerConfig.js";

/**
 * Evaluates whether hypothesis H predicts a transit dip at time t (BKJD).
 * @param {number} t Time in BKJD [BJD(TDB) - 2454833]
 * @param {'H1' | 'H2'} h Hypothesis ID: 'H1' (P ~ 2.47d) or 'H2' (P ~ 4.94d)
 * @returns {boolean}
 */
export function predictsDip(t, h) {
  const p = PERIOD * (h === "H1" ? 1 : 2);
  const nearest = ANCHOR + Math.round((t - ANCHOR) / p) * p;
  return Math.abs(t - nearest) <= DURATION_HOURS / 48;
}

/**
 * Returns categorical prediction ('dip' or 'flat') at the given center time.
 * @param {number} center Time in BKJD
 * @param {'H1' | 'H2'} h Hypothesis ID
 * @returns {'dip' | 'flat'}
 */
export function predictionAt(center, h) {
  return predictsDip(center, h) ? "dip" : "flat";
}

/**
 * Checks whether an interval [min, max] overlaps any cadence where H1 and H2 disagree.
 * (Fixed ephemerides only; no historical flux enters this calculation).
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export function disagreementOverlap(min, max) {
  const first = Math.floor((min - ANCHOR) / PERIOD) - 1;
  const last = Math.ceil((max - ANCHOR) / PERIOD) + 1;
  for (let k = first; k <= last; k++) {
    if (Math.abs(k % 2) === 1) {
      const c = ANCHOR + k * PERIOD;
      if (max >= c - DURATION_HOURS / 48 && min <= c + DURATION_HOURS / 48) {
        return true;
      }
    }
  }
  return false;
}
