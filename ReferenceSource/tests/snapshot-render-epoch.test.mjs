import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';

// Setup fake DOM for loaders
const context = new Proxy({}, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => (o[k] = v, true) });
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context, append() {}, remove() {}, setAttribute() {}, style: {} }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(v) {} })
};
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, ...args) => {
  if (String(url).startsWith('file:')) return new Response(await fs.readFile(new URL(url)), { headers: { 'Content-Type': 'application/json' } });
  return nativeFetch(url, ...args);
};

const { getModel } = await import('../js/three/models.js');
const { createAssembly } = await import('../js/three/spacecraftParts.js');
const { createOrbitOps } = await import('../js/three/orbitOps.js');
const { createLaunchSpace } = await import('../js/three/launchSpace.js');
const { createOperations, stepOperations, chooseMode, MINUTES_PER_TICK } = await import('../js/engine/operations.js');
const { enrichCampaign, starterDesign } = await import('../js/campaign.js');
const { operationPoint } = await import('../js/three/orbitPresentation.js');
const { presetOrbit } = await import('../js/engine/orbitalGeometry.js');

let assertions = 0;
const check = (ok, msg) => { assert.ok(ok, msg); assertions++; };

const data = enrichCampaign(JSON.parse(await fs.readFile(new URL('../data/world1.json', import.meta.url))));
const m1 = data.missions.find(m => m.id === 'm1');
const design = starterDesign(m1, data);


for(const orbitId of ['sso','llo']){
 const orbit=presetOrbit(orbitId,{eccentricity:.04,meanAnomalyRad:1.4,raanRad:.8});
 for(const tick of [0,3,60,120]){
  const view=createOrbitOps(document.createElement('div'),{orbitId,design:{...design,orbitId},data,operationsSnapshot:{orbit},initialProgress:tick/120,initialPaused:true});
  view.draw(.016,0);check(view.craft.position.distanceTo(operationPoint(orbitId,tick*270,orbit))<1e-9,'Snapshot owns '+orbitId+' tick '+tick);
  view.draw(.05,100);check(view.craft.position.distanceTo(operationPoint(orbitId,tick*270,orbit))<1e-9,'Paused snapshot remains frozen');view.destroy();
 }
}
console.log('PASS: '+assertions+' Earth/Moon custom snapshot epoch assertions at ticks 0/3/60/120. No rasterization.');
