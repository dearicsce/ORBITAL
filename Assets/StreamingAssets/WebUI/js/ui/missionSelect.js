/**
 * ORBITAL — Stage Progression Selector
 * 
 * Game-like horizontal stage browsing experience inspired by stage-selector classics,
 * adapted to ORBITAL's space-mission campaign and navy/pale-teal visual system.
 * 
 * Replaces the old document-style celestial atlas with:
 * 1. Compact header with actual completion status, currency and navigation.
 * 2. Chapter strip (Earth, Moon, Inner planets, Small bodies, Jupiter, Outer planets, Solar frontier).
 * 3. Main stage track with 28 large illustrated mission cards, orbital connectors, and instant visual states.
 * 4. Selected-stage detail panel with objectives, unlock prerequisite jumps, and authoritative launch actions.
 */

import { getState, clearDesign, setDesign, saveProgress, setPracticeMode } from '../state.js';
import { showScreen } from './router.js';
import { escapeHtml as escape } from './html.js';
import { missionImage, bindMissionImages } from './missionArt.js';
import { bodyById, missionDestination, isCoreMission } from '../campaignAtlas.js';
import { getFlightSession } from '../flightSession.js';
import {clearSimulationResults} from './simulation.js';
import { campaignDraft, unfinishedFlight } from '../unity/campaignResume.js';
import {
  isActiveCampaignMission,
  getActiveCampaignMissions,
  getActiveCampaignProgress,
  getNextRecommendedMission,
  isMissionUnlocked,
  CAMPAIGN_CHAPTERS,
  CHAPTER_MISSIONS,
  STAGE_ORDER_IDS,
  migrateRetiredCampaignState,
} from '../unity/campaignPolicy.js';
import { starterDesign } from '../campaign.js';
import { readEconomy, missionDifficulty } from '../workshop/economy.js';
import {beginPracticeProfile, leavePracticeProfile} from '../unity/practiceProfile.js';
import {confirmMissionSwitch} from '../unity/confirmDialog.js';
import {openSharedScreenRoles} from '../unity/learningTools.js';
import {featuredMissions, featuredArt} from './missionArt.js';

let activeSelectedId = null;
let activeChapterId = 'earth';
let cleanupStageSelect = () => {};

export function renderMissionSelect(container, data, { openNext = false, initialStage = null, retiredNotice = false } = {}) {
  cleanupStageSelect();
  let destroyed = false;
  const lifetime = new AbortController();
  let enteringMission = false;

  const rawState = getState();
  // Safe migration of any retired mission drafts/selections
  const { state, notice: migrationNotice } = migrateRetiredCampaignState(rawState, data);
  if (migrationNotice) { setDesign(state.currentDesign); saveProgress(); }

  const completed = state.completedMissions || {};
  const activeMissions = getActiveCampaignMissions(data);
  const progress = getActiveCampaignProgress(state, data);
  const flight = getFlightSession();
  const activeRun = unfinishedFlight(flight);
  const draft = activeRun ? null : campaignDraft(state, data, flight?.design?.missionId);
  let coins;
  try { coins = readEconomy().coins; } catch { coins = '—'; }

  // Determine authoritative next recommended mission
  const nextMission = getNextRecommendedMission(state, data);

  // Initialize selection
  if (initialStage && activeMissions.some(m => m.id === initialStage)) {
    activeSelectedId = initialStage;
  } else if (openNext && nextMission) {
    activeSelectedId = nextMission.id;
  } else if (!activeSelectedId || !activeMissions.some(m => m.id === activeSelectedId)) {
    activeSelectedId = (activeRun?.design?.missionId && isActiveCampaignMission(activeRun.design.missionId))
      ? activeRun.design.missionId
      : (draft?.missionId && isActiveCampaignMission(draft.missionId))
        ? draft.missionId
        : nextMission ? nextMission.id : activeMissions[0]?.id;
  }

  // Find chapter of selected mission
  const getChapterForMission = (mId) => {
    for (const [chapId, mList] of Object.entries(CHAPTER_MISSIONS)) {
      if (mList.includes(mId)) return chapId;
    }
    return 'earth';
  };
  activeChapterId = getChapterForMission(activeSelectedId);

  // Format stages data with 1-based index (Stage 01 to Stage 28)
  const stageCards = activeMissions.map((m, index) => {
    const stageNumber = String(index + 1).padStart(2, '0');
    const isCompleted = Boolean(completed[m.id]);
    const isNext = m.id === nextMission?.id && !isCompleted;
    const isUnlocked = isMissionUnlocked(m, completed);
    const isInProgress = (activeRun?.design?.missionId === m.id) || (draft?.missionId === m.id);
    const record = completed[m.id];
    const diff = missionDifficulty(m);
    const core = isCoreMission(m);

    let status = 'available';
    let statusLabel = 'Available';
    if (isCompleted && !isInProgress) {
      status = 'completed';
      statusLabel = 'Completed';
    } else if (isInProgress) {
      status = 'in-progress';
      statusLabel = 'In Progress';
    } else if (isNext) {
      status = 'recommended';
      statusLabel = 'Next Mission';
    } else if (!isUnlocked) {
      status = 'locked';
      statusLabel = 'Locked';
    }

    return {
      mission: m,
      stageNumber,
      status,
      statusLabel,
      isCompleted,
      isNext,
      isUnlocked,
      isInProgress,
      record,
      difficulty: diff,
      core,
      chapterId: getChapterForMission(m.id),
    };
  });

  // Render Full Stage Selector DOM
  container.innerHTML = `
    <div class="stage-progression-screen" data-screen="missionSelect" role="region" aria-label="Campaign Stage Progression">
      <!-- 1. Header -->
      <header class="stage-header">
        <div class="stage-header-brand">
          <button type="button" class="stage-home-btn" id="stage-home" aria-label="Return to Main Menu">
            <span class="brand-glyph" aria-hidden="true">◫</span>
            <strong>ORBITAL</strong>
            <span class="brand-divider">/</span>
            <span class="brand-sub">CAMPAIGN</span>
          </button>
        </div>

        <div class="stage-header-progress">
          <div class="progress-meter" role="progressbar" aria-valuenow="${progress.completed}" aria-valuemin="0" aria-valuemax="${progress.total}" aria-label="Campaign progress">
            <div class="progress-bar-fill" style="width: ${progress.percentage}%;"></div>
          </div>
          <span class="progress-text">${progress.completed} / ${progress.total} CONTRACTS COMPLETED</span>
        </div>

        <div class="stage-header-actions">
          <span class="stage-currency" title="Equipment coins">
            <span class="currency-icon" aria-hidden="true">◆</span>
            <span class="currency-val">${coins}</span>
            <span class="currency-unit">COINS</span>
          </span>
          <button type="button" class="stage-nav-link" id="stage-academy">Flight Academy</button>
          <button type="button" class="stage-nav-link" id="stage-reference">Reference</button>
          <button type="button" class="stage-nav-link" id="stage-practice" title="Launch an isolated practice flight for showcase missions">Practice Showcase</button>
          <button type="button" class="stage-nav-link" id="stage-team-roles" title="Assign shared-screen classroom roles">Team Roles</button>
          ${nextMission ? `<button type="button" class="stage-jump-btn" id="stage-jump-next">Next Stage ★</button>` : ''}
        </div>
      </header>

      <!-- Migration / Status Notice if applicable -->
      ${state.practiceMode ? `
        <div class="stage-notice-banner practice-active-banner" role="status" style="background: rgba(127, 224, 248, 0.12); border-left: 4px solid #7fe0f8; display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 1rem;">
          <span><strong>Practice flight</strong></span>
          <button type="button" class="btn btn-sm btn-primary" id="btn-exit-practice">Exit to Campaign</button>
        </div>
      ` : (migrationNotice || retiredNotice) ? `
        <div class="stage-notice-banner" role="status">
          <span>${escape(migrationNotice || 'The previous Proxima sail contract has been retired from the active campaign.')}</span>
          <button type="button" class="stage-notice-close" aria-label="Dismiss notice">&times;</button>
        </div>
      ` : ''}

      ${!state.practiceMode ? `<section class="featured-missions" aria-label="Featured missions">
        <h1>Choose a mission</h1>
        <div class="featured-grid">${Object.entries(featuredMissions).map(([id, feature]) => {
          const stage = stageCards.find(s => s.mission.id === id);
          if (!stage) return '';
          const flightSaved = activeRun?.design?.missionId === id;
          const action = stage.isInProgress ? (flightSaved ? 'Resume flight' : 'Resume design')
            : !stage.isUnlocked ? 'Start practice' : stage.isCompleted ? 'Replay mission' : 'Open briefing';
          return `<article class="featured-card ${stage.status}">
            ${featuredArt(id)}
            <div class="featured-copy">
              <div class="featured-card-heading"><h2>${feature.name}</h2><span>${stage.isUnlocked || stage.isInProgress ? stage.statusLabel : 'Campaign locked'}</span></div>
              <p>${feature.objective}</p>
              <button type="button" class="stage-action-btn ${stage.isUnlocked || stage.isInProgress ? 'primary' : ''}" data-feature-mission="${id}" aria-label="${action} · ${feature.name}">${action} <span aria-hidden="true">→</span></button>
            </div>
          </article>`;
        }).join('')}</div>
      </section>` : ''}

      <!-- 2. Chapter Strip -->
      <nav class="stage-chapter-strip" aria-label="Campaign Chapters">
        <span class="chapter-caption">Browse chapters</span>
        <div class="chapter-scroll-track" role="tablist">
          ${CAMPAIGN_CHAPTERS.map(chap => {
            const chapMissions = CHAPTER_MISSIONS[chap.id] || [];
            const chapDone = chapMissions.filter(id => Boolean(completed[id])).length;
            const isAllDone = chapDone === chapMissions.length;
            const isCurrent = chap.id === activeChapterId;
            return `
              <button type="button"
                role="tab"
                class="chapter-tab ${isCurrent ? 'active' : ''} ${isAllDone ? 'done' : ''}"
                data-chapter-id="${chap.id}"
                aria-selected="${isCurrent}"
                aria-controls="stage-strip-container"
              >
                <span class="chapter-name">${escape(chap.name)}</span>
                <span class="chapter-count">${chapDone}/${chapMissions.length}</span>
              </button>
            `;
          }).join('')}
        </div>
      </nav>

      <!-- 3. Main Stage Strip (Cards Track) -->
      <main class="stage-track-viewport" id="stage-strip-container">
        <button type="button" class="stage-track-arrow prev" id="track-prev" aria-label="Previous Stages" title="Previous stages">‹</button>
        
        <div class="stage-track" id="stage-track" tabindex="0" role="listbox" aria-label="Mission stages">
          <div class="stage-connector-line" aria-hidden="true"></div>
          
          ${stageCards.map(s => {
            const isSelected = s.mission.id === activeSelectedId;
            const destination = bodyById(missionDestination(s.mission));
            return `
              <article
                class="stage-card ${s.status} ${isSelected ? 'selected' : ''}"
                data-stage-id="${s.mission.id}"
                data-stage-num="${s.stageNumber}"
                role="option"
                aria-selected="${isSelected}"
                aria-label="Stage ${s.stageNumber}: ${escape(s.mission.name)}, ${s.statusLabel}"
                tabindex="${isSelected ? 0 : -1}"
              >
                <div class="stage-card-header">
                  <span class="stage-num-badge">STAGE ${s.stageNumber}</span>
                  <span class="stage-core-badge ${s.core ? 'core' : 'optional'}">${s.core ? 'CORE' : 'OPTIONAL'}</span>
                </div>

                <div class="stage-card-art">
                  ${missionImage(s.mission)}
                  ${s.status === 'locked' ? '<div class="stage-lock-overlay" aria-hidden="true"><span class="lock-icon">🔒</span></div>' : ''}
                </div>

                <div class="stage-card-body">
                  <h3 class="stage-title">${escape(s.mission.name)}</h3>
                  <p class="stage-dest">${escape(destination?.name || s.mission.tag || 'Earth orbit')}</p>
                </div>

                <div class="stage-card-footer">
                  ${s.status === 'completed' ? `
                    <div class="stage-badge-status completed">
                      <span class="badge-icon">✓</span>
                      <span>COMPLETED</span>
                      ${s.record?.stars ? `<span class="badge-stars">${s.record.stars.toFixed(1)}/6 ★</span>` : ''}
                    </div>
                  ` : s.status === 'recommended' ? `
                    <div class="stage-badge-status next">
                      <span class="badge-icon">★</span>
                      <span>NEXT MISSION</span>
                    </div>
                  ` : s.isInProgress ? `
                    <div class="stage-badge-status progress">
                      <span class="badge-icon">●</span>
                      <span>IN PROGRESS</span>
                    </div>
                  ` : s.isUnlocked ? `
                    <div class="stage-badge-status available">
                      <span>AVAILABLE</span>
                    </div>
                  ` : `
                    <div class="stage-badge-status locked">
                      <span class="badge-icon">🔒</span>
                      <span>LOCKED</span>
                    </div>
                  `}
                </div>
              </article>
            `;
          }).join('')}
        </div>

        <button type="button" class="stage-track-arrow next" id="track-next" aria-label="Next Stages" title="Next stages">›</button>
      </main>

      <!-- 4. Selected Stage Detail & Action Bar -->
      <footer class="stage-detail-panel" id="stage-detail-panel" aria-live="polite">
        <!-- Injected dynamically via renderDetailPanel() -->
      </footer>
    </div>
  `;

  // Grab interactive handles
  const track = container.querySelector('#stage-track');
  const detailPanel = container.querySelector('#stage-detail-panel');
  const prevBtn = container.querySelector('#track-prev');
  const nextBtn = container.querySelector('#track-next');
  bindMissionImages(container);
  window.addEventListener('orbital-wallet-change', event => {
    container.querySelector('.currency-val').textContent = event.detail;
  }, {signal:lifetime.signal});

  // Helper: Get selected stage card data
  function getSelectedStage() {
    return stageCards.find(s => s.mission.id === activeSelectedId) || stageCards[0];
  }

  // Render bottom detail panel for selected stage
  function renderDetailPanel() {
    const s = getSelectedStage();
    if (!s) return;
    const m = s.mission;
    const destination = bodyById(missionDestination(m));
    const payload = data.instruments?.find(p => p.id === m.payload);
    const requiresNames = (m.requires || []).filter(id => !completed[id]).map(id => {
      const parent = activeMissions.find(p => p.id === id);
      return { id, name: parent?.name || id };
    });

    const isLocked = !s.isUnlocked;
    const isCompleted = s.isCompleted;
    const isInProgress = s.isInProgress;

    detailPanel.innerHTML = `
      <div class="detail-col detail-summary">
        <div class="detail-kicker">
          <span>STAGE ${s.stageNumber}</span>
          <span class="kicker-sep">·</span>
          <span>${escape(CAMPAIGN_CHAPTERS.find(c => c.id === s.chapterId)?.name || 'Campaign')}</span>
        </div>
        <h2 class="detail-title">${escape(m.name)}</h2>
        <p class="detail-desc">${escape(m.objective || m.brief || '')}</p>
        <div class="detail-tags">
          <span class="detail-tag"><strong>Target:</strong> ${escape(destination?.name || 'Earth orbit')}</span>
          ${payload ? `<span class="detail-tag"><strong>Payload:</strong> ${escape(payload.name)}</span>` : ''}
          <span class="detail-tag"><strong>Budget:</strong> $${Math.round(m.budget * (data.difficulty[state.difficulty]?.budgetMultiplier ?? 1))}M</span>
          <span class="detail-tag"><strong>Difficulty:</strong> ${'★'.repeat(s.difficulty)}</span>
        </div>
      </div>

      <div class="detail-col detail-status-box">
        ${isLocked ? `
          <div class="status-callout locked">
            <div class="callout-header">
              <span class="callout-icon" aria-hidden="true">🔒</span>
              <strong>Mission Locked</strong>
            </div>
            <p class="callout-body">Complete ${requiresNames.map(r => `<em>${escape(r.name)}</em>`).join(' and ')}.</p>
            ${requiresNames.length ? `
              <button type="button" class="btn-prereq-jump" data-jump-prereq="${requiresNames[0].id}">
                View ${escape(requiresNames[0].name)} →
              </button>
            ` : ''}
          </div>
        ` : isCompleted && !isInProgress ? `
          <div class="status-callout completed">
            <div class="callout-header">
              <span class="callout-icon" aria-hidden="true">✓</span>
              <strong>Mission complete</strong>
            </div>
            <p class="callout-body">
              ${s.record?.stars ? `Best result: ${s.record.stars.toFixed(1)} / 6 stars.` : 'All baseline scientific objectives met.'}
            </p>
          </div>
        ` : isInProgress ? `
          <div class="status-callout in-progress">
            <div class="callout-header">
              <span class="callout-icon" aria-hidden="true">●</span>
              <strong>Active Mission</strong>
            </div>
            <p class="callout-body">
              ${activeRun?.design?.missionId === m.id ? 'Flight checkpoint saved.' : 'Spacecraft configuration draft saved.'}
            </p>
          </div>
        ` : ''}
      </div>

      <div class="detail-col detail-action-box">
        <div class="action-btn-row">
          ${isLocked ? `
            <button type="button" class="stage-action-btn primary disabled" disabled aria-disabled="true">
              <span>Stage Locked</span>
              <span class="btn-icon" aria-hidden="true">🔒</span>
            </button>
          ` : isInProgress && activeRun?.design?.missionId === m.id ? `
            <button type="button" class="stage-action-btn primary" id="btn-stage-enter" data-action="resumeRun">
              <span>Resume Flight</span>
              <span class="btn-icon" aria-hidden="true">→</span>
            </button>
          ` : isInProgress && draft?.missionId === m.id ? `
            <button type="button" class="stage-action-btn primary" id="btn-stage-enter" data-action="resumeDraft">
              <span>Resume Design</span>
              <span class="btn-icon" aria-hidden="true">→</span>
            </button>
          ` : isCompleted ? `
            <button type="button" class="stage-action-btn primary replay" id="btn-stage-enter" data-action="replay">
              <span>Replay Mission</span>
              <span class="btn-icon" aria-hidden="true">↺</span>
            </button>
          ` : m.id === 'dip' ? `
            <button type="button" class="stage-action-btn primary" id="btn-stage-enter" data-action="brief">
              <span>Open Briefing</span>
              <span class="btn-icon" aria-hidden="true">→</span>
            </button>
          ` : `
            <button type="button" class="stage-action-btn primary" id="btn-stage-enter" data-action="start">
              <span>Open Briefing</span>
              <span class="btn-icon" aria-hidden="true">→</span>
            </button>
          `}
        </div>

        <div class="action-secondary-row">
          ${!isLocked && !isInProgress && m.id !== 'dip' ? `
            <button type="button" class="stage-starter-btn" id="btn-use-starter" title="Start with recommended educational baseline">
              Use starter design
            </button>
          ` : ''}
        </div>
      </div>
    `;

    // Bind Jump to Prerequisite
    const jumpBtn = detailPanel.querySelector('[data-jump-prereq]');
    if (jumpBtn) {
      jumpBtn.onclick = () => {
        selectStage(jumpBtn.dataset.jumpPrereq, true);
      };
    }

    // Bind Primary Action Launch / Resume
    const enterBtn = detailPanel.querySelector('#btn-stage-enter');
    if (enterBtn) enterBtn.onclick = () => openStage(m);

    // Bind Starter Design
    const starterBtn = detailPanel.querySelector('#btn-use-starter');
    if (starterBtn) {
      starterBtn.onclick = () => {
        const starter = starterDesign(m, data, state.difficulty || 'normal');
        enterMission(m, starter);
      };
    }
  }

  // Select stage by ID and update UI
  function selectStage(missionId, smoothScroll = true) {
    if (!activeMissions.some(m => m.id === missionId)) return;
    activeSelectedId = missionId;
    activeChapterId = getChapterForMission(missionId);

    // Update active card class
    container.querySelectorAll('.stage-card').forEach(card => {
      const isCardSelected = card.dataset.stageId === missionId;
      card.classList.toggle('selected', isCardSelected);
      card.setAttribute('aria-selected', isCardSelected);
      card.setAttribute('tabindex', isCardSelected ? 0 : -1);
      if (isCardSelected && document.activeElement && document.activeElement.classList.contains('stage-card')) {
        card.focus();
      }
    });

    // Update chapter tabs
    container.querySelectorAll('.chapter-tab').forEach(tab => {
      const isTabActive = tab.dataset.chapterId === activeChapterId;
      tab.classList.toggle('active', isTabActive);
      tab.setAttribute('aria-selected', isTabActive);
    });

    // Re-render bottom details
    renderDetailPanel();

    // Scroll selected card into view
    const selectedCard = container.querySelector(`.stage-card[data-stage-id="${missionId}"]`);
    if (selectedCard && track) {
      prevBtn.disabled = missionId === stageCards[0].mission.id;
      nextBtn.disabled = missionId === stageCards.at(-1).mission.id;
      const scrollTarget = selectedCard.offsetLeft - (track.clientWidth / 2) + (selectedCard.clientWidth / 2);
      track.scrollTo({
        left: Math.max(0, scrollTarget),
        behavior: smoothScroll && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant',
      });
    }
  }

  function openStage(mission) {
    if (enteringMission || destroyed) return;
    if (activeRun?.design?.missionId === mission.id) {
      if (getState().currentDesign.missionId !== mission.id) setDesign(activeRun.design);
      showScreen('simulation', {mission:true});
    } else if (draft?.missionId === mission.id) {
      showScreen(draft.screen, {mission:true});
    } else {
      enterMission(mission);
    }
  }

  // Authoritative mission launch controller with switch-mission confirmation safeguards
  async function enterMission(mission, preset = null, isPractice = false) {
    if (enteringMission || destroyed || (!isPractice && !isMissionUnlocked(mission, completed))) return;
    enteringMission = true;

    const hasActiveWork = (activeRun && activeRun.design?.missionId !== mission.id) || (draft && draft.missionId !== mission.id);

    if (hasActiveWork && !isPractice) {
      if (!await confirmMissionSwitch(mission.name, {signal:lifetime.signal, flight:Boolean(activeRun)})) {
        enteringMission = false;
        return;
      }
    }
    if (destroyed) return;

    if (clearSimulationResults() === false) { enteringMission = false; return; }
    clearDesign();
    setDesign({
      missionId: mission.id,
      launcherId: null,
      orbitId: null,
      flightWorkflow: true,
      scienceBundleId: null,
      ...(preset || {}),
    });
    saveProgress();

    if (preset && !isPractice && mission.id !== 'dip') showScreen('workshop', {mission:true, preset});
    else showScreen('brief');
  }

  function launchPractice(missionId) {
    if (enteringMission || destroyed) return;
    const m = data.missions.find(entry => entry.id === missionId);
    if (!m) return;
    const prerequisites = new Set();
    const queue = [...(m.requires || [])];
    for (const id of queue) {
      if (prerequisites.has(id)) continue;
      prerequisites.add(id);
      queue.push(...(data.missions.find(entry => entry.id === id)?.requires || []));
    }
    beginPracticeProfile([...prerequisites]);
    setPracticeMode(true, state.currentMissionId);
    let starter = null;
    if (missionId === 'dip') {
      starter = {
        busId: 'bus_micro',
        panelIds: ['panel_m'],
        batteryIds: ['battery_m'],
        computerId: 'computer_basic',
        pointingId: 'pointing_reaction_wheels',
        commsId: 'comms_x_band',
        fuelIds: ['fuel_s'],
        instrumentIds: ['optical_camera'],
        windowId: 'A',
        prediction: 'H1',
        keplerPolicy: 'all',
        keplerRecipe: 'native',
        keplerCase: 'nominal'
      };
    } else {
      starter = starterDesign(m, data, state.difficulty || 'normal');
    }
    enterMission(m, starter, true);
  }

  container.querySelectorAll('[data-feature-mission]').forEach(button => {
    button.onclick = () => {
      const stage = stageCards.find(s => s.mission.id === button.dataset.featureMission);
      selectStage(stage.mission.id, false);
      if (stage.isUnlocked || stage.isInProgress) openStage(stage.mission);
      else launchPractice(stage.mission.id);
    };
  });

  function showPracticeModal() {
    const existing = container.querySelector('.stage-practice-modal-backdrop');
    if (existing) existing.remove();
    const modal = document.createElement('dialog');
    modal.setAttribute('aria-labelledby', 'practice-modal-title');
    modal.className = 'stage-practice-modal-backdrop';
    modal.innerHTML = `
      <div class="stage-practice-modal">
        <div class="practice-modal-header">
          <div>
            <h2 id="practice-modal-title">Practice Showcase Simulator</h2>
            <p>Choose a mission to try.</p>
          </div>
          <button type="button" class="practice-modal-close" id="btn-close-practice-modal" aria-label="Close dialog">&times;</button>
        </div>
        <div class="practice-mission-grid">
          <article class="practice-mission-card">
            <span class="practice-card-badge">Earth Chapter · Transit</span>
            <h3 class="practice-card-title">Catch the Next Dip</h3>
            <p class="practice-card-desc">Choose three star readings that distinguish two predictions.</p>
            <button type="button" class="btn btn-sm btn-primary practice-card-btn" data-practice-launch="dip">Practice Kepler Transit →</button>
          </article>
          <article class="practice-mission-card">
            <span class="practice-card-badge">Moon Chapter · Store & Forward</span>
            <h3 class="practice-card-title">Far-side Relay</h3>
            <p class="practice-card-desc">Get a crew message from the far side of the Moon to Earth.</p>
            <button type="button" class="btn btn-sm btn-primary practice-card-btn" data-practice-launch="relay">Practice Lunar Relay →</button>
          </article>
          <article class="practice-mission-card">
            <span class="practice-card-badge">Inner Planets · Capture</span>
            <h3 class="practice-card-title">Mars Reconnaissance</h3>
            <p class="practice-card-desc">Brake into Mars orbit and photograph the surface again.</p>
            <button type="button" class="btn btn-sm btn-primary practice-card-btn" data-practice-launch="mars-orbiter">Practice Mars Capture →</button>
          </article>
        </div>
      </div>
    `;
    container.appendChild(modal);
    modal.addEventListener('close', () => modal.remove(), {once:true});
    modal.showModal();
    modal.querySelector('#btn-close-practice-modal').onclick = () => modal.close();
    modal.onclick = (e) => { if (e.target === modal) modal.close(); };
    modal.querySelectorAll('[data-practice-launch]').forEach(btn => {
      btn.onclick = () => {
        modal.close();
        launchPractice(btn.dataset.practiceLaunch);
      };
    });
  }

  // Wire Card Click handlers
  container.querySelectorAll('.stage-card').forEach(card => {
    card.onclick = (e) => {
      // Distinguish drag from click
      if (isDragging) return;
      selectStage(card.dataset.stageId, true);
    };
  });

  // Wire Chapter Tabs Click
  container.querySelectorAll('.chapter-tab').forEach(tab => {
    tab.onclick = () => {
      const chapId = tab.dataset.chapterId;
      const firstMissionId = CHAPTER_MISSIONS[chapId]?.[0];
      if (firstMissionId) {
        selectStage(firstMissionId, true);
      }
    };
  });

  // Wire Arrow Buttons
  if (prevBtn) {
    prevBtn.onclick = () => {
      const currentIndex = stageCards.findIndex(s => s.mission.id === activeSelectedId);
      if (currentIndex > 0) {
        selectStage(stageCards[currentIndex - 1].mission.id, true);
      }
    };
  }
  if (nextBtn) {
    nextBtn.onclick = () => {
      const currentIndex = stageCards.findIndex(s => s.mission.id === activeSelectedId);
      if (currentIndex < stageCards.length - 1) {
        selectStage(stageCards[currentIndex + 1].mission.id, true);
      }
    };
  }

  // Wire Quick Jump to Recommended Next
  const jumpNextBtn = container.querySelector('#stage-jump-next');
  if (jumpNextBtn && nextMission) {
    jumpNextBtn.onclick = () => {
      selectStage(nextMission.id, true);
    };
  }

  // Wire Header Links
  container.querySelector('#stage-home').onclick = () => showScreen('menu');
  container.querySelector('#stage-academy').onclick = () => showScreen('academy');
  container.querySelector('#stage-reference').onclick = () => showScreen('evidence');
  const practiceNavBtn = container.querySelector('#stage-practice');
  if (practiceNavBtn) practiceNavBtn.onclick = () => showPracticeModal();
  const teamRolesBtn = container.querySelector('#stage-team-roles');
  if (teamRolesBtn) teamRolesBtn.onclick = () => openSharedScreenRoles(container, data, activeSelectedId);
  const exitPracticeBtn = container.querySelector('#btn-exit-practice');
  if (exitPracticeBtn) {
    exitPracticeBtn.onclick = () => {
      if (leavePracticeProfile()) return;
      // Older releases saved practice directly in the campaign slot.
      setPracticeMode(false);
      clearSimulationResults();
      clearDesign();
      setDesign({missionId:state.practiceOrigin || 'm1', flightWorkflow:false});
      saveProgress();
      renderMissionSelect(container, data);
    };
  }

  // Wire Notice Dismiss
  const noticeClose = container.querySelector('.stage-notice-close');
  if (noticeClose) {
    noticeClose.onclick = () => {
      container.querySelector('.stage-notice-banner')?.remove();
    };
  }

  // Pointer drag / swipe support with threshold
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let isDragging = false;

  const onPointerDown = (e) => {
    isDown = true;
    isDragging = false;
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  };
  const onPointerMove = (e) => {
    if (!isDown) return;
    const x = e.pageX - track.offsetLeft;
    const walk = x - startX;
    if (Math.abs(walk) > 8) {
      isDragging = true;
      track.scrollLeft = scrollLeft - walk;
    }
  };
  const onPointerUp = () => {
    isDown = false;
    setTimeout(() => { isDragging = false; }, 50);
  };

  track.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  // Wheel horizontal browsing
  const onWheel = (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      track.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };
  track.addEventListener('wheel', onWheel, { passive: false });

  // Keyboard navigation
  const onKeyDown = (e) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!Object.hasOwn(keys, e.key)) return;
    e.preventDefault();
    const currentIndex = stageCards.findIndex(s => s.mission.id === activeSelectedId);
    if (e.key === 'Home') {
      selectStage(stageCards[0].mission.id, true);
    } else if (e.key === 'End') {
      selectStage(stageCards.at(-1).mission.id, true);
    } else {
      const nextIndex = Math.max(0, Math.min(stageCards.length - 1, currentIndex + keys[e.key]));
      selectStage(stageCards[nextIndex].mission.id, true);
    }
  };
  track.addEventListener('keydown', onKeyDown);

  // Initial selection and render
  selectStage(activeSelectedId, false);

  // Cleanup handler
  cleanupStageSelect = () => {
    if (destroyed) return;
    destroyed = true;
    lifetime.abort();
    track.removeEventListener('mousedown', onPointerDown);
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerUp);
    track.removeEventListener('wheel', onWheel);
    track.removeEventListener('keydown', onKeyDown);
  };

  return cleanupStageSelect;
}
