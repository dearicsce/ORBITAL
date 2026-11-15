// Speech Synthesis & Character Voice Engine (Step 16)
import { getState, setSettings, saveProgress } from './state.js';
import { getCharacter } from './characters.js';

let availableVoices = [];
let activeTimer = null;
let currentUtterance = null;
let watchdogTimer = null;

function updateVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      availableVoices = window.speechSynthesis.getVoices() || [];
    } catch (e) {
      availableVoices = [];
    }
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  updateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
  }
}

export function isMuted() {
  const state = getState();
  return state.settings?.audio === false;
}

export function setMuted(muted) {
  setSettings({ audio: !muted });
  saveProgress();
  if (muted) {
    stopSpeaking();
  }
  return isMuted();
}

export function stopSpeaking() {
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
  if(currentUtterance){currentUtterance.onend=null;currentUtterance.onerror=null;currentUtterance.onstart=null;}
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // Ignore synthesis cancel error
    }
  }
  currentUtterance = null;
}

function selectVoiceForCharacter(char) {
  if (!availableVoices.length) updateVoices();
  if (!availableVoices.length) return null;

  const englishVoices = availableVoices.filter(
    (v) => v.lang && v.lang.toLowerCase().startsWith('en')
  );
  const voicePool = englishVoices.length ? englishVoices : availableVoices;

  // 1. Try preferredNames
  const prefs = char?.voice?.preferredNames || [];
  for (const pref of prefs) {
    const match = voicePool.find((v) => v.name.toLowerCase().includes(pref.toLowerCase()));
    if (match) return match;
  }

  // 2. Try gender match in voice name or properties if available
  const gender = char?.voice?.gender;
  if (gender === 'female' || gender === 'male') {
    const genderKeywords = gender === 'female'
      ? ['female', 'woman', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'veena', 'hazel']
      : ['male', 'man', 'david', 'daniel', 'alex', 'george', 'rishi', 'oliver', 'mark', 'fred'];
    const genderMatch = voicePool.find((v) => {
      const lower = v.name.toLowerCase();
      return genderKeywords.some((k) => lower.includes(k));
    });
    if (genderMatch) return genderMatch;
  }

  // 3. Fallback: allocate distinct voice indices based on character ID
  const charOrder = ['nova', 'commander', 'engineer', 'scientist', 'accountant'];
  const charIndex = Math.max(0, charOrder.indexOf(char?.id));
  return voicePool[charIndex % voicePool.length] || null;
}

export function speak(characterId, text, { onStart, onEnd } = {}) {
  stopSpeaking();

  if (!text || typeof text !== 'string') {
    onEnd?.();
    return;
  }

  const char = getCharacter(characterId);
  const muted = isMuted();
  const hasSynth = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const rate = char?.voice?.rate ?? 1.0;
  const baseDuration = Math.max(1600, Math.min(8500, text.length * 60));
  const fallbackDurationMs = Math.round(baseDuration / rate);

  // If speechSynthesis is missing or muted, do nothing but still call onEnd after a timer based on text length
  if (muted || !hasSynth) {
    onStart?.();
    activeTimer = setTimeout(() => {
      activeTimer = null;
      onEnd?.();
    }, fallbackDurationMs);
    return;
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    const voice = selectVoiceForCharacter(char);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.pitch = char?.voice?.pitch ?? 1.0;
    utterance.rate = rate;

    let ended = false;
    const handleEnd = () => {
      if (!ended) {
        ended = true;
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
        currentUtterance = null;
        onEnd?.();
      }
    };

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      handleEnd();
    };

    utterance.onerror = (e) => {
      if (e.error === 'canceled' || e.error === 'interrupted') {
        handleEnd();
        return;
      }
      // If synthesis fails (e.g. no audio device or not-allowed), fall back to text length timer
      console.warn('Speech synthesis error, falling back to reading timer:', e.error);
      activeTimer = setTimeout(() => {
        handleEnd();
      }, fallbackDurationMs);
    };

    window.speechSynthesis.speak(utterance);

    // Watchdog timer: Chrome speech synthesis sometimes freezes on long utterances
    watchdogTimer = setTimeout(() => {
      handleEnd();
    }, fallbackDurationMs + 4000);
  } catch (err) {
    console.warn('Speech synthesis exception, falling back to timer:', err);
    onStart?.();
    activeTimer = setTimeout(() => {
      activeTimer = null;
      onEnd?.();
    }, fallbackDurationMs);
  }
}
