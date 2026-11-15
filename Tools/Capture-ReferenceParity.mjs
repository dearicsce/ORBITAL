import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdtemp, mkdir, stat, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const [source, destination, browser, width = '1366', height = '768'] = process.argv.slice(2);
if (!source || !destination || !browser)
  throw Error('Pass the reference directory, evidence directory and Chrome/Edge executable.');
const root = path.resolve(source);
const output = path.resolve(destination);
await mkdir(output, { recursive: true });
const profile = await mkdtemp(path.join(tmpdir(), 'orbital-parity-'));
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.webm': 'video/webm', '.mp4': 'video/mp4',
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (path.relative(root, target).startsWith('..') || !(await stat(target)).isFile()) throw Error('Not found');
    response.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
    createReadStream(target).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const child = spawn(browser, [
  '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile,
  '--no-first-run', '--no-default-browser-check', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
let socket;
let seq = 0;
const log = [];
try {
  const debuggerUrl = await new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => reject(Error(stderr || 'Browser startup timed out.')), 15000);
    child.once('error', reject);
    child.stderr.on('data', chunk => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on ws:\/\/([^/]+)/);
      if (match) { clearTimeout(timer); resolve('http://' + match[1]); }
    });
  });
  const targets = await (await fetch(debuggerUrl + '/json/list')).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => {
        socket.removeEventListener('message', onReply);
        reject(Error('Browser timed out on ' + method));
      }, method === 'Page.captureScreenshot' ? 60000 : 15000);
      function onReply(event) {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        clearTimeout(timer);
        socket.removeEventListener('message', onReply);
        if (message.error) reject(Error(message.error.message));
        else resolve(message.result);
      }
      socket.addEventListener('message', onReply);
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description || expression);
    return response.result.value;
  }
  async function waitFor(expression, timeout = 12000) {
    const end = Date.now() + timeout;
    do {
      if (await evaluate(expression)) return;
      await delay(150);
    } while (Date.now() < end);
    throw Error('Timed out waiting for ' + expression);
  }
  const query = selector => 'document.querySelector(' + JSON.stringify(selector) + ')';
  async function click(selector) {
    const element = query(selector);
    await waitFor(`Boolean(${element} && !${element}.disabled)`);
    await evaluate(`${element}.click()`);
  }
  async function capture(name, selector) {
    await waitFor(`Boolean(${query(selector)})`);
    await delay(450);
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    await writeFile(path.join(output, name + '.png'), Buffer.from(shot.data, 'base64'));
    const state = await evaluate(`({route:document.querySelector('[data-screen]')?.dataset.screen,
      url:location.pathname + location.search, disabled:[...document.querySelectorAll('button:disabled')].map(b=>b.textContent.trim())})`);
    log.push({ name, ...state });
    console.log(name, state.route);
  }
  const origin = 'http://127.0.0.1:' + server.address().port;
  await send('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: origin });
  await capture('01-home-first-launch', '#campaign');
  await click('#settings');
  await capture('02-settings', '#settings-title');
  await click('#close-settings');
  await click('#campaign');
  await capture('03-campaign-map', '.program-map');
  await click('[data-map-mission="m1"]');
  await capture('04-mission-contract', '#map-build');
  await click('#map-preset');
  await capture('05-satellite-workshop', '#ws-view canvas');
  await click('[data-category="bus"]');
  await capture('06-bus-catalogue', '[data-add="bus_micro"]');
  await click('[data-preview="bus_micro"]');
  await capture('07-bus-preview', '#ws-equipment-preview');
  await click('[data-choice="0"]');
  await click('#ws-review');
  await capture('08-launcher-selection', '#custom-rocket');
  await click('#custom-rocket');
  await capture('09-rocket-workshop', '#rocket-reference');
  await click('#rocket-reference');
  await click('#rocket-use');
  await capture('10-orbit-selection', '#orbit-info');
  await click('#confirm');
  await capture('11-flight-plan', '#plan-confirm');
  await click('#plan-confirm');
  await click('#next');
  await capture('12-launch-review', '#launch');
  await click('#launch');
  await click('#pause-launch');
  await capture('13-flight', '#launch-clock');
  await evaluate(`(()=>{const warp=document.querySelector('#launch-warp');warp.value='64';warp.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await click('#pause-launch');
  await waitFor("Boolean(document.querySelector('#pause-ops'))", 90000);
  await capture('14-operations', '#pause-ops');
  await click('[data-speed="4"]');
  await waitFor(`(()=>{
    const choices = document.querySelector('#incident-host .incident-choices');
    choices?.querySelector('[data-choice="buffer"],[data-choice="continue"],[data-choice="cool"],button:not(:disabled)')?.click();
    return document.querySelector('#report')?.hidden === false;
  })()`, 90000);
  await click('#report');
  await capture('15-report', '.ops-report-summary');
} catch (error) {
  log.push({ error: error.message });
  throw error;
} finally {
  socket?.close();
  child.kill();
  server.close();
  await writeFile(path.join(output, 'captures.json'), JSON.stringify({ width: +width, height: +height, captures: log }, null, 2));
  await delay(500);
  await rm(profile, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
}
