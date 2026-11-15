import {createOrbitGlobe} from './orbitGlobe.js';
import {presetOrbit,orbitalPeriod,BODIES,RAD} from '../engine/orbitalGeometry.js';
let active=null;
export function closeOrbitViewer(){active?.();active=null;}
export function openOrbitViewer(allowedOrbitIds,currentOrbitId,data,onSelect){
 closeOrbitViewer();let selected=currentOrbitId||allowedOrbitIds[0];
 const modal=document.createElement('div');modal.className='orbit-modal-backdrop';modal.innerHTML=`<div class="orbit-modal-dialog"><div class="orbit-canvas-wrap"></div><div class="orbit-modal-top"><h2>Orbital geometry</h2><button class="btn" id="close-orbits">Close</button></div><div class="orbit-chips-bar">${allowedOrbitIds.map(id=>`<button class="btn" data-orbit="${id}">${id.toUpperCase()}</button>`).join('')}</div><div class="orbit-info-card"><p id="orbit-detail"></p><button class="btn btn-primary" id="confirm-orbit">Select orbit</button></div></div>`;
 document.body.append(modal);const view=createOrbitGlobe(modal.querySelector('.orbit-canvas-wrap'),{orbits:allowedOrbitIds.map(id=>({id})),selectedId:selected,onSelect:choose});
 function choose(id){selected=id;view.select(id);const o=presetOrbit(id);modal.querySelector('#orbit-detail').textContent=o?`${o.body} frame / ${((o.semiMajorAxisM-BODIES[o.body].radiusM)/1000).toFixed(0)} km altitude / ${(o.inclinationRad/RAD).toFixed(1)} degrees / ${(orbitalPeriod(o)/60).toFixed(1)} min period`:'Distant destination schematic; no halo or transfer propagated.';}
 modal.querySelectorAll('[data-orbit]').forEach(b=>b.onclick=()=>choose(b.dataset.orbit));modal.querySelector('#close-orbits').onclick=closeOrbitViewer;modal.querySelector('#confirm-orbit').onclick=()=>{onSelect?.(selected);closeOrbitViewer();};active=()=>{view.destroy();modal.remove();};choose(selected);
}
