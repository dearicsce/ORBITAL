import { spawn } from 'node:child_process';
import fs from 'node:fs';
import * as THREE from 'three';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runChromeTest(url, viewport) {
  const tempDir = process.env.TEMP + '\\chrome-test-perf-' + Math.random().toString(36).slice(2);
  return new Promise((resolve) => {
    const proc = spawn(chromePath, [
      '--headless=new',
      '--no-sandbox',
      '--dump-dom',
      `--window-size=${viewport.width},${viewport.height}`,
      '--virtual-time-budget=12000',
      `--user-data-dir=${tempDir}`,
      url
    ],{windowsHide:true});
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
      resolve({ code, stdout, stderr });
    });
  });
}

console.log('Testing A10: Desktop (1440x900) & Narrow (390x844) Layouts...');

// 1. Desktop 1440x900
const desktopRes = await runChromeTest('http://127.0.0.1:8785/tests/visual-quality.test.html', { width: 1440, height: 900 });
const cleanDesktop = desktopRes.stdout.replace(/<script[\s\S]*?<\/script>/gi, '');
const desktopPass = cleanDesktop.match(/PASS:[^<]+/);
if (desktopRes.code !== 0 || !desktopPass) {
  throw new Error(`Desktop 1440x900 visual quality failed: code ${desktopRes.code}`);
}
console.log('Desktop 1440x900 verified:', desktopPass[0].trim());

// 2. Mobile 390x844 narrow layout container & illustrative preview HUD check (not live responsive player loop)
const mobileRes = await runChromeTest('http://127.0.0.1:8785/tests/scene-repairs.test.html?bookmark=narrow_viewport', { width: 390, height: 844 });
const cleanMobile = mobileRes.stdout.replace(/<script[\s\S]*?<\/script>/gi, '');
const mobilePass = cleanMobile.match(/PASS:[^<]+/);
if (mobileRes.code !== 0 || !mobilePass) {
  throw new Error(`Mobile 390x844 scene repairs failed: code ${mobileRes.code}; ${cleanMobile.match(/(?:FAIL:|Running)[^<]+/)?.[0] || cleanMobile.slice(-1200)}`);
}
if (!cleanMobile.includes('MISSION CONTROL') || !cleanMobile.includes('mobile-hud') || !cleanMobile.includes('Ground link active')) {
  throw new Error('Mobile narrow viewport DOM did not render preview Mission Control HUD overlay');
}
console.log('Mobile 390x844 narrow viewport verified with preview HUD overlay (live player UI loop PENDING):', mobilePass[0].trim());

// Fake DOM setup for headless Three.js loaders
const context = new Proxy({}, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => (o[k] = v, true) });
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context, append() {}, remove() {}, setAttribute() {}, style: {} }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, set src(v) {} })
};
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, ...args) => {
  if (String(url).startsWith('file:')) return new Response(await fs.promises.readFile(new URL(url)), { headers: { 'Content-Type': 'application/json' } });
  return nativeFetch(url, ...args);
};

// 3. Failure Path Injections (Missing Model & WebGL fallback)
console.log('Testing A10: Failure Injection Paths (Missing Asset & WebGL Fallback)...');
const { createLaunchScene } = await import('../js/three/launchScene.js');
const { enrichCampaign, starterDesign } = await import('../js/campaign.js');
const modelsMod = await import('../js/three/models.js');

const data = enrichCampaign(JSON.parse(fs.readFileSync('data/world1.json', 'utf8')));
const design = starterDesign(data.missions.find(m => m.id === 'm1'), data);

// Failure test 1: WebGL / 3D unavailable fallback
let webglFallbackReported = false;
let webglDoneResult = null;
const mockContainerAsset = {
  append() {},
  querySelector: () => null,
  querySelectorAll: () => []
};
const sceneWebGL = createLaunchScene(mockContainerAsset, {
  launcherId: 'kestrel',
  launchResult: { success: true },
  data,
  design,
  onPhase: text => {
    if (text.includes('3D unavailable')) webglFallbackReported = true;
  },
  onDone: res => { webglDoneResult = res; }
});
if (!webglFallbackReported) {
  throw new Error('WebGL unavailable did not trigger "3D unavailable · Use Skip to continue" fallback');
}
sceneWebGL.skip();
if (!webglDoneResult || !webglDoneResult.success) {
  throw new Error('WebGL fallback skip did not invoke onDone with launch success');
}
sceneWebGL.destroy();
console.log('WebGL failure fallback & skip recovery verified: graceful "3D unavailable" fallback triggered.');

// Failure test 2: Missing / corrupt model loading failure
let assetErrorReported = false;
let assetDoneResult = null;
const sceneAsset = createLaunchScene(mockContainerAsset, {
  launcherId: 'kestrel',
  launchResult: { success: true },
  data: { parts: null }, // Corrupted data causes assembly load to reject gracefully
  design: { busId: 'bus_micro' },
  onPhase: text => {
    if (text.includes('Unable to load launch vehicle')) assetErrorReported = true;
  },
  onDone: res => { assetDoneResult = res; }
});
await new Promise(r => setTimeout(r, 150));

if (!assetErrorReported) {
  throw new Error('Corrupt model data did not trigger "Unable to load launch vehicle" fallback');
}
sceneAsset.skip();
if (!assetDoneResult || !assetDoneResult.success) {
  throw new Error('Asset failure skip did not invoke onDone');
}
sceneAsset.destroy();
console.log('Asset failure fallback & skip recovery verified: graceful notification received without unhandled exception.');

// Failure test 3: Missing GLB file fallback to procedural geometry
const fallbackModel = await modelsMod.getModel('missing_model_test_id');
if (!fallbackModel) {
  throw new Error('Missing model did not produce a valid fallback primitive');
}
console.log('Missing asset GLB fallback verified: procedural primitive returned.');

// 4. Metrics and timing measurement
console.log('Testing A10: Runtime Metrics & Frame Timing...');
const metrics = sceneAsset.getMetrics();
if (typeof metrics.averageFrameMs !== 'number' || typeof metrics.drawCalls !== 'number') {
  throw new Error('Metrics did not expose averageFrameMs or drawCalls');
}
console.log(`Measured scene metrics: averageFrameMs = ${metrics.averageFrameMs.toFixed(1)} ms, drawCalls = ${metrics.drawCalls} (Headless Node fallback; physical display GPU FPS hardware benchmark stays PENDING)`);

console.log('PASS: A10 UI performance & failure paths verified (physical display FPS hardware benchmark stays PENDING).');
