import {escapeHtml} from './html.js';
import {cruiseSummary} from '../transfer/cruise.js';
import {launcherFor} from '../rocket/engineering.js';
import {difficultyLabel} from '../workshop/economy.js';
import {claimReward} from '../workshop/economy.js';
import {rateFlight} from '../flightOutcome.js';
import {canCompleteFlight} from '../flightCompletion.js';
import {operationSummary} from '../engine/operations.js';
// Flight Evaluation Board & Final Mission Report
import { getState, setDesign, clearDesign, completeMission, markTutorialDone, saveProgress } from '../state.js';
import { evaluateDesign, rateDesign, checkLaunchGate, getUnlocked } from '../engine.js';
import { rollLaunch, runEvents, applyEvents } from '../events.js';
import { getSimulationResults, clearSimulationResults } from './simulation.js';
import { showScreen } from './router.js';
import { renderTutorialReport } from './reportTutorial.js';
import { renderJudgeStars, getAvatarSvg } from './reportJudges.js';
import { getLearnExplanation } from './learnTexts.js';
import { queueLines, showLine } from './speech.js';
import { animateReport } from './reportAnimation.js';
import { programOrder,isMissionUnlocked } from '../campaign.js';

export function renderReport(container, data) {
  const state = getState();
  const sim = getSimulationResults();
  const missionId = sim?.design?.missionId || state.currentMissionId || 'm1';
  const mission = (data.missions || []).find((m) => m.id === missionId) || data.missions[0];
  const launcher = launcherFor(sim?.design||state.currentDesign,data);

  if (missionId === 'tutorial') {
    markTutorialDone();
    saveProgress();
    renderTutorialReport(
      container,
      () => {
        clearSimulationResults();
        showScreen('design', { missionId: 'tutorial' });
      },
      () => {
        clearSimulationResults();
        showScreen('menu');
      }
    );
    return;
  }

  const design = sim?.design || { ...state.currentDesign, missionId, difficulty: state.difficulty || 'normal' };
  const evalResult = sim?.evalResult || evaluateDesign(design, data);
  const launchResult = sim?.launchResult || rollLaunch(design, data);
  const eventResults = sim?.eventResults || runEvents(design, data);
  const adjusted = applyEvents(evalResult, eventResults);
  const gateChecks = checkLaunchGate(design, data);

  // Rebuild older active-session summaries from their preserved engine state.
  const ops=sim?.cruise ? cruiseSummary(sim.cruise) : sim?.operations ? operationSummary(sim.operations) : sim?.operationsSummary;
  const rating=rateFlight(design,data,evalResult,launchResult,eventResults,ops);
  const isLaunchFailure=launchResult.success===false;
  const insertion=sim?.ascentInsertion;
  const ascentEventNames={ignition:'Ignition',liftoff:'Liftoff',boosters:'Booster separation',core:'Core separation',
    fairing:'Fairing release',insertion:'Insertion cutoff',payload:'Payload release'};

  const completedKeysBefore = Object.keys(state.completedMissions || {});
  const unlockedBefore = getUnlocked(data, completedKeysBefore);
  const passStars = data.settings?.passStars ?? 3.0;
  const flight=sim ? {...sim, operationsSummary:ops} : null;
  const isPassed = canCompleteFlight(missionId, rating, passStars, flight);

  let newlyUnlockedNames = [];
  if (isPassed) {
    completeMission(missionId, rating, passStars, flight);
    claimReward(flight,mission,rating,passStars).then(result=>{const p=document.createElement("p");p.className="wallet-reward";p.textContent=result.amount?`Mission reward: +${result.amount} coins · Balance ${result.coins}`:`Reward already claimed · Balance ${result.coins} coins`;container.querySelector("section")?.prepend(p);}).catch(error=>{const p=document.createElement("p");p.textContent="Reward not saved: "+error.message;container.querySelector("section")?.prepend(p);});
    saveProgress();
    const completedKeysAfter = Object.keys(getState().completedMissions || {});
    const unlockedAfter = getUnlocked(data, completedKeysAfter);

    unlockedAfter.launchers.filter((id) => !unlockedBefore.launchers.includes(id))
      .forEach((lid) => { const item = (data.launchers || []).find((l) => l.id === lid); if (item) newlyUnlockedNames.push(item.name); });
    unlockedAfter.parts.filter((id) => !unlockedBefore.parts.includes(id))
      .forEach((pid) => { const item = (data.parts || []).find((p) => p.id === pid); if (item) newlyUnlockedNames.push(item.name); });
    unlockedAfter.instruments.filter((id) => !unlockedBefore.instruments.includes(id))
      .forEach((iid) => { const item = (data.instruments || []).find((i) => i.id === iid); if (item) newlyUnlockedNames.push(item.name); });
    unlockedAfter.orbits.filter((id) => !unlockedBefore.orbits.includes(id))
      .forEach((oid) => { const item = (data.orbits || []).find((o) => o.id === oid); if (item) newlyUnlockedNames.push(item.name); });
  }

  let failureReplayTitle = 'FLIGHT OPERATIONS LOG';
  let failureReplayText = 'All subsystems performed nominally through the orbital mission lifecycle.';
  let isFailureReplayRed = false;

  if (isLaunchFailure) {
    isFailureReplayRed = true;
    failureReplayTitle = launchResult.reason?'ASCENT TERMINATED':'PRIMARY ASCENT FAILURE: ROCKET MALFUNCTION';
    failureReplayText = launchResult.reason||`${launcher ? launcher.name : 'The launcher'} suffered an engine anomaly during first-stage burn. Reliability rating: ${launcher ? Math.round(launcher.reliability * 100) : 90}%.`;
  } else if (!isPassed) {
    isFailureReplayRed = true;
    const failedChecks = gateChecks.filter((c) => !c.ok);
    if (failedChecks.length > 0) {
      failureReplayTitle = 'CRITICAL SUBSYSTEM AUDIT DEFECTS';
      failureReplayText = failedChecks.map((c) => c.message).join(' ');
    } else {
      const margins = evalResult.margins;
      const marginList = [
        { name: 'Mass buffer', val: margins.mass, tip: 'Pick a larger launcher or reduce payload mass.' },
        { name: 'Power margin', val: margins.power, tip: 'Add solar panels to meet the 1.1x generation requirement.' },
        { name: 'Battery storage', val: margins.battery, tip: 'Add batteries to survive eclipse dark passes.' },
        { name: 'Downlink throughput', val: margins.downlink, tip: 'Upgrade comms dish or switch to an orbit with longer ground contact.' },
        { name: 'Propellant reserve', val: margins.fuel, tip: 'Install fuel tanks to supply orbit insertion and stationkeeping.' }
      ];
      marginList.sort((a, b) => a.val - b.val);
      const weakest = marginList[0];
      failureReplayTitle = `PRIMARY SYSTEM CONSTRAINT: ${weakest.name.toUpperCase()}`;
      failureReplayText = `Weakest subsystem margin was ${weakest.name} at ${(weakest.val * 100).toFixed(1)}%. Recommendation: ${weakest.tip}`;
    }
  }

  const hurtingEvents = eventResults.filter((e) => !e.survived);
  const eventHurtSentence = hurtingEvents.length > 0
    ? ` Flight incident penalty: ${hurtingEvents.map((e) => `${e.name} (${e.effect})`).join(', ')}.`
    : '';

  if(ops&&!ops.passed&&!isLaunchFailure){failureReplayTitle='FLIGHT OBJECTIVES NOT MET';failureReplayText=ops.objectives.filter(o=>!o.passed).map(o=>`${o.name}: ${o.value.toFixed(1)} / ${o.target} ${o.unit}.`).join(' ')+' Review your command schedule, payload and reserves before trying again.';isFailureReplayRed=true;}
  const worldMissions = data.campaignVersion?programOrder(data):(data.missions || []).filter((m) => m.id !== 'tutorial');
  const currentIdx = worldMissions.findIndex((m) => m.id === missionId);
  const nextMission = worldMissions.find(m=>m.id!==missionId&&!getState().completedMissions[m.id]&&isMissionUnlocked(m,getState().completedMissions))||null;

  container.innerHTML = `
    <div class="mission-shell" data-screen="report">
      <header class="mission-header">
        <div class="header-branding">
          <div class="status-indicator"></div>
          <h1 class="hud-label" style="font-size: 0.875rem;">Flight Report: ${mission.name}</h1>
        </div>
        <div class="screen-breadcrumbs">
          <span class="active-badge">${isPassed ? 'MISSION CLEARED' : 'AUDIT FAILED'}</span>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-report-roster-top">← Mission Select</button>
        </div>
      </header>

      <main class="mission-panel">
        <div class="report-summary-hero">
          <div>
            <h2 class="panel-title">${isLaunchFailure ? 'MISSION FAILED: LAUNCH ABORT' : isPassed ? 'MISSION SUCCESS' : 'MISSION NOT CLEARED'}</h2>
            <p class="panel-description">
              ${isLaunchFailure
                ? 'The launch vehicle failed to achieve orbit. Satellite lost.'
                : isPassed
                ? 'Your spacecraft met technical, scientific, and budgetary requirements.'
                : `Mission not cleared. Meet all flight objectives and earn at least ${passStars.toFixed(1)} stars. Retry to improve your design and operations.`}
            </p>
          </div>
          <div class="report-stars-display">
            <div>
              <p>${difficultyLabel(mission)}</p><small>PERFORMANCE RATING</small><div class="report-total-stars">${rating.total.toFixed(1)} <span style="font-size: 1.25rem; color: #94a3b8;">/ 6.0</span></div>
              ${rating.medal ? `<span class="mission-medal-badge medal-${rating.medal.toLowerCase()}">★ ${rating.medal.toUpperCase()} MEDAL</span>` : ''}
            </div>
          </div>
        </div>

        <div class="failure-replay-box ${isFailureReplayRed ? '' : 'nominal'}">
          <span class="replay-title">${failureReplayTitle}</span>
          <p class="replay-body">${escapeHtml(failureReplayText)}</p>
        </div>

        ${insertion?`<section class="ops-report-summary">
          <h2>Ascent and deployment</h2>
          <p>Achieved payload orbit ${Math.round(insertion.orbit.periapsisM/1000)} × ${Math.round(insertion.orbit.apoapsisM/1000)} km
          at ${(insertion.orbit.inclinationRad*180/Math.PI).toFixed(1)}° inclination. Stack at insertion ${insertion.massKg.toFixed(0)} kg,
          including ${insertion.upperPropellantKg.toFixed(0)} kg of upper-stage propellant.</p>
          <details><summary>Ascent events</summary>${insertion.events.map(e=>`<div>${e.timeS.toFixed(1)} s since pad preparation · ${ascentEventNames[e.id]}</div>`).join('')}</details>
        </section>`:''}
        ${ops?`<section class="ops-report-summary"><h2>Your flight. Measured.</h2><div class="ops-report-grid">${ops.objectives.map(o=>`<div><span>${o.name}</span><strong>${o.value.toFixed(1)} ${o.unit}</strong><small>${o.passed?'✓ Achieved':'× Below target'} · Required ${o.target} ${o.unit}</small></div>`).join('')}</div><p>${ops.decisions} incident decisions · ${ops.collectedGb.toFixed(2)} GB collected · ${ops.lostGb.toFixed(2)} GB lost · ${ops.fuelKg.toFixed(1)} kg fuel remaining.</p><details><summary>Flight decision timeline</summary>${ops.log.map(e=>`<div>T+${Math.round(e.elapsedSec!=null?e.elapsedSec/60:e.tick*4.5)} min · ${e.text}</div>`).join('')||'<p>No manual commands recorded.</p>'}</details></section>`:''}
        <div class="learn-panel-host" id="report-learn-host"></div>

        ${isPassed && newlyUnlockedNames.length > 0 ? `
          <div class="unlocks-box">
            <span><strong>New Technologies Unlocked:</strong> ${newlyUnlockedNames.join(', ')}</span>
          </div>
        ` : ''}

        <div class="judges-grid">
          <div class="judge-card card-engineer">
            <div class="judge-card-header">
              <div class="judge-avatar-wrap">${getAvatarSvg('engineer')}</div>
              <div class="judge-header-info">
                <span class="judge-role-title">Chief Engineer</span>
                <span class="judge-role-badge badge-engineer">Margins & Survivability</span>
              </div>
            </div>
            <div class="judge-comment-box">"${rating.comments.engineer}${eventHurtSentence}"</div>
            <div class="judge-rating-area">${renderJudgeStars(rating.engineer, 2)}</div>
          </div>

          <div class="judge-card card-scientist">
            <div class="judge-card-header">
              <div class="judge-avatar-wrap">${getAvatarSvg('scientist')}</div>
              <div class="judge-header-info">
                <span class="judge-role-title">Lead Scientist</span>
                <span class="judge-role-badge badge-scientist">Sensor & Payload Return</span>
              </div>
            </div>
            <div class="judge-comment-box">"${rating.comments.scientist}"</div>
            <div class="judge-rating-area">${renderJudgeStars(rating.scientist, 2)}</div>
          </div>

          <div class="judge-card card-accountant">
            <div class="judge-card-header">
              <div class="judge-avatar-wrap">${getAvatarSvg('accountant')}</div>
              <div class="judge-header-info">
                <span class="judge-role-title">Mission Accountant</span>
                <span class="judge-role-badge badge-accountant">Financial Prudence</span>
              </div>
            </div>
            <div class="judge-comment-box">"${rating.comments.accountant}"</div>
            <div class="judge-rating-area">${renderJudgeStars(rating.accountant, 2)}</div>
          </div>
        </div>

        <div class="panel-actions">
          <button type="button" class="btn btn-secondary" id="btn-report-retry">Retry Mission</button>
          <button type="button" class="btn btn-secondary" id="btn-report-roster">Mission Select</button>
          ${isPassed && nextMission ? `<button type="button" class="btn btn-primary" id="btn-report-next">Continue campaign →</button>` : isPassed ? `<button type="button" class="btn btn-primary" id="btn-report-roster-win">Campaign Complete! →</button>` : ''}
        </div>
      </main>
    </div>
  `;

  const learnHost=container.querySelector('#report-learn-host');
  learnHost.innerHTML='<button class="btn" id="report-why">Why?</button>';
  learnHost.querySelector('button').onclick=()=>showLine('nova',getLearnExplanation(design,evalResult,gateChecks,data).text);
  animateReport(container,rating,eventHurtSentence);

  const topRosterBtn = container.querySelector('#btn-report-roster-top');
  if (topRosterBtn) topRosterBtn.addEventListener('click', () => { clearSimulationResults(); showScreen('missionSelect'); });

  const retryBtn = container.querySelector('#btn-report-retry');
  if (retryBtn) retryBtn.addEventListener('click', () => { clearSimulationResults(); showScreen('design', { missionId }); });

  const rosterBtn = container.querySelector('#btn-report-roster');
  if (rosterBtn) rosterBtn.addEventListener('click', () => { clearSimulationResults(); showScreen('missionSelect'); });

  const nextBtn = container.querySelector('#btn-report-next');
  if (nextBtn && nextMission) nextBtn.addEventListener('click', () => { clearSimulationResults(); showScreen('missionSelect'); });

  const winBtn = container.querySelector('#btn-report-roster-win');
  if (winBtn) winBtn.addEventListener('click', () => { clearSimulationResults(); showScreen('missionSelect'); });
}
