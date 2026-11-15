import {readFile,writeFile} from 'node:fs/promises';
import {relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {SCENARIOS} from './EmbeddedUI/scienceScenarios.js';

import {transferChallenges as followups} from './EmbeddedUI/missionLessons.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const latest = Boolean(process.argv[2]);
const evidence = latest ? pathToFileURL(resolve(process.argv[2], 'models.json')) :
  new URL('../Verification/MissionExperiments/models.json', import.meta.url);
const modelLink = relative(root, fileURLToPath(evidence)).replaceAll('\\','/');
const hostFile = latest ? 'campaign.json' : 'Windows/campaign.json';
const hostLink = relative(root, fileURLToPath(new URL(hostFile,evidence))).replaceAll('\\','/');
const retestFile = 'FloodwatchRetest/verify-evidence-report.json';
const retestLink = relative(root, fileURLToPath(new URL(retestFile,evidence))).replaceAll('\\','/');
const results = JSON.parse(await readFile(evidence,'utf8'));
const optional = async url => JSON.parse(await readFile(new URL(url,evidence),'utf8').catch(error => {
  if(error.code==='ENOENT')return '[]';
  throw error;
}));
const hosts = new Map((await optional(hostFile)).filter(r=>r.id).map(r=>[r.id,r]));
const floodwatchRetest = latest && (await optional(retestFile)).find(r=>r.missionId==='m1'&&r.result==='pass');
const relayFocus = !latest && (await optional('RelayFocusRetry/verify-evidence-report.json')).find(r=>r.missionId==='relay'&&r.result==='pass');
function windowsStatus(id) {
  const result = hosts.get(id);
  if(result?.result==='pass')return 'Windows nominal flight, phase reload, export and reward checks passed.';
  if(id==='m1'&&floodwatchRetest)return 'Windows nominal flight and phase reload passed. The [same-player export retest](' + retestLink + ') also passed.';
  if(id==='relay'&&relayFocus)return 'Windows nominal flight and export passed. [Archived relay dialog retest](Verification/MissionExperiments/RelayFocusRetry/verify-evidence-report.json).';
  return latest ? 'Final Windows check pending or incomplete. Earlier evidence applies to the previous MissionEvidence player.' :
    'See the Windows campaign evidence for the current host status.';
}

const sources = {
  optical_camera:'[NASA OLI](https://science.nasa.gov/mission/landsat/oli/)',
  thermal_imager:'[USGS Landsat sensor bands](https://www.usgs.gov/faqs/what-are-band-designations-landsat-satellites)',
  weather_imager:'[NASA instrument principles](https://science.nasa.gov/learn/basics-of-space-flight/chapter12-1/)',
  transponder_s:'[NASA telecom](https://science.nasa.gov/learn/basics-of-space-flight/chapter10-1/)',
  spectrometer:'[NASA instrument principles](https://science.nasa.gov/learn/basics-of-space-flight/chapter12-1/)',
  laser_altimeter:'[NASA LOLA](https://science.nasa.gov/mission/lro/lola/)',
  magnetometer:'[NASA Voyager instruments](https://science.nasa.gov/mission/voyager/instruments/)'
};
const n = value => value.toFixed(2);
const link = '[automated result and strategy data](' + modelLink + ')';
const lines = ['# Mission differentiation matrix', '',
  'Inventory generated from the packaged campaign and the completed model harness. All 28 IDs and prerequisites come from the same definitions used by the campaign. Each scenario uses the same authoritative operations or transfer engine. The experiment strategies can be applied in flight through existing modes or the encounter schedule selector.', '',
  'Model evidence starts from the selected orbit or transfer parking orbit. Interactive evidence is tracked separately by exact player identity.' +
    (hosts.size ? ' [Windows campaign run](' + hostLink + ')' : '') + ' · [Scientific models](MISSION_EVIDENCE_MODELS.md)', '',
  '| ID | Prerequisites | Scientific product | Verified nominal and alternative strategies |',
  '| --- | --- | --- | --- |'];
for (const r of results) {
  lines.push('| ' + r.id + ' | ' + (r.prerequisites.join(', ')||'Start') + ' | ' + SCENARIOS[r.id].product + ' | Both model runs passed |');
}
for (const r of results) {
  const s = SCENARIOS[r.id];
  const isRelay = s.instrument === 'transponder_s';
  const [next,challenge] = followups[r.id];
  const a = r.baseline, b = r.alternative;
  const strategy = s.targets ? 'A spreads integration across both encounter slots. B shifts integration to the first target. A gives up primary integration. B leaves less time for the second target and can delay its first received bytes.' :
    isRelay ? 'A uses continuous autopilot with the recorded incident responses. B protects the relay between scheduled check-ins when contact is poor or after the last GEO check-in. A costs more load energy. B reduces standby readiness and can give up weak or late contacts.' :
    'A uses autopilot throughout with the recorded incident responses. B keeps autopilot until the last target window ends and then transmits at contacts and conserves power between them. A keeps gathering context but spends more energy and can fill the recorder. B gives up later context and any opportunity to compensate for a truncated schedule.';
  const windows = s.targets ? s.targets.join(' → ') + ', ' + s.hours + ' h total. Nominal primary share ' + Math.round(s.primaryShare*100) + '%.' :
    s.windows.map(([target,start,end]) => target + ' from T+' + start*4.5 + ' to ' + end*4.5 + ' min').join('. ') + '.';
  const constraints = [
    s.sun && 'The useful fraction requires modeled daylight.',
    s.dark && 'Only the dark fraction qualifies and solar output drops in eclipse.',
    s.efficiency && 'Instrument efficiency must stay at or above ' + s.efficiency*100 + '%.',
    s.deadline && 'Receive by T+' + s.deadline*4.5 + ' min.',
    isRelay && 'Only powered service with Earth contact contributes.',
    s.targets && 'Successful navigation and arrival are required. The recorder, link and signal time control what arrives.',
    r.id==='m1' && 'Achieved mean altitude sets whether nadir sample spacing meets the 30 m limit.',
    r.id==='proxima-sail' && 'Sail speed, lifetime and receiver assumptions are separately adjustable in isolated runs.'
  ].filter(Boolean).join(' ');
  const success = r.objectives.map(o => o.name + ' ≥ ' + n(o.target) + ' ' + o.unit).join(', ');
  const recovery = s.targets ? 'Approve the correction while it is offered and budget the proper arrival kit before launch. After a missed encounter, rerun with a revised plan.' :
    isRelay ? 'Resume service before the next check-in if Earth is in view. An elapsed missed check-in requires a replay.' :
    'Use a later contact for queued data if it can arrive before cutoff. Replay to recover a missed target window.';
  lines.push('', '## ' + r.name + ' (' + r.id + ')','',
    '- **Question and beneficiary.** ' + s.question + ' ' + s.user + '.',
    '- **Player briefing.** Deliver the ' + s.product.toLowerCase() + '. ' + windows,
    '- **Payload and conditions.** `' + s.instrument + '` qualifies. ' + constraints,
    '- **Decision and strategies.** ' + strategy,
    '- **Product and success.** ' + s.product + '. ' + success + '. Eligible partial measurements or service minutes remain visible even when a requirement is missed.',
    '- **Failure and recovery.** ' + (s.targets ? 'Omitting trim misses the encounter.' : 'Safe mode throughout misses one or more required products.') + ' ' + recovery,
    '- **Learning and transfer.** ' + r.learning + ' Try `' + next + '` next. ' + challenge,
    '- **Sources and approximation.** ' + sources[s.instrument] +
      (s.targets ? ' · [NASA trajectories](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/).' : '.') +
      ' Targets and schedules are authored. Integration or contact minutes are modeled. No physical measurement values or geographic retrievals are inferred.',
    '- **Verification.** ' + a.products.map((p,i)=>p.name + ' ' + n(p.value) + ' → ' + n(b.products[i].value) + ' min').join(', ') +
      '. Served loads ' + n(a.servedWh) + ' → ' + n(b.servedWh) + ' Wh.' +
      (r.hardwareTrials ? ' Fitted single-part trials exercised ' + r.hardwareTrials.length + ' replacements.' : '') +
      ' ' + link + ' ' + windowsStatus(r.id));
}
await writeFile(new URL('../MISSION_DIFFERENTIATION_MATRIX.md', import.meta.url),lines.join('\n')+'\n');


