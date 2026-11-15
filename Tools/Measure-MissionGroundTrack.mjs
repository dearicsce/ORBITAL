import {readFile,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {cpus} from 'node:os';

const root = new URL('../',import.meta.url);
const previous = new URL('Verification/V03Parity/ManagedCheck-Final/Player/ORBITAL_Data/StreamingAssets/WebUI/',root);
const current = new URL('Verification/V03Parity/ManagedCheck-MissionEvidence/Player/ORBITAL_Data/StreamingAssets/WebUI/',root);
const {presetOrbit,EARTH_STATIONS} = await import(new URL('js/engine/orbitalGeometry.js',current));
const paths = [previous,current].map(base => new URL('js/ui/groundTrack.js',base));
const original = (await import(paths[0])).groundTrackMarkup;
const candidate = (await import(paths[1])).groundTrackMarkup;
const state = {orbit:presetOrbit('sso'),stations:EARTH_STATIONS,contactOutage:0,tick:0};
const collect = render => {
  let chars = 0;
  const times = [];
  for (let i=0;i<120;i++) {
    state.tick=i;
    const start=performance.now();
    chars+=render(state)?.length ?? 0;
    times.push(performance.now()-start);
  }
  const sorted=times.toSorted((a,b)=>a-b);
  return {characters:chars, totalMs:times.reduce((a,b)=>a+b,0), p95Ms:sorted[113], p99Ms:sorted[118], maxMs:sorted[119]};
};
collect(original); collect(candidate);
const result={
  cpu:cpus()[0]?.model, node:process.version,
  fixture:'120 SSO operation ticks, identical orbit/stations; isolated JS markup generation only',
  priorPlayer:'ManagedCheck-Final', candidatePlayer:'ManagedCheck-MissionEvidence',
  sameRendererSource:(await readFile(paths[0],'utf8'))===(await readFile(paths[1],'utf8')),
  previousHidden:[collect(original),collect(original),collect(original)],
  candidateHidden:[collect(()=>undefined),collect(()=>undefined),collect(()=>undefined)],
  candidateExpanded:[collect(candidate),collect(candidate),collect(candidate)]
};
await writeFile(new URL('Verification/MissionExperiments/ground-track-cost.json',root),JSON.stringify(result,null,2)+'\n');
