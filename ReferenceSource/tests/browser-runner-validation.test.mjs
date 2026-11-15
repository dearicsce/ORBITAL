import assert from 'node:assert/strict';
import { validateSuiteResult } from './run-browser-tests.mjs?no-auto-run';

let assertions = 0;
const check = (ok, msg) => { assert.ok(ok, msg); assertions++; };

console.log('Testing browser runner result validation...');

// 1. Non-zero exit code
const rExit = validateSuiteResult('/tests/launch.test.html', 9, '<pre>PASS Success</pre>');
check(rExit.passed === false, 'Non-zero exit code rejected');
check(rExit.summary.includes('exit code 9'), 'Exit code captured in summary');

// 2. Empty output
const rEmpty = validateSuiteResult('/tests/engine.test.html', 0, '');
check(rEmpty.passed === false, 'Empty output rejected');

// 3. Incomplete / running state
const rRunning = validateSuiteResult('/tests/launch.test.html', 0, '<html><pre id="results">Running: T−03s · Launch sequence</pre></html>');
check(rRunning.passed === false, 'Running status rejected');
check(rRunning.summary.includes('Running:'), 'Running status captured in summary');

// 4. Incomplete launch checks (e.g. only 4 passes)
const partialLaunch = `
PASS Success preserved
PASS Reached space exactly once
PASS Completed once
PASS Canvas cleaned
`;
const rPartial = validateSuiteResult('/tests/launch.test.html', 0, partialLaunch);
check(rPartial.passed === false, 'Partial launch checks rejected (< 7 passes)');

// 5. Successful 7/7 launch checks
const fullLaunch = `
PASS Success preserved
PASS Reached space exactly once
PASS Completed once
PASS Canvas cleaned
PASS No reference video
PASS Release phase shown
PASS Wing deployment shown
Observed rolling frame time: 16.7 ms; draw calls: 56
`;
const rFull = validateSuiteResult('/tests/launch.test.html', 0, fullLaunch);
check(rFull.passed === true, 'Complete 7/7 launch checks passed');

// 6. Explicit failure detection
const rFail = validateSuiteResult('/tests/scene-repairs.test.html', 0, '<div>FAIL: camera out of bounds</div>');
check(rFail.passed === false, 'Explicit FAIL: detected and rejected');

// 7. Successful events suite
const rEvents = validateSuiteResult('/tests/events.test.html', 0, '<div>Total: 23 / 23 assertions passed.</div>');
check(rEvents.passed === true, '23/23 events passed');

// 8. Incomplete events suite
const rEventsInc = validateSuiteResult('/tests/events.test.html', 0, '<div>Total: 22 / 23 assertions passed.</div><div class="fail">Error</div>');
check(rEventsInc.passed === false, 'Incomplete events rejected');

console.log(`PASS: All ${assertions} browser runner validation assertions passed!`);
