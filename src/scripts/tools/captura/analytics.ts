// ── analytics.ts ─────────────────────────────────────────────────────────────
// Google Analytics helpers for Captura Web Recorder.
// All functions are no-ops when GA is unavailable or blocked.

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  try {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', name, params || {});
    }
  } catch (_) {}
}
