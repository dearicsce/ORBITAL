const option=(id,name,spec)=>({id,name,...spec});

export const ROCKET_PARTS = {
 coreTank:[
  option('core-18','Courier tank',{propellant:'kerolox',port:'18',diameterM:1.8,dryKg:1350,propellantKg:18500,cost:2.4}),
  option('core-28','Expedition tank',{propellant:'kerolox',port:'28',diameterM:2.8,dryKg:3400,propellantKg:53500,cost:8,requires:'m1'}),
  option('core-methane','Expedition methane tank',{propellant:'methalox',port:'28',diameterM:2.8,dryKg:3600,propellantKg:56500,cost:9,requires:'m3'}),
  option('core-frontier','Frontier methalox tank',{propellant:'methalox',port:'28',diameterM:2.8,dryKg:6300,propellantKg:148000,cost:25,requires:'mars-orbiter'}),
  option('core-helio','Heliopause high-energy tank',{propellant:'methalox',port:'28',diameterM:2.8,dryKg:11700,propellantKg:340000,cost:43,requires:'neptune-scout'})
 ],
 coreEngine:[
  option('core-k1','Courier kerolox engine',{propellant:'kerolox',port:'18',dryKg:400,thrustN:355000,isp:311,cost:2.5}),
  option('core-k3','Expedition kerolox cluster',{propellant:'kerolox',port:'28',dryKg:1100,thrustN:1110000,isp:324,cost:7,requires:'m1'}),
  option('core-m3','Expedition methalox cluster',{propellant:'methalox',port:'28',dryKg:1050,thrustN:1240000,isp:346,cost:8,requires:'m3'}),
  option('core-frontier-engine','Frontier methalox engine cluster',{propellant:'methalox',port:'28',dryKg:1850,thrustN:2960000,isp:355,cost:18,requires:'mars-orbiter'}),
  option('core-helio-engine','Heliopause methalox cluster',{propellant:'methalox',port:'28',dryKg:3650,thrustN:6000000,isp:359,cost:32,requires:'neptune-scout'})
 ],
 upperTank:[
  option('upper-18','Courier vacuum tank',{propellant:'kerolox',port:'18',diameterM:1.8,dryKg:250,propellantKg:4800,cost:1.5}),
  option('upper-h18','Cryogenic vacuum tank',{propellant:'hydrolox',port:'18',diameterM:1.8,dryKg:420,propellantKg:6800,cost:5,requires:'m3'}),
  option('upper-h28','Expedition cryogenic tank',{propellant:'hydrolox',port:'28',diameterM:2.8,dryKg:540,propellantKg:10500,cost:6,requires:'m3'}),
  option('upper-frontier','Frontier high-mass-ratio cryogenic tank',{propellant:'hydrolox',port:'28',diameterM:2.8,dryKg:790,propellantKg:22400,cost:14,requires:'mars-orbiter'}),
  option('upper-helio','Heliopause cryogenic tank',{propellant:'hydrolox',port:'28',diameterM:2.8,dryKg:1320,propellantKg:40000,cost:24,requires:'neptune-scout'})
 ],
 upperEngine:[
  option('upper-k1','Courier vacuum engine',{propellant:'kerolox',port:'18',dryKg:100,thrustN:40000,isp:364,cost:1.8}),
  option('upper-h1','Cryogenic vacuum engine',{propellant:'hydrolox',port:'18',dryKg:125,thrustN:50000,isp:450,cost:4,requires:'m3'}),
  option('upper-h3','Expedition cryogenic engine',{propellant:'hydrolox',port:'28',dryKg:180,thrustN:76000,isp:450,cost:5,requires:'m3'}),
  option('upper-frontier-engine','Frontier expander-cycle engine',{propellant:'hydrolox',port:'28',dryKg:220,thrustN:106000,isp:455,cost:10,requires:'mars-orbiter'}),
  option('upper-helio-engine','Heliopause expander cluster',{propellant:'hydrolox',port:'28',dryKg:280,thrustN:177000,isp:455,cost:16,requires:'neptune-scout'})
 ],
 separator:[
  option('sep-18','Straight 1.8 m interstage',{corePort:'18',upperPort:'18',dryKg:75,cost:.45}),
  option('sep-reducer','2.8 → 1.8 m interstage',{corePort:'28',upperPort:'18',dryKg:160,cost:.75,requires:'m1'}),
  option('sep-28','Straight 2.8 m interstage',{corePort:'28',upperPort:'28',dryKg:135,cost:.7,requires:'m3'})
 ],
 adapter:[
  option('adapter-18','1.8 m universal payload plate',{port:'18',dryKg:35,cost:.3}),
  option('adapter-28','2.8 m universal payload plate',{port:'28',dryKg:65,cost:.5,requires:'m3'})
 ],
 fairing:[
  option('fairing-18','Courier fairing',{port:'18',dryKg:125,radiusM:1.45,heightM:3.8,cost:.65}),
  option('fairing-wide','Wide Courier fairing',{port:'18',dryKg:270,radiusM:1.95,heightM:5,cost:1.5,requires:'m1'}),
  option('fairing-28','Expedition fairing',{port:'28',dryKg:320,radiusM:2.4,heightM:6.1,cost:2,requires:'m3'})
 ],
 guidance:[option('guidance-1','Sequencer and telemetry',{dryKg:40,cost:.8})],
 boosters:[
  option('solid-pair','Two symmetric solid boosters',{port:'28',count:2,dryKg:400,propellantKg:2900,thrustN:185000,isp:259,cost:3.2,requires:'m1'})
 ]
};

export const ROCKET_LABELS = {
 coreTank:'Core tank',coreEngine:'Core engine',upperTank:'Upper-stage tank',upperEngine:'Upper-stage engine',
 separator:'Interstage and separation',adapter:'Payload adapter',fairing:'Fairing',guidance:'Guidance',boosters:'Optional boosters'
};
export const STANDARD_STAGING = ['ignition','core-separation','fairing-release','upper-cutoff','payload-release'];
export const BOOSTER_STAGING = ['ignition','booster-separation',...STANDARD_STAGING.slice(1)];
export const ORBITAL_DECAL = {asset:'ORBITAL wordmark',owner:'ORBITAL',source:'Original game typography',usage:'Player-built fictional vehicles'};
export const rocketPart=(slot,id)=>ROCKET_PARTS[slot]?.find(p=>p.id===id);
export const rocketPartUnlocked=(part,completed)=>!part.requires||Boolean(completed[part.requires]);
