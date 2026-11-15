import assert from 'node:assert/strict';
import {ascentVehicle,simulateAscent,sampleFlight} from '../js/engine/ascent.js';
import {BODIES,presetOrbit} from '../js/engine/orbitalGeometry.js';
import {trajectoryPreview,formatAltitude} from '../js/engine/trajectoryPreview.js';
assert.equal(formatAltitude(0),'0 m');assert.equal(formatAltitude(84),'84 m');assert.equal(formatAltitude(1000),'1.00 km');
for(const launcherId of ['kestrel','condor','albatross','roc']){
 const flight=simulateAscent(ascentVehicle({launcherId},210),presetOrbit('leo'));
 assert.equal(flight.reason,'');
 assert.ok(sampleFlight(flight,8).altitudeM<150,'Five seconds after release must still be close to the pad');
 assert.ok(sampleFlight(flight,13).altitudeM<500,'Ten seconds after release must not be kilometres high');
 assert.ok(flight.samples.find(s=>s.altitudeM>=100000).timeS>180,'Space takes minutes');
 assert.ok(flight.end.timeS>600,'Orbital insertion takes sustained acceleration');
 for(const time of [3,33,123,flight.end.timeS]){
  const state=sampleFlight(flight,time),preview=trajectoryPreview(state.positionM,state.velocityMps);
  assert.ok(preview.points.flat().every(Number.isFinite));
  assert.ok(preview.points.every(p=>Math.hypot(...p)>=BODIES.earth.radiusM-.01),'Map must stop at surface');
  if(time===33){assert.equal(preview.impact,true);assert.match(preview.status,/Suborbital/);}
  if(time===flight.end.timeS){assert.equal(preview.impact,false);assert.match(preview.status,/clear/);}
 }
}
console.log('PASS: launch pacing, metre units, bounded predictions, surface impact, and achieved orbit across four launchers');
