import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {adaptBrowser} from './EmbeddedUI/adaptBrowser.mjs';
import {thermalParts} from './EmbeddedUI/thermalCatalogue.mjs';
import {LAUNCHER_NAMES} from './EmbeddedUI/launcherAdditions.js';
import {inventory,sha256,publishPackage} from './WebUIPackage.mjs';

const source = path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--')) || 'F:/space-mission-gaame_v_0.3');
const project = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
if(process.platform==='win32'){
 const quoted=project.replaceAll("'","''");
 const active=execFileSync('powershell.exe',['-NoProfile','-Command',`Get-CimInstance Win32_Process -Filter "Name='Unity.exe'" | Where-Object {$_.CommandLine -like '*-projectPath*' -and ($_.CommandLine.Replace('/','\\') -like '*${quoted}*')} | Select-Object -ExpandProperty ProcessId`],{encoding:'utf8'}).trim();
 if(active)throw Error('Close the Unity editor before swapping generated WebUI assets. Package first, then build.');
}
const output = path.resolve(process.env.ORBITAL_PACK_TARGET || path.join(project, 'Assets/StreamingAssets/WebUI'));
const lockFile=path.resolve(process.env.ORBITAL_INPUT_LOCK || path.join(project,'Tools/ReferenceInputs.lock.json'));
// Exact source paths and hashes pin the machine-external reference snapshot.
const inputFiles=['index.html','assets','css','data','images','js','models','textures','vendor','videos','docs/REALISM_AND_SPACE_APPS_AUDIT.md'].flatMap(name=>{
 const file=path.join(source,name);
 return fs.statSync(file).isDirectory()?inventory(file).map(e=>({...e,file:name+'/'+e.file})):[{file:name,bytes:fs.statSync(file).size,sha256:sha256(file)}];
});
const inputIdentity={schemaVersion:1,files:inputFiles};
if(process.argv.includes('--update-input-lock')){fs.writeFileSync(lockFile,JSON.stringify(inputIdentity,null,2)+'\n');console.log('Pinned reference inventory: '+lockFile);process.exit(0);}
if(!fs.existsSync(lockFile))throw Error('Missing reference lock. Review acquisition instructions before explicitly updating it.');
if(JSON.stringify(JSON.parse(fs.readFileSync(lockFile)))!==JSON.stringify(inputIdentity))throw Error('External reference inputs drifted. Preserve/review changes, then explicitly run --update-input-lock.');
const target=fs.mkdtempSync(path.join(project,'.orbital-web-stage-'));
try {
const records = [];
const runtime = ['index.html', 'assets', 'css', 'data', 'images', 'js', 'models', 'textures', 'vendor', 'videos'];
// These authoring originals have optimized runtime equivalents in stage-sources.json.
// Keep them in the reference project, not in the distributed player.
const sourceOnlyStages = new Set(['atlas-lower.glb', 'atlas-upper.glb', 'falcon-adapter.glb', 'falcon-lower.glb', 'falcon-upper.glb']
  .map(name => 'models/supplied/stages/' + name));
// Retained in pinned external inputs; unresolved redistribution records exclude
// these reference meshes from the candidate. Existing procedural visuals apply.
const unresolvedModels=new Set(['mobile-launcher','cygnss','cloudsat','cassini'].map(name=>'models/supplied/'+name+'.glb'));
// Reviewed in Verification/Cleanup-2026-11-11: no runtime entry point or
// dynamic consumer. Authoring/inspector originals remain in the pinned input.
const unusedModules=new Set([
  'js/content/inspectAsset.js','js/three/orbit.js','js/three/orbiterAssets.js',
  'js/three/orbitViewer.js','js/ui/assetLibrary.js','js/ui/designAdvice.js',
  'js/ui/evidence.js','js/ui/menu.js'
]);
function copy(relative) {
  if (sourceOnlyStages.has(relative.replaceAll('\\', '/'))||unresolvedModels.has(relative.replaceAll('\\', '/'))||unusedModules.has(relative.replaceAll('\\', '/'))) return;
  const original = path.join(source, relative);
  if (fs.statSync(original).isDirectory()) {
    for (const entry of fs.readdirSync(original)) copy(path.join(relative, entry));
    return;
  }
  // Source models and backups are not player dependencies.
  if (!/\.(?:html|js|json|css|glb|gltf|bin|png|jpg|jpeg|webp|svg|ico|wasm|woff2?|ttf|mp4|webm|ogg|mp3|wav|txt|md)$/i.test(relative)) return;
  const content = fs.readFileSync(original);
  const output = path.join(target, relative);
  fs.mkdirSync(path.dirname(output), {recursive:true});
  if(!fs.existsSync(output)||!content.equals(fs.readFileSync(output)))fs.writeFileSync(output, content);
  records.push({file: relative.replaceAll('\\','/'), source: original, referenceSha256: crypto.createHash('sha256').update(content).digest('hex')});
}
for (const relative of runtime) copy(relative);
copy('docs/REALISM_AND_SPACE_APPS_AUDIT.md');
const modelManifestPath=path.join(target,'models/manifest.json');
const modelManifest=JSON.parse(fs.readFileSync(modelManifestPath));
const worldPath=path.join(target,'data/world1.json');
const world=JSON.parse(fs.readFileSync(worldPath));
world.parts.push(...thermalParts);
for(const launcher of world.launchers)if(LAUNCHER_NAMES[launcher.id])launcher.name=LAUNCHER_NAMES[launcher.id];
fs.writeFileSync(worldPath,JSON.stringify(world,null,2)+'\n');
for(const part of thermalParts)modelManifest[part.id]={file:'models/thermal/'+part.id+'.glb',credit:'ORBITAL original Blender model'};
for(const entry of Object.values(modelManifest)){
 if(unresolvedModels.has(entry.file)){entry.externalReference={...entry,sourceRelativePath:entry.file,shipped:false};delete entry.externalReference.file;entry.file=null;entry.credit='ORBITAL procedural educational launch tower; external reference model omitted pending rights verification';}
 if(entry.preservedReference&&unresolvedModels.has(entry.preservedReference.file)){entry.externalReference={...entry.preservedReference,sourceRelativePath:entry.preservedReference.file,shipped:false};delete entry.externalReference.file;delete entry.preservedReference;}
}
fs.writeFileSync(modelManifestPath,JSON.stringify(modelManifest,null,2)+'\n');
for (const [name, destination] of Object.entries({
  'speech.js':'js/ui/speech.js', 'bridge.js':'js/unity/bridge.js', 'earth.js':'js/three/earth.js', 'nativeSceneKit.js':'js/unity/nativeSceneKit.js',
  'flightSession.js':'js/flightSession.js', 'storageStatus.js':'js/unity/storageStatus.js',
  'floodwatch.js':'js/unity/floodwatch.js','learningTools.js':'js/unity/learningTools.js',
  'missionLessons.js':'js/unity/missionLessons.js','reportExport.js':'js/unity/reportExport.js','embedded.css':'css/embedded.css',
  'modelNotes.md':'docs/REALISM_AND_SPACE_APPS_AUDIT.md'
})) {
  const output = path.join(target,destination);
  fs.mkdirSync(path.dirname(output), {recursive:true});
  fs.copyFileSync(path.join(project,'Tools/EmbeddedUI',name),output);
}
for (const name of ['scienceScenarios','scienceEvidence','scienceOperations','scienceTransfer','missionExperiment','scienceUI','navigation','physicalCruise','missionLifecycle','relayTraffic','missionEnd']) {
  const destination = 'js/unity/' + name + '.js';
  fs.copyFileSync(path.join(project, 'Tools/EmbeddedUI', name + '.js'), path.join(target, destination));
}
const nasaBundles={};
for(const name of fs.readdirSync(path.join(project,'Tools/EmbeddedUI/NasaData')).filter(name=>name.endsWith('.json')).sort()){
 const entry=JSON.parse(fs.readFileSync(path.join(project,'Tools/EmbeddedUI/NasaData',name),'utf8'));
 const {processedChecksum,...body}=entry.bundle;
 if(crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')!==processedChecksum)throw Error('Corrupted NASA bundle '+name);
 nasaBundles[entry.bundle.id]=entry;
}
fs.writeFileSync(path.join(target,'js/unity/nasaBundles.js'),'// Generated from owned Tools/EmbeddedUI/NasaData.\nexport const NASA_BUNDLES = '+JSON.stringify(nasaBundles)+';\n');
const keplerJsonPath = path.join(project, 'Tools/EmbeddedUI/data/kepler-q1-v1.json');
if (fs.existsSync(keplerJsonPath)) {
  const keplerParsed = JSON.parse(fs.readFileSync(keplerJsonPath, 'utf8'));
  if (keplerParsed.source?.sha256 !== '10bfca91bdd928deda2e638de7a27cdc940b879452408a96b5be6146944639e9') {
    throw new Error('Kepler dataset origin checksum mismatch: ' + keplerParsed.source?.sha256);
  }
}
const journeyModules=['menu','practiceProfile','campaignResume','campaignPolicy','observations','operationsPreview','journeyBar','dialogFocus'];
for(const name of ['sourceData','sourceUI','consequences','missionGuide',...journeyModules])fs.copyFileSync(path.join(project,'Tools/EmbeddedUI',name+'.js'),path.join(target,'js/unity',name+'.js'));
const workshop=fs.readFileSync(path.join(source,'js/three/workshopView.js'),'utf8')
  .replace("from './sceneKit.js'", "from '../unity/nativeSceneKit.js'")
  .replace(/thumbnail\(\)\{try\{.*?\}catch\{return null;\}\}/s,'thumbnail(){return kit.renderer.nativeThumbnail||null;}');
fs.writeFileSync(path.join(target,'js/three/workshopView.js'),workshop);
const controls=fs.readFileSync(path.join(source,'vendor/three/addons/controls/OrbitControls.js'),'utf8')
  .replaceAll('rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );','rotateUp( - 2 * Math.PI * rotateDelta.y / element.clientHeight );');
fs.writeFileSync(path.join(target,'js/unity/OrbitControls.js'),controls);
const adaptations=['js/ui/speech.js','models/manifest.json','data/world1.json','js/three/earth.js','js/three/workshopView.js','js/unity/bridge.js','js/unity/nativeSceneKit.js',
  'js/unity/OrbitControls.js','js/flightSession.js','js/unity/storageStatus.js','js/unity/floodwatch.js',
  'js/unity/scienceScenarios.js','js/unity/scienceEvidence.js','js/unity/scienceOperations.js','js/unity/scienceTransfer.js','js/unity/missionExperiment.js','js/unity/scienceUI.js',
  ...['navigation','physicalCruise','missionLifecycle','relayTraffic','missionEnd'].map(n=>'js/unity/'+n+'.js'),
  'js/unity/learningTools.js','js/unity/missionLessons.js','js/unity/reportExport.js','css/embedded.css',
  'docs/REALISM_AND_SPACE_APPS_AUDIT.md','js/unity/nasaBundles.js','js/unity/sourceData.js','js/unity/sourceUI.js','js/unity/consequences.js','js/unity/missionGuide.js',...journeyModules.map(name=>'js/unity/'+name+'.js'),...adaptBrowser(target)];
// Substantial flight modules are owned here instead of fragile string patches.
for (const [name,destination] of Object.entries({
  ...Object.fromEntries(['kestrel','condor','albatross','roc','skylark','meridian','vanguard','sprint','asterion','leviathan'].map(id=>['launcher-models/'+id+'.glb','models/launchers/'+id+'.glb'])),
  ...Object.fromEntries(['icesat-2','lro','cassini'].map(id=>['nasa-models/'+id+'.glb','models/nasa/'+id+'.glb'])),
  'launcherAdditions.js':'js/rocket/launcherAdditions.js','launcherModels.js':'js/three/launcherModels.js',
  ...Object.fromEntries(thermalParts.map(({id})=>['thermal-models/'+id+'.glb','models/thermal/'+id+'.glb'])),
  'thermalModels.js':'js/three/thermalModels.js',
  'planReadiness.js':'js/unity/planReadiness.js',
  ...Object.fromEntries(['spacecraftSystems','systemsOperations','spacecraftTests','systemsCruise'].map(name=>[name+'.js','js/unity/'+name+'.js'])),
  'rocketCarousel.js':'js/three/rocketCarousel.js','referenceCraft.js':'js/three/referenceCraft.js',
  'ascent.js':'js/engine/ascent.js','ascentLegacy.js':'js/engine/ascentLegacy.js',
  'numericalLaunch.js':'js/three/numericalLaunch.js','numericalAscent.js':'js/ui/numericalAscent.js',
  'flightFraming.js':'js/three/flightFraming.js','launchSurroundings.js':'js/three/launchSurroundings.js',
  'earthMaterial.js':'js/three/earthMaterial.js','launchVehicle.js':'js/three/launchVehicle.js',
  'solarSystemView.js':'js/three/solarSystemView.js',
  'flightFrame.js':'js/three/flightFrame.js',
  'flightCamera.js':'js/ui/flightCamera.js',
  ...Object.fromEntries(fs.readdirSync(path.join(project,'Tools/EmbeddedUI/eyes-textures')).map(name=>['eyes-textures/'+name,'textures/eyes/'+name])),
  'launchExhaust.js':'js/three/launchExhaust.js','workshop/collision.js':'js/workshop/collision.js',
  'workshop/blueprint.js':'js/workshop/blueprint.js','workshop/autonomy.js':'js/workshop/autonomy.js',
  'workshop/structure.js':'js/workshop/structure.js','workshop.js':'js/ui/workshop.js',
  'rocketSelect.js':'js/ui/rocketSelect.js',
  'brief.js':'js/ui/brief.js',
  'report.js':'js/ui/report.js',
  'featuredFlight.js':'js/unity/featuredFlight.js',
  'review.js':'js/ui/review.js',
  'stageSelect.js':'js/ui/missionSelect.js',
  'campaignAtlas.js':'js/campaignAtlas.js',
  'stageSelect.css':'css/stageSelect.css',
  'media/manchar-landsat.jpg':'images/missions/manchar-landsat.jpg',
  'media/mars-viking-globe.jpg':'images/missions/mars-viking-globe.jpg',
  'keplerDebrief.js':'js/ui/keplerDebrief.js',
  'liveAdapter.js':'js/liveAdapter.js','keplerOperations.js':'js/ui/keplerOperations.js',
  'campaignPresentation.js':'js/unity/campaignPresentation.js','campaignEvidenceView.js':'js/unity/campaignEvidenceView.js',
  'presentation/mountPanel.js':'js/presentation/mountPanel.js',
  'presentation/liveAdapterFacade.js':'js/presentation/liveAdapterFacade.js',
  'presentation/orbital-ui.js':'presentation/orbital-ui.js',
  'presentation/orbital-ui.css':'presentation/orbital-ui.css',
  'theme.css':'css/theme.css',
  'screen-layout.css':'css/screen-layout.css',
  'confirmDialog.js':'js/unity/confirmDialog.js',
  'characters.js':'js/characters.js',
  'missionArt.js':'js/ui/missionArt.js',
  'orbitOps.js':'js/three/orbitOps.js',
  'starfield.js':'js/three/starfield.js',
  'orbitSelect.js':'js/ui/orbitSelect.js',
  'orbitGlobe.js':'js/three/orbitGlobe.js',
  'missionRoute.js':'js/unity/missionRoute.js',
  'transferControl.js':'js/ui/cruise.js',
  'encounterView.js':'js/three/encounterView.js',
  'launchSpace.js':'js/three/launchSpace.js',
  'launchScene.js':'js/three/launchScene.js',
  'data/kepler-q1-v1.json':'data/kepler-q1-v1.json',
  'data/keplerDataAsset.js':'js/data/keplerDataAsset.js',
  'kepler/keplerConfig.js':'js/kepler/keplerConfig.js',
  'kepler/keplerPredictions.js':'js/kepler/keplerPredictions.js',
  'kepler/keplerSource.js':'js/kepler/keplerSource.js',
  'kepler/keplerMission.js':'js/kepler/keplerMission.js',
  'kepler/keplerMapping.js':'js/kepler/keplerMapping.js',
  'kepler/keplerInvestigation.js':'js/kepler/keplerInvestigation.js'
})) {
 const srcPath = path.join(project, 'Tools/EmbeddedUI', name);
 const destPath = path.join(target, destination);
 fs.mkdirSync(path.dirname(destPath), { recursive: true });
 fs.copyFileSync(srcPath, destPath);
 if(!adaptations.includes(destination))adaptations.push(destination);
}
fs.writeFileSync(path.join(target,'dependency-manifest.json'),JSON.stringify({
  schemaVersion:2, referenceInputLockSha256:sha256(lockFile),
  ownedInputs:inventory(path.join(project,'Tools/EmbeddedUI'),{skipDirectories:['node_modules','dist']}).filter(e=>!e.file.endsWith('.cs')),
  outputInventory:inventory(target), reference:JSON.parse(fs.readFileSync(path.join(source,'data/build-identity.json'))),
  adaptations:adaptations.map(file=>({file,packagedSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(target,file))).digest('hex')})),
  files:records.map(record=>({...record, packagedSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(target,record.file))).digest('hex')}))
},null,2)+'\n');
const result=publishPackage(target,output,{manifestRecovery:path.join(project,'Verification/PackagingRecovery/Manifests')});
console.log('Packaged '+records.length+' reference runtime files into '+output+'; complete staged inventory '+result.currentFiles+' files.');
} finally {if(fs.existsSync(target))fs.rmSync(target,{recursive:true});}

