import {readFile,writeFile} from 'node:fs/promises';
const base=new URL('../Verification/Campaign-2026-11-09/',import.meta.url);
const read=async(file)=>JSON.parse(await readFile(new URL(file,base),'utf8'));
const models=await read('models.json');
const baseline=[...await read('Host/floodwatch.json'),...await read('Host/campaign.json')];
async function optional(file){try{return await read(file);}catch(error){if(error.code!=='ENOENT')throw error;return [];}}
const intermediate=await optional('CandidateHost/campaign.json');
const final=await optional('VerifiedHost/campaign.json');
const status=(rows,id)=>rows.findLast(r=>r.id===id)?.result||'pending';
const summary=model=>model.objectives.map(o=>o.target+' '+o.unit+' '+o.id).join(', ');
const rows=models.map(m=>[
 m.id,m.prerequisites.join(', ')||'Start',m.destination,m.family,
 `${m.supportedDesign.nominal.launcher} / ${m.supportedDesign.nominal.orbit} / ${m.supportedDesign.nominal.payload}`,
 summary(m),m.checkpoint,m.result,status(baseline,m.id),status(intermediate,m.id),status(final,m.id)
]);
const md=[
 '# Campaign acceptance matrix','',
 'The inventory comes from the packaged campaign definitions. All 28 contracts are listed. Training is tracked separately. Model checks exercise normal prerequisite progression, the valid design gate, rejection of a spacecraft without a bus, objective success and failure, resource bounds, checkpoint replay and one reward per run. Host runs use the Windows player and advance through the public mission atlas and launch flow. Host success is a playthrough result. The whole acceptance checklist also requires human learning evidence, matching performance tests and release gates.',
 '',
 'The [model evidence](models.json) lists the actual objective, learning decision, phases, supported launcher and useful orbit choices, reference design, failed objectives and reward per mission. The [model notes](../../Tools/EmbeddedUI/modelNotes.md) give the equations, assumptions and source links for each family. Legacy lunar, GEO and observatory contracts begin operations after illustrative delivery. Transfer contracts model their educational encounters separately.',
 '',
 'Baseline evidence is split between [Floodwatch](Host/floodwatch.json) and the [remaining 27 missions](Host/campaign.json). [First repair run](CandidateHost/campaign.json) is distinct from [verification build](VerifiedHost/campaign.json). Missing host evidence is marked pending. A passing model checkpoint uses serialization and replay in the packaged engine. Windows process restarts and profile recovery are tracked in the [handoff](README.md).',
 '',
 '| Mission ID | Prerequisites | Destination | Scenario family | Verified design | Objectives | Model checkpoint | Model | Baseline host | First repair host | Verification host |',
 '|---|---|---|---|---|---|---|---|---|---|---|',
 ...rows.map(row=>'| '+row.join(' | ')+' |'),''
].join('\n');
await writeFile(new URL('acceptance-matrix.md',base),md);
