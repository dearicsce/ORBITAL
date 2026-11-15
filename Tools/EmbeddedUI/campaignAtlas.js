/**
 * ORBITAL Campaign Atlas & Celestial Body Hierarchy
 * 
 * Defines celestial bodies, destination mappings, and active map levels.
 * Stellar and galactic navigation levels have been retired from the active campaign.
 * The Sun's parent chain terminates cleanly at home-system (level: 'solar', parent: null).
 */

export const MAP_LEVELS = [
  { id: 'earth', name: 'Earth neighbourhood' },
  { id: 'solar', name: 'Solar System' },
];

export const HISTORICAL_MAP_LEVELS = [
  { id: 'earth', name: 'Earth neighbourhood' },
  { id: 'solar', name: 'Solar System' },
  { id: 'stars', name: 'Nearby stars' },
  { id: 'galaxy', name: 'Milky Way overview' },
];

export const CELESTIAL_BODIES = [
  // Active Solar System Hierarchy
  { id: 'home-system', name: 'Solar System', level: 'solar', parent: null, kind: 'Home star system', zoom: 'solar', note: 'Our planets and smaller bodies orbit the Sun.' },
  { id: 'sun', name: 'Sun', level: 'solar', parent: 'home-system', kind: 'Central star' },
  { id: 'mercury', name: 'Mercury', level: 'solar', parent: 'sun', kind: 'Rocky planet', distanceAU: 0.387 },
  { id: 'venus', name: 'Venus', level: 'solar', parent: 'sun', kind: 'Rocky planet', distanceAU: 0.723 },
  { id: 'earth', name: 'Earth', level: 'solar', parent: 'sun', kind: 'Rocky planet', distanceAU: 1.0, zoom: 'earth' },
  { id: 'mars', name: 'Mars', level: 'solar', parent: 'sun', kind: 'Rocky planet', distanceAU: 1.524 },
  { id: 'ceres', name: 'Ceres', level: 'solar', parent: 'sun', kind: 'Main-belt dwarf planet', distanceAU: 2.77 },
  { id: 'comet', name: 'Comet 67P', level: 'solar', parent: 'sun', kind: 'Short-period comet', note: 'Follows an eccentric orbit around the Sun.' },
  { id: 'jupiter', name: 'Jupiter', level: 'solar', parent: 'sun', kind: 'Gas giant', distanceAU: 5.203, moons: ['io', 'europa', 'ganymede', 'callisto'] },
  { id: 'saturn', name: 'Saturn', level: 'solar', parent: 'sun', kind: 'Ringed gas giant', distanceAU: 9.537 },
  { id: 'uranus', name: 'Uranus', level: 'solar', parent: 'sun', kind: 'Ice giant', distanceAU: 19.19 },
  { id: 'neptune', name: 'Neptune', level: 'solar', parent: 'sun', kind: 'Ice giant', distanceAU: 30.07 },
  { id: 'precursor', name: 'Interstellar precursor region', level: 'solar', parent: 'sun', kind: 'Local interstellar medium', note: 'Beyond the heliopause, still far from other star systems.' },
  { id: 'frontier', name: 'Solar frontier', level: 'solar', parent: 'sun', kind: 'Outer heliosphere', note: 'The heliopause is a boundary in the solar wind.' },
  
  // Jovian Moons
  { id: 'io', name: 'Io', level: 'jupiter', parent: 'jupiter', kind: 'Volcanic moon' },
  { id: 'europa', name: 'Europa', level: 'jupiter', parent: 'jupiter', kind: 'Icy moon' },
  { id: 'ganymede', name: 'Ganymede', level: 'jupiter', parent: 'jupiter', kind: 'Icy moon' },
  { id: 'callisto', name: 'Callisto', level: 'jupiter', parent: 'jupiter', kind: 'Cratered moon' },
  
  // Earth Neighborhood
  { id: 'earth-orbit', name: 'Earth orbit', level: 'earth', parent: 'earth', kind: 'Inclined, polar and geosynchronous orbits' },
  { id: 'moon', name: 'Moon', level: 'earth', parent: 'earth', kind: 'Natural satellite · about 384,400 km', note: 'Orbits Earth. Surface-delivery research would need a descent stage, landing gear and terrain hazard checks.' },
  { id: 'transfer', name: 'Transfer regions', level: 'earth', parent: 'earth', kind: 'Earth–Moon Lagrange points', note: 'L1–L3 lie on the Earth–Moon line. L4 and L5 sit 60° ahead of and behind the Moon in the rotating frame.' },

  // Retired / Historical Celestial Bodies (Preserved for compatibility and historical save lookup)
  { id: 'proxima', name: 'Proxima Centauri', level: 'solar', parent: 'home-system', kind: 'Red dwarf · 4.24 light-years', historical: true, note: 'Retired speculative flyby target.' },
  { id: 'barnard', name: "Barnard's Star", level: 'solar', parent: 'home-system', kind: 'Red dwarf · about 6 light-years', historical: true },
  { id: 'sirius', name: 'Sirius', level: 'solar', parent: 'home-system', kind: 'Binary star · about 8.6 light-years', historical: true },
  { id: 'milky-way', name: 'Milky Way', level: 'solar', parent: null, kind: 'Spiral galaxy', historical: true, note: 'The Solar System lies in the Orion Spur.' },
  { id: 'orion-spur', name: 'Orion Spur', level: 'solar', parent: 'milky-way', kind: 'Local arm segment', historical: true },
];

export const bodyById = id => CELESTIAL_BODIES.find(body => body.id === id);

export function resolveSafeMapLevel(levelId) {
  if (levelId === 'earth') return 'earth';
  return 'solar';
}

export function missionDestination(mission) {
  return mission.destination || (mission.id === 'observatory' ? 'transfer' : mission.chapter === 'frontier' ? 'moon' : 'earth-orbit');
}

export const CORE_MISSIONS = ['m1', 'm2', 'm3'];
export const isCoreMission = mission => mission.core === true || CORE_MISSIONS.includes(mission.id);

export function missionChapter(mission) {
  if (mission.id === 'dip') return 'Earth Operations';
  return mission.programChapter || ({ m1: 'Earth Academy', m2: 'Earth Operations' }[mission.id] ?? (mission.chapter === 'frontier' ? 'Moon' : mission.chapter === 'network' ? 'Earth Operations' : 'Earth Academy'));
}
