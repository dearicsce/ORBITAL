// Run in the developer console of the original ORBITAL game tab and download the result.
(() => {
  const read = (key, fallback) => JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback));
  const progress = read('space_mission_game_state_v1', {});
  const wallet = read('orbital_economy_v1', { schemaVersion: 1, coins: 0, unlocked: [], claims: {} });
  const academy = read('orbital_academy_v1', {});
  const result = {
    schemaVersion: 1,
    format: 'orbital-browser-transfer',
    exportedAt: new Date().toISOString(),
    completed: Object.entries(progress.completedMissions || {}).map(([id, record]) => ({ id, stars: record.stars })),
    coins: wallet.coins,
    unlocks: wallet.unlocked,
    academyFurthest: academy.furthest || 0,
    spacecraft: read('orbital_blueprints_v1', []),
    launchers: read('orbital_rocket_library_v1', []),
    records: { completedMissions: progress.completedMissions || {}, wallet, academy },
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'orbital-browser-transfer.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
})();

