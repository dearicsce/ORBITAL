import {presetOrbit} from '../engine/orbitalGeometry.js';
import {TRANSFER_TARGETS} from '../transfer/catalogue.js';

export const ARRIVAL_LABELS = {
  flyby: 'Flyby', capture: 'Orbital capture', rendezvous: 'Rendezvous', crossing: 'Boundary crossing',
};

export function missionOrbitAllowed(mission, orbitId) {
  if (mission.transfer) return orbitId === 'leo';
  if (mission.id === 'dip') return orbitId === 'leo' || orbitId === 'sso';
  return Number(mission.orbitFit?.[orbitId]) > 0;
}

export function operatingLocation(orbitId) {
  if (orbitId === 'lagrange') return 'Earth–Moon Lagrange region';
  if (orbitId === 'llo') return 'Low lunar orbit';
  if (orbitId === 'geo') return 'Geostationary Earth orbit';
  return 'Low Earth orbit';
}

export function orbitLocationIssue(mission, design, orbits) {
  if (!mission) return null;
  if (!missionOrbitAllowed(mission, design.orbitId)) {
    if (mission.transfer) return 'This transfer must depart from its assigned low Earth parking orbit.';
    const compatible = orbits.filter(orbit => missionOrbitAllowed(mission, orbit.id)).map(orbit => orbit.name);
    return compatible.length ? 'Choose an operating location supported by this mission: ' + compatible.join(' or ') + '.' : null;
  }
  if (design.orbitElements && design.orbitElements.body !== presetOrbit(design.orbitId)?.body) {
    return 'The saved orbit is in the wrong reference frame. Reselect the mission orbit to reset it.';
  }
  return null;
}

export function transferDestination(mission) {
  const name = TRANSFER_TARGETS[mission.destination].name;
  const arrival = ARRIVAL_LABELS[mission.transfer.type];
  return {name, arrival};
}
