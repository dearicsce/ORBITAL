import {setFlightSession} from '../flightSession.js';
import {advance, freshAttempt} from '../kepler/keplerMission.js';
import {mapOrbitalToKepler} from '../kepler/keplerMapping.js';
import {CASES, WINDOWS} from '../kepler/keplerConfig.js';
import {keplerEvidence} from '../unity/campaignEvidenceView.js';
import {mountPanel} from '../presentation/mountPanel.js';

const stageActions = {
  pointing: 'Point the photometer',
  capture: 'Record the observation',
  filter: 'Filter flagged readings',
  aggregate: 'Keep individual readings',
  prepare: 'Prepare downlink packets',
  downlink: 'Transmit to Earth',
  complete: 'Open science debrief',
};

export function observationPlan(design) {
  if (!WINDOWS.some(window => window.id === design.windowId)) return null;
  return {
    window: design.windowId,
    prediction: ['H1', 'H2'].includes(design.prediction) ? design.prediction : null,
    recipe: 'native',
    policy: design.keplerPolicy === 'bracket' ? 'bracket' : 'all',
    caseId: Object.hasOwn(CASES, design.keplerCase) ? design.keplerCase : 'nominal',
  };
}

export function renderKeplerOperations(container, run, report) {
  const plan = observationPlan(run.design);
  if (!plan || !run.ascentInsertion || run.launchResult?.success !== true) {
    container.innerHTML = '<section class="screen content-screen"><h1>Observation unavailable</h1><p>A selected observation window and successful deployment are required.</p><button class="orbital-button" id="kepler-report">Review flight</button></section>';
    container.querySelector('#kepler-report').onclick = report;
    return;
  }
  if (!run.keplerAttempt) {
    const {design} = mapOrbitalToKepler(run.design);
    run.keplerAttempt = freshAttempt(run.runId, design, plan);
  }

  container.innerHTML = '<section class="screen content-screen kepler-operations" data-screen="operations">' +
    '<header class="screen-top"><div><p class="orbital-eyebrow">ORBITAL / FLIGHT OPERATIONS</p><h1>Catch the Next Dip</h1></div></header>' +
    '<main class="campaign-kepler"><div id="kepler-evidence-panel"></div></main></section>';
  function snapshot() {
    const attempt = run.keplerAttempt;
    const window = WINDOWS.find(window => window.id === attempt.plan.window);
    const evidence = keplerEvidence(attempt);
    const policy = attempt.plan.policy === 'bracket' ? 'Bracket Four' : 'All Six';
    return {
      ...evidence,
      name:'Observation and downlink',
      message:window.label + ' · ' + window.archiveDate + ' · ' + policy + '. ' + CASES[attempt.plan.caseId].description,
      log:attempt.ledger.map(entry => entry.message),
      actions:[{id:'kepler-advance', label:stageActions[attempt.stage], primary:true}],
    };
  }
  const panel = mountPanel(container.querySelector('#kepler-evidence-panel'), 'evidence', snapshot(), {
    'kepler-advance': () => {
      const prior = run.keplerAttempt;
      if (prior.stage === 'complete') {
        report();
        return;
      }
      run.keplerAttempt = advance(prior);
      if (!setFlightSession(run)) {
        run.keplerAttempt = prior;
        return {ok:false, reason:'Could not save this step. Check profile storage and try again.'};
      }
      panel.update(snapshot());
    },
  });
  return panel.destroy;
}
