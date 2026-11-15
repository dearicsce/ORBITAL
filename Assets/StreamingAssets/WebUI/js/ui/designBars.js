// Resource bars HUD rendering and ripple effect logic for Spacecraft CAD
export function renderResourceBars(container, evalResult, effectiveBudget, computer) {
  const bars = [
    {
      id: 'mass',
      name: 'Mass',
      used: `${evalResult.launchMass} kg`,
      limit: `${evalResult.capacity} kg`,
      over: evalResult.launchMass > evalResult.capacity || evalResult.capacity === 0,
      near: evalResult.capacity > 0 && (evalResult.launchMass / evalResult.capacity) > 0.85
    },
    {
      id: 'power',
      name: 'Power',
      used: `${evalResult.panelPower}W gen`,
      limit: `${(evalResult.averageLoad * 1.1).toFixed(0)}W req`,
      over: evalResult.panelPower < evalResult.averageLoad * 1.1,
      near: evalResult.panelPower > 0 && ((evalResult.averageLoad * 1.1) / evalResult.panelPower) > 0.85
    },
    {
      id: 'battery',
      name: 'Battery',
      used: `${evalResult.batteryUsableWh.toFixed(0)} Wh`,
      limit: `${evalResult.eclipseNeedWh.toFixed(0)} Wh req`,
      over: evalResult.batteryUsableWh < evalResult.eclipseNeedWh,
      near: evalResult.batteryUsableWh > 0 && (evalResult.eclipseNeedWh / evalResult.batteryUsableWh) > 0.85
    },
    {
      id: 'budget',
      name: 'Budget',
      used: `$${evalResult.totalCost}M`,
      limit: `$${effectiveBudget}M`,
      over: evalResult.totalCost > effectiveBudget,
      near: (evalResult.totalCost / effectiveBudget) > 0.85
    },
    {
      id: 'data',
      name: 'Data',
      used: `${evalResult.dataPerDay.toFixed(1)} GB/d`,
      limit: `${computer ? computer.maxDataPerDay : 0} GB/d`,
      over: evalResult.dataPerDay > (computer ? computer.maxDataPerDay : 0),
      near: computer && (evalResult.dataPerDay / computer.maxDataPerDay) > 0.85
    },
    {
      id: 'fuel',
      name: 'Fuel',
      used: `${evalResult.fuelKg} kg`,
      limit: `${evalResult.fuelNeeded.toFixed(0)} kg req`,
      over: evalResult.fuelKg < evalResult.fuelNeeded,
      near: evalResult.fuelKg > 0 && (evalResult.fuelNeeded / evalResult.fuelKg) > 0.85
    }
  ];

  container.innerHTML = bars
    .map((b) => {
      const statusClass = b.over ? 'bar-red' : b.near ? 'bar-amber' : 'bar-green';
      const fillPct = b.over ? 100 : b.near ? 90 : 65;
      return `
        <div class="bar-card ${statusClass}" data-bar="${b.id}">
          <div class="bar-header">
            <span class="bar-name">${b.name}</span>
            <span class="bar-values">${b.used} / ${b.limit}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${fillPct}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

export function triggerBarRipple(rootElement, barIds = []) {
  barIds.forEach((id) => {
    const el = rootElement.querySelector(`.bar-card[data-bar="${id}"]`);
    if (el) {
      el.classList.remove('ripple-active');
      void el.offsetWidth;
      el.classList.add('ripple-active');
    }
  });
}
