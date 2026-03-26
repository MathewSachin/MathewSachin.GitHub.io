---
title: Hacking the Chrome Dino Game
tags: [chrome, hack, game]
highlight: true
related:
  - /blog/2026/03/07/hacking-wordle
  - /blog/2026/03/20/hacking-minesweeper-online
  - /blog/2026/03/20/hacking-typeracer
  - /blog/2026/03/21/instagram-reel-sniper
  - /blog/2019/12/07/unhide-password-box
---

*All hacks updated as of 8th March 2026 based on game changes.*

---

*Tired of just jumping over cacti? Let’s take it to the next level with some simple hacks you can try right in your browser!*

## What is the Chrome Dino Game?
When you lose internet connection in Chrome, a hidden endless runner game appears. Tap space to start, and our pixelated dino begins a desert adventure!

But… what if we could cheat?

Even if you’re not a programmer, here’s something cool: the Chrome Dino game is built using JavaScript, and its internal game code is exposed globally. That means we can actually poke around and change how the game works — right from the browser!

Thanks to JavaScript’s flexible (and kinda wild) nature, we can override built-in functions and tweak the game’s behavior without needing to dig into the source files. All you need is the Chrome Developer Console, and a few clever lines of code.

## How to Play the Chrome Dino Game?
<div class="alert alert-info">
  💡 <b>Pro Tip:</b> Can’t get the <i>“No Internet”</i> screen to show up? <br>
  Just open a new tab and go to <b>chrome://dino</b> — the game works even when you're online!
</div>

If this is your first time discovering the Dino game, welcome! It's super easy to play:  
**Jump:** Press Spacebar or Up Arrow (this also starts the game)  
**Duck:** Press Down Arrow (useful when those sneaky pterodactyls appear after 450 points)  
**Pause:** Press Alt  
**Night Mode:** Every 700 points, the background switches to black for 100 points — just to keep you on your toes!

![Chrome Dino](/images/chromeDino.gif)

## Play It Right Here

<div class="dino-embed-wrapper">
<iframe id="dino-game-frame" class="dino-embed-frame" src="/dino/" title="Chrome Dino Game — press Space or tap to start" scrolling="no" loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe>
<small class="dino-embed-caption">Chrome Dino game &copy; <a href="https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/neterror/resources/" target="_blank" rel="noopener">The Chromium Authors</a>, open-sourced under the <a href="https://chromium.googlesource.com/chromium/src/+/refs/heads/main/LICENSE" target="_blank" rel="noopener">BSD 3-Clause License</a>. Extracted by <a href="https://github.com/wayou/t-rex-runner" target="_blank" rel="noopener">@liuwayong</a>.</small>
</div>

<script>
function dinoApply(fn) {
  var frame = document.getElementById('dino-game-frame');
  if (!frame) return;
  var w = frame.contentWindow;
  if (!w || !w.Runner || !w.Runner.instance_) {
    alert('Press Space (or tap) in the game above to start it first, then try again.');
    return;
  }
  try { fn(w); } catch(e) { console.error('Dino hack error:', e); }
}
</script>

## Opening Developer Tools / Chrome Console

The [**Developer Tools** (DevTools)]({% post_url /blog/2026-03-07-edit-webpage-inspect-element %}) is a panel built right into Chrome that lets you inspect and interact with any web page — including its JavaScript code. Think of it as a secret control room for the browser.

To open it and get to the Console:

**On Windows / Linux:**
- Press `F12` or `Ctrl + Shift + I` to open DevTools, then click the **Console** tab.
- Shortcut: `Ctrl + Shift + J` jumps straight to the Console.

**On Mac:**
- Press `Cmd + Option + I` to open DevTools, then click the **Console** tab.
- Shortcut: `Cmd + Option + J` jumps straight to the Console.

You’ll see a blinking cursor where you can type JavaScript commands directly. After typing each command, press **Enter** to run it.

A few things to keep in mind:
- The commands are **case-sensitive** — type them exactly as shown.
- Seeing `undefined` after a command? That’s completely normal. It just means the expression didn’t return a value, which is expected for most of these hacks.

<div class="alert alert-info">
  📱 <b>On a phone or tablet?</b> Mobile browsers don’t have DevTools — but you can still hack the Dino using a bookmarklet. No computer needed!<br>
  👉 <a href="{% post_url /blog/2026-03-19-chrome-dino-hack-mobile-bookmarklet %}">Hack the Chrome Dino on Mobile (Bookmarklet Method)</a>
</div>

## Immortality (God Mode)

Want to make your dino un-killable? Let’s activate **God Mode** using a little JavaScript magic.

<div class="dino-hack-widget">
<div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2">
<button class="btn btn-sm btn-dino-apply" id="godmode-apply-btn" data-bs-toggle="tooltip" data-bs-placement="top" title="Apply to embedded game above" aria-label="Activate God Mode on embedded game"><i class="fa fa-shield" aria-hidden="true"></i> Activate God Mode</button>
</div>
<pre class="dino-hack-pre"><code class="language-js">Runner.prototype.gameOver = function() {};</code></pre>
</div>
<script>
(function() {
  var btn = document.getElementById('godmode-apply-btn');
  var active = false;
  btn.addEventListener('click', function() {
    dinoApply(function(w) {
      if (!active) {
        w._dinoOrigGameOver = w.Runner.prototype.gameOver;
        w.Runner.prototype.gameOver = function() {};
      } else {
        if (w._dinoOrigGameOver) w.Runner.prototype.gameOver = w._dinoOrigGameOver;
      }
    });
    active = !active;
    btn.innerHTML = active
      ? '<i class="fa fa-undo" aria-hidden="true"></i> Restore Normal'
      : '<i class="fa fa-shield" aria-hidden="true"></i> Activate God Mode';
  });
})();
</script>

##### Step 1: Save the Original Function  
This is **very important** if you want to bring the game back to normal later.

```js
var original = Runner.prototype.gameOver;
```

##### Step 2: Disable Game Over  
Now, we override the `gameOver` function so that it does… nothing.

```js
Runner.prototype.gameOver = function() {};
```

Boom — your dino is now immortal. It’ll just run through cacti like a champ.

##### How to Stop It

If you want to restore the game to normal (or get bored of being a god), use this:

```js
Runner.prototype.gameOver = original;
```

This only works if you **saved the original function** first (step 1). Otherwise, go ahead and refresh the page.

##### How does it work?

In JavaScript, functions are just objects — and they can be replaced on the fly.

The `gameOver` function is normally triggered when the dino crashes. By saving it first (`var original = ...`) and then replacing it with an empty function (`function() {}`), we stop the game from ending.

When you're done, you just restore the original function by assigning it back. Think of it like temporarily muting the crash handler!

This works only because JavaScript allows us to override methods of objects while the game is still running in the browser.

## Tweaking Speed

Want to put the pedal to the metal? Or maybe slow things down for a relaxing run? The game normally starts at a speed of around **6** and gradually increases as your score climbs. With this hack, you can take full control of the pace.

Use the slider below to pick any speed — `1000` for pure chaos, `50` for a fast but still-playable pace, or `1` for dramatic slow motion. The default starting speed is `6`.

<div class="dino-hack-widget">
<div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2">
<label class="text-white-50 small mb-0 me-1" for="speed-slider">Speed:</label>
<input type="range" class="form-range flex-grow-1" id="speed-slider" min="1" max="1000" value="6" style="min-width:120px" aria-label="Speed slider">
<input type="number" class="form-control form-control-sm dino-hack-num" id="speed-input" min="1" max="1000" value="6" aria-label="Speed value">
<button class="btn btn-sm btn-dino-reset" id="speed-reset" data-bs-toggle="tooltip" data-bs-placement="top" title="Reset to default" aria-label="Reset speed to default"><i class="fa fa-undo" aria-hidden="true"></i> Reset</button>
<button class="btn btn-sm btn-dino-apply" id="speed-apply" data-bs-toggle="tooltip" data-bs-placement="top" title="Apply to embedded game above" aria-label="Apply speed to embedded game"><i class="fa fa-play" aria-hidden="true"></i> Apply</button>
<button class="btn btn-sm btn-clip" data-clipboard-target="#speed-pre" data-bs-toggle="tooltip" data-bs-placement="top" title="Copy to clipboard" aria-label="Copy code to clipboard"><i class="fa fa-copy" aria-hidden="true"></i></button>
</div>
<pre id="speed-pre" class="dino-hack-pre"><code class="language-js">Runner.getInstance().setSpeed(6)</code></pre>
</div>
<script>
(function() {
  var DEFAULT = 6;
  var slider = document.getElementById('speed-slider');
  var input = document.getElementById('speed-input');
  var code = document.querySelector('#speed-pre code');
  function update(v) {
    var val = Math.max(1, Math.min(1000, parseInt(v, 10) || DEFAULT));
    slider.value = val;
    input.value = val;
    code.textContent = 'Runner.getInstance().setSpeed(' + val + ')';
    if (window.hljs) hljs.highlightElement(code);
  }
  slider.addEventListener('input', function() { update(this.value); });
  input.addEventListener('input', function() { update(this.value); });
  document.getElementById('speed-reset').addEventListener('click', function() { update(DEFAULT); });
  document.getElementById('speed-apply').addEventListener('click', function() {
    var val = parseInt(input.value, 10) || DEFAULT;
    dinoApply(function(w) { w.Runner.getInstance().setSpeed(val); });
  });
})();
</script>

## Setting the Current Score

Want to jump right into the action with a specific score? You can set the score to any value up to **99999** (but no higher!). Enter your target score below:

<div class="dino-hack-widget">
<div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2">
<label class="text-white-50 small mb-0 me-1" for="score-input">Score:</label>
<input type="number" class="form-control form-control-sm dino-hack-num" id="score-input" min="0" max="99999" value="12345" aria-label="Score value" style="width:110px">
<button class="btn btn-sm btn-dino-reset" id="score-reset" data-bs-toggle="tooltip" data-bs-placement="top" title="Reset to default" aria-label="Reset score to default"><i class="fa fa-undo" aria-hidden="true"></i> Reset</button>
<button class="btn btn-sm btn-dino-apply" id="score-apply" data-bs-toggle="tooltip" data-bs-placement="top" title="Apply to embedded game above" aria-label="Apply score to embedded game"><i class="fa fa-play" aria-hidden="true"></i> Apply</button>
<button class="btn btn-sm btn-clip" data-clipboard-target="#score-pre" data-bs-toggle="tooltip" data-bs-placement="top" title="Copy to clipboard" aria-label="Copy code to clipboard"><i class="fa fa-copy" aria-hidden="true"></i></button>
</div>
<pre id="score-pre" class="dino-hack-pre"><code class="language-js">Runner.getInstance().distanceRan = 12345 / Config$2.COEFFICIENT</code></pre>
</div>
<script>
(function() {
  var DEFAULT = 12345;
  var input = document.getElementById('score-input');
  var code = document.querySelector('#score-pre code');
  function update(v) {
    var val = parseInt(v, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 99999) val = 99999;
    input.value = val;
    code.textContent = 'Runner.getInstance().distanceRan = ' + val + ' / Config$2.COEFFICIENT';
    if (window.hljs) hljs.highlightElement(code);
  }
  input.addEventListener('input', function() { update(this.value); });
  document.getElementById('score-reset').addEventListener('click', function() { update(DEFAULT); });
  document.getElementById('score-apply').addEventListener('click', function() {
    var val = parseInt(input.value, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 99999) val = 99999;
    dinoApply(function(w) { w.Runner.getInstance().distanceRan = val / 0.025; });
  });
})();
</script>

##### How does it work?

Internally, the game tracks how far the dino has run using a property called `distanceRan`. The visible score on screen is calculated by multiplying `distanceRan` by a constant called `Config$2.COEFFICIENT` (roughly `0.025`). By dividing your desired score by that constant, you get the right internal value to set.

⚠️ Note: The score resets when the game ends, so don’t forget to re-enter the command if you want to keep the score high!

Experiment with different values to make your dino feel like a seasoned pro right from the start!

## Jumping Height

Want your dino to leap over obstacles in a single bound, or keep jumps tight and controlled? You can tune the jump velocity to your liking.

The default jump velocity is **10**. Increasing it makes your dino launch higher into the air, while decreasing it results in shorter, snappier hops. Use the slider to find your sweet spot.

<div class="dino-hack-widget">
<div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2">
<label class="text-white-50 small mb-0 me-1" for="jump-slider">Jump Velocity:</label>
<input type="range" class="form-range flex-grow-1" id="jump-slider" min="1" max="50" value="10" style="min-width:120px" aria-label="Jump velocity slider">
<input type="number" class="form-control form-control-sm dino-hack-num" id="jump-input" min="1" max="50" value="10" aria-label="Jump velocity value">
<button class="btn btn-sm btn-dino-reset" id="jump-reset" data-bs-toggle="tooltip" data-bs-placement="top" title="Reset to default" aria-label="Reset jump velocity to default"><i class="fa fa-undo" aria-hidden="true"></i> Reset</button>
<button class="btn btn-sm btn-dino-apply" id="jump-apply" data-bs-toggle="tooltip" data-bs-placement="top" title="Apply to embedded game above" aria-label="Apply jump velocity to embedded game"><i class="fa fa-play" aria-hidden="true"></i> Apply</button>
<button class="btn btn-sm btn-clip" data-clipboard-target="#jump-pre" data-bs-toggle="tooltip" data-bs-placement="top" title="Copy to clipboard" aria-label="Copy code to clipboard"><i class="fa fa-copy" aria-hidden="true"></i></button>
</div>
<pre id="jump-pre" class="dino-hack-pre"><code class="language-js">Runner.getInstance().tRex.setJumpVelocity(10)</code></pre>
</div>
<script>
(function() {
  var DEFAULT = 10;
  var slider = document.getElementById('jump-slider');
  var input = document.getElementById('jump-input');
  var code = document.querySelector('#jump-pre code');
  function update(v) {
    var val = Math.max(1, Math.min(50, parseInt(v, 10) || DEFAULT));
    slider.value = val;
    input.value = val;
    code.textContent = 'Runner.getInstance().tRex.setJumpVelocity(' + val + ')';
    if (window.hljs) hljs.highlightElement(code);
  }
  slider.addEventListener('input', function() { update(this.value); });
  input.addEventListener('input', function() { update(this.value); });
  document.getElementById('jump-reset').addEventListener('click', function() { update(DEFAULT); });
  document.getElementById('jump-apply').addEventListener('click', function() {
    var val = Math.max(1, Math.min(50, parseInt(input.value, 10) || DEFAULT));
    dinoApply(function(w) { w.Runner.getInstance().tRex.setJumpVelocity(val); });
  });
})();
</script>

Try `20` for floaty, sky-high jumps that easily clear everything on screen, or drop it to `5` for a low, fast hop that’s great for clearing small cacti quickly. Combined with God Mode, a high jump velocity lets you sail through the entire game without a care in the world!

## Walk in Air

Ever wondered what it’s like for the dino to defy gravity? You can make it walk through the sky with this fun trick!

<img alt="Chrome Dino walking in air" src="/images/sky_dino.jpg" width="400">

The `groundYPos` property controls the vertical position where the dino “rests” when not jumping — measured in pixels from the top of the canvas. The normal ground level is **93**. Setting it to `0` moves the dino’s resting position to the very top of the screen.

Use the slider to position the dino anywhere from the sky (`0`) to the normal ground level (`93`). Intermediate values like `40` or `60` let you glide over ground-level cacti without getting hit. Obstacles still scroll past at fixed heights, so this is a sneaky alternative to God Mode!

<div class="dino-hack-widget">
<div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2">
<label class="text-white-50 small mb-0 me-1" for="ground-slider">Y Position:</label>
<input type="range" class="form-range flex-grow-1" id="ground-slider" min="0" max="130" value="93" style="min-width:120px" aria-label="Ground Y position slider">
<input type="number" class="form-control form-control-sm dino-hack-num" id="ground-input" min="0" max="130" value="93" aria-label="Ground Y position value">
<button class="btn btn-sm btn-dino-reset" id="ground-reset" data-bs-toggle="tooltip" data-bs-placement="top" title="Reset to default" aria-label="Reset Y position to default"><i class="fa fa-undo" aria-hidden="true"></i> Reset</button>
<button class="btn btn-sm btn-dino-apply" id="ground-apply" data-bs-toggle="tooltip" data-bs-placement="top" title="Apply to embedded game above" aria-label="Apply Y position to embedded game"><i class="fa fa-play" aria-hidden="true"></i> Apply</button>
<button class="btn btn-sm btn-clip" data-clipboard-target="#ground-pre" data-bs-toggle="tooltip" data-bs-placement="top" title="Copy to clipboard" aria-label="Copy code to clipboard"><i class="fa fa-copy" aria-hidden="true"></i></button>
</div>
<pre id="ground-pre" class="dino-hack-pre"><code class="language-js">Runner.getInstance().tRex.groundYPos = 93</code></pre>
</div>
<script>
(function() {
  var DEFAULT = 93;
  var slider = document.getElementById('ground-slider');
  var input = document.getElementById('ground-input');
  var code = document.querySelector('#ground-pre code');
  function update(v) {
    var val = parseInt(v, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 130) val = 130;
    slider.value = val;
    input.value = val;
    code.textContent = 'Runner.getInstance().tRex.groundYPos = ' + val;
    if (window.hljs) hljs.highlightElement(code);
  }
  slider.addEventListener('input', function() { update(this.value); });
  input.addEventListener('input', function() { update(this.value); });
  document.getElementById('ground-reset').addEventListener('click', function() { update(DEFAULT); });
  document.getElementById('ground-apply').addEventListener('click', function() {
    var val = parseInt(input.value, 10);
    if (isNaN(val) || val < 0) val = 0;
    if (val > 130) val = 130;
    dinoApply(function(w) { w.Runner.getInstance().tRex.groundYPos = val; });
  });
})();
</script>

## Auto-play

Want the dino to play itself? There's a JavaScript bot you can paste straight into the Console that detects every cactus and pterodactyl and reacts automatically.

👉 **[Full script + step-by-step explanation → Auto-play the Chrome Dino Game]({% post_url /blog/2026-03-14-chrome-dino-autoplay %})**

## Invisibility

Want to make your dino invisible? It’s easy to do by simply disabling its drawing function! This will prevent the dino from being rendered on the screen, making it fully invisible.

<div class="dino-hack-widget">
<div class="dino-hack-controls d-flex align-items-center gap-2 flex-wrap px-3 py-2">
<button class="btn btn-sm btn-dino-apply" id="invis-apply-btn" data-bs-toggle="tooltip" data-bs-placement="top" title="Apply to embedded game above" aria-label="Toggle dino invisibility on embedded game"><i class="fa fa-eye-slash" aria-hidden="true"></i> Make Invisible</button>
</div>
<pre class="dino-hack-pre"><code class="language-js">Runner.getInstance().tRex.draw = function() {};</code></pre>
</div>
<script>
(function() {
  var btn = document.getElementById('invis-apply-btn');
  var active = false;
  btn.addEventListener('click', function() {
    dinoApply(function(w) {
      var tRex = w.Runner.getInstance().tRex;
      if (!active) {
        w._dinoOrigDraw = tRex.draw;
        tRex.draw = function() {};
      } else {
        if (w._dinoOrigDraw) tRex.draw = w._dinoOrigDraw;
      }
    });
    active = !active;
    btn.innerHTML = active
      ? '<i class="fa fa-eye" aria-hidden="true"></i> Restore Dino'
      : '<i class="fa fa-eye-slash" aria-hidden="true"></i> Make Invisible';
  });
})();
</script>

##### Make the Dino Invisible

```js
const originalDraw = Runner.getInstance().tRex.draw;
Runner.getInstance().tRex.draw = function() {};
```

This code replaces the dino's draw function with an empty one, meaning the dino won’t be drawn on the canvas.

**Note:** The dino can still die if it collides with obstacles

##### Restore the Dino
To bring the dino back, simply restore the original draw function:

```js
Runner.getInstance().tRex.draw = originalDraw;
```

Now the dino is visible again, and the game continues as usual!

---

Keep having fun and may your dino run forever!

Share this page around and comment down if you have tricks of your own!

---

Time to try some other great hacks — [Wordle]({% post_url /blog/2026-03-07-hacking-wordle %}), [Minesweeper]({% post_url /blog/2026-03-20-hacking-minesweeper-online %}), [TypeRacer]({% post_url /blog/2026-03-20-hacking-typeracer %}).
