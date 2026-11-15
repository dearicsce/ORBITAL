import fs from 'node:fs';
import {SCENARIOS} from './EmbeddedUI/scienceScenarios.js';
import {transferChallenges} from './EmbeddedUI/missionLessons.js';
const root='Verification/CompleteGameplay-2026-11-11/';
const models=JSON.parse(fs.readFileSync(root+'Models/models.json'));
const marker='\n<!-- CompleteGameplay-2026-11-11 -->';
const original=fs.readFileSync('MISSION_DIFFERENTIATION_MATRIX.md','utf8').split(marker)[0];
let text=marker+'\n\n## Current gameplay candidate — 11 November 2026\n\nThe sections above retain their historical evidence. This table adds the intended learner, implemented decision and current evidence for all 28 IDs. The model evidence contains baseline/alternative results and disadvantages; it is not human learning evidence. Host evidence is separately recorded in the dated verification directory. Unsupported physical regimes remain labeled.\n\n';
text+='| Mission | Intended learner / key skill | Current distinctive decision and strategies | Failure / recovery and approximation | Current evidence / next task |\n| --- | --- | --- | --- | --- |\n';
for(const r of models){
 const s=SCENARIOS[r.id],relay=['m2','relay'].includes(r.id),physical=['lunar-pathfinder','lunar-capture','mars-scout','mars-orbiter'].includes(r.id),source=['m1','m3','wildfire'].includes(r.id),transfer=!!s.targets;
 let learner=transfer?'Advanced / arrival resources and delayed receipt':relay?'Intermediate / end-to-end service':r.id==='m1'?'Beginner / access, storage and contact':'Intermediate / observation conditions and competing opportunities';
 let decision=relay?'Urgent-first versus six-interval batching; immediate latency versus grouping/expiry risk':source?'Broad source context versus source-priority subset; breadth versus focused inspection. Both can succeed with the documented geometry':transfer?'Two-target schedule versus primary priority; balanced evidence versus lost secondary integration': 'Auto versus mission-relevant late-transmit schedule; contact use versus acquisition time';
 let limit=relay?'Missing source access cannot be repaired by an Earth link. Wait/store costs delay; some expired messages are terminal. Spherical links and averaged capacity.':physical?'Actual depleted upper stage fails. Correct now/later, coast, or abandon. Failed capture may retain a shorter flyby. Circular body states and impulsive patched conics.':transfer?'Missing trim or inadequate arrival/lifetime can fail. Legacy transfer stays explicitly simplified.': 'Safe mode or cooldown costs acquisition; retain/transmit stored evidence. Scripted target windows; geometric access for source scenarios.';
 const evidence=relay||physical||source?'[new model cases]('+root+'complete-gameplay-models.json)':'[campaign model/alternative]('+root+'Models/models.json)';
 const next=transferChallenges[r.id]?.[1]??r.learning;
 text+='| '+r.name+' (`'+r.id+'`) | '+learner+' | '+decision+' | '+limit+' | '+evidence+'; '+String(next).replaceAll('|','/')+' |\n';
}
text+='\nScientific questions, beneficiaries and instruments remain in the individual mission sections above. New source interpretation: flood 255 means insufficient data, cold lunar context does not establish ice, and historical fire detections are not burn perimeters. New source-model evidence is capped per location. Source acquisition, actual host runs and remaining limits are linked from [the candidate record]('+root+'README.md).\n';
fs.writeFileSync('MISSION_DIFFERENTIATION_MATRIX.md',original+text);
const evidenceOriginal=fs.readFileSync('MISSION_EVIDENCE_MODELS.md','utf8').split(marker)[0];
fs.writeFileSync('MISSION_EVIDENCE_MODELS.md',evidenceOriginal+marker+'\n\n## Current candidate increments\n\nSee [owned model notes](Tools/EmbeddedUI/modelNotes.md#11-november-2026-gameplay-candidate) for `mission-continuity-1`, `dated-conics-1`, `two-link-traffic-1`, `unique-target-1`, explicit experiment scopes, post-mission reserve commitments, and all approximations. [Independent model cases]('+root+'complete-gameplay-models.json) and [persistence/reference boundaries]('+root+'boundaries.json) are model-level evidence; dated Windows records are host-level evidence. Three source subsets are available, including 32 actual flood-class cells with an explicitly unavailable cloud-specific mask. No human learning results exist. Historical model labels and old scores remain readable.\n');
console.log('Updated all 28 mission rows without replacing historical records.');
