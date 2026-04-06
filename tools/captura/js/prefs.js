// ── prefs.js ──────────────────────────────────────────────────────────────────
// Preference key names and localStorage helpers.

export const PREFS = {
  sysAudio: 'captura-sysAudio',
  fps:      'captura-fps',
  quality:  'captura-quality',
  format:   'captura-format',
  pipX:     'captura-pipX',
  pipY:     'captura-pipY',
  webcam:   'captura-webcam',
  mic:      'captura-mic',
  micGain:  'captura-micGain',
  sysGain:  'captura-sysGain',
};

export const savePref = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
export const loadPref = k      => { try { return localStorage.getItem(k); } catch (_) { return null; } };
