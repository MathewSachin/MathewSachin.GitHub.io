// ── media-session.ts ─────────────────────────────────────────────────────────
export function setupMediaSession(onPlay: () => void, onPause: () => void, onStop: () => void) {
  if (!('mediaSession' in navigator)) return;
  try {
    (navigator as any).mediaSession.metadata = new MediaMetadata({
      title:  'Captura Web',
      artist: 'Recording Session Active',
      artwork: [{ src: new URL('/images/captura.png', location.href).href, sizes: '512x512', type: 'image/png' }],
    });
    navigator.mediaSession.setActionHandler('play',  onPlay as MediaSessionActionHandler);
    navigator.mediaSession.setActionHandler('pause', onPause as MediaSessionActionHandler);
    navigator.mediaSession.setActionHandler('stop',  onStop as MediaSessionActionHandler);
  } catch (e) {
    // Some browsers may throw when setting handlers; fail silently.
  }
}

export function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    (navigator as any).mediaSession.metadata = null;
    (['play', 'pause', 'stop'] as MediaSessionAction[]).forEach(a => {
      try { navigator.mediaSession.setActionHandler(a, null); } catch (_) {}
    });
  } catch (e) {
    // ignore
  }
}
