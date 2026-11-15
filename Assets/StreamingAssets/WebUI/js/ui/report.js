import {mountPanel} from '../presentation/mountPanel.js';
import {campaignEvidence} from '../unity/campaignEvidenceView.js';
import {escapeHtml} from './html.js';
import {floodwatchReport} from '../unity/floodwatch.js';
import {lessons} from '../unity/missionLessons.js';
import {bindMissionExperiment} from '../unity/scienceUI.js';
import {bindReportExport} from '../unity/reportExport.js';
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
import { acknowledgeReport } from '../unity/campaignResume.js';
import { renderKeplerDebrief } from './keplerDebrief.js';
import { evaluate } from '../kepler/keplerMission.js';

export function renderReport(container, data) {
  const state = getState();
  let sim = getSimulationResults();
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

  if (missionId === 'dip') {
    const attempt = sim?.keplerAttempt;
    if (!sim?.ascentInsertion || sim.launchResult.success !== true || attempt?.stage !== 'complete') {
      container.innerHTML = `<section class="screen content-screen" data-screen="report">
        <h1>${sim?.launchResult?.success === false ? 'Launch failed' : 'Observation incomplete'}</h1>
        <p>${escapeHtml(sim?.launchResult?.reason || 'There is no completed observation to review.')}</p>
        <button class="orbital-button primary" id="kepler-replan">Return to mission planning</button>
        <button class="orbital-button" id="kepler-home">Mission control</button>
      </section>`;
      container.querySelector('#kepler-home').onclick = () => showScreen('menu');
      container.querySelector('#kepler-replan').onclick = () => showScreen('brief');
      return;
    }
    const evidence = evaluate(attempt.ground);
    const rating = { total: evidence.discriminates ? 6 : 0 };
    const passStars = data.settings?.passStars ?? 3;
    const record = async () => {
      if (evidence.discriminates) {
        if (!completeMission(missionId, rating, passStars, sim) || !saveProgress()) {
          throw Error('Could not save the mission record.');
        }
        await claimReward(sim, mission, rating, passStars);
      }
      acknowledgeReport(sim?.runId);
      showScreen('menu');
    };
    renderKeplerDebrief(
      container, { ...sim, keplerPlan: attempt.plan, keplerDesign: attempt.design }, data,
      fix => {
        const plan = fix?.type === 'kepler/setPlan' ? fix.payload : {};
        setDesign({
          windowId: plan.window ?? attempt.plan.window,
          keplerPolicy: ['all', 'bracket'].includes(plan.policy) ? plan.policy : attempt.plan.policy,
        });
        if (saveProgress()) showScreen('brief');
      },
      async () => {
        const status = container.querySelector('#kepler-record-status');
        try { await record(); } catch (error) { status.textContent = error.message; }
      },
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
  const insertion=sim?.ascentInsertion||sim?.parkingAscent;
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

  const hurtingEvents = ops?[]:eventResults.filter((e) => !e.survived);
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
          <div class="report-hero-actions"><div class="report-stars-display">
            <div>
              <p>${difficultyLabel(mission)}</p><small>PERFORMANCE RATING</small><div class="report-total-stars">${rating.total.toFixed(1)} <span style="font-size: 1.25rem; color: #94a3b8;">/ 6.0</span></div>
              ${rating.medal ? `<span class="mission-medal-badge medal-${rating.medal.toLowerCase()}">★ ${rating.medal.toUpperCase()} MEDAL</span>` : ''}
            </div>
          </div><div id="report-compare-actions"></div></div>
        </div>

        <div class="failure-replay-box ${isFailureReplayRed ? '' : 'nominal'}">
          <span class="replay-title">${failureReplayTitle}</span>
          <p class="replay-body">${escapeHtml(failureReplayText)}</p>
        </div>

        ${ops?measuredFlight(sim,ops):''}
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

  const flightEvidence = launchResult.success && (sim?.cruise ?? sim?.operations);
  const resultHost = document.createElement('div');
  container.querySelector('.report-summary-hero').after(resultHost);
  const missed = ops?.objectives?.find(objective => !objective.passed);
  const evidence = flightEvidence?.evidence ? campaignEvidence(flightEvidence) : {};
  const result = mountPanel(resultHost, 'report', {
    ...evidence,
    name:'Mission outcome',
    outcome:isLaunchFailure?'Ascent failed':isPassed?'Mission cleared':'Objective incomplete',
    message:isLaunchFailure?launchResult.reason || 'The spacecraft did not reach deployment.':
      missed?'First unmet objective: ' + missed.name + '.':ops?.science?.product ?? mission.objective,
    notes:isLaunchFailure?['Review the launcher, payload mass and flight plan before retrying.']:
      [...(evidence.notes ?? []), ...(missed?[mission.transfer?'On retry, compare encounter allocation, power reserves and time for Earth receipt.':
        'On retry, compare the target schedule, contact opportunities and the available operating modes.']:[])],
    status:isPassed?'passed':'failed',
  });

  const learnHost=container.querySelector('#report-learn-host');
  learnHost.innerHTML='<button class="btn" id="report-why">Why?</button>';
  learnHost.querySelector('button').onclick=()=>showLine('nova',getLearnExplanation(design,evalResult,gateChecks,data).text);
  animateReport(container,rating,eventHurtSentence);

  bindReportExport(container,sim,ops,rating);
  bindMissionExperiment(container,sim,data);
  const topRosterBtn = container.querySelector('#btn-report-roster-top');
  if (topRosterBtn) topRosterBtn.addEventListener('click', () => { acknowledgeReport(sim?.runId); clearSimulationResults(); showScreen('missionSelect'); });

  const retryBtn = container.querySelector('#btn-report-retry');
  if (retryBtn) retryBtn.addEventListener('click', () => { acknowledgeReport(sim?.runId); clearSimulationResults(); showScreen('design', { missionId }); });

  const rosterBtn = container.querySelector('#btn-report-roster');
  if (rosterBtn) rosterBtn.addEventListener('click', () => { acknowledgeReport(sim?.runId); clearSimulationResults(); showScreen('missionSelect'); });

  const nextBtn = container.querySelector('#btn-report-next');
  if (nextBtn && nextMission) nextBtn.addEventListener('click', () => { acknowledgeReport(sim?.runId); clearSimulationResults(); showScreen('missionSelect'); });

  const winBtn = container.querySelector('#btn-report-roster-win');
  if (winBtn) winBtn.addEventListener('click', () => { acknowledgeReport(sim?.runId); clearSimulationResults(); showScreen('missionSelect'); });
  return result.destroy;
}

function measuredFlight(run,ops){
 const value=(n,dp=1)=>Number(n??0).toFixed(dp);
 const cards=ops.objectives.map(o=>{
  const progress=o.target>0?Math.min(100,Math.max(0,o.value/o.target*100)):o.passed?100:0;
  return `<article class="flight-result-card ${o.passed?'achieved':'missed'}"><span>${escapeHtml(o.name)}</span><strong>${value(o.value)} <small>${escapeHtml(o.unit)}</small></strong><div class="flight-result-meter" aria-hidden="true"><i style="width:${progress}%"></i></div><p><b>${o.passed?'✓ Achieved':'Below target'}</b> · Target ${value(o.target)} ${escapeHtml(o.unit)}</p></article>`;
 }).join('');
 const resources=[['Collected',value(ops.collectedGb,2)+' GB'],['Still onboard',value(ops.storageGb,2)+' GB'],['Discarded',value(ops.lostGb,2)+' GB'],['Propellant left',value(ops.fuelKg)+' kg'],['Incident decisions',String(ops.decisions??0)]];
 const events=ops.log.map(e=>`<li><time>T+${Math.round(e.elapsedSec!=null?e.elapsedSec/60:e.tick*4.5)} min</time><span>${escapeHtml(e.text)}</span></li>`).join('');
 const detail=floodwatchReport(run);
 return `<section class="flight-measured" aria-labelledby="flight-measured-title"><header><div><p class="orbital-eyebrow">FLIGHT TELEMETRY</p><h2 id="flight-measured-title">Your flight. Measured.</h2></div><span class="flight-result-count">${ops.objectives.filter(o=>o.passed).length} / ${ops.objectives.length} targets achieved</span></header><div class="flight-result-grid">${cards}</div><dl class="flight-resource-grid">${resources.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><details class="flight-decisions"><summary>Flight decisions <span>${ops.log.length} events</span></summary><ol>${events||'<li>No manual commands recorded.</li>'}</ol></details>${detail?'<details class="flight-observation-detail"><summary>Observation detail</summary>'+detail+'</details>':''}</section>`;
}
