import {applyHDMaterials} from '../three/hdMaterials.js';
import {createCatchTower} from '../three/catchTower.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {createScene, disposeObject} from '../three/sceneKit.js';
import {fetchAsset} from '../content/inspectAsset.js';

const find = id => document.getElementById(id);
let registry, selected, abort, scene, objectUrl, generation = 0, tower = null;
const decoder = new DRACOLoader().setDecoderPath(new URL('../../vendor/three/draco/', import.meta.url).href);
const loader = new GLTFLoader().setDRACOLoader(decoder);
function status(message, error = false) {find('preview-status').textContent=message;find('preview-status').dataset.error=String(error);}
function clear() {
  generation++; tower=null;find('catch-controls').hidden=true; abort?.abort(); abort=null; scene?.destroy(); scene=null;
  if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;
  find('asset-preview').replaceChildren(); find('asset-metrics').textContent='';
  find('clear-preview').disabled=true; find('reset-view').disabled=true;
  find('load-preview').disabled=!selected?.previewUrl;
}
function details(entry) {
  clear(); selected=entry;
  find('asset-title').textContent=entry.title;
  find('asset-decision').textContent=entry.runtimeDecision;
  find('asset-details').replaceChildren();
  for(const [key,value] of Object.entries({Source:entry.sourceId,File:entry.originalPath,Bytes:entry.bytes?.toLocaleString()||'Unavailable',Credit:entry.credit,Terms:entry.declaredLicense,Verification:entry.factualVerification,Use:entry.intendedUse,Conversion:entry.conversionRequirement,SHA256:entry.sha256||'No payload'})){
    const term=document.createElement('dt'),definition=document.createElement('dd');term.textContent=key;definition.textContent=value;find('asset-details').append(term,definition);
  }
  find('load-preview').disabled=!entry.previewUrl;
  status(entry.previewUrl?'Ready to load this reference.':'Preview unavailable. '+entry.conversionRequirement);
  list();
}
function list() {
  const query=find('asset-search').value.trim().toLowerCase(), filter=find('asset-filter').value;
  const entries=registry.assets.filter(e=>(filter==='all'||(filter==='preview'?Boolean(e.previewUrl):!e.previewUrl))&&`${e.title} ${e.sourceId} ${e.intendedUse}`.toLowerCase().includes(query));
  find('asset-list').replaceChildren();find('catalog-status').textContent=`${entries.length} of ${registry.assets.length} references · no automatic asset loading`;
  for(const entry of entries){
    const button=document.createElement('button'),title=document.createElement('strong'),note=document.createElement('small');
    title.textContent=entry.title;note.textContent=`${entry.sourceId} · ${entry.previewUrl?'Preview available':entry.availability}`;
    button.append(title,note);button.setAttribute('aria-pressed',String(selected?.id===entry.id));button.onclick=()=>details(entry);find('asset-list').append(button);
  }
  if(!entries.length)find('asset-list').textContent='No matching references. Try another name or show all references.';
}
find('load-preview').onclick=async()=>{
  clear();const ticket=generation, entry=selected;abort=new AbortController();
  find('clear-preview').disabled=false;find('load-preview').disabled=true;status('Checking bytes, checksum and file signature…');
  try {
    const {buffer,inspection}=await fetchAsset(entry,{signal:abort.signal});
    if(ticket!==generation)return;
    if(inspection.kind==='image'){
      const image=new Image();image.alt=entry.title;objectUrl=URL.createObjectURL(new Blob([buffer],{type:inspection.mime}));image.src=objectUrl;
      await image.decode();if(ticket!==generation)return;
      find('asset-preview').append(image);find('asset-metrics').textContent=`${image.naturalWidth} × ${image.naturalHeight} pixels\nDecoded RGBA estimate: ${(image.naturalWidth*image.naturalHeight*4/1048576).toFixed(1)} MiB (before mipmaps).`;
    }else{
      status('Decoding model with local resources…');
      const gltf=await loader.parseAsync(buffer,'');
      if(ticket!==generation){disposeObject(gltf.scene);return;}
      let root=gltf.scene;
      const enhanced=find('hd-finish').checked;
      if(enhanced&&entry.id==='additional-2'){disposeObject(root);root=createCatchTower();tower=root;find('catch-controls').hidden=false;find('arm-opening').value='0.3';}
      else if(enhanced)applyHDMaterials(root);
      const box=new THREE.Box3().setFromObject(root), size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),longest=Math.max(...size.toArray());
      if(!Number.isFinite(longest)||longest<=0){disposeObject(root);throw new Error('Model has no finite visible geometry.');}
      const group=new THREE.Group();group.add(root);root.position.sub(center);group.scale.setScalar(6/longest);
      scene=createScene(find('asset-preview'),{position:[7,4,9]});scene.scene.add(group);
      let triangles=0, renderedMeshes=0;const renderedNames=[];root.traverse(o=>{if(o.name)renderedNames.push(o.name);if(o.isMesh){renderedMeshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position?.count||0)/3;}});
      find('asset-metrics').textContent=`Bounds in source units: ${size.toArray().map(n=>n.toFixed(3)).join(' × ')}\n${tower?'Original ORBITAL illustrative tower; paired truss arms, inward rails and sliding carriage. No catch physics.':'Source scale/pivots unverified.'} ${enhanced?'HD analytic material patterns; original source geometry unless indicated.':'Original source appearance.'} Preview normalized for viewing.\n${renderedMeshes} rendered meshes (source GLB: ${inspection.nodes} nodes / ${inspection.meshes} meshes) · ${Math.round(triangles).toLocaleString()} triangles · ${inspection.animations} animation clips\n${inspection.images} embedded images. Drag to orbit; scroll to zoom.\nNamed nodes: ${renderedNames.join(', ')||'(unnamed)'}`;
      find('reset-view').disabled=!scene.renderer;
    }
    if(scene&&!scene.renderer)status('Model checked, but 3D rendering is unavailable. Source details and geometry measurements remain readable.',true);
    else status('Preview loaded · checksum and signature match. Reference review only; runtime approval is unchanged.');
  }catch(error){if(ticket!==generation)return;clear();status(error.name==='AbortError'?'Preview cancelled.':error.message,true);}
};
find('clear-preview').onclick=()=>{clear();status('Preview cleared. Resources released; choose another reference.');};
find('reset-view').onclick=()=>{scene?.camera.position.set(7,4,9);scene?.controls?.target.set(0,0,0);scene?.controls?.update();};
find('hd-finish').onchange=()=>{if(selected?.previewUrl)find('load-preview').click();};
find('arm-opening').oninput=e=>tower?.userData.setArmOpening(Number(e.target.value));
find('catch-closeup').onclick=()=>{scene?.camera.position.set(1.8,2.0,3.0);scene?.controls?.target.set(0,1.1,.6);scene?.controls?.update();};
find('asset-search').oninput=()=>list();find('asset-filter').onchange=()=>list();
window.addEventListener('pagehide',()=>{clear();decoder.dispose();});
try{
  const response=await fetch('data/content/source-registry.json');if(!response.ok)throw new Error('Catalog is unavailable. Run node tools/build-content-registry.mjs in the project folder.');
  registry=await response.json();list();
  for(const item of registry.supplements||[]){const p=document.createElement('p'),a=document.createElement('a');a.href=item.source;a.textContent=item.id;a.target='_blank';a.rel='noopener';p.append(a,document.createTextNode(': '+item.factualUse+' · manifest: '+item.manifest));find('source-notes').append(p);}
  for(const source of registry.sources){const p=document.createElement('p');p.textContent=`${source.id}: ${source.decision}`;find('source-notes').append(p);}
}catch(error){find('catalog-status').textContent=error.message;}
