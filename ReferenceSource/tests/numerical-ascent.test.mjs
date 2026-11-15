import assert from 'node:assert/strict';
import {ascentVehicle,simulateAscent,sampleFlight,payloadDeployment} from '../js/engine/ascent.js';
import {BODIES,presetOrbit,propagate,toFixed,toInertial,orbitalPeriod} from '../js/engine/orbitalGeometry.js';
import {referenceRocket} from '../js/rocket/reference.js';

const {radiusM,mu}=BODIES.earth;
const target=presetOrbit('leo');
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const cases=[
 [ascentVehicle({launcherId:'condor'},210),['boosters','core','fairing','insertion']],
 [ascentVehicle({rocketBlueprint:referenceRocket({})},210),['core','fairing','insertion']]
];
for(const [vehicle,order] of cases){
 const flight=simulateAscent(vehicle,target);
 assert.equal(flight.reason,'');
 assert.deepEqual(flight.events.map(e=>e.id),['ignition','liftoff',...order]);
 const final=flight.end;
 const atInsertion=propagate(flight.orbit,0);
 assert.ok(distance(atInsertion,final.positionM)<.001);
 const reconstructed=propagate(flight.orbit,.01).map((x,i)=>(x-propagate(flight.orbit,-.01)[i])/.02);
 assert.ok(distance(reconstructed,final.velocityMps)<.001);
 assert.ok(distance(propagate(flight.orbit,orbitalPeriod(flight.orbit)),atInsertion)<.001);
 assert.ok(distance(toInertial(toFixed(final.positionM,'earth',final.timeS),'earth',final.timeS),final.positionM)<.001);
 const energy=Math.hypot(...final.velocityMps)**2/2-mu/Math.hypot(...final.positionM);
 assert.ok(Math.abs(energy+mu/(2*flight.orbit.semiMajorAxisM))<.001);
 const deployment=payloadDeployment(flight,210);
 assert.ok(distance(propagate(deployment.payloadOrbit,0),deployment.event.positionM)<.001);
 assert.ok(distance(propagate(deployment.upperOrbit,0),deployment.event.positionM)<.001);
 assert.ok(Math.abs(distance(deployment.craftVelocity,deployment.stageVelocity)-1.2)<1e-8);
 const velocity=deployment.craftVelocity.map((v,i)=>(v*210+deployment.stageVelocity[i]*deployment.stageKg)/final.massKg);
 assert.ok(distance(velocity,deployment.event.velocityMps)<1e-9);
 for(const [i,sample] of flight.samples.entries()){
  const attached=vehicle.parts.filter(p=>sample.attachedPartIds.includes(p.id));
  assert.equal(attached.reduce((sum,p)=>sum+p.dryKg+sample.propellantKgByTank[p.id],0).toFixed(6),sample.massKg.toFixed(6));
  assert.ok(Object.values(sample.propellantKgByTank).every(f=>f>=0));
  assert.ok(Math.abs(sample.pitchRateDegS)<=2.2+1e-9);
  if(sample.timeS<=3)assert.ok(Math.abs(Math.hypot(...sample.positionM)-radiusM)<1e-6);
  if(i)assert.ok(sample.massKg<=flight.samples[i-1].massKg+1e-8);
 }
 for(const event of flight.events.filter(e=>e.partIds.length)){
  const pre=sampleFlight(flight,event.timeS-1e-7);
  const post=sampleFlight(flight,event.timeS);
  assert.ok(event.partIds.every(id=>pre.attachedPartIds.includes(id)&&!post.attachedPartIds.includes(id)));
  assert.ok(distance(pre.positionM,post.positionM)<.01);
  if(event.id==='boosters')assert.ok(post.attachedPartIds.includes('core'));
 }
 const refined=simulateAscent(vehicle,target,{stepS:.1});
 assert.equal(refined.reason,'');
 assert.ok(Math.abs(refined.end.timeS-final.timeS)<3);
 assert.ok(Math.abs(refined.orbit.apoapsisM-flight.orbit.apoapsisM)<2000);
 assert.ok(Math.abs(refined.orbit.periapsisM-flight.orbit.periapsisM)<1500);
 for(const fps of [24,30,60]){
  let clock=0;
  while(clock<final.timeS)clock+=64/fps;
  assert.equal(sampleFlight(flight,clock),final);
  const resumed=JSON.parse(JSON.stringify({version:1,timeS:flight.events[2].timeS,paused:true,speed:64}));
  assert.deepEqual(sampleFlight(simulateAscent(vehicle,target),resumed.timeS),sampleFlight(flight,resumed.timeS));
 }
}
const retro=simulateAscent(cases[0][0],presetOrbit('sso'));
assert.ok(retro.orbit.inclinationRad>Math.PI/2);
const weak=structuredClone(cases[0][0]);
weak.parts.filter(p=>p.id==='core'||p.id.startsWith('booster')).forEach(p=>{p.thrustN=1;});
assert.match(simulateAscent(weak,target).reason,/cannot lift/);
const empty=structuredClone(cases[0][0]);
empty.parts.find(p=>p.id==='upper').propellantKg=2;
assert.match(simulateAscent(empty,target).reason,/exhausted/);
assert.throws(()=>simulateAscent(cases[0][0],presetOrbit('geo')),/near-circular Earth orbits/);
console.log('PASS: preset and custom insertion, ordered staging, mass accounting, retrograde guidance, convergence, frame round-trip, sampled warp and failure cases.');
