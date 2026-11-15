import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {inventory,sha256} from './WebUIPackage.mjs';
const record='Verification/UsabilityRelease-2026-11-11',candidate=record+'/Candidate Player';
const files=inventory(candidate);
const source=inventory('Assets/StreamingAssets').filter(e=>!e.file.includes('.previous-package'));
const equality=source.map(e=>({...e,candidateSha256:sha256(path.join(candidate,'ORBITAL_Data/StreamingAssets',e.file))}));
assert.ok(equality.every(e=>e.sha256===e.candidateSha256),'Candidate must match all maintained generated runtime inputs');
assert.ok(!files.some(e=>/previous-package|EBWebView|PlayProfile|node_modules/.test(e.file)),'No development caches or tools in release');
const installed=JSON.parse(fs.readFileSync(record+'/installed-baseline.json')).map(e=>({...e,unchanged:sha256(e.file)===e.sha256}));
assert.ok(installed.every(e=>e.unchanged),'Installed files must remain intact');
const baseline=JSON.parse(fs.readFileSync(record+'/source-baseline.json')),changes=[];
for(const e of baseline)if(fs.existsSync(e.file)&&sha256(e.file)!==e.sha256)changes.push({file:e.file,before:e.sha256,after:sha256(e.file)});
for(const dir of ['Tools/EmbeddedUI','Tools/NasaPipeline','Assets/Orbital','Assets/Editor','ProjectSettings','Packages'])for(const e of inventory(dir)){const file=dir+'/'+e.file;if(!baseline.some(b=>b.file===file))changes.push({file,before:null,after:e.sha256});}
const tooling=['WebUIPackage.mjs','HostSession.mjs','Measure-DesignForecast.mjs','Check-ForecastResponsiveness.mjs','Check-PackageOwnership.mjs','Check-UsabilityHost.mjs','Check-KeyboardMission.mjs','Check-PlanningHost.mjs','Check-ReleaseAssets.mjs','Start-IsolatedCandidate.ps1','Start-SpacedPathAcceptance.ps1','Verify-UsabilityWindows.ps1','Measure-UsabilityRelease.ps1','Inventory-ReleaseCleanup.mjs','Clean-VerificationCaches.ps1','Write-UsabilityManifest.mjs','ReferenceInputs.lock.json','Install-CompleteGameplayCandidate.ps1','Check-PackagedBrowser.mjs','Check-EmbeddedCampaign.mjs','Check-GameplayReleaseHost.mjs'];
tooling.push('Wait-OwnedHostExit.ps1','Check-PackageUpdateStorage.mjs','Measure-StartupPairs.ps1','Finalize-UsabilityEvidence.mjs');
for(const name of tooling){const file='Tools/'+name;changes.push({file,before:null,after:sha256(file),note:'New or updated tooling/input lock; modified-tool recovery files are under Before/Tools.'});}
for(const e of inventory('Docs'))changes.push({file:'Docs/'+e.file,before:null,after:e.sha256,note:'Authoritative documentation added for this increment'});
fs.writeFileSync(record+'/source-candidate-match.json',JSON.stringify(equality,null,2));
fs.writeFileSync(record+'/installed-preserved.json',JSON.stringify({files:installed.length,changed:installed.filter(e=>!e.unchanged)},null,2));
fs.writeFileSync(record+'/changed-source.json',JSON.stringify(changes,null,2));
fs.writeFileSync(record+'/candidate-hashes.json',JSON.stringify({version:'usability-2026.11.11',unity:'6000.6.8f1 (237b6593792b)',player:'Candidate Player/ORBITAL.exe',buildLog:'unity-build-frozen.log',packagedUiManifestSha256:sha256(candidate+'/ORBITAL_Data/StreamingAssets/WebUI/dependency-manifest.json'),referenceInputLockSha256:sha256('Tools/ReferenceInputs.lock.json'),streamingFilesEqual:equality.length,totalBytes:files.reduce((s,e)=>s+e.bytes,0),files},null,2));
console.log(`${files.length} candidate files; ${equality.length} exact StreamingAssets matches; ${installed.length} installed files unchanged`);
