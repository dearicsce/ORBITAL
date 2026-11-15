import {getState} from '../state.js';
import {resolveFlightDesign} from '../flightConfiguration.js';
import {escapeHtml as escape} from '../ui/html.js';

const planning = ['workshop', 'rocketSelect', 'orbitSelect', 'flightPlan', 'advisory', 'review'];

export function designImpact(before, after) {
  const changed = Object.keys({...before, ...after}).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  if (!changed.length) return null;
  const affected = new Set(['readiness', 'launch review']);
  if (changed.some(k => /assembly|bus|battery|panel|instrument|comms|computer|pointing|fuel/i.test(k))) ['mass and cost', 'power reserve', 'science and delivery forecast'].forEach(v => affected.add(v));
  if (changed.some(k => /orbit|station|scienceBundle/i.test(k))) ['access and contact', 'science and delivery forecast'].forEach(v => affected.add(v));
  if (changed.some(k => /launcher|rocket|flightPlan|planId/i.test(k))) affected.add('launch and transfer estimates');
  return {changed, affected: [...affected]};
}

export function validationDestination(id) {
  if (id === 'mission-orbit') return {screen:'orbitSelect', params:{}};
  if (id === 'flight-plan' || id.startsWith('transfer-')) return {screen: 'flightPlan', params: {}};
  if (id === 'launcher-blueprint' || id.startsWith('rocket-') || id === 'reach') return {screen: 'rocketSelect', params: {}};
  const category = {launch_mass: 'bus', budget: 'all', power: 'panel', eclipse: 'battery', slots: 'bus', computer: 'computer', pointing: 'pointing', radio_pointing: 'pointing', fuel: 'fuel', comms: 'comms', lifetime: 'fuel', required_payload: 'instrument', fairing: 'bus'}[id] || 'all';
  return {screen: 'workshop', params: {mission: true, category}};
}

export function bindJourney(container, data, screen, params, showScreen, flight) {
  if(screen==='report')return ()=>{};
  const design = getState().currentDesign;
  if (!design.flightWorkflow || design.missionId === 'tutorial' || (!planning.includes(screen) && !['rocketWorkshop', 'simulation', 'report'].includes(screen))) return () => {};
  if (['workshop', 'rocketWorkshop'].includes(screen) && !params.mission) return () => {};
  const mission = data.missions.find(m => m.id === (['simulation', 'report'].includes(screen) ? flight?.design?.missionId : design.missionId));
  if (!mission) return () => {};

  const activeFlight = screen === 'simulation' || screen === 'report';

  // During active simulation/operations, do not inject the bulky planning navigation
  // into the live console grid. Instead, integrate a compact derived phase badge
  // into the live header so panel gutters remain clean and layout is preserved.
  if (screen === 'simulation') {
    const compactBadge = document.createElement('div');
    compactBadge.className = container.querySelector('.mission-control') ? 'control-phase-badge' : 'control-phase-badge journey-bar';
    compactBadge.setAttribute('data-journey-phase', 'true');
    let lastPhase = '';

    const updateLiveBadge = () => {
      const rootScreen = container.querySelector('[data-screen]')?.dataset.screen;
      const isOps = Boolean(container.querySelector('.mission-control') || ['missionControl', 'operations'].includes(rootScreen));
      compactBadge.className = isOps ? 'control-phase-badge' : 'control-phase-badge journey-bar';
      const current = rootScreen === 'cruise' ? 'Transfer / encounter' : ['missionControl', 'operations'].includes(rootScreen) ? 'Operations' : 'Flight Ascent';
      if (current !== lastPhase) {
        lastPhase = current;
        compactBadge.innerHTML = `<span>Phase: <strong data-journey-current>${escape(current)}</strong></span><small>Flown configuration retained</small>` +
          `<span data-journey-flight style="display:none">${current === 'Operations' ? 'Flight · completed' : 'Flight · current'}</span>` +
          `<span data-journey-operations style="display:none">${current === 'Operations' ? 'Operations · current' : 'Operations · blocked until deployment'}</span>`;
      }
      const header = container.querySelector('.control-header, .screen-top');
      if (header && !compactBadge.isConnected) {
        header.append(compactBadge);
      }
    };

    updateLiveBadge();
    const observer = new MutationObserver(mutations => {
      const isBadgeMutation = mutations.every(m => compactBadge.contains(m.target) || m.target === compactBadge);
      if (isBadgeMutation) return;
      updateLiveBadge();
    });
    observer.observe(container, {childList: true, subtree: true});

    return () => {
      observer.disconnect();
      compactBadge.remove();
    };
  }

  // During planning screens, present the standard step-by-step navigation bar
  const index = screen === 'rocketWorkshop' ? 1 : planning.indexOf(screen);
  const locationStep = mission.transfer ? 'Earth departure orbit' : 'Operating location';
  const planStep = mission.transfer ? 'Transfer plan' : 'Insertion plan';
  const steps = [['Spacecraft', 'workshop'], ['Launcher', 'rocketSelect'], [locationStep, 'orbitSelect'], [planStep, 'flightPlan'], ['Readiness', 'advisory'], ['Launch review', 'review']];
  const phase = steps[index]?.[0] ?? 'Launcher';
  const nextAction = {workshop: 'Choose launcher when your spacecraft is ready.', rocketSelect: 'Choose a compatible launcher, then continue.', rocketWorkshop: 'Save and use this launcher to return to mission planning.', orbitSelect: mission.transfer?'Confirm Earth parking orbit to plan the transfer.':'Confirm where this mission will operate.', flightPlan: 'Confirm this flight plan to check readiness again.', advisory: 'Fix the listed issues or continue to the evaluation board.', review: 'Launch this reviewed configuration, or return to change it.'}[screen] || '';

  const nav = document.createElement('nav');
  nav.className = 'journey-bar';
  nav.setAttribute('aria-label', 'Mission progress');
  nav.innerHTML = '<div class="journey-meta-row">' +
    '<div class="journey-title-group"><span class="journey-eyebrow">Mission</span><strong class="journey-mission-name">' + escape(mission.name) + '</strong><span class="journey-phase-tag" data-journey-current>' + phase + '</span></div>' +
    '<div class="journey-feedback-group"><span class="journey-next">Next: ' + escape(nextAction) + '</span><span class="journey-impact" role="status" hidden></span></div>' +
    '</div>' +
    '<ol class="journey-steps"><li><button type="button" class="btn journey-btn" data-journey="missionSelect">Mission map</button></li>' + steps.map(([label, target], i) => {
      const state = i === index ? 'current' : i < index ? 'completed' : 'blocked';
      return '<li><button type="button" class="btn journey-btn ' + (i === index ? 'is-current' : '') + '" data-journey="' + target + '" ' + (state === 'blocked' ? 'disabled' : '') + ' ' + (i === index ? 'aria-current="step"' : '') + '>' + escape(label) + ' · ' + state + '</button></li>';
    }).join('') + '<li class="journey-step-tag" data-journey-flight>Flight · blocked until review</li><li class="journey-step-tag" data-journey-operations>' + (mission.transfer ? 'Transfer / encounter' : 'Operations') + ' · blocked until deployment</li><li class="journey-step-tag">Results · available after flight</li></ol>';

  const attach = () => {
    if (!nav.isConnected) {
      const header = container.querySelector('.screen-top, .ws-header');
      if (header) header.after(nav);
      else container.firstElementChild?.prepend(nav);
    }
  };

  attach();
  const observer = new MutationObserver(attach);
  observer.observe(container, {childList: true, subtree: true});

  for (const button of nav.querySelectorAll('[data-journey]:not(:disabled)')) {
    button.onclick = () => showScreen(button.dataset.journey, {mission: true});
  }

  let previous = resolveFlightDesign(getState().currentDesign);
  const changed = () => {
    if (activeFlight) return;
    const current = resolveFlightDesign(getState().currentDesign);
    const impact = designImpact(previous, current);
    previous = current;
    if (!impact) return;
    const notice = nav.querySelector('.journey-impact');
    if (notice) {
      notice.hidden = false;
      notice.textContent = 'Design changed. Recheck ' + impact.affected.join(', ') + '. Forecasts are estimates; the launch review will use the current design.';
    }
  };

  addEventListener('orbital-design-change', changed);
  return () => {
    observer.disconnect();
    removeEventListener('orbital-design-change', changed);
    nav.remove();
  };
}
