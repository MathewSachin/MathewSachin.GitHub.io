import { trackEvent } from './utils';

// Prevent Up/Down/Space from scrolling the page while the game iframe is focused
document.addEventListener('keydown', function(e) {
  var frame = document.getElementById('dino-game-frame');
  if (frame && document.activeElement === frame &&
      (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ')) {
    e.preventDefault();
  }
}, { passive: false });

// Returns a debounced version of fn that delays invocation by `wait` ms
function debounce(fn, wait) {
  var timer;
  return function() {
    var ctx = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(ctx, args); }, wait);
  };
}

// Track when the user clicks into the dino game iframe
(function() {
  var frame = document.getElementById('dino-game-frame');
  if (!frame) return;
  var tracked = false;
  window.addEventListener('blur', function() {
    if (document.activeElement === frame) {
      if (!tracked) {
        trackEvent('dino_game_play', { event_category: 'dino_hack', event_label: 'game_started' });
        tracked = true;
      }
    }
  });
})();

// Speed hack widget
(function() {
  var DEFAULT = 6;
  var input = document.getElementById('speed-input');
  function update(v) {
    var val = Math.max(0, Math.min(1000, parseInt(v, 10) || 0));
    input.value = val;
  }
  input.addEventListener('input', function() {
    update(this.value);
  });
  document.getElementById('speed-reset').addEventListener('click', function() {
    update(DEFAULT);
  });
})();

// Score hack widget
(function() {
  var DEFAULT = 12345;
  var input = document.getElementById('score-input');
  function update(v) {
    var val = parseInt(v, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 99999) val = 99999;
    input.value = val;
  }
  input.addEventListener('input', function() {
    update(this.value);
  });
  document.getElementById('score-reset').addEventListener('click', function() {
    update(DEFAULT);
  });
})();

// Jump velocity hack widget
(function() {
  var DEFAULT = 10;
  var input = document.getElementById('jump-input');
  function update(v) {
    var val = Math.max(0, Math.min(50, parseInt(v, 10) || 0));
    input.value = val;
  }
  input.addEventListener('input', function() {
    update(this.value);
  });
  document.getElementById('jump-reset').addEventListener('click', function() {
    update(DEFAULT);
  });
})();

// Ground Y position hack widget (now an offset: groundYPos = 93 - X)
(function() {
  var DEFAULT = 0;
  var MIN = -40;
  var MAX = 130;
  var input = document.getElementById('ground-input');
  function update(v) {
    var val = parseInt(v, 10);
    if (isNaN(val)) val = DEFAULT;
    if (val < MIN) val = MIN;
    if (val > MAX) val = MAX;
    input.value = val;
  }
  input.addEventListener('input', function() {
    update(this.value);
  });
  document.getElementById('ground-reset').addEventListener('click', function() {
    update(DEFAULT);
  });
})();
