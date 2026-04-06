// ── media-session.js ─────────────────────────────────────────────────────────
// Media Session API integration (OS media controls and lock-screen metadata).

export function setupMediaSession(onPlay, onPause, onStop) {
  if (!navigator.mediaSession) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title:   'Captura Web',
    artist:  'Recording Session Active',
    artwork: [{ src: new URL('/images/captura.png', location.href).href, sizes: '512x512', type: 'image/png' }],
  });
  navigator.mediaSession.setActionHandler('play',  onPlay);
  navigator.mediaSession.setActionHandler('pause', onPause);
  navigator.mediaSession.setActionHandler('stop',  onStop);
}

export function clearMediaSession() {
  if (!navigator.mediaSession) return;
  navigator.mediaSession.metadata = null;
  ['play', 'pause', 'stop'].forEach(a => {
    try { navigator.mediaSession.setActionHandler(a, null); } catch (_) {}
  });
}
