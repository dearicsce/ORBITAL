// Advisory panel and gate status rendering for the Design Studio
export function renderAdvicePanel(container, gateChecks, evalResult) {
  const adviceEl = container.querySelector('#advice-content');
  const badge = container.querySelector('#gate-status-badge');
  const failed = gateChecks.filter((c) => !c.ok);

  if (failed.length === 0) {
    badge.textContent = 'READY FOR LAUNCH';
    badge.className = 'status-tag tag-ready';
    adviceEl.innerHTML = `
      <div class="advice-block advice-success">
        <p class="advice-title">✓ All 10 Launch Gate Checks Passed</p>
        <p class="advice-text">Your spacecraft satisfies orbital reach, mass limits, power margins, and mission budget.</p>
      </div>
      <div class="advice-block advice-info">
        <p class="advice-title">Projected Science Score</p>
        <p class="advice-text">Expected Return: <strong>${evalResult.sciencePoints.toFixed(1)} points</strong> over ${evalResult.lifetimeAchieved.toFixed(1)} years.</p>
      </div>
    `;
  } else {
    badge.textContent = `${failed.length} GATE ISSUE${failed.length > 1 ? 'S' : ''}`;
    badge.className = 'status-tag tag-blocked';
    adviceEl.innerHTML = failed
      .map(
        (c) => `
        <div class="advice-block advice-warning">
          <p class="advice-title">⚠️ ${c.id.toUpperCase()}</p>
          <p class="advice-text">${c.message}</p>
        </div>
      `
      )
      .join('');
  }
}
