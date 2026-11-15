import {readEconomy} from '../workshop/economy.js';
import {practicePrerequisites} from '../unity/practiceProfile.js';
export function getUnlocked(data, completedMissions = []) {
  completedMissions = [...completedMissions, ...practicePrerequisites()];
  const parts = [];
  const instruments = [];
  const launchers = [];
  const orbits = [];

  const isUnlocked = (tag) => {
    if (!tag || tag === 'start') return true;
    if (tag === 'after_m1') return completedMissions.includes('m1');
    if (tag === 'after_m2') return completedMissions.includes('m2');
    if (tag === 'after_m3') return completedMissions.includes('m3');
    if (tag === 'after_w2m1' || tag === 'after_w2m2' || tag === 'after_w2m3') return false;
    return false;
  };

  for (const p of data.parts || []) {
    if (isUnlocked(p.unlock)) parts.push(p.id);
  }
  for (const inst of data.instruments || []) {
    if (isUnlocked(inst.unlock)) instruments.push(inst.id);
  }
  for (const l of data.launchers || []) {
    if (isUnlocked(l.unlock)) launchers.push(l.id);
  }
  for (const o of data.orbits || []) {
    if (isUnlocked(o.unlock)) orbits.push(o.id);
  }

  try{for(const id of readEconomy().unlocked){if(data.parts.some(p=>p.id===id)&&!parts.includes(id))parts.push(id);if(data.instruments.some(p=>p.id===id)&&!instruments.includes(id))instruments.push(id);}}catch{}
  return { parts, instruments, launchers, orbits };
}