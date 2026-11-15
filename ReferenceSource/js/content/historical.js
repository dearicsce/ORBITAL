// Strict, reproducible parsing. Empty/malformed observations never become zeros.
export function parseCsv(text){
  if(typeof text!=='string'||text.length>2e6)throw new Error('CSV input is missing or too large');
  const rows=[];let row=[],field='',quoted=false,closed=false;
  const finishField=()=>{row.push(field);field='';closed=false;};
  const finishRow=()=>{finishField();if(row.some(v=>v!==''))rows.push(row);row=[];};
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){if(ch==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=ch;continue;}
    if(ch==='"'){if(field||closed)throw new Error('Unexpected CSV quote');quoted=true;}
    else if(ch===',')finishField();
    else if(ch==='\n')finishRow();
    else if(ch==='\r'){if(text[i+1]==='\n')i++;finishRow();}
    else{if(closed)throw new Error('Unexpected text after CSV quote');field+=ch;}
  }
  if(quoted)throw new Error('Unterminated CSV quote');
  if(field||row.length||closed)finishRow();return rows;
}
export function ingestHistoricalCsv(text,{columns,cutoff='2025-10-02',firstYear=1957}={}){
  const rows=parseCsv(text),expected=['YEAR',...columns.map(c=>c.id)];
  if(!rows.length||JSON.stringify(rows[0].map(s=>s.trim()))!==JSON.stringify(expected))throw new Error('CSV headers differ from the declared schema');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(cutoff)||(Number.isNaN(Date.parse(cutoff))||new Date(cutoff).toISOString().slice(0,10)!==cutoff))throw new Error('Invalid cutoff date');
  const cutoffYear=Number(cutoff.slice(0,4)),records=[],issues=[],seen=new Set();
  for(let index=1;index<rows.length;index++){
    const row=rows[index],line=index+1;
    if(row.length!==expected.length){issues.push({line,reason:'Column count differs from schema'});continue;}
    const values=row.map(v=>v.trim());
    if(values.some(v=>!v||!/^\d+(?:\.\d+)?$/.test(v)||!Number.isFinite(Number(v)))){issues.push({line,reason:'Missing, non-finite or malformed numeric value'});continue;}
    const year=Number(values[0]);
    if(!Number.isInteger(year)||year<firstYear||year>cutoffYear){issues.push({line,reason:'Year outside declared source coverage'});continue;}
    if(seen.has(year)){issues.push({line,reason:'Duplicate year',year});continue;}
    if(columns.some((c,i)=>c.unit==='count'&&!Number.isSafeInteger(Number(values[i+1])))){issues.push({line,reason:'Count must be a safe non-negative integer'});continue;}
    seen.add(year);records.push({year,values:Object.fromEntries(columns.map((c,i)=>[c.id,Number(values[i+1])])),qualityFlags:year===cutoffYear&&cutoff.slice(5)!=='12-31'?['partial-year','cutoff-inferred-from-filename']:[]});
  }
  records.sort((a,b)=>a.year-b.year);
  return {records,issues,originalHeaders:rows[0],rowCount:rows.length-1,cutoff,firstYear:records[0]?.year,lastYear:records.at(-1)?.year};
}
export function validateHistoricalContext(dataset){
  if(dataset.schemaVersion!==1||!Array.isArray(dataset.series)||!dataset.series.length)throw new Error('Unsupported historical dataset');
  for(const s of dataset.series){
    if(s.provenance!=='supplied-reference-unverified'||s.scoringEligible!==false||!s.sourceSha256||!s.cutoff||!Array.isArray(s.records)||!s.records.length)throw new Error('Historical provenance/coverage is missing');
    if(!Array.isArray(s.columns)||!s.columns.length||new Set(s.columns.map(c=>c.id)).size!==s.columns.length||s.columns.some(c=>typeof c.id!=='string'||!['count','ratio'].includes(c.unit)))throw new Error('Invalid historical metric schema');
    const years=new Set();let prior=0;for(const r of s.records){if(!Number.isInteger(r.year)||years.has(r.year)||r.year<=prior||r.year>Number(s.cutoff.slice(0,4)))throw new Error('Invalid or duplicate historical year');years.add(r.year);prior=r.year;if(!Array.isArray(r.qualityFlags)||r.year===Number(s.cutoff.slice(0,4))&&s.cutoff.slice(5)!=='12-31'&&!r.qualityFlags.includes('partial-year'))throw new Error('Missing partial-year quality flag');for(const c of s.columns)if(!Number.isFinite(r.values[c.id])||r.values[c.id]<0)throw new Error('Invalid historical value');}
  }
  return dataset;
}
export function historicalPoints(series,columnId,includePartial=true){
  if(!series.columns.some(c=>c.id===columnId))throw new Error('Unknown historical metric');
  return series.records.filter(r=>includePartial||!r.qualityFlags.includes('partial-year')).map(r=>({year:r.year,value:r.values[columnId],partial:r.qualityFlags.includes('partial-year')}));
}
