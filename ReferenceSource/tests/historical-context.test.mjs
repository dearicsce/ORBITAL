import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {parseCsv,ingestHistoricalCsv,validateHistoricalContext,historicalPoints} from '../js/content/historical.js';
const data=JSON.parse(fs.readFileSync(new URL('../data/content/historical-context.json',import.meta.url)));
let assertions=0;const check=(ok,message)=>{assert.ok(ok,message);assertions++;};const fails=(fn)=>{assert.throws(fn);assertions++;};
validateHistoricalContext(data);check(data.series.length===4,'Four series');check(data.series.reduce((n,s)=>n+s.records.length,0)===276,'All 276 records retained');
for(const s of data.series){
  const raw=fs.readFileSync(new URL('../'+s.sourcePath,import.meta.url));check(crypto.createHash('sha256').update(raw).digest('hex')===s.sourceSha256,'Raw hash matches');
  const parsed=ingestHistoricalCsv(raw.toString(),{columns:s.columns,cutoff:s.cutoff});
  check(!parsed.issues.length&&parsed.records.length===69,'Originals parse completely');assert.deepEqual(parsed.records,s.records);assertions++;
  for(const c of s.columns){const points=historicalPoints(s,c.id);check(points.length===69&&points.at(-1).partial,'2025 explicitly partial');check(historicalPoints(s,c.id,false).length===68,'Exclude partial-year option');check(points.every(p=>p.value===s.records.find(r=>r.year===p.year).values[c.id]),'Chart/table values identical');}
  check(s.scoringEligible===false&&s.provenance==='supplied-reference-unverified','No official/scoring claim');
}
const columns=[{id:'COUNT',unit:'count'}];
for(const bad of ['', 'NaN','Infinity','-1','1e309','2.5','1,2']){
  const result=ingestHistoricalCsv('YEAR,COUNT\n2024,'+bad+'\n',{columns});check(result.issues.length===1&&result.records.length===0,'Malformed counts do not become zero');
}
const duplicate=ingestHistoricalCsv('YEAR,COUNT\n2024,3\n2024,4',{columns});check(duplicate.issues[0].reason==='Duplicate year','Duplicate year flagged');
check(ingestHistoricalCsv('YEAR,COUNT\n2026,3',{columns}).issues.length===1,'After cutoff rejected');
check(ingestHistoricalCsv('YEAR,COUNT\n2025,0',{columns}).records[0].values.COUNT===0,'Explicit source zero preserved');
check(ingestHistoricalCsv('YEAR,COUNT\n2025,0',{columns}).records[0].qualityFlags.includes('partial-year'),'Partial-year cutoff is required');
fails(()=>ingestHistoricalCsv('YEAR,WRONG\n2024,3',{columns}));fails(()=>parseCsv('YEAR,"COUNT'));fails(()=>parseCsv('YEAR,"COUNT"x'));fails(()=>ingestHistoricalCsv('YEAR,COUNT\n2024,3',{columns,cutoff:'2025-02-31'}));
assert.deepEqual(parseCsv('\uFEFF"YEAR","CO,UNT"\r\n"2024","3"'),[['YEAR','CO,UNT'],['2024','3']]);assertions++;
for(const mutate of [d=>d.series[0].scoringEligible=true,d=>d.series[0].records[1].year=d.series[0].records[0].year,d=>d.series[0].records[0].values.LAUNCHES=NaN,d=>d.series[0].records.at(-1).qualityFlags=[]]){const copy=structuredClone(data);mutate(copy);fails(()=>validateHistoricalContext(copy));}
check(data.crossSeriesFlags.some(f=>f.type==='country-total-not-reconciled'),'Country sum differences recorded');check(data.crossSeriesFlags.some(f=>f.type==='ratio-not-reconciled'),'Ratio differences recorded');
const synthetic=JSON.parse(fs.readFileSync(new URL('./fixtures/historical-synthetic.json',import.meta.url)));check(synthetic.sourceType==='synthetic'&&synthetic.scoringEligible===false,'Fictional fixture clearly separated');check(!data.series.some(s=>s.id===synthetic.id),'Synthetic rows excluded from runtime historical observations');
const result={date:'2026-11-02',assertions,series:4,records:276,qualityFlags:data.crossSeriesFlags.length};fs.writeFileSync(new URL('./historical-context-results.json',import.meta.url),JSON.stringify(result,null,2));console.log('PASS: '+JSON.stringify(result));
