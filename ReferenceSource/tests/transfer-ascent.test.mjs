import fs from 'node:fs';
import assert from 'node:assert/strict';
import {enrichCampaign,starterDesign} from '../js/campaign.js';
import {evaluateDesign} from '../js/engine.js';
import {recommendedPlan} from '../js/transfer/planning.js';
import {ascentVehicle,simulateAscent,numericalTarget} from '../js/engine/ascent.js';
import {referenceRocket} from '../js/rocket/reference.js';
const data=enrichCampaign(JSON.parse(fs.readFileSync(new URL('../data/world1.json',import.meta.url))));
for(const mission of data.missions.filter(m=>m.transfer)){
 const design=starterDesign(mission,data);design.flightPlan=recommendedPlan(mission,'leo',Object.fromEntries(data.missions.map(m=>[m.id,true])));design.planId=design.flightPlan.id;
 design.rocketBlueprint=referenceRocket(mission);design.rocketId=design.rocketBlueprint.id;
 const flight=simulateAscent(ascentVehicle(design,evaluateDesign(design,data).launchMass),numericalTarget(design));
 assert.equal(flight.reason,'',mission.id);assert.ok(flight.orbit.periapsisM>100000);assert.ok(flight.end.timeS>300);
}
console.log('PASS: all 16 transfer reference launchers establish an Earth parking orbit before cruise');
