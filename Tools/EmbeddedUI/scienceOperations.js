import {acquire, discard, note, receive, send} from './scienceEvidence.js';
import {targetAccess,validateBundleIdentity} from './sourceData.js';

export function observeInterval(state, env, mode, powered, seconds, startSec) {
  const e = state.evidence;
  if (!e) return null;
  const {scenario} = e;
  const entry=validateBundleIdentity(e.bundle);
  const access=entry?targetAccess(state,entry,startSec,seconds):null;
  const light = env.sunlitFraction ?? Number(env.sunlit);
  const contact = env.contactFraction ?? Number(env.contact);
  const target = scenario.windows.find(([, start, end]) => state.tick >= start && state.tick < end)?.[0];
  const illumination = scenario.sun ? light : scenario.dark ? 1 - light : 1;
  e.minimumWh = Math.min(e.minimumWh, state.batteryWh);
  e.contactSec += seconds * contact;
  if (!target) return {target: 'Background', effectiveSec: 0, quality: 'Outside the scheduled target window'};
  let reason = null;
  if (!e.instrument) reason = 'instrument';
  else if (state.sampling && !state.sampling.meetsBenchmark) reason = 'resolution';
  else if (!powered) reason = 'power';
  else if (mode !== 'observe') reason = mode;
  else if (illumination <= 0) reason = 'lighting';
  else if (state.efficiency + 1e-9 < (scenario.efficiency ?? 0)) reason = 'quality';
  else if (state.hardware.relay && contact <= 0) reason = 'contact';
  else if(access&&!access.known)reason='unknown';
  else if(access&&access.fraction===0)reason='access';
  if (reason) note(e, reason, startSec, {target, batteryWh: state.batteryWh, sunlight: light});
  let effectiveSec = reason ? 0 : seconds * illumination * state.efficiency * state.hardware.orbitFit*(access?.fraction??1)*(access?.priorityWeight??1);
  if(e.sourceEvidenceModel==='unique-target-1'&&access?.visibleTargetIds.length&&effectiveSec>0){
    // Bounded useful integration for each source location. More bytes from the
    // same location cannot manufacture an unlimited independent evidence score.
    const share=effectiveSec/access.visibleTargetIds.length;let useful=0;
    for(const id of access.visibleTargetIds){const previous=e.targetSeconds[id]??0,accepted=Math.min(share,Math.max(0,600-previous));e.targetSeconds[id]=previous+accepted;useful+=accepted;}
    effectiveSec=useful;
  }
  if (state.hardware.relay && !state.relayTraffic && effectiveSec > 0) {
    e.serviceSec[target] = (e.serviceSec[target] ?? 0) + effectiveSec * contact;
  }
  const quality = reason ?? (state.sampling ? state.sampling.sampleM?.toFixed(1) + ' m/sample' :
    (seconds * illumination / 60).toFixed(2) + ' min integration before efficiency losses');
  return {target, effectiveSec, quality,access};
}

export function recordOperationsAcquisition(state, sample, endSec, produced, accepted) {
  if (!sample) return;
  acquire(state.evidence, sample.target, endSec, sample.effectiveSec, produced, accepted, sample.quality);
  if(sample.access){const o=state.evidence.observations.at(-1);if(o){o.visibleSourceTargetIds=sample.access.visibleTargetIds;o.sourceCoverageKnown=sample.access.known;o.accessFraction=sample.access.fraction;
   o.derivedValues=[{name:'Spherical target access',value:sample.access.fraction,units:'fraction',sourceProductIds:validateBundleIdentity(state.evidence.bundle).bundle.productIds,derivationMethod:'15-second two-body states; centre-point elevation above authored mask',limitations:'Finite sampling; no calibrated sensor footprint, terrain occlusion or pointing-error solution.'}];
  }}
  if (produced - accepted > 1e-9) note(state.evidence, 'recorder', endSec, {target: sample.target});
}

export function recordOperationsReceipt(state, amount, endSec, stepSec) {
  const e = state.evidence;
  if (!e) return;
  receive(e, send(e, amount), endSec, (e.scenario.deadline ?? state.totalTicks) * stepSec);
}

export {discard};

