// ── register-service-worker.js ────────────────────────────────────────────────
// Registers the PWA service worker and manages the in-app update notification bar.

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const updateBar  = document.getElementById('pwa-update-bar');
  const updateBtn  = document.getElementById('pwa-update-btn');
  const dismissBtn = document.getElementById('pwa-dismiss-btn');
  if (!updateBar || !updateBtn) return;

  let newWorker = null;
  let reloading = false;

  // Only show the update notification when running as an installed PWA.
  const isPwa = () => window.matchMedia('(display-mode: standalone)').matches;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    if (!isPwa()) return;
    reloading = true;
    window.location.reload();
  });

  // sw.js lives at the same level as js/
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller && isPwa()) {
          updateBar.hidden = false;
        }
      });
    });
  }).catch(err => console.warn('Service worker registration failed:', err));

  updateBtn.addEventListener('click', () => {
    updateBtn.textContent = 'Updating…';
    updateBtn.disabled    = true;
    newWorker?.postMessage('SKIP_WAITING');
  });

  dismissBtn?.addEventListener('click', () => { updateBar.hidden = true; });
}
