import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ascentVehicle,simulateAscent,numericalTarget} from '../Assets/StreamingAssets/WebUI/js/engine/ascent.js';
const fixture=JSON.parse(fs.readFileSync('Tools/TestFixtures/m3-fixture.json'));
const vehicle=ascentVehicle(fixture.design,fixture.payloadKg),target=fixture.target;
for(const invalid of [{body:'moon'},{eccentricity:-.01},{eccentricity:NaN},{eccentricity:Infinity},{eccentricity:undefined}]){
 assert.throws(()=>simulateAscent(vehicle,{...target,...invalid}),/near-circular Earth orbits/);
}
const wrongBody={...target,body:'moon'};
assert.equal(numericalTarget({orbitId:'leo',orbitElements:wrongBody}),wrongBody,'Invalid target must reach the numerical validator instead of the scripted animation');
let reentry;
for(const thrustScale of [.08,.12,.2,.3,.4,.5]){
 const weak=structuredClone(vehicle);weak.parts.find(p=>p.id==='upper').thrustN*=thrustScale;
 const flight=simulateAscent(weak,target);
 if(/Atmospheric reentry/.test(flight.reason)){reentry=flight;break;}
}
assert.ok(reentry,'An underpowered second stage must fail at the atmospheric boundary');
assert.equal(reentry.orbit,null);assert.equal(reentry.end.phase,'failed');assert.equal(reentry.end.throttle,0);
assert.ok(reentry.end.altitudeM<100000&&reentry.end.altitudeM>99000);
assert.ok(reentry.end.verticalMps<0);
fs.writeFileSync('Verification/Repair-2026-11-11/ascent-boundaries.json',JSON.stringify({invalidTargetsRejected:5,reentry:{reason:reentry.reason,altitudeM:reentry.end.altitudeM,verticalMps:reentry.end.verticalMps,timeS:reentry.end.timeS}},null,2));
console.log('PASS: invalid orbit inputs rejected; underpowered ascent terminates on actual descending atmospheric crossing, without deployment.');
