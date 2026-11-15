import {mkdtemp,mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {inventory} from './WebUIPackage.mjs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const project=fileURLToPath(new URL('../',import.meta.url));
const source=path.resolve(process.argv[2]||'F:/space-mission-gaame_v_0.3');
const packaged=path.join(project,'Assets/StreamingAssets/WebUI');
const evidence=process.env.ORBITAL_TEST_ARTIFACTS?path.resolve(process.env.ORBITAL_TEST_ARTIFACTS):path.join(project,'Verification/MissionExperiments');
await mkdir(evidence,{recursive:true});
const run=await mkdtemp(path.join(evidence,'browser-regressions-'));
for(const name of ['js','data','models','vendor'])await cp(path.join(packaged,name),path.join(run,name),{recursive:true});
const testDir=path.join(run,'tests');
await mkdir(testDir);
const suites=[
 'program.test.mjs','physics-audit.test.mjs','contracts.test.mjs',
 'campaign-operations.test.mjs','mission-flow-acceptance.test.mjs','flight-completion.test.mjs',
 'flight-continuity.test.mjs','numerical-ascent.test.mjs','transfer-ascent.test.mjs',
 'orbital-geometry.test.mjs','orbital-operations.test.mjs','workshop.test.mjs'
];
await cp(path.join(source,'tests/fixtures'),path.join(testDir,'fixtures'),{recursive:true});
for(const file of ['flight-fixture.js','three-loader.mjs'])await cp(path.join(source,'tests',file),path.join(testDir,file));
let failed=0;
for(const name of suites){
 const test=path.join(testDir,name);
 await cp(path.join(source,'tests',name),test);
 // Reference fixtures assert the old product count and repeat payout. Verify
 // their new equivalents in the copied test, leaving the reference untouched.
 if(name==='program.test.mjs'||name==='mission-flow-acceptance.test.mjs'){
  const before=name==='program.test.mjs'?'assert.equal(replay.amount,25);':"check(summaryM1.objectives.length === 3, 'Three objectives evaluated');";
  const after=name==='program.test.mjs'?'assert.equal(replay.amount,0);':"check(summaryM1.objectives.some(o=>o.id==='product-0'&&o.passed), 'Response region product received');";
  const code=await readFile(test,'utf8');
  if(code.split(before).length!==2)throw Error('Review upstream test assertion in '+name);
  await writeFile(test,code.replace(before,after));
 }
 const result=spawnSync(process.execPath,[test],{cwd:run,encoding:'utf8',timeout:120000});
 await writeFile(path.join(run,name+'.log'),(result.stdout||'')+(result.stderr||'')+(result.error||''));
 console.log(name,result.status===0?'PASS':'FAIL');
 if(result.status!==0)failed++;
}
console.log(`${suites.length-failed}/${suites.length} passed against ${packaged}. Logs in ${run}`);
// These exact copied runtime inputs are reproducible from the retained package.
// Keep tests, logs and hashes; retain the complete fixture on any failure.
if(!failed&&!process.argv.includes('--keep-fixture')){
 const owned=['models','vendor'];
 const inputs=owned.flatMap(name=>inventory(path.join(run,name)).map(e=>({...e,file:name+'/'+e.file})));
 await writeFile(path.join(run,'fixture-inputs.json'),JSON.stringify({owner:'Tools/Check-PackagedBrowser.mjs',packageManifest:JSON.parse(await readFile(path.join(packaged,'dependency-manifest.json'),'utf8')),removedDirectories:owned,inputs},null,2));
 for(const name of owned){const target=path.resolve(run,name);if(!target.startsWith(path.resolve(run)+path.sep))throw Error('Fixture cleanup escaped run');await rm(target,{recursive:true,maxRetries:3,retryDelay:100});}
}
process.exitCode=failed?1:0;
