import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [baseline, candidate, fixture, output] = process.argv.slice(2);
if (!output) throw Error('Pass the baseline WebUI, candidate WebUI, comparison fixture and output paths.');
const {before} = JSON.parse(await readFile(fixture, 'utf8'));
const run = {operations: before.state};
const summary = before.summary;
const versions = await Promise.all([baseline, candidate].map(async directory => {
  const {scienceReport} = await import(pathToFileURL(resolve(directory, 'js/unity/scienceUI.js')));
  return {directory: resolve(directory), scienceReport, samples: [], bytes: 0};
}));

// Same frozen report input in both versions. Alternate order to reduce drift.
for (let index = 0; index < 120; index++) {
  for (const version of index % 2 ? [...versions].reverse() : versions) {
    const start = performance.now();
    const html = version.scienceReport(run, summary);
    const elapsed = performance.now() - start;
    if (index >= 20) version.samples.push(elapsed);
    version.bytes = Buffer.byteLength(html);
  }
}
const stats = versions.map(({directory, samples, bytes}) => {
  samples.sort((a, b) => a - b);
  const percentile = p => samples[Math.ceil(p * samples.length) - 1];
  return {directory, initialMarkupBytes: bytes, samples: samples.length, p50Ms: percentile(.5),
    p95Ms: percentile(.95), p99Ms: percentile(.99), maxMs: samples.at(-1)};
});
const result = {node: process.version, fixture: resolve(fixture), observations: run.operations.evidence.observations.length,
  ticks: run.operations.history.length, scope: 'Initial report HTML generation in Node. DOM and deferred expansion excluded.', versions: stats};
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
