import { spawn } from 'node:child_process';
import fs from 'node:fs';

export const urls = [
  { url: '/tests/scene-repairs.test.html', timeout: 20000 },
  { url: '/tests/launch.test.html', timeout: 50000 },
  { url: '/tests/visual-quality.test.html', timeout: 20000 },
  { url: '/tests/historical-ui.test.html', timeout: 20000 },
  { url: '/tests/state.test.html', timeout: 20000 },
  { url: '/tests/engine.test.html', timeout: 20000 },
  { url: '/tests/events.test.html', timeout: 20000 },
  { url: '/tests/evidence.test.html', timeout: 20000 }
];

export function validateSuiteResult(url, exitCode, rawOutput) {
  if (exitCode !== 0) {
    return { passed: false, summary: `Process failed with exit code ${exitCode}` };
  }
  if (!rawOutput || !rawOutput.trim()) {
    return { passed: false, summary: 'Empty or missing output' };
  }

  const cleanDom = rawOutput.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

  // Detect explicit failures
  const failMatch = cleanDom.match(/FAIL:[^<]+/);
  if (failMatch) {
    return { passed: false, summary: failMatch[0].trim() };
  }

  // Detect in-progress / incomplete status
  if (cleanDom.includes('Running:') || cleanDom.includes('Preparing live launch test')) {
    const runningMatch = cleanDom.match(/Running:[^<]+/);
    return { passed: false, summary: runningMatch ? runningMatch[0].trim() : 'Incomplete: test suite still running' };
  }

  // Suite-specific terminal validations
  if (url.includes('launch.test.html')) {
    const passLines = cleanDom.match(/PASS\s+[^\n<]+/g) || [];
    const failLines = cleanDom.match(/FAIL\s+[^\n<]+/g) || [];
    if (failLines.length > 0) {
      return { passed: false, summary: `Launch checks failed: ${failLines.join('; ')}` };
    }
    if (passLines.length < 7) {
      return { passed: false, summary: `Incomplete launch checks: only ${passLines.length}/7 passed` };
    }
    return { passed: true, summary: `PASS: 7/7 launch checks passed (${passLines.length} assertions)` };
  }

  if (url.includes('events.test.html')) {
    const eventsFails = (cleanDom.match(/class=["']fail["']/g) || []).length;
    if (eventsFails > 0) {
      return { passed: false, summary: `Events suite had ${eventsFails} failures` };
    }
    const match = cleanDom.match(/(\d+)\s*\/\s*(\d+)\s*assertions passed/i);
    if (!match || match[1] !== match[2]) {
      return { passed: false, summary: `Events assertions incomplete: ${match ? match[0] : 'no pass count'}` };
    }
    return { passed: true, summary: `PASS: Total: ${match[1]} / ${match[2]} assertions passed` };
  }

  // Standard PASS: matching
  const passMatch = cleanDom.match(/PASS:[^<]+/);
  if (passMatch) {
    return { passed: true, summary: passMatch[0].trim() };
  }

  if (cleanDom.includes('class="summary all-pass"')) {
    const m = cleanDom.match(/class="summary all-pass"[^>]*>([\s\S]*?)<\/div>/);
    return { passed: true, summary: 'PASS: ' + (m ? m[1].trim().replace(/\s+/g, ' ') : 'all-pass') };
  }

  return { passed: false, summary: 'Unknown outcome: no terminal pass signature found' };
}

async function checkUrl({ url, timeout }) {
  return new Promise((resolve) => {
    const fullUrl = 'http://127.0.0.1:8785' + url;
    const tempDir = process.env.TEMP + '\\chrome-test-run-' + Math.random().toString(36).slice(2);
    const proc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
      '--headless=new',
      '--dump-dom',
      '--virtual-time-budget=' + timeout,
      `--user-data-dir=${tempDir}`,
      fullUrl
    ]);
    let out = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', () => {});
    proc.on('close', (code) => {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
      resolve({ url, code, out });
    });
  });
}

if (!import.meta.url.includes('no-auto-run')) {
  let hasFailure = false;
  for (const item of urls) {
    const { url, code, out } = await checkUrl(item);
    const result = validateSuiteResult(url, code, out);
    console.log(`${url} --> ${result.summary}`);
    if (!result.passed) {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    console.error('One or more browser suites failed.');
    process.exit(1);
  }
}
