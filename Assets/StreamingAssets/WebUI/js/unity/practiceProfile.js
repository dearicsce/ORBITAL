// Showcase flights use a tab-local profile. Libraries and the wallet start with
// the player's equipment, then diverge on the first practice edit.
const marker = 'orbital_practice_profile';
const prefix = marker + ':';
const inherited = new Set(['orbital_blueprints_v1', 'orbital_rocket_library_v1', 'orbital_economy_v1', 'orbital_flight_plans_v1']);
let practice;
export function usingPracticeProfile() {
  if (practice === undefined) practice = globalThis.sessionStorage?.getItem(marker) === '1';
  return practice;
}
const sandbox = {
  getItem(key) {
    return sessionStorage.getItem(prefix + key) ?? (inherited.has(key) ? localStorage.getItem(key) : null);
  },
  setItem(key, value) { sessionStorage.setItem(prefix + key, value); },
  removeItem(key) { sessionStorage.removeItem(prefix + key); },
};
export function profileStorage() {
  return usingPracticeProfile() ? sandbox : globalThis.localStorage;
}
export function practicePrerequisites() {
  return usingPracticeProfile() ? JSON.parse(sessionStorage.getItem(prefix + 'prerequisites') || '[]') : [];
}

export function beginPracticeProfile(prerequisites = []) {
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(prefix)) sessionStorage.removeItem(key);
  }
  sessionStorage.setItem(marker, '1');
  sessionStorage.setItem(prefix + 'prerequisites', JSON.stringify(prerequisites));
  practice = true;
}
export function leavePracticeProfile() {
  if (!usingPracticeProfile()) return false;
  sessionStorage.removeItem(marker);
  const url = new URL(location.href);
  url.search = '?screen=missionSelect';
  // Keep any outgoing pagehide saves in the practice profile until navigation finishes.
  location.replace(url);
  return true;
}
