import { geometryIssues, stowedEnvelope } from '../workshop/collision.js';
import { launcherFor } from '../rocket/engineering.js';
import { getState, setDesign, saveProgress } from '../state.js';
import { getUnlocked } from '../engine.js';
import { createRocketCarousel, BAY_SPECS } from '../three/rocketCarousel.js';
import { showScreen } from './router.js';
import { getUnlockLabel } from './designTooltips.js';

export function renderRocketSelect(container, data) {
  const state = getState();
  const mission = data.missions.find(m => m.id === state.currentMissionId) || data.missions[0];
  const missionLauncherIds = mission.launchers || [];
  const unlockedLaunchers = getUnlocked(data, Object.keys(state.completedMissions || {})).launchers || [];

  // A rocket is accessible if and only if it is unlocked in the campaign AND permitted for this mission!
  const isAccessible = (id) => unlockedLaunchers.includes(id) && missionLauncherIds.includes(id);

  // Build the complete 10-bay inventory
  const allBayLaunchers = BAY_SPECS.map((spec) => {
    const launcherData = data.launchers.find(l => l.id === spec.id) || {};
    const accessible = isAccessible(spec.id);
    let lockReason = '';
    if (!unlockedLaunchers.includes(spec.id)) {
      lockReason = getUnlockLabel(launcherData.unlock || 'Locked');
    } else if (!missionLauncherIds.includes(spec.id)) {
      lockReason = 'Not certified for this mission payload';
    }

    return {
      ...spec,
      ...launcherData,
      id: spec.id,
      name: launcherData.name || spec.id,
      cost: launcherData.cost ?? spec.defaultCost,
      accessible,
      lockReason,
      capacity: launcherData.capacity || { leo: 0, gto: 0, tli: 0 },
      reliability: launcherData.reliability ?? 0.9,
      fairingRadiusM: launcherData.fairingRadiusM ?? 1.5,
      fairingHeightM: launcherData.fairingHeightM ?? 4.0,
      description: launcherData.description || spec.subtitle
    };
  });

  const accessibleLaunchers = allBayLaunchers.filter(l => l.accessible);
  const accessibleIds = accessibleLaunchers.map(l => l.id);
  const lockedIds = allBayLaunchers.filter(l => !l.accessible).map(l => l.id);

  // Preferred initial selection
  let selected = (allBayLaunchers.find(l => l.id === state.currentDesign?.launcherId && l.accessible)?.id)
    || (accessibleLaunchers[0]?.id)
    || 'skylark';

  const backLabel = state.currentDesign?.flightWorkflow ? '← Workshop' : '← Briefing';
  const nextLabelBase = mission.transfer ? 'Next: Earth departure orbit' : 'Next: operating location';

  container.innerHTML = `
    <section class="screen scene-screen hangar-screen" data-screen="rocketSelect">
      <div class="scene-canvas hangar-canvas" id="rocket-canvas"></div>

      <!-- Top Bar -->
      <header class="hangar-top-bar">
        <div class="hangar-top-left">
          <button class="btn hangar-btn" id="back">${backLabel}</button>
          <div class="hangar-title-pill">
            <span class="hangar-title-text">10-BAY HIGH-BAY ROCKET HANGAR // RAIL ROLLOUT &amp; 360° TURNTABLE</span>
          </div>
        </div>
        <div class="hangar-top-right">
          <button class="btn hangar-btn" id="custom-rocket">Rocket Workshop ↗</button>
          <button class="btn hangar-rollout-btn" id="next">Roll Out to Orbit ▶</button>
        </div>
      </header>

      <!-- Left Hangar 10-Bay Storage & Technical Specs Panel -->
      <aside class="hangar-sidebar">
        <div class="hangar-sidebar-header">
          <div class="hangar-sidebar-tag">10-BAY AUTOMATED STORAGE &amp; TURNTABLE</div>
          <h2 class="hangar-sidebar-title">SELECT ROCKET TO ROLL OUT</h2>
        </div>

        <div class="hangar-bay-list" id="bay-list">
          ${allBayLaunchers.map((l, idx) => {
            if (l.accessible) {
              return `
                <button class="hangar-bay-card ${l.id === selected ? 'selected' : ''}" data-rocket="${l.id}" type="button">
                  <div class="hangar-bay-top">
                    <span class="hangar-bay-badge">${l.bayCode}</span>
                    <span class="hangar-bay-meta">${l.pad} · $${l.cost}M</span>
                  </div>
                  <div class="hangar-bay-name">${idx + 1}. ${l.name}</div>
                  <div class="hangar-bay-subtitle">${l.subtitle}</div>
                </button>
              `;
            } else {
              return `
                <div class="hangar-bay-card locked" data-locked-rocket="${l.id}" title="${l.name}: ${l.lockReason}">
                  <div class="hangar-bay-top">
                    <span class="hangar-bay-badge locked">${l.bayCode}</span>
                    <span class="hangar-bay-meta locked">🔒 LOCKED</span>
                  </div>
                  <div class="hangar-bay-name">${idx + 1}. ${l.name}</div>
                  <div class="hangar-bay-subtitle locked">🔒 ${l.lockReason}</div>
                </div>
              `;
            }
          }).join('')}
        </div>

        <!-- Technical Breakdown Table -->
        <div class="hangar-spec-sheet" id="spec-sheet"></div>
      </aside>

      <!-- Toast Feedback Notification -->
      <div class="hangar-toast" id="hangar-toast"></div>
    </section>
  `;

  const toastEl = container.querySelector('#hangar-toast');
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3200);
  }

  const canvasEl = container.querySelector('#rocket-canvas');
  const view = createRocketCarousel(canvasEl, {
    launcherIds: allBayLaunchers.map(l => l.id),
    accessibleIds,
    lockedIds,
    selectedId: selected,
    data,
    onSelect: (id) => {
      const match = allBayLaunchers.find(l => l.id === id);
      if (match?.accessible) {
        select(id);
      } else if (match) {
        showToast(`🔒 ${match.name} is inaccessible: ${match.lockReason}`);
      }
    }
  });

  function updateSpecSheet(l) {
    const specSheet = container.querySelector('#spec-sheet');
    if (!specSheet || !l) return;

    let capacityRows = '';
    const cap = l.capacity || {};
    capacityRows += `<div class="hangar-spec-row"><span class="hangar-spec-label">LEO Capacity:</span><span class="hangar-spec-val">${cap.leo ? cap.leo + ' kg' : 'Cannot reach'}</span></div>`;
    capacityRows += `<div class="hangar-spec-row"><span class="hangar-spec-label">GTO Transfer:</span><span class="hangar-spec-val">${cap.gto ? cap.gto + ' kg' : 'Cannot reach'}</span></div>`;
    capacityRows += `<div class="hangar-spec-row"><span class="hangar-spec-label">Trans-Lunar (TLI):</span><span class="hangar-spec-val">${cap.tli ? cap.tli + ' kg' : 'Cannot reach'}</span></div>`;

    let payloadFitHtml = '';
    const assembly = state.currentDesign?.assembly;
    const launcher = launcherFor({ launcherId: l.id }, data);
    if (assembly?.busId && Number.isFinite(launcher?.fairingRadiusM)) {
      const envelope = stowedEnvelope(assembly, data);
      const issues = geometryIssues(assembly, data, launcher);
      const isOk = issues.length === 0;
      payloadFitHtml = `
        <div class="hangar-fairing-note ${isOk ? 'text-green' : 'text-red'}">
          ${isOk ? '✓ Fits fairing: ' : '⚠ Clearance error: '}
          Stowed r ${envelope.radiusM.toFixed(2)} / ${launcher.fairingRadiusM.toFixed(2)} m ·
          h ${envelope.heightM.toFixed(2)} / ${launcher.fairingHeightM.toFixed(2)} m.
          ${issues.length ? issues.map(i => i.message).join(' ') : 'Meets all acoustic shroud clearances.'}
        </div>
      `;
    }

    specSheet.innerHTML = `
      <div class="hangar-spec-title">Structural &amp; Propulsion Specs</div>
      <div class="hangar-spec-row">
        <span class="hangar-spec-label">Launch Cost:</span>
        <span class="hangar-spec-val" style="color: #6ee7b7;">$${l.cost}M</span>
      </div>
      <div class="hangar-spec-row">
        <span class="hangar-spec-label">Reliability:</span>
        <span class="hangar-spec-val">${Math.round(l.reliability * 100)}%</span>
      </div>
      <div class="hangar-spec-row">
        <span class="hangar-spec-label">Launch Complex:</span>
        <span class="hangar-spec-val" style="color: #38bdf8;">${l.pad || 'LC-41'}</span>
      </div>
      <div class="hangar-spec-row">
        <span class="hangar-spec-label">Fairing Envelope:</span>
        <span class="hangar-spec-val">r ${l.fairingRadiusM} m · h ${l.fairingHeightM} m</span>
      </div>
      ${capacityRows}
      ${payloadFitHtml}
    `;
  }

  function select(id) {
    const launcher = allBayLaunchers.find(l => l.id === id);
    if (!launcher || !launcher.accessible) return;

    selected = id;
    view.select(id);

    // Update active styling on cards
    container.querySelectorAll('.hangar-bay-card').forEach((card) => {
      if (card.dataset.rocket) {
        const isMatch = card.dataset.rocket === id;
        card.classList.toggle('selected', isMatch);
        card.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
      }
    });

    // Update technical spec sheet
    updateSpecSheet(launcher);

    // Update rollout button
    const nextBtn = container.querySelector('#next');
    if (nextBtn) {
      nextBtn.disabled = !selected;
      nextBtn.textContent = `Roll Out to ${launcher.pad || 'LC-41'} ▶`;
    }
  }

  // Card click events
  container.querySelectorAll('[data-rocket]').forEach((btn) => {
    btn.onclick = () => select(btn.dataset.rocket);
  });

  container.querySelectorAll('[data-locked-rocket]').forEach((card) => {
    card.onclick = () => {
      const match = allBayLaunchers.find(l => l.id === card.dataset.lockedRocket);
      if (match) {
        showToast(`🔒 ${match.name} is inaccessible: ${match.lockReason}`);
      }
    };
  });

  // Top bar navigation
  container.querySelector('#back').onclick = () => {
    showScreen(state.currentDesign?.flightWorkflow ? 'workshop' : 'brief', { mission: true });
  };

  container.querySelector('#custom-rocket').onclick = () => {
    showScreen('rocketWorkshop', { mission: true });
  };

  const nextBtn = container.querySelector('#next');
  nextBtn.onclick = () => {
    if (!selected) return;
    setDesign({
      launcherId: selected,
      rocketId: null,
      rocketBlueprint: null,
      planId: null,
      flightPlan: null
    });
    saveProgress();
    showScreen('orbitSelect');
  };

  // Keyboard navigation
  const keyHandler = (event) => {
    if (!accessibleIds.length) return;
    if (['ArrowUp', 'ArrowLeft'].includes(event.key)) {
      event.preventDefault();
      const currIdx = accessibleIds.indexOf(selected);
      const nextIdx = (currIdx - 1 + accessibleIds.length) % accessibleIds.length;
      select(accessibleIds[nextIdx]);
    } else if (['ArrowDown', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const currIdx = accessibleIds.indexOf(selected);
      const nextIdx = (currIdx + 1) % accessibleIds.length;
      select(accessibleIds[nextIdx]);
    }
  };

  window.addEventListener('keydown', keyHandler);

  // Initial selection
  select(selected);

  return () => {
    window.removeEventListener('keydown', keyHandler);
    clearTimeout(toastTimer);
    view.destroy();
  };
}
