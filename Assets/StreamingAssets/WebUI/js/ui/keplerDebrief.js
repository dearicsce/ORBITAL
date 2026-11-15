// ORBITAL - Catch the Next Dip: Investigation Debrief Component
// Phase 4: 3 debrief fields, 3-lane aligned timeline, causal limiter, stress matrix, and 1-change retry.

import { escapeHtml as escape } from './html.js';
import {
  buildTimeline,
  diagnoseCausalLimiter,
  calculateDeltas,
  generateStressMatrix,
} from '../kepler/keplerInvestigation.js';
import { evaluate } from '../kepler/keplerMission.js';

export function renderKeplerDebrief(container, flight, data, onRetry, onFinish) {
  const attempt = flight?.keplerAttempt || flight?.attempt;
  const plan = attempt.plan;
  const design = attempt.design;
  const history = flight?.history || [];
  const previousRun = history.length > 0 ? history[history.length - 1] : null;

  const ground = attempt?.ground || [];
  const evidence = evaluate(ground, 'intro');
  const timeline = buildTimeline(attempt, plan, plan.caseId || 'nominal');
  const diagnosis = diagnoseCausalLimiter(attempt, evidence, plan, plan.caseId || 'nominal');
  const stressMatrix = generateStressMatrix(design, plan);
  const deltas = previousRun ? calculateDeltas(previousRun, { attempt, evidence }) : null;

  const isSuccess = evidence.discriminates && evidence.contradicted === 'H2';
  const isShared = evidence.adequate && !evidence.discriminates;

  container.innerHTML = `
    <section class="orbital-report kepler-debrief" data-screen="report">
      <header class="orbital-topbar">
        <button class="orbital-button" id="debrief-finish">← Mission Control</button>
        <span class="orbital-status"><i></i> INVESTIGATION DEBRIEF · KIC 11446443</span>
        <span>ORBITAL / SCIENCE DIVISION</span>
      </header>

      <main class="kepler-debrief-container">
        <!-- Hero Summary -->
        <div class="kepler-debrief-hero">
          <p class="orbital-eyebrow">ASTRONOMICAL INVESTIGATION / CATCH THE NEXT DIP</p>
          <h1>${isSuccess ? 'Scientific Goal Achieved: H2 Disfavored' : isShared ? 'Photometry Verified: Inconclusive (Shared Dip)' : 'Photometry Inconclusive'}</h1>
          <p class="brief-lead">
            “Two teams expect this star to dim on different schedules. You can look once. Choose when to look so the readings that reach Earth tell the two predictions apart.”
          </p>
        </div>

        ${deltas ? `
          <div class="kepler-delta-banner">
            <strong>REVISION DELTA FROM PREVIOUS ATTEMPT:</strong>
            <span>${escape(deltas.outcomeShift)}</span>
            <span class="delta-detail">Packets: ${deltas.packetsReceivedDelta >= 0 ? '+' : ''}${deltas.packetsReceivedDelta} · Energy reserve: ${deltas.energyRemainingDelta >= 0 ? '+' : ''}${deltas.energyRemainingDelta} Wh</span>
          </div>
        ` : ''}

        <!-- The Three Distinct Debrief Fields -->
        <div class="kepler-fields-grid">
          <!-- Field 1: Did flight and operations work? -->
          <article class="kepler-field-card">
            <div class="field-header">
              <span class="field-number">FIELD 1</span>
              <h2>Flight & Operations</h2>
            </div>
            <div class="field-content">
              <p class="field-verdict ${attempt?.failed ? 'text-red' : 'text-green'}">
                ${attempt?.failed ? '× Operational Abort / Constraint Defect' : '✓ Spacecraft Subsystems Operated Nominally'}
              </p>
              <ul class="field-ledger">
                ${(attempt?.ledger || []).map(entry => `
                  <li class="ledger-${entry.status}">
                    <strong>${escape(entry.stage.toUpperCase())}:</strong> ${escape(entry.message)}
                    ${entry.debit > 0 ? `<span class="ledger-debit">-${entry.debit.toFixed(1)} Wh</span>` : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          </article>

          <!-- Field 2: What actually made it home? -->
          <article class="kepler-field-card">
            <div class="field-header">
              <span class="field-number">FIELD 2</span>
              <h2>Receipts on Earth</h2>
            </div>
            <div class="field-content">
              <div class="receipt-metric-row">
                <span class="metric-val">${ground.length}</span>
                <span class="metric-label">packets received at ground station</span>
              </div>
              <p class="receipt-summary">
                ${attempt?.queue?.length > 0 
                  ? `<strong>${attempt.queue.length} packets held onboard:</strong> Contact window closed before transmission.`
                  : 'All queued science packets successfully downlinked.'}
              </p>
              <p class="receipt-summary">
                ${attempt?.excluded?.length > 0 
                  ? `<strong>${attempt.excluded.length} cadence excluded:</strong> Flag ${attempt.excluded[0].quality} (quality-zero curation).`
                  : 'No corrupted records detected in acquisition span.'}
              </p>
              <div class="receipt-packet-chips">
                ${ground.map(p => `
                  <span class="packet-chip" title="Time: ${p.time.toFixed(3)} BKJD · Flux: ${p.flux.toFixed(5)}">
                    ${escape(p.id)} (${p.members.length} cadences)
                  </span>
                `).join('')}
              </div>
            </div>
          </article>

          <!-- Field 3: What does that evidence let you conclude? -->
          <article class="kepler-field-card highlight-field">
            <div class="field-header">
              <span class="field-number">FIELD 3</span>
              <h2>Scientific Evidence</h2>
            </div>
            <div class="field-content">
              <div class="evidence-verdict-box ${isSuccess ? 'verdict-success' : 'verdict-inconclusive'}">
                <span class="verdict-tag">${isSuccess ? 'DISCRIMINATING EVIDENCE' : 'EVIDENCE INCONCLUSIVE'}</span>
                <h3>${escape(evidence.reason)}</h3>
              </div>
              <div class="evidence-breakdown">
                <div><span>Low Interval (&lt;0.997):</span> <strong>${evidence.dipIds?.length ? '✓ Detected (' + evidence.dipIds.join(', ') + ')' : '× None received'}</strong></div>
                <div><span>Baseline Before (&gt;0.999):</span> <strong>${evidence.beforeId ? '✓ ' + evidence.beforeId : '× Missing'}</strong></div>
                <div><span>Baseline After (&gt;0.999):</span> <strong>${evidence.afterId ? '✓ ' + evidence.afterId : '× Missing'}</strong></div>
                <div><span>Contradicted Hypothesis:</span> <strong>${evidence.contradicted ? escape(evidence.contradicted) + ' Disfavored' : 'None (both remain viable)'}</strong></div>
              </div>
            </div>
          </article>
        </div>

        <!-- Aligned 3-Lane Timeline -->
        <section class="kepler-timeline-section" aria-label="3-lane observation timeline">
          <div class="timeline-header-bar">
            <h2>Observation Timeline: Planned · Recorded · Received</h2>
            <p>Individual cadence markers across the observation window. Never displays invented interpolation or unrevealed flux for held records.</p>
          </div>

          <div class="kepler-timeline-lanes">
            <!-- Lane 1: Could see / planned -->
            <div class="timeline-lane">
              <div class="lane-title">
                <strong>1. Could see / planned</strong>
                <small>Sky opportunity & recipe window</small>
              </div>
              <div class="lane-track">
                ${timeline.cadences.map(c => `
                  <div class="timeline-marker status-${c.planned.status}" 
                       data-cadence="${c.id}" 
                       title="Cadence ${c.id} · ${c.planned.label}">
                    <span class="marker-dot"></span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Lane 2: Recorded onboard -->
            <div class="timeline-lane">
              <div class="lane-title">
                <strong>2. Recorded onboard</strong>
                <small>Acquired & curated records</small>
              </div>
              <div class="lane-track">
                ${timeline.cadences.map(c => `
                  <div class="timeline-marker status-${c.recorded.status}" 
                       data-cadence="${c.id}" 
                       title="Cadence ${c.id} · ${escape(c.recorded.reason)}">
                    <span class="marker-dot"></span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Lane 3: Received on Earth -->
            <div class="timeline-lane">
              <div class="lane-title">
                <strong>3. Received on Earth</strong>
                <small>Downlinked telemetry (Flux revealed on Earth)</small>
              </div>
              <div class="lane-track">
                ${timeline.cadences.map(c => `
                  <div class="timeline-marker status-${c.received.status}" 
                       data-cadence="${c.id}" 
                       title="Cadence ${c.id} · ${escape(c.received.reason)}${c.received.flux ? ' · Flux: ' + c.received.flux.toFixed(5) : ''}">
                    <span class="marker-dot"></span>
                    ${c.received.flux ? `<span class="marker-flux">${(c.received.flux * 100).toFixed(1)}%</span>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Selected Cadence Inspector -->
          <div class="kepler-cadence-inspector" id="cadence-inspector">
            <p>Click any timeline marker above to inspect its exact time support, quality flags, member IDs, and gap rules.</p>
          </div>

          <!-- Accessible Table Equivalent -->
          <details class="kepler-accessible-table">
            <summary>Accessible Cadence & Packet Data Table</summary>
            <table>
              <thead>
                <tr>
                  <th>Cadence ID</th>
                  <th>Time (BKJD)</th>
                  <th>1. Planned</th>
                  <th>2. Recorded</th>
                  <th>3. Received</th>
                  <th>Flux / Earth Measurement</th>
                  <th>Restriction / Gap Reason</th>
                </tr>
              </thead>
              <tbody>
                ${timeline.cadences.map(c => `
                  <tr>
                    <td>${c.id}</td>
                    <td>${c.time.toFixed(4)}</td>
                    <td>${escape(c.planned.status)}</td>
                    <td>${escape(c.recorded.status)}</td>
                    <td>${escape(c.received.status)}</td>
                    <td>${c.received.flux !== null ? c.received.flux.toFixed(5) : '— (unseen / held)'}</td>
                    <td>${escape(c.received.reason)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </details>
        </section>

        <!-- Causal Limiter & 1-Change Replay Card -->
        <section class="kepler-causal-section">
          <div class="causal-card">
            <div class="causal-diagnosis">
              <small>PRIMARY CAUSAL LIMITER</small>
              <h3>${escape(diagnosis.firstCausalLimiter)}</h3>
              <p class="consequence-text"><strong>Downstream Consequence:</strong> ${escape(diagnosis.downstreamConsequence)}</p>
            </div>

            <div class="causal-action-box">
              <small>RECOMMENDED INVESTIGATION ACTION</small>
              <p>${escape(diagnosis.consequentialAction)}</p>

              ${diagnosis.fixCommand ? `
                <div class="replay-prediction-box">
                  <button class="orbital-button primary large" id="btn-apply-fix">
                    Edit the plan for another attempt ↗
                  </button>
                </div>
              ` : `
                <button class="orbital-button large" id="btn-retry-custom">
                  Try another configuration or window ↗
                </button>
              `}
            </div>
          </div>
        </section>

        <!-- Deterministic 3-Case Stress Comparison Matrix -->
        <section class="kepler-stress-section">
          <h2>Deterministic Stress Comparison: Nominal · Timing · Short Contact</h2>
          <p>The same spacecraft build evaluated across all three independent challenge conditions without random hazards.</p>
          <div class="stress-grid">
            ${stressMatrix.map(c => `
              <div class="stress-card ${c.discriminates ? 'stress-success' : 'stress-inconclusive'}">
                <div class="stress-card-header">
                  <strong>${escape(c.label)}</strong>
                  <span class="stress-badge">${c.discriminates ? 'Discriminates' : 'Inconclusive'}</span>
                </div>
                <p class="stress-desc">${escape(c.description)}</p>
                <div class="stress-metrics">
                  <div><span>Packets at Earth:</span> <strong>${c.packetsAtGround} ${c.packetsHeld > 0 ? `(${c.packetsHeld} held)` : ''}</strong></div>
                  <div><span>Energy Margin:</span> <strong>${c.energyMarginWh.toFixed(1)} Wh</strong></div>
                  <div><span>Storage Margin:</span> <strong>${c.storageMarginSlots} slots</strong></div>
                  <div><span>Verdict:</span> <em>${escape(c.verdictText)}</em></div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Bottom Actions -->
        <footer class="kepler-debrief-actions">
          <p id="kepler-record-status" role="status"></p>
          <button class="orbital-button subtle" id="btn-export-report">Export scientific report</button>
          <button class="orbital-button primary large" id="btn-complete-debrief">Finish mission & record evidence ↗</button>
        </footer>
      </main>
    </section>
  `;

  // Bind interactive cadence inspector
  const inspectorBox = container.querySelector('#cadence-inspector');
  container.querySelectorAll('.timeline-marker').forEach(marker => {
    marker.onclick = () => {
      const cid = Number(marker.dataset.cadence);
      const c = timeline.cadences.find(item => item.id === cid);
      if (!c) return;

      inspectorBox.innerHTML = `
        <div class="inspector-card">
          <h4>Cadence ${c.id} · Time: ${c.time.toFixed(4)} BKJD</h4>
          <div class="inspector-grid">
            <div><span>1. Planned Lane:</span> <strong>${escape(c.planned.label)}</strong></div>
            <div><span>2. Recorded Lane:</span> <strong>${escape(c.recorded.status)}</strong> (${escape(c.recorded.reason)})</div>
            <div><span>3. Received Lane:</span> <strong>${escape(c.received.status)}</strong> (${escape(c.received.reason)})</div>
            <div><span>Measured Flux:</span> <strong>${c.received.flux !== null ? c.received.flux.toFixed(6) + ' normalized' : '— (Protected spoiler boundary: held/unrevealed)'}</strong></div>
            ${c.received.packet ? `<div><span>Packet:</span> <strong>${escape(c.received.packet.id)} (${c.received.packet.kind}) · Members: [${c.received.packet.memberIds.join(', ')}]</strong></div>` : ''}
          </div>
        </div>
      `;
    };
  });

  // Bind 1-change retry action
  const fixBtn = container.querySelector('#btn-apply-fix');
  if (fixBtn && diagnosis.fixCommand) {
    fixBtn.onclick = () => {
      if (typeof onRetry === 'function') {
        onRetry(diagnosis.fixCommand);
      }
    };
  }

  const customRetryBtn = container.querySelector('#btn-retry-custom');
  if (customRetryBtn) {
    customRetryBtn.onclick = () => {
      if (typeof onRetry === 'function') {
        onRetry(null);
      }
    };
  }

  // Bind finish and export
  container.querySelector('#debrief-finish').onclick = () => {
    if (typeof onFinish === 'function') onFinish();
  };
  container.querySelector('#btn-complete-debrief').onclick = () => {
    if (typeof onFinish === 'function') onFinish();
  };

  container.querySelector('#btn-export-report').onclick = () => {
    const text = JSON.stringify({
      manifest: 'kepler-q1-v1',
      mission: 'dip',
      evidence,
      timelineSummary: timeline.summary,
      stressMatrix,
      attemptId: attempt?.id,
      timestamp: new Date().toISOString()
    }, null, 2);

    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbital-kepler-debrief-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
}
