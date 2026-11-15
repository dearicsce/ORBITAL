export const TRANSFER_TARGETS = {
 moon:{name:'Moon',distanceM:384400000,mu:4.902800118e12,radiusM:1737400,conditions:'Vacuum, low gravity and lunar night',windowDay:12,correction:18},
 venus:{name:'Venus',au:.723,mu:3.24858592e14,radiusM:6051800,conditions:'High solar flux · cloud-top flyby',windowDay:48,correction:32},
 mars:{name:'Mars',au:1.524,mu:4.282837e13,radiusM:3389500,conditions:'Reduced sunlight · long-delay communications',windowDay:90,correction:40},
 comet:{name:'Comet 67P',au:1.24,semimajorAu:3.46,conditions:'Guided encounter at perihelion · dust and outgassing',windowDay:145,correction:75},
 ceres:{name:'Ceres',au:2.767,mu:6.26325e10,radiusM:469700,conditions:'Faint sunlight · low gravity · weak link',windowDay:125,correction:55},
 europa:{name:'Europa',au:5.203,mu:3.202739e12,radiusM:1560800,conditions:'Jovian radiation belts · close icy-moon encounter',windowDay:215,correction:108,jovian:true},
 jupiter:{name:'Jupiter',au:5.203,mu:1.2668653e17,radiusM:69911000,periapsisM:1200000000,apoapsisM:3200000000,jovian:true,conditions:'Intense radiation belts · faint sunlight',windowDay:210,correction:75},
 saturn:{name:'Saturn',au:9.537,mu:3.7931187e16,radiusM:58232000,conditions:'Ring-plane clearance · very weak solar power',windowDay:245,correction:90},
 uranus:{name:'Uranus',au:19.19,mu:5.793939e15,radiusM:25362000,conditions:'Cold environment · decades of autonomous cruise',windowDay:300,correction:115},
 neptune:{name:'Neptune',au:30.07,mu:6.836529e15,radiusM:24622000,conditions:'Extreme distance · weak link · very long cruise',windowDay:330,correction:125},
 frontier:{name:'Heliopause',au:120,escapeSpeed:15200,conditions:'Solar wind boundary · ultra-low bitrate and decades of autonomy',windowDay:380,correction:140},
 precursor:{name:'Interstellar medium',au:165,escapeSpeed:15200,conditions:'Beyond the heliopause · long-delay plasma measurements',windowDay:395,correction:155},
 proxima:{name:'Proxima Centauri',distanceLy:4.2465,speedFraction:.05,conditions:'Speculative beamed sail and optical return · high-speed stellar flyby',windowDay:410,correction:110}
};

function mission(id,name,destination,type,programChapter,requires,difficulty,budget,delivered,objective,payload='optical_camera',core=true){
 return {
  id,name,destination,transfer:{type},core,programChapter,chapter:'transfer',tag:destination==='proxima'?'Speculative flyby':({flyby:'Flyby',capture:'Orbiter',rendezvous:'Rendezvous',crossing:'Boundary crossing'})[type],
  missionDifficulty:difficulty,budget,requires,objective,payload,brief:TRANSFER_TARGETS[destination].conditions,
  targetLifetime:1,launchers:['albatross','roc'],relevance:{[payload]:2.5},orbitFit:{leo:1},
  starThresholds:[.5,1,2,3],fixedEvents:[],profile:{coverage:100,delivered,contact:1,eclipse:0}
 };
}

export const TRANSFER_MISSIONS = [
 mission('lunar-pathfinder','Lunar pathfinder','moon','flyby','Moon',['m2'],1,160,.1,'Photograph the Moon during a flyby.','optical_camera',false),
 mission('lunar-capture','Lunar capture demonstration','moon','capture','Moon',['m3'],2,185,.15,'Brake into lunar orbit and return a surface survey.','optical_camera',false),
 mission('venus-clouds','Venus cloud survey','venus','flyby','Inner planets',['m3'],2,180,.08,'Photograph Venus’s cloud tops.','optical_camera',false),
 mission('mars-scout','Mars scout','mars','flyby','Inner planets',['m3'],1,180,.12,'Return a flyby survey of Mars.'),
 mission('mars-orbiter','Mars reconnaissance orbiter','mars','capture','Inner planets',['mars-scout'],3,210,.18,'Brake into Mars orbit, then survey the surface.'),
 mission('ceres-rendezvous','Ceres rendezvous','ceres','rendezvous','Small bodies',['mars-orbiter'],3,245,.1,'Match velocity with Ceres and image its cratered terrain.','optical_camera',false),
 mission('comet-pass','67P dust survey','comet','flyby','Small bodies',['mars-orbiter'],3,245,.1,'Characterise the active comet during a perihelion flyby.','optical_camera',false),
 mission('jupiter-scout','Jupiter reconnaissance','jupiter','flyby','Jupiter system',['mars-orbiter'],4,260,.12,'Survey Jupiter from outside the strongest radiation belts.','optical_camera'),
 mission('jupiter-orbiter','Jupiter high orbiter','jupiter','capture','Jupiter system',['jupiter-scout'],5,295,.12,'Capture into a wide Jovian orbit above the strongest radiation belts.','optical_camera',false),
 mission('europa-scout','Europa ice survey','europa','flyby','Jupiter system',['jupiter-scout'],4,290,.12,'Image the fractured ice during a guided close encounter.','optical_camera',false),
 mission('saturn-scout','Saturn ring survey','saturn','flyby','Outer planets',['jupiter-scout'],4,315,.1,'Image Saturn’s rings from a safe flyby corridor.'),
 mission('uranus-scout','Uranus long watch','uranus','flyby','Outer planets',['saturn-scout'],4,370,.08,'Survey the tilted ice giant.','optical_camera',false),
 mission('neptune-scout','Neptune far signal','neptune','flyby','Outer planets',['saturn-scout'],5,420,.06,'Return a science packet after a decades-long cruise.'),
 mission('heliopause-crossing','Heliopause crossing','frontier','crossing','Solar frontier',['neptune-scout'],5,475,.016,'Detect the edge of the solar wind with a magnetometer.','magnetometer'),
 mission('interstellar-precursor','Interstellar precursor','precursor','crossing','Solar frontier',['heliopause-crossing'],5,505,.009,'Measure the magnetic environment in the local interstellar medium.','magnetometer'),
 mission('proxima-sail','Proxima sail demonstrator','proxima','flyby','Nearby stars',['interstellar-precursor'],5,910,.06,'Return a compact observation packet from a speculative stellar flyby.')
];

export const CRUISE_MODULES = {
 solar:{name:'Spacecraft solar arrays',powerW:0,dryKg:0,cost:0},
 isotope:{name:'Long-life radioisotope power and autonomy',powerW:315,dryKg:84,cost:36,requires:'mars-orbiter',lifetimeYears:38},
 frontier:{name:'Extended radioisotope power and autonomy',powerW:365,dryKg:112,cost:55,lifetimeYears:67,requires:'neptune-scout'},
 beamed:{name:'Speculative beamed sail, optical link and long-life power',powerW:370,dryKg:115,cost:295,lifetimeYears:110,requires:'interstellar-precursor',opticalGbDayAt1Ly:.028}
};
export const ARRIVAL_KITS = {
 none:{name:'Flyby · no braking kit',dryKg:0,propellantRatio:0,cost:0},
 capture:{name:'Storable braking stage',dryKg:36,propellantRatio:1.35,isp:335,cost:18},
 captureHeavy:{name:'High-energy storable braking stage',dryKg:45,propellantRatio:1.85,isp:355,cost:24},
 rendezvous:{name:'Extended storable braking stage',dryKg:50,propellantRatio:3.3,isp:347,cost:29}
};
export const WINDOW_OFFSETS={early:-8,nominal:0,late:10};
