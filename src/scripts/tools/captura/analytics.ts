// ── analytics.ts ─────────────────────────────────────────────────────────────
// Google Analytics helpers for Captura Web Recorder.
// All functions are no-ops when GA is unavailable or blocked.

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  try {
    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === 'function') {
      w.gtag('event', name, params || {});
    }
  } catch (_) {}
}
