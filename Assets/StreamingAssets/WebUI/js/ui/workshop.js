import {escapeHtml as escape} from './html.js';
import {resolveFlightDesign} from '../flightConfiguration.js';
import {launcherFor} from '../rocket/engineering.js';
import {ACADEMY_KIT,academyBlueprint,academyDesign,academyCheckpoint,introduceFault,advanceAcademy,saveAcademy} from '../academy.js';
import {academyGuide,bindAcademyGuide} from './academyGuide.js';
import {summarizeBlueprint} from '../workshop/librarySummary.js';
import {getState,setDesign,saveProgress} from '../state.js';
import {showScreen} from './router.js';
import {getUnlocked,evaluateDesign,checkLaunchGate} from '../engine.js';
import {copy,uid,catalog,instance,makeBlueprint,projectAssembly,placementIssues} from '../workshop/blueprint.js';
import {mountPanel} from '../presentation/mountPanel.js';
import {geometryIssues, stowedEnvelope} from '../workshop/collision.js';
import {createHistory} from '../workshop/history.js';
import {createLibrary} from '../workshop/library.js';
import {metadata,structure,FACE_NAMES,surfaces} from '../workshop/structure.js';
import {readEconomy,purchase,difficultyLabel} from '../workshop/economy.js';
import {createWorkshopView} from '../three/workshopView.js';

const categories=[['all','All'],['bus','Buses'],['panel','Solar wings'],['battery','Batteries'],['comms','Communications'],['computer','Computers'],['pointing','Attitude'],['fuel','Propulsion'],['instrument','Payloads']];

export function renderWorkshop(container,data,params={}){
 const training=params.academy;
 const library=createLibrary(data);let build,notice='',saved=null,selected=null,tab='all',query='',availableOnly=false,compatibleOnly=false,comparisons=[],mission=params.mission?data.missions.find(m=>m.id===getState().currentDesign.missionId):null,preview=null,alive=true;
 try{build=library.recover();}catch(error){notice='Draft recovery failed: '+error.message;}
 if(!build)build=makeBlueprint(getState().currentDesign,data,'My satellite');
 if(params.fresh)build=makeBlueprint(getState().currentDesign,data,'New satellite');
 if(params.newBuild)build=makeBlueprint({busId:null},data,'New satellite');
 if(params.preset){
  const deployment={...params.preset};
  setDesign({...deployment,assembly:null,rocketId:null,rocketBlueprint:null,planId:null,flightPlan:null});
  build=makeBlueprint(deployment,data,mission.name+' satellite');
 }
 if(params.blueprint)build=copy(params.blueprint);
 if(training){build=academyBlueprint(training,data);mission=data.missions.find(m=>m.id==='tutorial');}
 for(const [i,c]of build.assembly.components.filter(c=>catalog(data,c.catalogId)?.type==='fuel').entries())c.configuration.propulsionPort??=i;
 let history=createHistory(build),dirty=Boolean(build.assembly.busId||build.assembly.components.length);
 try{const named=library.list().find(b=>b.id===build.id);if(named){saved=JSON.stringify(named);dirty=JSON.stringify(build)!==saved;}}catch(error){notice=error.message;}

 container.innerHTML=`<section class="satellite-workshop" data-screen="workshop"><header class="ws-header"><div class="ws-header-left"><button class="btn ws-btn-subtle" id="ws-home">← Mission control</button><div class="ws-build-info"><span class="ws-eyebrow">Satellite Workshop</span><div class="ws-name-row"><label for="ws-name" class="ws-name-label">Craft:</label><input id="ws-name" maxlength="100" placeholder="Satellite name" aria-label="Satellite build name"><span id="ws-status" role="status" class="ws-status-badge"></span></div></div></div><div class="ws-header-actions"><div class="ws-action-group ws-primary-actions" role="toolbar" aria-label="Craft editing"><button class="btn" id="ws-undo" title="Undo change (Ctrl+Z)">Undo</button><button class="btn" id="ws-redo" title="Redo change (Ctrl+Y)">Redo</button><button class="btn ws-btn-save" id="ws-save">Save</button></div><div class="ws-action-group ws-secondary-actions" role="toolbar" aria-label="Craft management"><button class="btn" id="ws-save-as">Save As</button><button class="btn" id="ws-export">Export draft</button><button class="btn" id="ws-library">My Satellites</button><button class="btn" id="ws-new">New</button>${mission?'':'<button class="btn" id="ws-missions-top">Choose mission</button>'}</div></div></header><p id="ws-notice" role="status"></p><p id="ws-readiness" role="status"></p>
 ${training?academyGuide(training):''}<div class="ws-layout"><aside class="ws-catalogue"><h1>Equipment catalogue</h1><p id="ws-wallet"></p><input id="ws-search" type="search" placeholder="Search equipment" aria-label="Search equipment"><label><input id="ws-available" type="checkbox"> Available only</label><label><input id="ws-compatible" type="checkbox"> Compatible with current bus</label><button class="btn" id="ws-compare">Compare selected (0/2)</button><div id="ws-tabs" role="group" aria-label="Equipment categories"></div><div id="ws-cards"></div></aside>
 <main class="ws-centre"><div class="ws-view" id="ws-view"></div><div class="ws-camera" role="group" aria-label="Spacecraft camera">${['Front','Back','Left','Right','Top','Bottom','Free'].map(n=>`<button class="btn" data-view="${n}">${n}</button>`).join('')}</div><div class="ws-view-options"><label><input id="ws-interior" type="checkbox"> Interior / cutaway</label><label><input id="ws-stowed" type="checkbox"> Stowed</label><label><input id="ws-surfaces" type="checkbox"> Face labels</label></div><details class="ws-snap"><summary>Snapping options</summary><label><input id="ws-surface-snap" type="checkbox" checked> Surface snap</label><label>Grid <select id="ws-grid"><option value="0.025">0.025 m</option><option value="0.05">0.05 m</option><option value="0.1">0.1 m</option><option value="0">Off</option></select></label><label>Angle <select id="ws-angle"><option value="15">15°</option><option value="5">5°</option><option value="45">45°</option><option value="0">Off</option></select></label></details><p>+X Right · +Y Top · +Z Front · metres. Select equipment, then drag its amber/green handles. Escape cancels. Default surface/grid snap: 0.025 m; rotation snap: 15°.</p></main>
 <aside class="ws-inspector"><section id="ws-selected"></section><details open><summary>Installed components <span id="ws-installed-count"></span></summary><div id="ws-installed"></div></details><details open><summary>Engineering & readiness</summary><div id="ws-fit-panel"></div><div id="ws-engineering"></div></details><details><summary>Blueprint role tags & notes</summary><label>Role tags (comma separated)<input id="ws-tags" maxlength="2000"></label><label>Design notes<textarea id="ws-description" maxlength="10000" rows="4"></textarea></label></details></aside></div>
 <footer class="ws-actions"><div id="ws-mission"></div><button class="btn btn-primary" id="ws-review">Continue to launch review →</button></footer><div id="ws-dialog"></div></section>`;

 const find=id=>container.querySelector('#'+id);let importEpoch=0;
 const fitPanel=mountPanel(find('ws-fit-panel'),'fit',{name:'Stowed dimensions'});
 if(training){
  for(const id of ['ws-save','ws-save-as','ws-export','ws-library','ws-new','ws-missions-top','ws-review-top','ws-deployment','ws-missions','ws-review','ws-wallet']){const el=find(id);if(el)el.hidden=true;}
  bindAcademyGuide(container,training,{
   back:()=>showScreen('academy'),skip:()=>showScreen('missionSelect'),next:()=>{
    if(training.furthest<=training.step&&!academyCheckpoint(training,build.assembly,data))return;
    if(training.step===3&&training.furthest<4){introduceFault(build.assembly,data);persistDraft();}
    advanceAcademy(training);showScreen('academy');
   }
  });
 }

 const view=createWorkshopView(find('ws-view'),data,{
  onSelect(id){selected=id;view.select(id);inspector();},
  onMove(c){c.placementStatus="placed";mutate(b=>{b.assembly.components=b.assembly.components.map(p=>p.instanceId===c.instanceId?c:p);syncSymmetry(b,c);});},
  onPreview(c){preview=c;find('ws-notice').textContent=c?'Placement preview · '+(c.attachmentSurfaceId||c.bayId)+' · '+(placementIssues({...build.assembly,components:build.assembly.components.map(p=>p.instanceId===c.instanceId?c:p)},data).filter(i=>i.instanceId===c.instanceId).map(i=>i.message).join(' ')||'Valid mount'):'Manipulation cancelled';}
 });

 function unlocked(){if(training)return ACADEMY_KIT;const u=getUnlocked(data,Object.keys(getState().completedMissions));return [...u.parts,...u.instruments];}
 function syncSymmetry(b,c){if(!c.symmetryId)return;const opposite={left:'right',right:'left',front:'back',back:'front'};for(const other of b.assembly.components)if(other.instanceId!==c.instanceId&&other.symmetryId===c.symmetryId){other.attachmentSurfaceId=opposite[c.attachmentSurfaceId]||c.attachmentSurfaceId;other.localPosition=[-c.localPosition[0],c.localPosition[1],0];other.localRotation=[0,-c.localRotation[1],0];other.placementStatus=c.placementStatus;}}
 function persistDraft(){if(training){training.blueprint=copy(build);return saveAcademy(training);}try{library.draft(build);return true;}catch(error){notice='Draft not saved: '+error.message;return false;}}
 function mutate(change){const next=copy(build);change(next);next.name=find('ws-name').value.trim()||'Untitled satellite';next.updatedAt=new Date().toISOString();history.commit(next);build=history.value;dirty=true;persistDraft();render();}
 function save(as=false){if(training)return false;find('ws-status').textContent='Saving…';try{const next=copy(build);next.name=find('ws-name').value.trim()||'Untitled satellite';if(as){next.id=uid();next.createdAt=new Date().toISOString();}next.thumbnail=view.thumbnail();const stored=library.save(next);build=stored;if(as)history=createHistory(build);else history.replaceCurrent(build);saved=JSON.stringify(stored);dirty=false;notice='Satellite saved.';persistDraft();render();return true;}catch(error){notice='Save failed: '+error.message;find('ws-status').textContent='Save error';find('ws-notice').textContent=notice;return false;}}

 function dialog(title,body,buttons){importEpoch++;const returnFocus=document.activeElement,host=find('ws-dialog');host.innerHTML=`<div class="ws-modal-backdrop"><section class="ws-modal" role="dialog" aria-modal="true" aria-labelledby="ws-modal-title"><h2 id="ws-modal-title">${escape(title)}</h2>${body}<div class="ws-modal-actions">${buttons.map((b,i)=>`<button class="btn" data-choice="${i}">${escape(b[0])}</button>`).join('')}</div></section></div>`;buttons.forEach((b,i)=>host.querySelector(`[data-choice="${i}"]`).onclick=()=>{host.innerHTML='';importEpoch++;b[1]?.();if(!host.children.length&&returnFocus?.isConnected)returnFocus.focus();});host.querySelector('button')?.focus();}
 function guard(action){if(!dirty){action();return;}dialog('Unsaved changes','<p>Save this named satellite before continuing?</p>',[['Save and continue',()=>{if(save())action();}],['Discard changes and continue',()=>{build=saved?JSON.parse(saved):makeBlueprint({busId:null},data,'New satellite');history=createHistory(build);selected=null;dirty=false;persistDraft();setDesign(projectAssembly({...getState().currentDesign,assembly:build.assembly},data));saveProgress();action();}],['Cancel',()=>find('ws-name').focus()]]);}
 function load(b,isNamed=true){build=copy(b);selected=null;history=createHistory(build);saved=isNamed?JSON.stringify(b):null;dirty=!isNamed;persistDraft();render();}

 function showLibrary(){if(training)return;let list;try{list=library.list();}catch(error){notice=error.message;render();return;}
  dialog('My Satellites',`<p>Saved in this browser at ${escape(location.origin)}. Other browsers, addresses and ports have separate saves. Export JSON for portable backups; there is no cloud sync.</p><p>Blueprints are independent of missions. Imported locked or unknown equipment remains a draft and cannot launch.</p><div class="ws-library-list">${list.map(b=>{const summary=summarizeBlueprint(b,data,{mission,deployment:getState().currentDesign,allowed:unlocked()});return `<article>${b.thumbnail?`<img src="${escape(b.thumbnail)}" alt="Satellite thumbnail">`:''}<strong>${escape(b.name)}</strong><small>${escape(b.tags.join(' · ')||'No role tags')}<br>${escape(new Date(b.updatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}))}<br>${summary.engineering.launchMass.toFixed(1)} kg · ${summary.engineering.panelPower.toFixed(0)} W · ${summary.engineering.batteryUsableWh.toFixed(0)} Wh usable<br>Payload: ${escape(summary.payloads.join(', ')||'None')}<br>${escape(summary.status)}</small><button class="btn" data-load="${escape(b.id)}">Load</button><button class="btn" data-export="${escape(b.id)}">Export</button><button class="btn" data-library-duplicate="${escape(b.id)}">Duplicate</button><button class="btn" data-rename="${escape(b.id)}">Rename</button><button class="btn" data-delete="${escape(b.id)}">Delete</button></article>`;}).join('')||'<p>No named satellites yet.</p>'}</div><label>Import blueprint JSON <input id="ws-import" type="file" accept=".json,application/json"></label>`,[['Close',()=>find('ws-library').focus()]]);
  const host=find('ws-dialog');host.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>{host.innerHTML='';guard(()=>load(list.find(p=>p.id===b.dataset.load)));});
  host.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>{const item=list.find(p=>p.id===b.dataset.export),url=URL.createObjectURL(new Blob([JSON.stringify(item,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='satellite-'+item.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);notice='Export requested. The Windows host reports when the file is saved.';find('ws-notice').textContent=notice;});
  host.querySelectorAll('[data-library-duplicate]').forEach(button=>button.onclick=()=>{try{const duplicate=copy(list.find(b=>b.id===button.dataset.libraryDuplicate)),links=new Map();duplicate.id=uid();duplicate.name=(duplicate.name+' copy').slice(0,100);duplicate.createdAt=duplicate.updatedAt=new Date().toISOString();for(const c of duplicate.assembly.components){c.instanceId=uid();if(c.symmetryId){if(!links.has(c.symmetryId))links.set(c.symmetryId,uid());c.symmetryId=links.get(c.symmetryId);}}library.save(duplicate);showLibrary();}catch(error){notice='Duplicate failed: '+error.message;find('ws-notice').textContent=notice;}});
  host.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>dialog('Delete satellite?','<p>The working draft is preserved.</p>',[['Delete',()=>{try{library.remove(b.dataset.delete);if(build.id===b.dataset.delete){saved=null;dirty=true;notice='Named entry deleted; working draft retained.';find('ws-status').textContent='Unsaved named design';find('ws-notice').textContent=notice;}showLibrary();}catch(error){notice=error.message;render();}}],['Cancel',showLibrary]]));
  host.querySelectorAll('[data-rename]').forEach(b=>b.onclick=()=>{const item=list.find(p=>p.id===b.dataset.rename);dialog('Rename satellite','<label>Name <input id="ws-rename-name" maxlength="100" value="'+escape(item.name)+'"></label>',[['Rename',()=>{item.name=renameValue;try{library.save(item);showLibrary();}catch(error){notice=error.message;render();}}],['Cancel',showLibrary]]);let renameValue=item.name;find('ws-rename-name').oninput=e=>renameValue=e.target.value;});
  find('ws-import').onchange=async e=>{const token=++importEpoch;try{const file=e.target.files[0];if(!file)return;if(file.size>2e6)throw Error('Import exceeds 2 MB');const source=await file.text();if(token!==importEpoch||!host.querySelector('#ws-import'))return;const b=library.import(source);b.id=uid();host.innerHTML='';guard(()=>{load(b,false);dirty=true;notice='Imported working draft. Save to add it to My Satellites.';render();});}catch(error){notice='Import failed: '+error.message;find('ws-notice').textContent=notice;const feedback=host.querySelector('#ws-import-error')||document.createElement('p');feedback.id='ws-import-error';feedback.setAttribute('role','alert');feedback.textContent=notice;host.querySelector('.ws-modal')?.append(feedback);}};
 }

 function add(id){const p=catalog(data,id);if(!unlocked().includes(id))return;if(p.type==='bus'){
  const candidate=copy(build.assembly);candidate.busId=id;const conflicts=placementIssues(candidate,data);const unresolved=new Set(conflicts.map(i=>i.instanceId));
  const apply=()=>mutate(b=>{b.assembly.busId=id;for(const c of b.assembly.components)if(unresolved.has(c.instanceId))c.placementStatus='needs-placement';});
  if(build.assembly.busId&&build.assembly.busId!==id)dialog('Replace bus?',`<p>All ${build.assembly.components.length} component identities and placements will be retained. ${build.assembly.components.length-[...unresolved].filter(v=>v!=='bus').length} components keep valid mounts. Undo restores the complete previous bus.</p><ul>${conflicts.map(i=>'<li>'+escape(catalog(data,candidate.components.find(c=>c.instanceId===i.instanceId)?.catalogId)?.name||'Bus')+': '+escape(i.message)+'</li>').join('')||'<li>All current placements fit.</li>'}</ul>`,[['Replace bus',apply],['Cancel',()=>{}]]);else apply();return;
 }
 if(!build.assembly.busId){notice='Choose a bus first.';render();return;}
 if(['computer','pointing','comms'].includes(p.type)&&build.assembly.components.some(c=>catalog(data,c.catalogId)?.type===p.type)){notice='Remove the current '+p.type+' system before adding another.';render();return;}
 mutate(b=>{const internal=metadata(p).internal;const occupied=new Set(b.assembly.components.filter(c=>c.bayId).flatMap(c=>Array.from({length:metadata(catalog(data,c.catalogId)).bayUnits},(_,i)=>Number(c.bayId?.split('-')[1]||0)+i)));let n=0;while(occupied.has(n))n++;const count=b.assembly.components.filter(c=>!c.bayId).length;const c=instance(id,internal?{bay:'bay-'+n}:{surface:p.type==='panel'?(count%2?'left':'right'):p.type==='comms'?'top':'front',position:[0,0,0]});if(p.type==='fuel'){const used=new Set(b.assembly.components.filter(v=>catalog(data,v.catalogId)?.type==='fuel').map(v=>v.configuration.propulsionPort));let port=0;while(used.has(port))port++;c.configuration.propulsionPort=port;}b.assembly.components.push(c);if(training&&p.type==='panel')training.wings[c.instanceId]=[c.attachmentSurfaceId,...c.localPosition];selected=c.instanceId;}); }

 function catalogue(){const allowed=unlocked();let coins=0;try{coins=readEconomy().coins;}catch(error){notice=error.message;}find('ws-wallet').textContent=coins+' coins · unlock once, install repeatedly';find('ws-tabs').innerHTML=categories.map(([id,name])=>`<button class="btn" data-category="${id}" aria-pressed="${tab===id}">${name}</button>`).join('');
  const items=[...data.parts,...data.instruments].filter(p=>(!training||allowed.includes(p.id))&&(!compatibleOnly||p.type==='bus'||(metadata(p).internal?metadata(p).bayUnits<=structure(build.assembly.busId).bays:metadata(p).span<=Math.min(...Object.values(structure(build.assembly.busId)).slice(0,3))))&&(tab==='all'||(data.instruments.includes(p)?'instrument':p.type)===tab)&&(!availableOnly||allowed.includes(p.id))&&(`${p.name} ${p.id}`).toLowerCase().includes(query.toLowerCase()));
  find('ws-cards').innerHTML=items.map(p=>{const locked=!allowed.includes(p.id),half=p.type==='panel'?.5:1,price=p.unlockPrice||100;return `<article class="ws-card ${locked?'locked':''}"><h3>${escape(p.name)}${half===.5?' · single wing':''}</h3><p>${(p.mass*half).toFixed(1)} kg · $${(p.cost*half).toFixed(2)}M${p.power?' · '+(p.power*half).toFixed(0)+' W':''}${p.capacityWh?' · '+p.capacityWh+' Wh':''}</p><small>${p.type==='bus'?structure(p.id).bays+' internal bays':metadata(p).internal?'Internal bay module':'Exterior surface mount'}${locked?' · LOCKED':''}</small><label><input type="checkbox" data-compare="${p.id}" ${comparisons.includes(p.id)?'checked':''}> Compare</label><details><summary>Specifications</summary><p>${escape(p.description||p.tip||'Scaled educational component.')} ${p.dataPerDay?'Data: '+p.dataPerDay+' GB/day. ':''}${p.recorderCapacityGb?'Recorder: '+p.recorderCapacityGb+' GB. ':''}${p.maxDataGbDay?'Processing: '+p.maxDataGbDay+' GB/day. ':''}${p.fuelKg?'Propellant: '+p.fuelKg+' kg. ':''}${p.baseDownlinkGbDay?'Link: '+p.baseDownlinkGbDay+' GB/day reference. ':''}${p.quality?'Pointing: '+p.quality+'. ':''}${p.requiredPointing?'Requires '+p.requiredPointing+' pointing. ':''}</p><p>${escape(p.intendedStrengths)} ${escape(p.limitations)}</p><p>${p.dimensionsM?'Dimensions: '+p.dimensionsM.map(n=>n.toFixed(2)).join(' × ')+' m':'Installation: '+p.bayUnits+' bay units / '+p.installationVolumeM3.toFixed(4)+' m³ module envelope'}. Parent: bus. Prerequisites: none${p.unlock?.startsWith('after_')?'; campaign grant '+escape(p.unlock):''}.</p></details><button class="btn" data-preview="${p.id}">Preview equipment</button>${locked?`<button class="btn" data-buy="${p.id}" ${coins<price?'disabled':''}>Unlock · ${price} coins → ${Math.max(0,coins-price)} left</button>`:`<button class="btn" data-add="${p.id}">${p.type==='bus'?'Choose bus':'Install'}</button>`}</article>`;}).join('')||'<p>No equipment matches.</p>';
 }

 function formatLocation(c){
  if(c.bayId){
   const bayNum=c.bayId.replace(/^bay-/,'');
   return `Internal bay ${bayNum}`;
  }
  if(c.attachmentSurfaceId){
   const face=c.attachmentSurfaceId.charAt(0).toUpperCase()+c.attachmentSurfaceId.slice(1);
   return `${face} face`;
  }
  return 'Unassigned mount';
 }

 function inspector(){const c=build.assembly.components.find(p=>p.instanceId===selected),p=(c?catalog(data,c.catalogId):catalog(data,build.assembly.busId))||{name:'Unresolved catalogue entry: '+(c?.catalogId||build.assembly.busId||'no bus'),mass:0,cost:0,power:0,type:'unknown'};find('ws-selected').innerHTML=!c?`<h2>${selected==='bus'?escape(p?.name||'Bus inspector'):'Selected component'}</h2><p>${selected==='bus'?(p.type==='unknown'?'Missing catalogue definition. Choose a known bus to certify structural capacity.':'Structural origin: launch adapter. '+structure(build.assembly.busId).bays+' internal bays.'):'Click equipment or use the installed list.'}</p>`:`<h2>${escape(p.name)}</h2><small class="ws-detail-meta">${escape(formatLocation(c))} · ${escape(c.placementStatus)}</small><div class="ws-edit-tools"><button class="btn" data-tool="move" ${p.type==='unknown'?'disabled':''}>Move</button><button class="btn" data-tool="rotate" ${metadata(p).internal||p.type==='unknown'?'disabled title="Fixed bay or unresolved mounting interface"':''}>Rotate</button><button class="btn" data-tool="duplicate">Duplicate</button><button class="btn" data-tool="remove">Remove</button><button class="btn" data-tool="reset">Reset placement</button><button class="btn" data-tool="mirror" ${metadata(p).internal||p.type==='unknown'?'disabled':''}>${c.symmetryId?'Unlink symmetry':'Mirror & link'}</button></div>${metadata(p).internal?`<label>Internal bay (0–${structure(build.assembly.busId).bays-1})<input id="ws-bay" type="number" min="0" step="1" value="${Number(c.bayId.split('-')[1])}"></label>`:`<label>Attachment face<select id="ws-face">${FACE_NAMES.map(n=>`<option ${n===c.attachmentSurfaceId?'selected':''}>${n}</option>`).join('')}</select></label><div class="ws-numeric">${['U (m)','V (m)','Normal offset (m)','Mount angle (°)'].map((name,i)=>`<label>${name}<input data-coordinate="${i}" type="number" step="${i===3?15:.025}" value="${i===3?c.localRotation[1]:c.localPosition[i]}"></label>`).join('')}</div>`}${p.type==='fuel'?`<label>Thruster port (0–${structure(build.assembly.busId).propulsionPorts-1})<input id="ws-propulsion-port" type="number" min="0" max="${structure(build.assembly.busId).propulsionPorts-1}" value="${c.configuration.propulsionPort??0}"></label>`:''}<p class="ws-selected-specs">${p.mass*(p.type==='panel'?.5:1)} kg · ${metadata(p).bayUnits} ${metadata(p).internal?'bay unit(s)':'mount'} · ${(p.power||0)*(p.type==='panel'?.5:1)} W ${p.type==='panel'?'generation':'draw'}</p><p>${placementIssues(build.assembly,data,unlocked()).filter(i=>i.instanceId===c.instanceId).map(i=>escape(i.message)).join('<br>')||'Mount valid'}</p>`;
  find('ws-installed-count').textContent='('+build.assembly.components.length+')';find('ws-installed').innerHTML=`<button data-select="bus" class="btn ws-installed-part ${selected==='bus'?'is-selected':''}" aria-pressed="${selected==='bus'}"><span class="ws-part-title">${escape(catalog(data,build.assembly.busId)?.name||(build.assembly.busId?'Unresolved bus '+build.assembly.busId:'No bus'))}</span><small class="ws-part-meta">Structural core · ${structure(build.assembly.busId)?.bays||0} bays</small></button>`+build.assembly.components.map(c=>{const partName=catalog(data,c.catalogId)?.name||(c.catalogId+' (unresolved)');const loc=formatLocation(c);const statusNotice=c.placementStatus!=='placed'?' · Needs placement':'';const isSelected=selected===c.instanceId;return `<button class="btn ws-installed-part ${isSelected?'is-selected':''}" data-select="${escape(c.instanceId)}" aria-pressed="${isSelected}"><span class="ws-part-title">${escape(partName)}</span><small class="ws-part-meta">${escape(loc)}${statusNotice}</small></button>`;}).join('');
  find('ws-installed').querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{selected=b.dataset.select;view.select(selected);inspector();coach();});
  if(p.type==='unknown'&&find('ws-selected').querySelector('.ws-selected-specs'))find('ws-selected').querySelector('.ws-selected-specs').textContent='Specifications unavailable; engineering totals include known equipment only.';
  if(!c)return;
  find('ws-face')?.addEventListener('change',e=>mutate(b=>{const item=b.assembly.components.find(p=>p.instanceId===selected);item.attachmentSurfaceId=e.target.value;item.bayId=null;item.localPosition=[0,0,0];item.placementStatus='placed';syncSymmetry(b,item);}));
  find('ws-propulsion-port')?.addEventListener('change',e=>{const port=Number(e.target.value);if(!Number.isSafeInteger(port)||port<0||port>64)return;mutate(b=>{const item=b.assembly.components.find(p=>p.instanceId===selected);item.configuration.propulsionPort=port;item.placementStatus='placed';});});
  find('ws-bay')?.addEventListener('change',e=>{if(!Number.isSafeInteger(Number(e.target.value))||Number(e.target.value)<0)return;mutate(b=>{const item=b.assembly.components.find(p=>p.instanceId===selected);item.bayId='bay-'+Number(e.target.value);item.attachmentSurfaceId=null;item.placementStatus='placed';});});
  find('ws-selected').querySelectorAll('[data-coordinate]').forEach(input=>input.onchange=()=>{const value=Number(input.value);if(!Number.isFinite(value))return;mutate(b=>{const item=b.assembly.components.find(p=>p.instanceId===selected),i=Number(input.dataset.coordinate);if(i===3)item.localRotation[1]=value;else item.localPosition[i]=value;syncSymmetry(b,item);});});
  find('ws-selected').querySelectorAll('[data-tool]').forEach(button=>button.onclick=()=>{const tool=button.dataset.tool;if(tool==='move'&&metadata(p).internal){notice='Choose an internal bay to move this module. Integrated propulsion also has a separate thruster port.';find('ws-notice').textContent=notice;find('ws-bay')?.focus();return;}if(tool==='move'||tool==='rotate'){view.mode(tool);notice=tool==='move'?'Drag a coloured handle to move across mounting faces.':'Drag the rotation ring. Snaps to 15°. Numeric angle allows precision.';find('ws-notice').textContent=notice;return;}
   if(tool==='mirror'&&!c.symmetryId&&!c.bayId){const proposal=copy(build),item=proposal.assembly.components.find(v=>v.instanceId===selected),other=copy(item);other.instanceId=uid();item.symmetryId=other.symmetryId=uid();proposal.assembly.components.push(other);syncSymmetry(proposal,item);const errors=placementIssues(proposal.assembly,data,unlocked());view.update(proposal.assembly);view.select(selected);dialog('Preview linked mirror',`<p>Original: ${escape(item.attachmentSurfaceId)} (${item.localPosition.slice(0,2).join(', ')} m). Mirror: ${escape(other.attachmentSurfaceId)} (${other.localPosition.slice(0,2).join(', ')} m).</p><p>${errors.map(i=>escape(i.message)).join('<br>')||'Both mounts are valid.'}</p>`,[['Commit mirror',()=>mutate(b=>{b.assembly=proposal.assembly;})],['Cancel',()=>view.update(build.assembly)]]);return;}
   mutate(b=>{const item=b.assembly.components.find(p=>p.instanceId===selected);if(tool==='remove'){if(item.symmetryId)for(const partner of b.assembly.components)if(partner.symmetryId===item.symmetryId&&partner!==item)delete partner.symmetryId;b.assembly.components=b.assembly.components.filter(p=>p.instanceId!==selected);selected=null;}if(tool==='duplicate'){view.mode('move');const duplicate=copy(item);duplicate.instanceId=uid();delete duplicate.symmetryId;duplicate.placementStatus='needs-placement';b.assembly.components.push(duplicate);selected=duplicate.instanceId;notice='Duplicate needs placement: choose a face or bay, then move it. Every instance counts.';}if(tool==='reset'){item.localPosition=[0,0,0];item.localRotation=[0,0,0];if(metadata(p).internal){const occupied=new Set(b.assembly.components.filter(v=>v!==item&&v.bayId).flatMap(v=>Array.from({length:metadata(catalog(data,v.catalogId)).bayUnits},(_,i)=>Number(v.bayId.split('-')[1])+i)));let n=0;while(Array.from({length:metadata(p).bayUnits},(_,i)=>n+i).some(i=>occupied.has(i)))n++;item.bayId='bay-'+n;item.attachmentSurfaceId=null;if(p.type==='fuel'){const used=new Set(b.assembly.components.filter(v=>v!==item&&catalog(data,v.catalogId)?.type==='fuel').map(v=>v.configuration.propulsionPort));let port=0;while(used.has(port))port++;item.configuration.propulsionPort=port;}}else{item.bayId=null;if(!item.attachmentSurfaceId||item.attachmentSurfaceId==='bottom')item.attachmentSurfaceId='front';}item.placementStatus='placed';syncSymmetry(b,item);}if(tool==='mirror'){if(item.symmetryId){const link=item.symmetryId;for(const v of b.assembly.components)if(v.symmetryId===link)delete v.symmetryId;}else if(!item.bayId){const other=copy(item);other.instanceId=uid();item.symmetryId=other.symmetryId=uid();b.assembly.components.push(other);syncSymmetry(b,item);notice='Mirrored pair linked. Both placements are validated; undo removes the pair.';}}});
  });
 }

 function coach(){
  if(!training)return;
  const targets=[
   ['[data-add^="bus_"]','[data-view]:not([data-view="Free"])'],
   ['[data-add="panel_m"]','#ws-installed [data-select]:not([data-select="bus"])','[data-coordinate="0"]','#ws-stowed'],
   ['[data-add="battery_m"]','[data-add="computer_basic"]'],
   ['[data-add="optical_camera"]','[data-add="comms_x_band"]'],
   ['#ws-installed','[data-tool="reset"]','#ws-engineering']
  ];
  container.querySelectorAll('.academy-target').forEach(el=>el.classList.remove('academy-target'));
  for(const selector of targets[training.step]||[])container.querySelectorAll(selector).forEach(el=>el.classList.add('academy-target'));
  find('academy-next').disabled=training.furthest<=training.step&&!academyCheckpoint(training,build.assembly,data);
 }

 function render(){if(!alive)return;
  find('ws-name').value=build.name;find('ws-tags').value=build.tags.join(', ');find('ws-description').value=build.description;find('ws-status').textContent=dirty?'Unsaved named design':'Saved';find('ws-notice').textContent=notice;find('ws-undo').disabled=!history.canUndo;find('ws-redo').disabled=!history.canRedo;catalogue();view.update(build.assembly);view.select(selected);inspector();coach();
  const design=training?academyDesign(build.assembly,data):resolveFlightDesign(projectAssembly({...getState().currentDesign,assembly:build.assembly,missionId:mission?.id||null},data)),e=evaluateDesign(design,data),issues=placementIssues(build.assembly,data,unlocked()),checks=mission?checkLaunchGate(design,data).filter(c=>!c.ok&&!c.id.startsWith('placement-')):[];
  const launcher=launcherFor(design,data);
  const fairingIssues=launcher?geometryIssues(build.assembly,data,launcher).filter(i=>i.code?.startsWith('fairing')): [];
  
  // Separate into 4 distinct checks
  const check1_mountFace = issues.filter(i => i.checkCategory === 'mount_face' || (!i.code?.startsWith('fairing') && i.checkCategory !== 'stowed_clearance' && i.checkCategory !== 'deployment_clearance'));
  const check2_stowed = issues.filter(i => i.checkCategory === 'stowed_clearance' || i.code === 'stowed_clearance');
  const check3_deployment = issues.filter(i => i.checkCategory === 'deployment_clearance' || i.code === 'deployment_clearance');
  const check4_fairing = [...issues.filter(i => i.checkCategory === 'fairing_fit' || i.code?.startsWith('fairing')), ...fairingIssues];

  const envelope=build.assembly.busId?stowedEnvelope(build.assembly,data):null;
  const dimension=(value,limit)=>value.toFixed(3)+(Number.isFinite(limit)?' / '+limit.toFixed(3):'')+' m';
  fitPanel.update({
   name:'Stowed dimensions',
   message:!envelope?'Install a bus to measure the assembly.':launcher?'Measured assembly / '+launcher.name+' usable limit.':'Choose a launcher to compare usable limits.',
   metrics:envelope?[
    {label:'Radius',value:dimension(envelope.radiusM,launcher?.fairingRadiusM)},
    {label:'Height',value:dimension(envelope.heightM,launcher?.fairingHeightM)},
   ]:[],
  });

  const warnings=[];if(e.margins.power>=0&&e.margins.power<.15)warnings.push('Low solar power margin.');if(e.margins.battery>=0&&e.margins.battery<.15)warnings.push('Low eclipse battery margin.');if(e.margins.downlink<0)warnings.push('Payload production exceeds forecast downlink; schedule transmissions and protect the recorder.');if(mission&&(mission.orbitFit?.[design.orbitId]||0)<.7)warnings.push('This destination has poor suitability for the mission.');if(!mission){if(!design.computerId)warnings.push('Add a flight computer.');if(!design.commsId)warnings.push('Add communications.');if(!design.pointingId)warnings.push('Add attitude control.');if(!design.instrumentIds.length)warnings.push('Choose a payload for a mission role.');if(e.panelPower<e.averageLoad*1.1)warnings.push('Solar power is below the general engineering reserve.');if(e.batteryUsableWh<=0)warnings.push('Add battery reserve.');}for(const c of build.assembly.components)if(catalog(data,c.catalogId)?.type==='panel'&&Math.abs(Math.cos(c.localRotation[1]*Math.PI/180))<.95)warnings.push((catalog(data,c.catalogId)?.name||'Solar wing')+' ('+formatLocation(c)+') collects '+((.65+.35*Math.abs(Math.cos(c.localRotation[1]*Math.PI/180)))*100).toFixed(0)+'% of nominal output at this mounting angle.');
  const bayUsage=build.assembly.components.filter(c=>c.bayId).reduce((s,c)=>s+metadata(catalog(data,c.catalogId)).bayUnits,0);

  find('ws-engineering').innerHTML=`<dl><dt>${issues.some(i=>i.message.includes('Unknown'))?'Known mass only':'Launch mass'}</dt><dd>${e.launchMass.toFixed(1)} kg</dd><dt>Construction</dt><dd>$${e.partsCost.toFixed(2)}M</dd><dt>Power / load</dt><dd>${e.panelPower.toFixed(0)} / ${e.averageLoad.toFixed(0)} W</dd><dt>Usable battery</dt><dd>${e.batteryUsableWh.toFixed(0)} Wh · ${e.averageLoad?(e.batteryUsableWh/e.averageLoad).toFixed(1):'∞'} h endurance</dd><dt>Recorder</dt><dd>${catalog(data,design.computerId)?.recorderCapacityGb||0} GB</dd><dt>Payload interfaces</dt><dd>${design.instrumentIds.length} / ${data.parts.find(p=>p.id===design.busId)?.slots||0}</dd><dt>Data / downlink</dt><dd>${e.dataPerDay.toFixed(1)} / ${e.downlinkPerDay.toFixed(1)} GB/day</dd><dt>Internal bays</dt><dd>${bayUsage} / ${structure(build.assembly.busId).bays}</dd><dt>Fuel / lifetime</dt><dd>${e.fuelKg.toFixed(0)} kg / ${mission?e.lifetimeAchieved.toFixed(1)+' years':'choose mission'}</dd></dl><p>${mission?'Mission cost: $'+e.totalCost.toFixed(2)+'M':'No mission selected · General engineering only'}</p>
  
  <div class="ws-checks-panel">
    <h3>Engineering clearance & fit checks</h3>
    <div class="ws-check-card ${check1_mountFace.length ? 'ws-check-fail' : 'ws-check-pass'}">
      <strong>1. Mount faces & attachment:</strong> ${check1_mountFace.length ? `<span class="text-red">⚠ ${check1_mountFace.length} error(s)</span>` : '<span class="text-green">✓ Valid mounts</span>'}
      ${check1_mountFace.map(i => `<div class="ws-issue-row"><p>⚠ ${escape(i.message)}</p>${i.repair?.command === 'snapFlush' ? `<button class="btn btn-sm" data-action="snapFlush" data-part="${i.instanceId}">Snap flush (0 mm)</button>` : ''}${i.repair?.command === 'resetRotation' ? `<button class="btn btn-sm" data-action="resetRotation" data-part="${i.instanceId}">Reset rotation</button>` : ''}</div>`).join('')}
    </div>
    <div class="ws-check-card ${check2_stowed.length ? 'ws-check-fail' : 'ws-check-pass'}">
      <strong>2. Stowed clearance:</strong> ${check2_stowed.length ? `<span class="text-red">⚠ Clearance violation</span>` : '<span class="text-green">✓ Stowed clear</span>'}
      ${check2_stowed.map(i => `<div class="ws-issue-row"><p>⚠ ${escape(i.message)}</p></div>`).join('')}
    </div>
    <div class="ws-check-card ${check3_deployment.length ? 'ws-check-fail' : 'ws-check-pass'}">
      <strong>3. Deployment sweep clearance:</strong> ${check3_deployment.length ? `<span class="text-red">⚠ Sweep collision</span>` : '<span class="text-green">✓ Sweep clear</span>'}
      ${check3_deployment.map(i => `<div class="ws-issue-row"><p>⚠ ${escape(i.message)}</p></div>`).join('')}
    </div>
    <div class="ws-check-card ${check4_fairing.length ? 'ws-check-fail' : 'ws-check-pass'}">
      <strong>4. Fairing usable envelope:</strong> ${check4_fairing.length ? `<span class="text-red">⚠ Fairing envelope exceeded</span>` : `${launcher ? `<span class="text-green">✓ Fits ${escape(launcher.name)}</span>` : '<span>Choose a launcher to check stowed fit.</span>'}`}
      ${check4_fairing.map(i => `<div class="ws-issue-row"><p>⚠ ${escape(i.message)}</p><button class="btn btn-sm" data-action="navLauncher">Choose compatible launcher →</button></div>`).join('')}
    </div>
  </div>

  <div class="ws-errors">${checks.map(i=>`<p>⚠ ${escape(i.message)}</p>`).join('')}${warnings.map(w=>'<p>Advisory: '+escape(w)+'</p>').join('')}</div>`;

  // Bind interactive fix buttons
  find('ws-engineering').querySelectorAll('[data-action="snapFlush"]').forEach(btn => {
   btn.onclick = () => {
    const partId = btn.dataset.part;
    mutate(b => {
     for (const c of b.assembly.components) {
      if (!partId || c.instanceId === partId) {
       c.localPosition[2] = 0;
       const s = surfaces(b.assembly.busId)[c.attachmentSurfaceId];
       if (s) {
        const maxU = s.size[0] / 2 - 0.05, maxV = s.size[1] / 2 - 0.05;
        c.localPosition[0] = Math.max(-maxU, Math.min(maxU, c.localPosition[0]));
        c.localPosition[1] = Math.max(-maxV, Math.min(maxV, c.localPosition[1]));
       }
       syncSymmetry(b, c);
      }
     }
    });
    notice = 'Snapped mount flush to surface.';
    render();
   };
  });

  find('ws-engineering').querySelectorAll('[data-action="resetRotation"]').forEach(btn => {
   btn.onclick = () => {
    const partId = btn.dataset.part;
    mutate(b => {
     for (const c of b.assembly.components) {
      if (!partId || c.instanceId === partId) {
       c.localRotation = [0, 0, 0];
       syncSymmetry(b, c);
      }
     }
    });
    notice = 'Reset mount rotation.';
    render();
   };
  });

  find('ws-engineering').querySelectorAll('[data-action="navLauncher"]').forEach(btn => {
   btn.onclick = continueToLauncher;
  });

  const totalGeometryErrors = issues.length + check4_fairing.length;
  if(totalGeometryErrors > 0) {
   find('ws-readiness').textContent = 'Draft · ' + totalGeometryErrors + ' structural/fit error(s). ' + (issues[0] || check4_fairing[0]).message;
  } else if(checks.length > 0) {
   find('ws-readiness').textContent = 'Mission readiness: ' + checks.length + ' checks need attention. ' + checks[0].message;
  } else if(warnings.length > 0) {
   find('ws-readiness').textContent = '✓ Ready to continue — Structural checks verified. Advisory: ' + warnings[0];
  } else {
   find('ws-readiness').textContent = '✓ Ready to continue — Structural and mission checks verified.';
  }

  find('ws-mission').textContent=(mission?mission.name+' · '+difficultyLabel(mission):'Free workshop · Experiment, save, then choose a mission')+' · '+(totalGeometryErrors?totalGeometryErrors+' structural errors — draft only':'Structure valid');
  find('ws-review').disabled=!mission||totalGeometryErrors>0;
  if(design.flightWorkflow&&!training){find('ws-review').textContent='Continue to launcher →';if(find('ws-review-top'))find('ws-review-top').textContent='Continue to launcher →';}
  if(find('ws-review-top'))find('ws-review-top').disabled=find('ws-review').disabled;
 }

 find('ws-name').onchange=()=>mutate(()=>{});find('ws-tags').onchange=e=>mutate(b=>{b.tags=[...new Set(e.target.value.split(',').map(v=>v.trim()).filter(Boolean))];});find('ws-description').onchange=e=>mutate(b=>{b.description=e.target.value;});find('ws-save').onclick=()=>save();find('ws-save-as').onclick=()=>save(true);find('ws-library').onclick=showLibrary;find('ws-export').onclick=()=>{try{const b=library.import(JSON.stringify(build)),url=URL.createObjectURL(new Blob([JSON.stringify(b,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='satellite-'+b.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);notice='Export requested. The Windows host reports when the file is saved.';find('ws-notice').textContent=notice;}catch(error){notice='Export failed: '+error.message;find('ws-notice').textContent=notice;}};
 find('ws-new').onclick=()=>guard(()=>{build=makeBlueprint({busId:null},data,'New satellite');history=createHistory(build);selected=null;dirty=true;persistDraft();render();});
 find('ws-home').onclick=()=>training?showScreen('menu'):guard(()=>showScreen('menu'));
 function continueToLauncher(){guard(()=>{setDesign(projectAssembly({...getState().currentDesign,assembly:build.assembly,spacecraftName:build.name,spacecraftBlueprintId:build.id},data));saveProgress();showScreen('rocketSelect');});}
 if(find('ws-missions-top'))find('ws-missions-top').onclick=()=>guard(()=>{setDesign(projectAssembly({...getState().currentDesign,assembly:build.assembly},data));saveProgress();showScreen('missionSelect');});
 if(find('ws-review-top'))find('ws-review-top').onclick=()=>find('ws-review').click();

 find('ws-review').onclick=()=>{
  const allowed=unlocked(),issues=placementIssues(build.assembly,data,allowed);
  if(issues.length){notice=issues[0].message;render();return;}
  const design=projectAssembly({...getState().currentDesign,assembly:copy(build.assembly),spacecraftName:build.name,spacecraftBlueprintId:build.id},data);
  const launcher=launcherFor(design,data);
  if(launcher){
   const fIssues=geometryIssues(build.assembly,data,launcher).filter(i=>i.code?.startsWith('fairing'));
   if(fIssues.length){notice=fIssues[0].message;render();return;}
  }
  setDesign(design);
  if(!saveProgress()){notice='Storage error: Game progress could not be saved.';render();return;}
  showScreen(getState().currentDesign.flightWorkflow?'rocketSelect':'advisory');
 };

 find('ws-undo').onclick=()=>{build=history.undo();dirty=JSON.stringify(build)!==saved;persistDraft();render();};find('ws-redo').onclick=()=>{build=history.redo();dirty=JSON.stringify(build)!==saved;persistDraft();render();};
 find('ws-search').oninput=e=>{query=e.target.value;catalogue();};find('ws-available').onchange=e=>{availableOnly=e.target.checked;catalogue();};
 find('ws-compatible').onchange=e=>{compatibleOnly=e.target.checked;catalogue();};

 find('ws-compare').onclick=()=>{const parts=comparisons.map(id=>catalog(data,id));if(parts.length!==2){notice='Select two catalogue components to compare.';find('ws-notice').textContent=notice;return;}const fields=[['Mass','mass','kg'],['Construction cost','cost','$M'],['Power generation / draw','power','W'],['Battery capacity','capacityWh','Wh'],['Recorder','recorderCapacityGb','GB'],['Processing','maxDataGbDay','GB/day'],['Reference downlink','baseDownlinkGbDay','GB/day'],['Payload data','dataPerDay','GB/day'],['Propellant','fuelKg','kg'],['Bus load','baseLoad','W'],['Payload interfaces','slots',''],['Pointing','quality',''],['Internal bay units','bayUnits','']];dialog('Component comparison','<p>Single-wing values shown for solar equipment.</p><table><tr><th>Property</th>'+parts.map(p=>'<th>'+escape(p.name)+'</th>').join('')+'</tr>'+fields.map(([name,key,unit])=>'<tr><th>'+name+'</th>'+parts.map(p=>{let value=p[key];if(p.type==='panel'&&['mass','cost','power'].includes(key))value/=2;return '<td>'+escape(value??'—')+' '+unit+'</td>';}).join('')+'</tr>').join('')+'</table>',[['Close',()=>find('ws-compare').focus()]]);};
 find('ws-tabs').onclick=e=>{const b=e.target.closest('[data-category]');if(b){tab=b.dataset.category;catalogue();find('ws-tabs').querySelector('[data-category="'+tab+'"]')?.focus();}};

 find('ws-cards').onclick=async e=>{const compare=e.target.closest('[data-compare]');if(compare){const id=compare.dataset.compare;if(compare.checked){if(comparisons.length>=2){compare.checked=false;notice='Choose up to two components for comparison.';find('ws-notice').textContent=notice;return;}comparisons.push(id);}else comparisons=comparisons.filter(v=>v!==id);find('ws-compare').textContent='Compare selected ('+comparisons.length+'/2)';return;}const addButton=e.target.closest('[data-add]');if(addButton){add(addButton.dataset.add);return;}const previewButton=e.target.closest('[data-preview]');if(previewButton){const p=catalog(data,previewButton.dataset.preview);let previewView;dialog(p.name,'<p>Preview only — no coins spent and no equipment installed.</p><div id="ws-equipment-preview" style="height:320px;position:relative"></div>',[['Close',()=>previewView?.destroy()]]);const model=instance(p.id,metadata(p).internal?{bay:'bay-0'}:{surface:'right'});if(p.type==='fuel')model.configuration.propulsionPort=0;previewView=createWorkshopView(find('ws-equipment-preview'),data,{});previewView.update({schemaVersion:1,units:{position:'m',rotation:'degrees'},busInstanceId:'bus',busId:p.type==='bus'?p.id:build.assembly.busId||'bus_micro',components:p.type==='bus'?[]:[model]});previewView.interior(metadata(p).internal);return;}const buy=e.target.closest('[data-buy]');if(buy){const p=catalog(data,buy.dataset.buy);buy.disabled=true;try{const result=await purchase(p.id,p.unlockPrice||100);notice='Unlocked '+p.name+' · '+result.coins+' coins remaining.';}catch(error){notice=error.message;}if(alive)render();}};
 container.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view.preset(b.dataset.view);if(training&&build.assembly.busId&&b.dataset.view!=='Free'&&!training.faces.includes(b.dataset.view)){training.faces.push(b.dataset.view);saveAcademy(training);coach();}});find('ws-interior').onchange=e=>view.interior(e.target.checked);find('ws-stowed').onchange=e=>{view.fold(e.target.checked?1:0);if(training){if(e.target.checked)training.folded=true;else if(training.folded)training.unfolded=true;saveAcademy(training);coach();}};find('ws-surfaces').onchange=e=>view.surfaces(e.target.checked);

 const key=e=>{const modal=find('ws-dialog').querySelector('[role=dialog]');if(modal){if(e.key==='Escape'){e.preventDefault();[...modal.querySelectorAll('.ws-modal-actions button')].at(-1)?.click();return;}if(e.key==='Tab'){const focusable=[...modal.querySelectorAll('button:not(:disabled),input,select')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}return;}if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();find(e.shiftKey?'ws-redo':'ws-undo').click();}if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();save();}if(e.key==='Delete'&&selected&&selected!=='bus')find('ws-selected').querySelector('[data-tool="remove"]')?.click();};window.addEventListener('keydown',key);
 find('ws-surface-snap').onchange=e=>view.snap(e.target.checked);find('ws-grid').onchange=e=>view.grid(Number(e.target.value));find('ws-angle').onchange=e=>view.angle(Number(e.target.value));
 const storage=()=>{if(alive)catalogue();};window.addEventListener('storage',storage);render();if(params.library)showLibrary();
 if(params.preset||params.newBuild||params.blueprint)persistDraft();
 return ()=>{persistDraft();alive=false;window.removeEventListener('keydown',key);window.removeEventListener('storage',storage);fitPanel.destroy();view.destroy();};
}
