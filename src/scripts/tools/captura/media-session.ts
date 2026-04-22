// ── media-session.ts ─────────────────────────────────────────────────────────
export function setupMediaSession(onPlay: () => void, onPause: () => void, onStop: () => void) {
  if (!('mediaSession' in navigator)) return;
  try {
    const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
    if (!ms) return;
    ms.metadata = new MediaMetadata({
      title:  'Captura Web',
      artist: 'Recording Session Active',
      artwork: [{ src: new URL('/images/captura.png', location.href).href, sizes: '512x512', type: 'image/png' }],
    });
    ms.setActionHandler('play',  onPlay as MediaSessionActionHandler);
    ms.setActionHandler('pause', onPause as MediaSessionActionHandler);
    ms.setActionHandler('stop',  onStop as MediaSessionActionHandler);
  } catch (e) {
    // Some browsers may throw when setting handlers; fail silently.
  }
}

export function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
    if (!ms) return;
    ms.metadata = null;
    (['play', 'pause', 'stop'] as MediaSessionAction[]).forEach(a => {
      try { ms.setActionHandler(a, null); } catch (_) {}
    });
  } catch (e) {
    // ignore
  }
}
