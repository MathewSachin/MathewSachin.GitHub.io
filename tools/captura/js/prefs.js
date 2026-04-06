// ── prefs.js ──────────────────────────────────────────────────────────────────
// Preference key names, localStorage helpers, and display-value formatters.

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

// Format a gain value (0–1 or 0–2) as a percentage string, e.g. 0.75 → '75%'.
export const gainPct = v => Math.round(parseFloat(v) * 100) + '%';

// Format elapsed seconds as MM:SS, e.g. 65 → '01:05'.
export const fmtTime = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
