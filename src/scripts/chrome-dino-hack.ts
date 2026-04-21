import { trackEvent } from './utils';

// Prevent Up/Down/Space from scrolling the page while the game iframe is focused
document.addEventListener('keydown', function (e) {
  const frame = document.getElementById('dino-game-frame') as HTMLIFrameElement | null;
  if (
    frame &&
    document.activeElement === frame &&
    (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ')
  ) {
    e.preventDefault();
  }
}, { passive: false });

// Track when the user clicks into the dino game iframe
(function () {
  const frame = document.getElementById('dino-game-frame');
  if (!frame) return;
  let tracked = false;
  window.addEventListener('blur', function () {
    if (document.activeElement === frame) {
      if (!tracked) {
        trackEvent('dino_game_play', { event_category: 'dino_hack', event_label: 'game_started' });
        tracked = true;
      }
    }
  });
})();

// Speed hack widget
(function () {
  const DEFAULT = 6;
  const el = document.getElementById('speed-input');
  if (!el) return;
  const input = el as HTMLInputElement;
  function update(v: unknown) {
    const val = Math.max(0, Math.min(1000, parseInt(String(v), 10) || 0));
    input.value = String(val);
  }
  input.addEventListener('input', function () {
    update((this as HTMLInputElement).value);
  });
  const reset = document.getElementById('speed-reset');
  if (reset) reset.addEventListener('click', function () {
    update(DEFAULT);
  });
})();

// Score hack widget
(function () {
  const DEFAULT = 12345;
  const el = document.getElementById('score-input');
  if (!el) return;
  const input = el as HTMLInputElement;
  function update(v: unknown) {
    let val = parseInt(String(v), 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 99999) val = 99999;
    input.value = String(val);
  }
  input.addEventListener('input', function () {
    update((this as HTMLInputElement).value);
  });
  const reset = document.getElementById('score-reset');
  if (reset) reset.addEventListener('click', function () {
    update(DEFAULT);
  });
})();

// Jump velocity hack widget
(function () {
  const DEFAULT = 10;
  const el = document.getElementById('jump-input');
  if (!el) return;
  const input = el as HTMLInputElement;
  function update(v: unknown) {
    const val = Math.max(0, Math.min(50, parseInt(String(v), 10) || 0));
    input.value = String(val);
  }
  input.addEventListener('input', function () {
    update((this as HTMLInputElement).value);
  });
  const reset = document.getElementById('jump-reset');
  if (reset) reset.addEventListener('click', function () {
    update(DEFAULT);
  });
})();

// Ground Y position hack widget (now an offset: groundYPos = 93 - X)
(function () {
  const DEFAULT = 0;
  const MIN = -40;
  const MAX = 130;
  const el = document.getElementById('ground-input');
  if (!el) return;
  const input = el as HTMLInputElement;
  function update(v: unknown) {
    let val = parseInt(String(v), 10);
    if (isNaN(val)) val = DEFAULT;
    if (val < MIN) val = MIN;
    if (val > MAX) val = MAX;
    input.value = String(val);
  }
  input.addEventListener('input', function () {
    update((this as HTMLInputElement).value);
  });
  const reset = document.getElementById('ground-reset');
  if (reset) reset.addEventListener('click', function () {
    update(DEFAULT);
  });
})();
