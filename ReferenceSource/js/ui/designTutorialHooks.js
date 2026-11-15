// Tutorial helper hooks and design event dispatchers for Spacecraft CAD

export function isTutorialMission(missionId) {
  return missionId === 'tutorial';
}

export function initTutorialDesign(design, isTutorial) {
  if (!isTutorial) return;
  design.orbitId = design.orbitId || 'leo';
  design.launcherId = 'kestrel';
  if (!design.panelIds) design.panelIds = [];
  if (!design.batteryIds) design.batteryIds = [];
  if (!design.fuelIds) design.fuelIds = [];
  if (!design.instrumentIds) design.instrumentIds = [];
}

export function filterTutorialParts(items, isTutorial, allowedPartIds) {
  if (!isTutorial || !Array.isArray(allowedPartIds)) return items;
  return items.filter((item) => allowedPartIds.includes(item.id));
}

export function filterTutorialOrbits(orbits, isTutorial, allowedOrbitIds) {
  if (!isTutorial || !Array.isArray(allowedOrbitIds)) return orbits;
  return orbits.filter((orb) => allowedOrbitIds.includes(orb.id));
}

export function dispatchDesignUpdated(design, evalResult) {
  document.dispatchEvent(
    new CustomEvent('design-updated', {
      detail: { design, evalResult }
    })
  );
}
