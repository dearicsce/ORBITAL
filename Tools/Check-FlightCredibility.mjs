import assert from 'node:assert/strict';
import fs from 'node:fs';
import {enrichCampaign,starterDesign} from '../Assets/StreamingAssets/WebUI/js/campaign.js';
import {evaluateDesign} from '../Assets/StreamingAssets/WebUI/js/engine.js';
import {ascentVehicle,simulateAscent,payloadDeployment,numericalTarget} from '../Assets/StreamingAssets/WebUI/js/engine/ascent.js';
import {simulateAscent as legacy} from '../Assets/StreamingAssets/WebUI/js/engine/ascentLegacy.js';
import {BODIES} from '../Assets/StreamingAssets/WebUI/js/engine/orbitalGeometry.js';
const out=(process.argv[2]||'Verification/Sol61-2026-11-10').replace(/[\\/]$/,'')+'/';
fs.mkdirSync(out,{recursive:true});
const fixture=JSON.parse(fs.readFileSync('Tools/TestFixtures/m3-fixture.json'));
const {target}=fixture;
const vehicle=ascentVehicle(fixture.design,fixture.payloadKg);
const norm=a=>Math.hypot(...a),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),{mu,radiusM,rotationSec}=BODIES.earth;
const runs=[.2,.1,.05].map(stepS=>simulateAscent(vehicle,target,{stepS}));
const rows=[];
for(const [index,f] of runs.entries()){
 assert.equal(f.reason,'');
 // A burn more than 20 degrees below the local horizon for 10 seconds is
 // incompatible with the intended near-tangential apsis circularization.
 // This leaves brief attitude settling free; the old 70-degree altitude brake fails.
 let downward=0,longest=0,previous=f.samples[0];
 let maxFlowError=0,maxCoastEnergyError=0,coastEnergy=null,workResidual=0,absoluteWork=0;
 for(const s of f.samples){
  const dt=s.timeS-previous.timeS;
  downward=s.throttle>0&&s.pitchDeg< -20?downward+dt:0;longest=Math.max(longest,downward);
  const expectedMass=vehicle.parts.reduce((sum,p)=>sum+(s.attachedPartIds.includes(p.id)?p.dryKg+s.propellantKgByTank[p.id]:0),0);
  assert.ok(Math.abs(expectedMass-s.massKg)<1e-7);
  for(const p of vehicle.parts){
   const throttle=s.engineStatesById[p.id]??0;
   if(s.timeS>3&&throttle)assert.ok(throttle+1e-9>=p.minThrottle&&throttle<=1);
   assert.ok(s.ignitions[p.id]<=p.maxIgnitions);
   if(dt&&previous.attachedPartIds.includes(p.id)&&s.attachedPartIds.includes(p.id)){
    const used=previous.propellantKgByTank[p.id]-s.propellantKgByTank[p.id];
    // Final insertion sample reports cutoff although fuel was used during its step.
    if(s.phase!=='inserted')maxFlowError=Math.max(maxFlowError,Math.abs(used-p.thrustN/(p.isp*9.80665)*dt*throttle));
   }
  }
  if(s.guidancePhase==='coast'&&s.altitudeM>200000&&s.throttle===0){
   const energy=dot(s.velocityMps,s.velocityMps)/2-mu/norm(s.positionM);
   coastEnergy??=energy;maxCoastEnergyError=Math.max(maxCoastEnergyError,Math.abs((energy-coastEnergy)/coastEnergy));
  }
  if(dt>0&&previous.timeS>=3){
   const midR=s.positionM.map((x,i)=>(x+previous.positionM[i])/2),midV=s.velocityMps.map((x,i)=>(x+previous.velocityMps[i])/2);
   const omega=2*Math.PI/rotationSec,atmosphere=[-omega*midR[1],omega*midR[0],0],relative=midV.map((x,i)=>x-atmosphere[i]);
   const density=1.225*Math.exp(-Math.max(0,norm(midR)-radiusM)/7600);
   const used=vehicle.parts.reduce((n,p)=>n+previous.propellantKgByTank[p.id]-s.propellantKgByTank[p.id],0);
   const impulse=vehicle.parts.reduce((n,p)=>n+(previous.propellantKgByTank[p.id]-s.propellantKgByTank[p.id])*p.isp*9.80665,0);
   const midMass=previous.massKg-used/2;
   const work=dot(midV,s.direction)*impulse/midMass+dot(midV,relative)*(-.5*density*norm(relative)*vehicle.area*.36)*dt/midMass;
   const energy=a=>dot(a.velocityMps,a.velocityMps)/2-mu/norm(a.positionM);
   workResidual+=Math.abs(energy(s)-energy(previous)-work);absoluteWork+=Math.abs(work);
  }
  previous=s;
 }
 assert.ok(longest<10,'Sustained steep downward burn');
 assert.ok(maxFlowError<1e-6,'Propellant flow matches impulse');
 assert.ok(maxCoastEnergyError<1e-6,'Vacuum coast conserves specific energy');
 assert.ok(workResidual/absoluteWork<1e-4,'Powered/drag specific-energy change matches non-gravitational work to 0.01%');
 assert.equal(f.samples.at(-1).ignitions.upper,2,'Exactly one permitted upper-stage restart');
 if(index){
  const reference=runs.at(-1);
  assert.ok(Math.abs(f.end.timeS-reference.end.timeS)<2,'Insertion time convergence within 2 s');
  assert.ok(Math.abs(f.orbit.periapsisM-reference.orbit.periapsisM)<3000,'Periapsis convergence within 3 km');
  assert.ok(Math.abs(f.orbit.apoapsisM-reference.orbit.apoapsisM)<3000,'Apoapsis convergence within 3 km');
 }
 rows.push({stepS:[.2,.1,.05][index],timeS:f.end.timeS,orbit:f.orbit,longestDownwardBurnS:longest,maxFlowErrorKg:maxFlowError,maxCoastRelativeEnergyError:maxCoastEnergyError,specificWorkBalanceRelativeError:workResidual/absoluteWork,transitions:f.transitions});
}
const old=legacy(vehicle,target);
assert.ok(old.samples.some(s=>s.pitchDeg< -70&&s.throttle>0),'Legacy reproduction retains original trajectory');
const weak=structuredClone(vehicle);weak.parts.find(p=>p.id==='core').thrustN=1;
assert.match(simulateAscent(weak,target).reason,/cannot lift/);
const dry=structuredClone(vehicle);dry.parts.find(p=>p.id==='upper').propellantKg=1;
assert.ok(simulateAscent(dry,target).reason,'Insufficient delta-v fails');
const noRestart=structuredClone(vehicle);noRestart.parts.find(p=>p.id==='upper').maxIgnitions=1;
assert.match(simulateAscent(noRestart,target).reason,/ignition limit/);
assert.throws(()=>simulateAscent(vehicle,{...target,semiMajorAxisM:50e6}),/supports near-circular/);
const deployment=payloadDeployment(runs[0],fixture.payloadKg);
const momentum=deployment.craftVelocity.map((v,i)=>v*fixture.payloadKg+deployment.stageVelocity[i]*deployment.stageKg);
const before=deployment.event.velocityMps;
assert.ok(momentum.every((p,i)=>Math.abs(p-before[i]*runs[0].end.massKg)<1e-6));
// Catalog inventory is generated from the same resolver used by flight.
const data=enrichCampaign(JSON.parse(fs.readFileSync('Assets/StreamingAssets/WebUI/data/world1.json')));
const launchers=data.launchers.filter(l=>['kestrel','condor','albatross','roc'].includes(l.id)).map(l=>({id:l.id,name:l.name,model:ascentVehicle({launcherId:l.id},0)}));
fs.writeFileSync(out+'engine-envelopes.json',JSON.stringify(launchers,null,2));
const f=runs[0];fs.writeFileSync(out+'flight-after.json',JSON.stringify({fixture,rows,samples:f.samples,events:f.events},null,2));
const series=[['Altitude (km)',s=>s.altitudeM/1000],['Radial speed (m/s)',s=>s.verticalMps],['Tangential speed (m/s)',s=>Math.sqrt(Math.max(0,s.speedMps**2-s.verticalMps**2))],['Pitch above horizon (deg)',s=>s.pitchDeg],['Commanded throttle',s=>s.commandedThrottle],['Actual throttle',s=>s.throttle],['Apoapsis / periapsis (km)',s=>s.osculatingOrbit.apoapsisM/1000,s=>s.osculatingOrbit.periapsisM/1000],['Attached propellant (kg)',s=>s.attachedPartIds.reduce((n,id)=>n+s.propellantKgByTank[id],0)]];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="1600" viewBox="0 0 1100 1600"><rect width="1100" height="1600" fill="#091924"/><g font-family="Arial" fill="#d7e8ed">';
series.forEach(([label,...getters],i)=>{
 const y=35+i*195,values=getters.flatMap(get=>f.samples.map(get)).filter(Number.isFinite),min=Math.min(...values),max=Math.max(...values),span=max-min||1;
 svg+=`<text x="24" y="${y}">${label} · ${min.toFixed(2)} to ${max.toFixed(2)}</text><path d="M70 ${y+12}V${y+155}H1060" fill="none" stroke="#456575"/>`;
 getters.forEach((get,j)=>{svg+=`<polyline fill="none" stroke="${j?'#eeb66c':'#8ae4bf'}" points="${f.samples.filter((s,k)=>k%5===0).map(s=>`${70+990*s.timeS/f.end.timeS},${y+150-135*(get(s)-min)/span}`).join(' ')}"/>`;});
 svg+=`<text x="70" y="${y+175}">0 s</text><text x="980" y="${y+175}">${f.end.timeS.toFixed(1)} s</text>`;
});svg+='</g></svg>';fs.writeFileSync(out+'flight-trace.svg',svg);
console.log('PASS: m3 guidance, engine limits, mass/flow, vacuum coast, convergence, failures and legacy compatibility.');
