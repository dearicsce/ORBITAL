import assert from 'node:assert/strict';
import fs from 'node:fs';
import {enrichCampaign,starterDesign} from '../Assets/StreamingAssets/WebUI/js/campaign.js';
import {evaluateDesign} from '../Assets/StreamingAssets/WebUI/js/engine.js';
import {referenceRocket} from '../Assets/StreamingAssets/WebUI/js/rocket/reference.js';
import {ascentVehicle,simulateAscent,numericalTarget,sampleFlight} from '../Assets/StreamingAssets/WebUI/js/engine/ascent.js';
const data=enrichCampaign(JSON.parse(fs.readFileSync(new URL('../Assets/StreamingAssets/WebUI/data/world1.json',import.meta.url))));
const rows=[];
for(const mission of data.missions){
 if(!mission.transfer){
  const preset=starterDesign(mission,data);
  const nominal=simulateAscent(ascentVehicle(preset,evaluateDesign(preset,data).launchMass),numericalTarget(preset));
  assert.equal(nominal.reason,'',mission.id+' preset launcher');
 }
 const design=starterDesign(mission,data);
 design.rocketBlueprint=referenceRocket(mission);
 const target=numericalTarget(design);
 assert.ok(target,mission.id+' has a numerical ascent');
 const flight=simulateAscent(ascentVehicle(design,evaluateDesign(design,data).launchMass),target);
 assert.equal(flight.reason,'',mission.id);
 const early=sampleFlight(flight,5);
 assert.ok(early.altitudeM>=0&&early.altitudeM<100,mission.id+' remains close to the pad two seconds after liftoff');
 const space=flight.samples.find(s=>s.altitudeM>=100000);
 assert.ok(space?.timeS>100,mission.id+' cannot reach space within seconds');
 assert.ok(flight.end.timeS>300,mission.id+' orbital insertion takes minutes');
 rows.push({mission:mission.id,parkingOnly:!!target.parkingOnly,altitudeAfter2sM:early.altitudeM,spaceTimeS:space.timeS,insertionTimeS:flight.end.timeS});
}
const evidence=process.argv[2]||'Verification/Sol61-2026-11-10';
fs.mkdirSync(evidence,{recursive:true});
fs.writeFileSync(evidence+'/ascent.json',JSON.stringify(rows,null,2));
console.log('PASS: all '+rows.length+' mission reference rockets have physical ascent timing and successful insertion.');
