export const MAP_LEVELS = [
 {id:'earth',name:'Earth neighbourhood'},
 {id:'solar',name:'Solar System'},
 {id:'stars',name:'Nearby stars'},
 {id:'galaxy',name:'Milky Way overview'}
];

export const CELESTIAL_BODIES = [
 {id:'milky-way',name:'Milky Way',level:'galaxy',kind:'Spiral galaxy',note:'The Solar System lies in the Orion Spur.'},
 {id:'orion-spur',name:'Orion Spur',level:'galaxy',parent:'milky-way',kind:'Local arm segment',zoom:'stars',note:'Home of the Sun and the local stars shown in the next view.'},
 {id:'home-system',name:'Solar System',level:'stars',parent:'orion-spur',kind:'Home star system',zoom:'solar',note:'Our planets and smaller bodies orbit the Sun.'},
 {id:'proxima',name:'Proxima Centauri',level:'stars',parent:'orion-spur',kind:'Red dwarf · 4.24 light-years',note:'Speculative flyby target. At 5% light speed the flyby would take about 85 years, plus 4.24 years for the signal to reach Earth.'},
 {id:'barnard',name:'Barnard’s Star',level:'stars',parent:'orion-spur',kind:'Red dwarf · about 6 light-years'},
 {id:'sirius',name:'Sirius',level:'stars',parent:'orion-spur',kind:'Binary star · about 8.6 light-years'},
 {id:'sun',name:'Sun',level:'solar',parent:'home-system',kind:'Central star'},
 {id:'mercury',name:'Mercury',level:'solar',parent:'sun',kind:'Rocky planet',distanceAU:.387},
 {id:'venus',name:'Venus',level:'solar',parent:'sun',kind:'Rocky planet',distanceAU:.723},
 {id:'earth',name:'Earth',level:'solar',parent:'sun',kind:'Rocky planet',distanceAU:1,zoom:'earth'},
 {id:'mars',name:'Mars',level:'solar',parent:'sun',kind:'Rocky planet',distanceAU:1.524},
 {id:'ceres',name:'Ceres',level:'solar',parent:'sun',kind:'Main-belt dwarf planet',distanceAU:2.77},
 {id:'comet',name:'Comet 67P',level:'solar',parent:'sun',kind:'Short-period comet',note:'Follows an eccentric orbit around the Sun.'},
 {id:'jupiter',name:'Jupiter',level:'solar',parent:'sun',kind:'Gas giant',distanceAU:5.203,moons:['io','europa','ganymede','callisto']},
 {id:'saturn',name:'Saturn',level:'solar',parent:'sun',kind:'Ringed gas giant',distanceAU:9.537},
 {id:'uranus',name:'Uranus',level:'solar',parent:'sun',kind:'Ice giant',distanceAU:19.19},
 {id:'neptune',name:'Neptune',level:'solar',parent:'sun',kind:'Ice giant',distanceAU:30.07},
 {id:'precursor',name:'Interstellar precursor region',level:'solar',parent:'sun',kind:'Local interstellar medium',note:'Beyond the heliopause, still far from other star systems.'},
 {id:'frontier',name:'Solar frontier',level:'solar',parent:'sun',kind:'Outer heliosphere',note:'The heliopause is a boundary in the solar wind.'},
 {id:'io',name:'Io',level:'jupiter',parent:'jupiter',kind:'Volcanic moon'},
 {id:'europa',name:'Europa',level:'jupiter',parent:'jupiter',kind:'Icy moon'},
 {id:'ganymede',name:'Ganymede',level:'jupiter',parent:'jupiter',kind:'Icy moon'},
 {id:'callisto',name:'Callisto',level:'jupiter',parent:'jupiter',kind:'Cratered moon'},
 {id:'earth-orbit',name:'Earth orbit',level:'earth',parent:'earth',kind:'Inclined, polar and geosynchronous orbits'},
 {id:'moon',name:'Moon',level:'earth',parent:'earth',kind:'Natural satellite · about 384,400 km',note:'Orbits Earth. Surface-delivery research would need a descent stage, landing gear and terrain hazard checks.'},
 {id:'transfer',name:'Transfer regions',level:'earth',parent:'earth',kind:'Earth–Moon Lagrange points',note:'L1–L3 lie on the Earth–Moon line. L4 and L5 sit 60° ahead of and behind the Moon in the rotating frame.'}
];

export const bodyById = id=>CELESTIAL_BODIES.find(body=>body.id===id);
export function missionDestination(mission){
 return mission.destination||(mission.id==='observatory'?'transfer':mission.chapter==='frontier'?'moon':'earth-orbit');
}
export const CORE_MISSIONS = ['m1','m2','m3'];
export const isCoreMission = mission=>mission.core===true||CORE_MISSIONS.includes(mission.id);

export function missionChapter(mission) {
 return mission.programChapter||({m1:'Earth Academy',m2:'Earth Operations'}[mission.id]??(mission.chapter==='frontier'?'Moon':mission.chapter==='network'?'Earth Operations':'Earth Academy'));
}
