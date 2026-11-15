export function adaptSceneRepair(edit) {
  edit('js/three/localTexture.js',
    ['const texture=new THREE.Texture();', "const texture=new THREE.Texture();\n  if (typeof document === 'undefined') return texture;"]);
  edit('js/three/sceneKit.js',
    ['const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);scene.environment=space?null:environment.texture;room.dispose();pmrem.dispose();',
    `let environment = null;
  if (!space) {
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
  }`],
    ['environment.dispose();renderer.domElement', 'environment?.dispose();renderer.domElement']);

  edit('js/three/orbitOps.js',
    ["import {OPERATION_WINDOW_SEC}", "import {flightCameraInput} from './flightCameraInput.js';\nimport {OPERATION_WINDOW_SEC}"],
    [" const frame=createFlightFrame(kit.scene,kit.camera,craft,globe,orbitId,orbit);", " const input=flightCameraInput(kit.renderer?.domElement);\n const frame=createFlightFrame(kit.scene,kit.camera,craft,globe,orbitId,orbit,input);\n const hardwareFill=new THREE.DirectionalLight(0xb2cadc,.65);hardwareFill.target=craft;kit.scene.add(hardwareFill);"],
    ["kit.draw=(_dt,now)=>{assembly.animate", "kit.draw=(_dt,now)=>{frame.sample(elapsedSec);hardwareFill.position.copy(kit.camera.position);assembly.animate"],
    ["destroy(){globe.userData.stopTexture();", "destroy(){input.destroy();globe.userData.stopTexture();"],
  );
  edit('js/ui/missionControl.js',
    ['    <div class="mission-control-space" id="ops-canvas"></div><div class="control-vignette"></div>', ''],
    ['<div class="control-centre">', '<div class="control-centre"><div class="mission-control-space" id="ops-canvas"></div>'],
    ['view.setTime(seconds,{orbit:state.orbit});', 'view.setTime(seconds,{orbit:state.orbit,paused:state.paused||state.finished||Boolean(state.pendingIncident)});'],
  );
  edit('js/ui/missionSelect.js',
    ["import {observationMarkup", "import {mountSolarSystem} from '../three/solarSystemView.js';\nimport {observationMarkup"],
    [" let destroyGlobe=()=>{};", " let destroyGlobe=()=>{},destroySolar=()=>{};"],
    ["${listView?'<p>Body sizes are illustrative. Distances are listed separately.</p>':celestialDiagram(levelId)}", "${levelId==='solar'?'<div class=\"solar-system-viewport\" id=\"solar-system-viewport\" aria-label=\"Interactive Solar System\"></div><p>NASA Eyes planetary maps · Drag to orbit · Scroll to zoom · Select a planet. Distances and body sizes are compressed separately; positions are illustrative.</p>':listView?'<p>Body sizes are illustrative. Distances are listed separately.</p>':celestialDiagram(levelId)}"],
    [" cleanupMap=()=>{cleanupAgency();destroyGlobe();closeHistory?.();};", " const solarHost=find('solar-system-viewport');\n if(solarHost){const atlas=solarHost.closest('details');container.querySelector('.program-scroll')?.before(atlas);let mounted=false;atlas.addEventListener('toggle',()=>{if(atlas.open&&!mounted){mounted=true;destroySolar=mountSolarSystem(solarHost,id=>container.querySelector('.body-button[data-body=\"'+id+'\"]')?.click());}});atlas.open=true;}\n cleanupMap=()=>{cleanupAgency();destroyGlobe();destroySolar();closeHistory?.();};"],
  );
  edit('js/content/atlasTextures.js',
    ["export const atlasTexture=file=>", "for(const id of ['sun','mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune']){\n ATLAS_TEXTURES[id]={...ATLAS_TEXTURES[id],file:'../eyes/'+id+'-color.jpg',caption:'NASA/JPL-Caltech · Eyes on the Solar System · static visual map'};\n}\nEARTH_ATLAS_LAYERS.clouds.caption='NASA/JPL-Caltech · Eyes surface and separate cloud layer';\nEARTH_ATLAS_LAYERS.surface.file='../eyes/earth-color.jpg';\nEARTH_ATLAS_LAYERS.surface.caption='NASA/JPL-Caltech · Eyes static surface map';\nEARTH_ATLAS_LAYERS.night.file='../eyes/earth-night.jpg';\nEARTH_ATLAS_LAYERS.night.caption='NASA/JPL-Caltech · Eyes static night-light map';\nexport const atlasTexture=file=>"],
  );
  edit('js/contracts/missionRun.js',
    ["!['inertial','follow','fixed'].includes(run.camera.mode)",
     "!['solar','earth-moon','inertial','follow','fixed'].includes(run.camera.mode)"]
  );
}
