import {mountPanel} from '../presentation/mountPanel.js';
import {campaignEvidence} from '../unity/campaignEvidenceView.js';
import {escapeHtml} from './html.js';
import {missionImage, bindMissionImages, featuredArt} from './missionArt.js';
import {featuredResult, featuredObjectives} from '../unity/featuredFlight.js';
import {floodwatchReport} from '../unity/floodwatch.js';
import {lessons} from '../unity/missionLessons.js';
import {bindMissionExperiment} from '../unity/scienceUI.js';
import {bindReportExport} from '../unity/reportExport.js';
import {SYSTEM_INCIDENTS} from '../unity/systemsOperations.js';
import {cruiseSummary} from '../transfer/cruise.js';
import {launcherFor} from '../rocket/engineering.js';
import {claimReward} from '../workshop/economy.js';
import {rateFlight} from '../flightOutcome.js';
import {canCompleteFlight} from '../flightCompletion.js';
import {operationSummary} from '../engine/operations.js';
// Flight Evaluation Board & Final Mission Report
import { getState, setDesign, clearDesign, completeMission, markTutorialDone, saveProgress, setPracticeMode } from '../state.js';
import { evaluateDesign, rateDesign, checkLaunchGate, getUnlocked } from '../engine.js';
import { rollLaunch, runEvents, applyEvents } from '../events.js';
import { getSimulationResults, clearSimulationResults } from './simulation.js';
import { showScreen } from './router.js';
import { renderTutorialReport } from './reportTutorial.js';
import { renderJudgeStars, getAvatarSvg } from './reportJudges.js';
import { getLearnExplanation } from './learnTexts.js';
import { queueLines, showLine } from './speech.js';
import { animateReport } from './reportAnimation.js';
import {getActiveCampaignProgress, getNextRecommendedMission} from '../unity/campaignPolicy.js';
import {leavePracticeProfile} from '../unity/practiceProfile.js';
import { acknowledgeReport, clearCampaignDraft } from '../unity/campaignResume.js';
import { renderKeplerDebrief } from './keplerDebrief.js';
import { evaluate } from '../kepler/keplerMission.js';
import { presetOrbit, RAD } from '../engine/orbitalGeometry.js';

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
    const isPractice = Boolean(state.practiceMode);
    const record = async () => {
      if (evidence.discriminates && !isPractice) {
        if (!completeMission(missionId, rating, passStars, sim) || !saveProgress()) {
          throw Error('Could not save the mission record.');
        }
        await claimReward(sim, mission, rating, passStars);
      }
      acknowledgeReport(sim?.runId);
      if (isPractice) {
        returnFromPractice();
      } else {
        clearCampaignDraft();
        setDesign({flightWorkflow:false});
        saveProgress();
        clearSimulationResults();
        showScreen('missionSelect', {openNext:true});
      }
    };
    renderKeplerDebrief(
      container, { ...sim, keplerPlan: attempt.plan, keplerDesign: attempt.design }, data,
      fix => {
        clearSimulationResults();
        if (!fix) {
          showScreen('brief');
          return;
        }
        const curState = getState();
        const current = curState.currentDesign || {};
        if (fix.type === 'kepler/setDesign') {
          const kit = { ...(current.keplerKit || attempt.design || {}), ...fix.payload };
          const updates = { keplerKit: kit };
          if (fix.payload.battery === 'reserve') updates.batteryIds = ['battery_l'];
          if (fix.payload.store === 'extended') updates.computerId = 'computer_advanced';
          if (fix.payload.processor === 'aggregation') updates.instrumentIds = [...new Set([...(current.instrumentIds || []), 'spectrometer'])];
          if (fix.payload.profile === 'long' || fix.payload.launcherId) updates.launcherId = fix.payload.launcherId || 'albatross';
          setDesign(updates);
          saveProgress();
          showScreen('workshop', { mission: true });
        } else if (fix.type === 'kepler/setPlan') {
          const plan = fix.payload || {};
          const updates = {
            windowId: plan.window ?? attempt.plan.window,
            keplerPolicy: ['all', 'bracket', 'three_slot'].includes(plan.policy) ? plan.policy : attempt.plan.policy,
          };
          if (plan.recipe) updates.keplerRecipe = plan.recipe;
          if (plan.timestamps) updates.keplerTimestamps = plan.timestamps;
          setDesign(updates);
          saveProgress();
          showScreen('brief');
        } else {
          showScreen('brief');
        }
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
  const isPractice = Boolean(state.practiceMode);

  let newlyUnlockedNames = [];
  let recorded = false;
  if (isPassed && !isPractice) {
    recorded = completeMission(missionId, rating, passStars, flight);
    recorded = recorded && saveProgress();
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

  const limiter = diagnoseCampaignLimiter(sim, ops, evalResult, launchResult, gateChecks, mission, data, rating, passStars);
  const minWh = ops?.science?.minimumWh ?? sim?.operations?.batteryWh ?? evalResult.batteryUsableWh ?? 0;
  const fuelKg = ops?.fuelKg ?? sim?.operations?.fuelKg ?? evalResult.fuelKg ?? 0;
  const deliveredGb = ops?.deliveredGb ?? sim?.operations?.deliveredGb ?? 0;
  const storageGb = ops?.storageGb ?? sim?.operations?.storageGb ?? 0;
  const lostGb = ops?.lostGb ?? sim?.operations?.lostGb ?? 0;
  const contactSec = sim?.operations?.evidence?.contactSec ?? ops?.science?.contactSec;

  const field1Status = isLaunchFailure ? 'fail' : (minWh <= 0.05 || gateChecks.some(c => !c.ok)) ? 'fail' : 'pass';
  const field1Label = isLaunchFailure ? '× Launch Abort / Vehicle Malfunction' : gateChecks.some(c => !c.ok) ? '× Critical Subsystem Audit Defect' : minWh <= 0.05 ? '× Subsystem Brownout in Eclipse' : '✓ Subsystems & Operations Nominally Flown';

  const field2Status = isLaunchFailure ? 'fail' : lostGb > 0 ? 'warn' : storageGb > 0 && !isPassed ? 'warn' : 'pass';
  const field2Summary = isLaunchFailure ? 'No downlink.' : lostGb > 0 ? 'Some data was lost.' : storageGb > 0 ? 'Data remains onboard.' : ops?.unconfirmedGb > 0 ? 'Transmission in transit.' : deliveredGb > 0 ? 'Downlink received.' : 'No receipt.';

  const field3Status = isPassed ? 'pass' : 'fail';
  const field3Verdict = isPassed ? '✓ EVIDENCE STANDARD ACHIEVED' : isLaunchFailure ? '× MISSION INCOMPLETE' : '× EVIDENCE STANDARD NOT MET';

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
  const nextMission = getNextRecommendedMission(getState(), data);
  const campaignComplete = getActiveCampaignProgress(getState(), data).isComplete;
  const showcase = featuredResult(missionId, sim);

  function leaveReport(openNext = false) {
    acknowledgeReport(sim?.runId);
    if (isPractice) return returnFromPractice();
    clearCampaignDraft();
    setDesign({flightWorkflow:false});
    saveProgress();
    clearSimulationResults();
    showScreen('missionSelect', openNext ? {openNext:true} : {initialStage:missionId});
  }

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
        ${isPractice ? `
          <div class="practice-notice-banner" style="background: rgba(33,55,70,0.8); border: 1px solid #74e1e9; border-radius: 6px; padding: 12px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <span><strong>PRACTICE SIMULATION:</strong> Campaign records and one-time rewards remain isolated.</span>
            <button type="button" class="btn btn-sm btn-primary" id="btn-report-return-campaign">Return to Campaign ↗</button>
          </div>
        ` : ''}

        <div class="report-summary-hero${showcase?' report-featured':''}">
          ${showcase?`<figure class="featured-outcome">
            ${featuredArt(missionId)}
            <figcaption>
              <h2>${escapeHtml(showcase.title)}</h2>
              ${showcase.body}
            </figcaption>
          </figure>`:''}
          <div class="report-mission-summary">${showcase?'':`<div class="report-mission-art" aria-hidden="true">${missionImage(mission)}</div>`}<div>
            <h2 class="panel-title">${isLaunchFailure ? 'MISSION FAILED: LAUNCH ABORT' : isPassed ? 'MISSION SUCCESS' : 'MISSION NOT CLEARED'}</h2>
            <p class="panel-description">
              ${showcase ? escapeHtml(showcase.sentence) : isLaunchFailure
                ? 'The launch vehicle failed to achieve orbit. Satellite lost.'
                : isPassed
                ? escapeHtml(ops?.science?.product ?? mission.objective ?? 'Flight objectives met.')
                : `Mission not cleared. Meet all flight objectives and earn at least ${passStars.toFixed(1)} stars. Retry to improve your design and operations.`}
            </p>
            ${showcase?featuredObjectives(ops):''}
            <small id="report-reward" role="status"></small></div>
          </div>
          <div class="report-hero-actions"><div class="report-stars-display">
            <div>
              <small>FLIGHT RATING</small><div class="report-total-stars">${rating.total.toFixed(1)} <span style="font-size: 1.25rem; color: #94a3b8;">/ 6.0</span></div>
              ${rating.medal ? `<span class="mission-medal-badge medal-${rating.medal.toLowerCase()}">★ ${rating.medal.toUpperCase()} MEDAL</span>` : ''}
            </div>
          </div><div class="panel-actions">
          ${recorded && nextMission ? `<button type="button" class="btn btn-primary" id="btn-report-next">Next · ${escapeHtml(nextMission.name)} →</button>` : !isPractice && campaignComplete && isPassed ? `<button type="button" class="btn btn-primary" id="btn-report-roster-win">Campaign Complete! →</button>` : ''}
          <button type="button" class="btn btn-secondary" id="btn-report-retry">${showcase?'Retry':'Retry Mission'}</button>
          <div id="report-compare-actions"></div>
        </div></div>
        </div>

        ${ops?measuredFlight(sim,ops):''}
        <details class="report-detail"><summary>Flight details</summary>
        <div id="report-science"></div>
        <!-- 3 Debrief Fields Grid -->
        <div class="debrief-fields-grid">
          <!-- Field 1: Flight & Operations -->
          <article class="debrief-field-card">
            <div class="debrief-field-header">
              <h3 class="debrief-field-title">Flight & Operations</h3>
            </div>
            <div class="debrief-field-verdict ${field1Status}">
              ${field1Label}
            </div>
            <ul class="debrief-metric-list">
              <li><span>Lowest energy reserve:</span> <strong>${minWh.toFixed(1)} Wh</strong></li>
              <li><span>Propellant remaining:</span> <strong>${fuelKg.toFixed(1)} kg</strong></li>
              <li><span>Ascent status:</span> <strong>${isLaunchFailure ? 'Failed' : insertion ? 'Cutoff at ' + (insertion.timeS || insertion.timeSec || 0).toFixed(0) + 's' : 'Orbit achieved'}</strong></li>
              <li><span>Preflight checks:</span> <strong>${gateChecks.filter(c => c.ok).length} / ${gateChecks.length} passed</strong></li>
            </ul>
          </article>

          <!-- Field 2: Receipts on Earth -->
          <article class="debrief-field-card">
            <div class="debrief-field-header">
              <h3 class="debrief-field-title">Receipts on Earth</h3>
            </div>
            <div class="debrief-field-verdict ${field2Status}">
              <strong>${deliveredGb.toFixed(2)} GB</strong> confirmed received
            </div>
            <ul class="debrief-metric-list">
              <li><span>Held in recorder queue:</span> <strong>${storageGb.toFixed(2)} GB</strong></li>
              <li><span>Lost / expired data:</span> <strong>${lostGb.toFixed(2)} GB</strong></li>
              ${Number.isFinite(contactSec) ? `<li><span>Ground contact</span><strong>${(contactSec / 60).toFixed(1)} min</strong></li>` : ''}
              <li><span>Queue status:</span> <em>${field2Summary}</em></li>
            </ul>
          </article>

          <!-- Field 3: Scientific Evidence -->
          <article class="debrief-field-card">
            <div class="debrief-field-header">
              <h3 class="debrief-field-title">Scientific Evidence</h3>
            </div>
            <div class="debrief-field-verdict ${field3Status}">
              ${field3Verdict}
            </div>
            <p style="font-size: 13px; color: var(--orbital-text-muted); margin: 0;">
              <strong>User:</strong> ${escapeHtml(ops?.science?.user || mission.beneficiary || 'Science Desk')}<br>
              <strong>Question:</strong> “${escapeHtml(ops?.science?.question || mission.description)}”
            </p>
            <ul class="debrief-metric-list">
              ${(ops?.objectives || []).map(o => `
                <li>
                  <span>${escapeHtml(o.name)}:</span>
                  <strong>${o.passed ? '✓' : '×'} ${o.value.toFixed(1)} / ${o.target} ${escapeHtml(o.unit)}</strong>
                </li>
              `).join('')}
            </ul>
          </article>
        </div>

        </details>
        ${!isPassed ? `
        <section class="debrief-causal-card ${isPassed ? 'pass' : 'fail'}">
          <span class="causal-eyebrow">What to change</span>
          <h3 class="causal-title">${escapeHtml(limiter.firstCausalLimiter)}</h3>
          <p class="causal-consequence">${escapeHtml(limiter.downstreamConsequence)}</p>
          <div class="causal-action-box">
            <p class="causal-action-text">${escapeHtml(limiter.consequentialAction)}</p>
            ${!isPassed && limiter.buttonLabel ? `
              <button type="button" class="btn btn-primary" id="btn-report-apply-repair">
                ${escapeHtml(limiter.buttonLabel)}
              </button>
            ` : ''}
          </div>
        </section>

        ` : ''}
        <details class="report-detail"><summary>Flight log and ratings</summary>
        <div class="failure-replay-box ${isFailureReplayRed ? '' : 'nominal'}">
          <span class="replay-title">${failureReplayTitle}</span>
          <p class="replay-body">${escapeHtml(failureReplayText)}</p>
        </div>
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

        </details>

      </main>
    </div>
  `;

  if (isPassed && !isPractice) {
    const reward = container.querySelector('#report-reward');
    if (!recorded) reward.textContent = 'Mission record could not be saved.';
    else claimReward(flight, mission, rating, passStars).then(({amount, coins}) => {
      window.dispatchEvent(new CustomEvent('orbital-wallet-change', {detail:coins}));
      reward.textContent = amount ? '+' + amount + ' coins · Balance ' + coins : 'Balance ' + coins + ' coins';
    }).catch(error => { reward.textContent = 'Reward could not be saved. ' + error.message; });
  }
  bindMissionImages(container);
  const flightEvidence = launchResult.success && (sim?.cruise ?? sim?.operations);
  const resultHost = document.createElement('div');
  container.querySelector('#report-science').append(resultHost);
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
  animateReport(container,rating);

  bindReportExport(container,sim,ops,rating);
  bindMissionExperiment(container,sim,data);
  const topRosterBtn = container.querySelector('#btn-report-roster-top');
  if (topRosterBtn) topRosterBtn.addEventListener('click', () => leaveReport());

  const applyFixBtn = container.querySelector('#btn-report-apply-repair');
  if (applyFixBtn) {
    applyFixBtn.addEventListener('click', () => {
      acknowledgeReport(sim?.runId);
      clearSimulationResults();
      if (limiter.fixPatch) {
        setDesign(limiter.fixPatch);
        saveProgress();
      }
      showScreen(limiter.targetScreen || 'design', limiter.targetParams || { missionId });
    });
  }

  const practiceReturnBtn = container.querySelector('#btn-report-return-campaign');
  if (practiceReturnBtn) {
    practiceReturnBtn.addEventListener('click', () => {
      acknowledgeReport(sim?.runId);
      clearSimulationResults();
      returnFromPractice();
    });
  }

  const retryBtn = container.querySelector('#btn-report-retry');
  if (retryBtn) retryBtn.addEventListener('click', () => { acknowledgeReport(sim?.runId); clearSimulationResults(); showScreen('design', { missionId }); });

  const nextBtn = container.querySelector('#btn-report-next');
  if (nextBtn && nextMission) nextBtn.addEventListener('click', () => leaveReport(true));

  const winBtn = container.querySelector('#btn-report-roster-win');
  if (winBtn) winBtn.addEventListener('click', () => leaveReport());
  return result.destroy;
}

export function returnFromPractice() {
  if (leavePracticeProfile()) return;
  const state = getState();
  const origin = state.practiceOrigin || 'm1';
  if (typeof setPracticeMode === 'function') setPracticeMode(false);
  delete state.practiceMode;
  delete state.practiceOrigin;
  clearDesign();
  setDesign({missionId:origin, flightWorkflow:false});
  saveProgress();
  clearSimulationResults();
  showScreen('missionSelect');
}

export function diagnoseCampaignLimiter(sim, ops, evalResult, launchResult, gateChecks, mission, data, rating, passStars) {
  if (launchResult?.success === false) {
    return {
      firstCausalLimiter: launchResult.reason || 'First-stage engine anomaly or ascent trajectory abort.',
      downstreamConsequence: 'The launch vehicle failed to achieve orbital insertion; spacecraft lost.',
      consequentialAction: 'Select a larger or more reliable launch vehicle, or reduce payload mass in the workshop.',
      targetScreen: 'rocketSelect',
      fixPatch: null,
      buttonLabel: 'Select Launch Vehicle ↗',
    };
  }

  const failedGates = (gateChecks || []).filter(c => !c.ok);
  if (failedGates.length > 0) {
    const first = failedGates[0];
    return {
      firstCausalLimiter: `Subsystem defect: ${first.message}`,
      downstreamConsequence: 'Spacecraft configuration failed engineering verification before flight.',
      consequentialAction: 'Open the workshop to resolve component placement, power margin, or mass limits.',
      targetScreen: 'workshop',
      targetParams: { mission: true },
      fixPatch: null,
      buttonLabel: 'Open Workshop ↗',
    };
  }

  const minWh = ops?.science?.minimumWh ?? sim?.operations?.batteryWh;
  if (minWh !== undefined && minWh <= 0.05) {
    return {
      firstCausalLimiter: 'Battery reserve depleted during shadow / eclipse operations.',
      downstreamConsequence: 'Spacecraft browned out; subsequent observations and radio passes halted.',
      consequentialAction: 'Install a larger battery (e.g. Battery L) or add solar wings to recharge before eclipse.',
      targetScreen: 'workshop',
      targetParams: { mission:true, category:'battery' },
      fixPatch: null,
      buttonLabel: 'Review batteries ↗',
    };
  }

  const relayTraffic = sim?.operations?.relayTraffic;
  if (relayTraffic?.expired?.length > 0) {
    return {
      firstCausalLimiter: `${relayTraffic.expired.length} scheduled dispatch(es) expired before reaching Earth.`,
      downstreamConsequence: 'Store-and-forward queue latency exceeded the island/crew emergency deadline.',
      consequentialAction: 'Switch traffic policy to "Send urgent first" to prioritize time-critical dispatches.',
      targetScreen: 'flightPlan',
      fixPatch: { relayPolicy: 'urgent' },
      buttonLabel: 'Set Urgent-First Policy ↗',
    };
  }

  if (ops?.lostGb > 0) {
    return {
      firstCausalLimiter: `Onboard recorder overflow: ${ops.lostGb.toFixed(2)} GB discarded.`,
      downstreamConsequence: 'Science instruments generated more data than the onboard computer could hold before downlink.',
      consequentialAction: 'Install an Advanced Computer (12 GB recorder) or schedule intermediate downlink passes.',
      targetScreen: 'workshop',
      targetParams: { mission:true, category:'computer' },
      fixPatch: null,
      buttonLabel: 'Review onboard computers ↗',
    };
  }

  if (mission.id === 'm1') {
    if (ops?.sampling && !ops.sampling.meetsBenchmark) {
      return {
        firstCausalLimiter: `Orbital altitude (${(ops.sampling.altitudeM / 1000).toFixed(0)} km) exceeds Landsat OLI 30 m benchmark.`,
        downstreamConsequence: 'Pixel resolution is too coarse for regional flood classification follow-up.',
        consequentialAction: 'Select a 500 km LEO or lower SSO orbit to achieve 30 m/pixel resolution.',
        targetScreen: 'orbitSelect',
        fixPatch: { orbitId: 'leo' },
        buttonLabel: 'Switch to Low Earth Orbit (500 km) ↗',
      };
    }
    const floodObj = ops?.objectives?.find(o => o.id === 'product-0');
    if (floodObj && !floodObj.passed) {
      return {
        firstCausalLimiter: 'Ground track did not intersect the archived Sindh flood target coordinates.',
        downstreamConsequence: 'Raw data was downlinked, but zero qualifying flood-context observations reached the response desk.',
        consequentialAction: 'Select the Sindh-pass orbit preset (75° ascending node) in orbit selection.',
        targetScreen: 'orbitSelect',
        fixPatch: { orbitId: 'sso', orbitElements: presetOrbit('sso', { raanRad: 75 * RAD }) },
        buttonLabel: 'Select Sindh-Pass Orbit Preset (75° Node) ↗',
      };
    }
  }

  if (mission.id === 'wildfire') {
    const fireObj = ops?.objectives?.find(o => !o.passed && (o.id === 'product-0' || o.id === 'product-1'));
    if (fireObj && !fireObj.passed) {
      return {
        firstCausalLimiter: 'Ground track missed the active Rhodes hotspot cluster, or revisit was not confirmed.',
        downstreamConsequence: 'The fire monitoring desk lacked timely thermal detection and matched revisit corroboration.',
        consequentialAction: 'Select the Rhodes revisit orbit preset (60° ascending node) in orbit selection.',
        targetScreen: 'orbitSelect',
        fixPatch: { orbitId: 'sso', orbitElements: presetOrbit('sso', { raanRad: 60 * RAD }) },
        buttonLabel: 'Select Rhodes Revisit Preset (60° Node) ↗',
      };
    }
  }

  if (ops?.storageGb > 0 && ops?.objectives?.some(o => !o.passed)) {
    return {
      firstCausalLimiter: `Ground contact closed with ${ops.storageGb.toFixed(2)} GB still in onboard recorder.`,
      downstreamConsequence: 'Observations were successfully acquired onboard, but did not reach Earth before the briefing deadline.',
      consequentialAction: 'Upgrade communications antenna (e.g. X-band) or transmit earlier during ground passes.',
      targetScreen: 'workshop',
      targetParams: { mission:true, category:'comms' },
      fixPatch: null,
      buttonLabel: 'Review antennas ↗',
    };
  }

  if (mission.transfer?.type === 'capture' && sim?.cruise?.phase === 'failed' && sim.cruise.log?.at(-1)?.text === 'Braking stage exhausted before capture.') {
    return {
      firstCausalLimiter: 'Braking propellant reserve was insufficient for orbital insertion.',
      downstreamConsequence: 'Spacecraft could not enter a bound orbit and continued on a flyby trajectory.',
      consequentialAction: 'Add propellant tanks in the workshop to supply capture delta-V, or accept flyby science.',
      targetScreen: 'workshop',
      targetParams: { mission: true },
      fixPatch: null,
      buttonLabel: 'Add Braking Propellant in Workshop ↗',
    };
  }

  const missed = ops?.objectives?.find(o => !o.passed);
  if (missed) {
    return {
      firstCausalLimiter: `Unmet requirement: ${missed.name} (${missed.value.toFixed(1)} / ${missed.target} ${missed.unit}).`,
      downstreamConsequence: 'Returned data was below the threshold needed for the scientific brief.',
      consequentialAction: 'Adjust observing schedule, target allocation, or power reserves.',
      targetScreen: 'design',
      fixPatch: null,
      buttonLabel: 'Adjust Mission Design ↗',
    };
  }

  if (rating && rating.total < passStars) {
    return {
      firstCausalLimiter: `Flight rating ${rating.total.toFixed(1)} / 6. Clearance requires ${passStars}.`,
      downstreamConsequence: 'The flight fell below the campaign rating threshold.',
      consequentialAction: 'Review the ratings and change one part of the design.',
      targetScreen:'workshop', targetParams:{mission:true}, buttonLabel:'Revise spacecraft',
    };
  }
  return {
    firstCausalLimiter: 'None. All flight, downlink, and scientific requirements verified.',
    downstreamConsequence: 'All required evidence was received on Earth and delivered to the response desk.',
    consequentialAction: 'Finish mission and record evidence, or try alternative engineering designs.',
    targetScreen: 'missionSelect',
    fixPatch: null,
    buttonLabel: 'Return to Mission Select ↗',
  };
}

function measuredFlight(run,ops){
 const value=(n,dp=1)=>Number(n??0).toFixed(dp);
 const cards=ops.objectives.map(o=>{
  const progress=o.target>0?Math.min(100,Math.max(0,o.value/o.target*100)):o.passed?100:0;
  return `<article class="flight-result-card ${o.passed?'achieved':'missed'}"><span>${escapeHtml(o.name)}</span><strong>${value(o.value)} <small>${escapeHtml(o.unit)}</small></strong><div class="flight-result-meter" aria-hidden="true"><i style="width:${progress}%"></i></div><p><b>${o.passed?'✓ Achieved':'Below target'}</b> · Target ${value(o.target)} ${escapeHtml(o.unit)}</p></article>`;
 }).join('');
 const resources=[['Received on Earth',value(ops.deliveredGb,2)+' GB'],['Still onboard',value(ops.storageGb,2)+' GB'],['Discarded',value(ops.lostGb,2)+' GB'],['Propellant left',value(ops.fuelKg)+' kg'],['Incident decisions',String(ops.decisions??0)]];
 const engineering=[];
 const systems=ops.spacecraftSystems;
 if(systems)engineering.push(['Coldest battery',Math.round(systems.minBatteryC)+' °C'],['Hottest payload',Math.round(systems.peakPayloadC)+' °C'],
  ['Heater energy',systems.heaterWh.toFixed(1)+' Wh'],['Turning and settling',Math.round(systems.turnSec)+' s']);
 const recoveries=(systems?.faults??[]).map(f=>{
  const end=f.recoveredSec===undefined?'Unresolved when the window ended':'Subsystem recovered';
  const missed=f.missedObservationSec?' · '+f.missedObservationSec+' s in an observing window':f.missedContactSec?' · '+f.missedContactSec+' s of station visibility':'';
  return `<li><strong>${SYSTEM_INCIDENTS[f.id].name}</strong><p>${f.actions.map(id=>SYSTEM_INCIDENTS[f.id].choices.find(c=>c.id===id)?.label).join(' → ')||'No action'} · ${Math.round(f.downtimeSec)} s offline${missed} · ${f.lostGb.toFixed(3)} GB lost · ${end}.</p></li>`;
 }).join('');
 const events=(recoveries?`<li class="fault-recovery"><strong>Spacecraft fault recovery</strong><ul>${recoveries}</ul></li>`:'')+
  ops.log.map(e=>`<li><time>T+${Math.round(e.elapsedSec!=null?e.elapsedSec/60:e.tick*4.5)} min</time><span>${escapeHtml(e.text)}</span></li>`).join('');
 const detail=floodwatchReport(run);
 return `<section class="flight-measured" aria-labelledby="flight-measured-title"><header><div><h2 id="flight-measured-title">Mission objectives</h2></div><span class="flight-result-count">${ops.objectives.filter(o=>o.passed).length} / ${ops.objectives.length} targets achieved</span></header><div class="flight-result-grid">${cards}</div><dl class="flight-resource-grid">${resources.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${engineering.length ? `<details class="flight-decisions"><summary>Spacecraft systems</summary><dl class="flight-resource-grid">${engineering.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></details>` : ''}<details class="flight-decisions"><summary>Flight decisions <span>${ops.log.length} events</span></summary><ol>${events||'<li>No manual commands recorded.</li>'}</ol></details>${detail?'<details class="flight-observation-detail"><summary>Observation detail</summary>'+detail+'</details>':''}</section>`;
}
