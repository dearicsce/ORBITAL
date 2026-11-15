import {SCENARIOS} from './scienceScenarios.js';
import {bundleForMission, scenarioFromBundle} from './sourceData.js';

export function missionBriefing(mission, data, bundleId = null) {
  const scenario = scenarioFromBundle(mission.id, SCENARIOS[mission.id], bundleId);
  const instrument = data.instruments.find(item => item.id === (scenario?.instrument ?? mission.payload));
  const relay = Boolean(mission.profile?.relay);
  const family = mission.transfer ? 'transfer' : relay ? 'relay' : 'observation';
  const decision = {
    transfer: 'At arrival, choose whether to share time between both targets or give the primary target more integration.',
    relay: 'Compare ground contact with the scheduled check-ins. Choose when to keep the relay active or conserve power.',
    observation: 'Choose when to observe and when to transmit. Check target access, remaining power and the receipt deadline.',
  }[family];
  return {
    family,
    name: mission.name,
    question: scenario?.question ?? mission.objective ?? mission.brief,
    beneficiary: scenario?.user ?? null,
    product: scenario?.product ?? mission.tag,
    instrument: instrument?.name ?? null,
    decision,
    planOptions: relay ? [] : family === 'transfer' ? [
      {id:'balanced',label:'Share encounter time',detail:'Use the default time allocation across both targets.'},
      {id:'focused',label:'Prioritize the primary target',detail:'Give the first target more integration time. The other target gets a shorter look.'},
    ] : [
      {id:'balanced',label:'Balance capture and downlink',detail:'Start in Autopilot so the spacecraft switches between observing and transmitting.'},
      {id:'focused',label:'Prioritize the first observation',detail:'Start in Observe mode. Switch to Transmit before contact closes.'},
    ],
    windows: scenario?.windows?.map(([label, start, end]) => ({label, start: start * 4.5, end: end * 4.5})) ?? [],
    targets: scenario?.targets ?? [],
    encounterHours: scenario?.hours ?? null,
    deadlineMinutes: scenario?.deadline ? scenario.deadline * 4.5 : null,
    conditions: [
      scenario?.sun ? 'Daylight required for useful acquisition.' : null,
      scenario?.dark ? 'Darkness required for useful acquisition.' : null,
      scenario?.efficiency ? 'Minimum payload efficiency ' + Math.round(100 * scenario.efficiency) + '%.' : null,
      scenario?.approximation ?? null,
    ].filter(Boolean),
    sourceAvailable: bundleForMission(mission.id)?.bundle.id ?? null,
    source: bundleId ? 'Archived NASA context · simulated follow-up' :
      mission.destination === 'proxima' ? 'Speculative beamed sail · simulated encounter and downlink' :
      'Authored scenario · simulated conditions',
  };
}
