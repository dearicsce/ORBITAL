
export const ADDED_LAUNCHERS = [
  {
    id:'sprint',name:'Sprint',unlock:'start',
    description:'A carbon-shell three-engine launcher. Compact fairing, lower launch cost. Fictional educational performance.',
    cost:10,reliability:.88,capacity:{leo:270,gto:0,tli:0},
    fairingRadiusM:1.35,fairingHeightM:3.6,missions:['kestrel'],
  },
  {
    id:'asterion',name:'Asterion',unlock:'after_m1',
    description:'A twin-booster stack with an expanded payload shroud. Fictional educational performance.',
    cost:62,reliability:.94,capacity:{leo:1900,gto:460,tli:0},
    fairingRadiusM:2.5,fairingHeightM:6.1,missions:['condor'],
  },
  {
    id:'leviathan',name:'Leviathan',unlock:'after_m2',
    description:'A nine-engine heavy core with four boosters and a broad payload shroud. Fictional educational performance.',
    cost:212,reliability:.95,capacity:{leo:12600,gto:7900,tli:3900},
    fairingRadiusM:3.3,fairingHeightM:8,departureCapability:14400,missions:['roc'],
  },
  {
    id:'skylark', name:'Skylark', unlock:'start',
    description:'A low-cost two-stage launcher for compact Earth-orbit spacecraft.',
    cost:9, reliability:.87, capacity:{leo:225,gto:0,tli:0},
    fairingRadiusM:1.25, fairingHeightM:3.1,
    missions:['kestrel'],
  },
  {
    id:'meridian', name:'Meridian', unlock:'after_m1',
    description:'A booster-free launcher with a wider fairing for bulky Earth-orbit spacecraft.',
    cost:55, reliability:.96, capacity:{leo:2100,gto:490,tli:0},
    fairingRadiusM:2.25, fairingHeightM:5.6,
    missions:['condor'],
  },
  {
    id:'vanguard', name:'Vanguard', unlock:'after_m2',
    description:'A twin-booster launcher for heavier Earth-orbit and lunar departure stacks.',
    cost:138, reliability:.96, capacity:{leo:7200,gto:3400,tli:1650},
    fairingRadiusM:2.7, fairingHeightM:6.8, departureCapability:13600,
    missions:['albatross'],
  },
];

export const ADDED_ASCENT_PRESETS = {
  sprint: {core:[2100,21000,385000,315],upper:[450,6200,48000,370],fairing:130,area:3,boosters:0},
  asterion: {core:[4400,53000,920000,327],upper:[780,11900,85000,438],fairing:280,area:6,boosters:2},
  leviathan: {core:[19000,232000,4340000,338],upper:[2850,57500,330000,450],fairing:850,area:14,boosters:4},
  skylark: {core:[1700,17200,322000,318],upper:[380,5100,42300,378],fairing:110,area:2.45,boosters:0},
  meridian: {core:[5200,61800,1320000,347],upper:[910,16200,155000,451],fairing:385,area:6.1,boosters:0},
  vanguard: {core:[14700,174000,3220000,353],upper:[1500,40300,299000,464],fairing:620,area:10.8,boosters:2},
};

export function addLauncherPresets(data) {
  // These are original ORBITAL models with educational performance presets.
  // Stable IDs are retained for designs, unlocks and historical flight records.
  const names = {kestrel:'Kestrel',condor:'Condor',albatross:'Albatross',roc:'Roc'};
  for (const launcher of data.launchers) {
    if (names[launcher.id]) {
      launcher.name = names[launcher.id];
      launcher.description = 'Original ORBITAL launch vehicle · fictional educational performance.';
    }
  }
  for (const {missions, ...launcher} of ADDED_LAUNCHERS) {
    if (!data.launchers.some(entry=>entry.id===launcher.id)) data.launchers.push(launcher);
    for (const mission of data.missions) {
      if (mission.id!=='tutorial' && mission.launchers.some(id=>missions.includes(id)) &&
          !mission.launchers.includes(launcher.id)) mission.launchers.push(launcher.id);
    }
  }
  return data;
}
