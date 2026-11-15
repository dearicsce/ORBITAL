// ORBITAL - Catch the Next Dip: Historical Kepler Q1 Data Source
// Ported from Catch the Next Dip src/model/source.ts

import asset from "../data/keplerDataAsset.js";

export const source = asset;
export const MEDIAN = asset.transforms.normalizationMedian;
export const rows = asset.rows;

export const metadata = rows.map(({ id, time, flux, quality }) => ({
  id,
  time,
  quality,
  finitePair: time !== null && flux !== null,
}));

/**
 * Returns archived finite quality-zero rows within 0.15 BKJD of the given center.
 * Used for the authorized teaching examples / archive witnesses.
 * @param {number} center Time in BKJD
 * @returns {Array}
 */
export function archivedNeighborhood(center) {
  return rows.filter(
    (r) =>
      r.time !== null &&
      Math.abs(r.time - center) < 0.15 &&
      r.flux !== null &&
      r.quality === 0
  );
}

/**
 * Validates that a row has finite time and flux, and quality flag is 0.
 * @param {object} r
 * @returns {boolean}
 */
export function cleanRow(r) {
  return r.time !== null && r.flux !== null && r.quality === 0;
}
