// ── prefs.ts ────────────────────────────────────────────────────────────────
export const PREFS = {
  sysAudio:  'captura-sysAudio',
  fps:       'captura-fps',
  quality:   'captura-quality',
  format:    'captura-format',
  pipX:      'captura-pipX',
  pipY:      'captura-pipY',
  webcam:    'captura-webcam',
  mic:       'captura-mic',
  micGain:   'captura-micGain',
  sysGain:   'captura-sysGain',
  countdown: 'captura-countdown',
} as const;

export const savePref = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch (_) {} };
export const loadPref = (k: string) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
