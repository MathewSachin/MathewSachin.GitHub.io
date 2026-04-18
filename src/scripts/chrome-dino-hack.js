import { trackEvent } from './utils';

// Helper: run a function against the embedded dino game's runner instance
function dinoApply(fn) {
  var frame = document.getElementById('dino-game-frame');
  if (!frame) return;
  var w = frame.contentWindow;
  if (!w || !w.Runner) return;
  var runner = w.Runner.instance_ || w.Runner.getInstance();
  if (!runner) return;
  try { fn(w, runner); } catch(e) { console.error('Dino hack error:', e); }
}

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
  var slider = document.getElementById('speed-slider');
  var input = document.getElementById('speed-input');
  var code = document.querySelector('#speed-pre code');
  var trackSpeed = debounce(function(val) {
    trackEvent('dino_speed_change', { event_category: 'dino_hack', value: val });
  }, 500);
  function update(v) {
    var val = Math.max(1, Math.min(1000, parseInt(v, 10) || DEFAULT));
    slider.value = val;
    input.value = val;
    var numSpan = code.querySelector('.mi');
    if (numSpan) { numSpan.textContent = val; } else { code.textContent = '(Runner.instance_ || Runner.getInstance()).setSpeed(' + val + ')'; }
    dinoApply(function(w, runner) { runner.setSpeed(val); });
  }
  slider.addEventListener('input', function() {
    update(this.value);
    trackSpeed(parseInt(this.value, 10));
  });
  input.addEventListener('input', function() {
    update(this.value);
    trackSpeed(parseInt(this.value, 10));
  });
  document.getElementById('speed-reset').addEventListener('click', function() {
    update(DEFAULT);
    trackEvent('dino_reset', { event_category: 'dino_hack', event_label: 'speed' });
  });
})();

// Score hack widget
(function() {
  var DEFAULT = 12345;
  var input = document.getElementById('score-input');
  var code = document.querySelector('#score-pre code');
  var trackScore = debounce(function(val) {
    trackEvent('dino_score_change', { event_category: 'dino_hack', value: val });
  }, 500);
  function update(v) {
    var val = parseInt(v, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 99999) val = 99999;
    input.value = val;
    var numSpan = code.querySelector('.mi');
    if (numSpan) { numSpan.textContent = val; } else { code.textContent = '(Runner.instance_ || Runner.getInstance()).distanceRan = ' + val + ' / 0.025'; }
    dinoApply(function(w, runner) { runner.distanceRan = val / 0.025; });
  }
  input.addEventListener('input', function() {
    update(this.value);
    trackScore(parseInt(this.value, 10));
  });
  document.getElementById('score-reset').addEventListener('click', function() {
    update(DEFAULT);
    trackEvent('dino_reset', { event_category: 'dino_hack', event_label: 'score' });
  });
})();

// Jump velocity hack widget
(function() {
  var DEFAULT = 10;
  var slider = document.getElementById('jump-slider');
  var input = document.getElementById('jump-input');
  var code = document.querySelector('#jump-pre code');
  var trackJump = debounce(function(val) {
    trackEvent('dino_jump_change', { event_category: 'dino_hack', value: val });
  }, 500);
  function update(v) {
    var val = Math.max(1, Math.min(50, parseInt(v, 10) || DEFAULT));
    slider.value = val;
    input.value = val;
    var numSpan = code.querySelector('.mi');
    if (numSpan) { numSpan.textContent = val; } else { code.textContent = '(Runner.instance_ || Runner.getInstance()).tRex.setJumpVelocity(' + val + ')'; }
    dinoApply(function(w, runner) { runner.tRex.setJumpVelocity(val); });
  }
  slider.addEventListener('input', function() {
    update(this.value);
    trackJump(parseInt(this.value, 10));
  });
  input.addEventListener('input', function() {
    update(this.value);
    trackJump(parseInt(this.value, 10));
  });
  document.getElementById('jump-reset').addEventListener('click', function() {
    update(DEFAULT);
    trackEvent('dino_reset', { event_category: 'dino_hack', event_label: 'jump' });
  });
})();

// Ground Y position hack widget
(function() {
  var DEFAULT = 93;
  var slider = document.getElementById('ground-slider');
  var input = document.getElementById('ground-input');
  var code = document.querySelector('#ground-pre code');
  var trackGround = debounce(function(val) {
    trackEvent('dino_ground_change', { event_category: 'dino_hack', value: val });
  }, 500);
  function update(v) {
    var val = parseInt(v, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 130) val = 130;
    slider.value = val;
    input.value = val;
    var numSpan = code.querySelector('.mi');
    if (numSpan) { numSpan.textContent = val; } else { code.textContent = '(Runner.instance_ || Runner.getInstance()).tRex.groundYPos = ' + val; }
    dinoApply(function(w, runner) { runner.tRex.groundYPos = val; });
  }
  slider.addEventListener('input', function() {
    update(this.value);
    trackGround(parseInt(this.value, 10));
  });
  input.addEventListener('input', function() {
    update(this.value);
    trackGround(parseInt(this.value, 10));
  });
  document.getElementById('ground-reset').addEventListener('click', function() {
    update(DEFAULT);
    trackEvent('dino_reset', { event_category: 'dino_hack', event_label: 'ground' });
  });
})();
