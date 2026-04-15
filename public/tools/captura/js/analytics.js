// ── analytics.js ─────────────────────────────────────────────────────────────
// Google Analytics helpers for Captura Web Recorder.
// All functions are no-ops when GA is unavailable or blocked.

// Safe GA event tracker — mirrors the pattern used in scripts/search.js.
export function trackEvent(name, params) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    }
  } catch (_) {}
}
