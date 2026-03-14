---
title: "Reskin the Chrome Dino as Super Mario (Sprite Sheet Swapping)"
tags: [chrome, hack, game, javascript, mario]
highlight: true
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2026/03/14/chrome-dino-autoplay
  - /blog/2026/03/07/edit-webpage-inspect-element
  - /blog/2026/03/07/hacking-wordle
---

*What if the Chrome Dino wasn't a dinosaur at all — but Mario? With a single JavaScript trick, you can swap the entire game's art and run through the desert as your favourite plumber.*

---

## 🎨 How the Chrome Dino Game Draws Everything

Before we swap anything, it helps to know how the game actually renders its characters. Rather than loading dozens of individual images, the whole game — the dino, cacti, pterodactyl, clouds, moon, score digits, even the "Game Over" text — is packed into **one single image** called a **sprite sheet**.

The game's drawing code then crops tiny rectangles from that image and paints them onto the game canvas at exactly the right position and the right time. For example:

- 🦕 **T-Rex sprites** live at x=848 in the sprite sheet, 44px wide, 47px tall per frame
- 🦅 **Pterodactyl** (two wing-flap frames) lives at x=134
- 🌵 **Small cacti** start at x=228
- 🌵 **Large cacti** start at x=332
- ☁️ **Clouds** are at x=86, the moon at x=484

Here's an annotated map of the key regions:

<img alt="Annotated Chrome Dino sprite sheet showing the position of each game element" src="/images/dino-sprite-map.svg">

The key insight: **if you replace the sprite sheet image with one where the same positions contain different artwork, the game will draw your artwork instead — no source code changes needed.**

---

## 🍄 Our Mario Sprite Sheet

We designed a full replacement sprite sheet that swaps every character for a Super Mario Bros-style equivalent, positioned at exactly the same pixel offsets the game expects:

| Original | Replacement | Position (1x sheet) |
|---|---|---|
| T-Rex (running) | **Mario** (running) | x=848–1234, y=2 |
| Pterodactyl | **Koopa Paratroopa** | x=134, y=2 |
| Small cactus | **Goomba** | x=228, y=2 |
| Large cactus | **Piranha Plant** | x=332, y=2 |
| Clouds | **Mario-style clouds** | x=86, y=2 |

<img alt="Mario-themed replacement sprites for the Chrome Dino game — Mario running, Goomba, Koopa Paratroopa, and Piranha Plant" src="/images/mario-dino-showcase.svg">

The full sprite sheet (matching all dimensions of the original Chrome Dino 1x sheet):

<img alt="Full Mario-themed sprite sheet for the Chrome Dino game, showing all characters at their correct positions" src="/images/mario-dino-sprite-sheet.svg">

---

## 🔧 Method 1 — Canvas Patch (Quickest Way to Try It)

The easiest way to experiment is to **draw directly onto the sprite sheet** using the browser's Canvas API. This lets you modify the existing sprites without needing a separate image file.

Open `chrome://dino`, start the game, then paste this into the DevTools Console (`F12` → **Console** tab):

```js
// Step 1: Get the game's current sprite sheet
var inst = Runner.getInstance();
var origSprite = inst.getOrigImageSprite();

// Step 2: Copy it onto a canvas so we can modify it
var patchCanvas = document.createElement('canvas');
patchCanvas.width  = origSprite.naturalWidth;
patchCanvas.height = origSprite.naturalHeight;
var ctx = patchCanvas.getContext('2d');
ctx.drawImage(origSprite, 0, 0);

// Step 3: Draw a red hat on the running T-Rex frames.
// Read the T-Rex position from the game's own sprite definition so it works
// on both standard (LDPI) and HiDPI (2x) sprite sheets automatically.
var scale  = Runner.isHDPI ? 2 : 1;
var trexX  = inst.spriteDef.TREX.x;  // e.g. 848 on LDPI, 1678 on HDPI
var frameW = 44 * scale;
var hatH   =  8 * scale;

ctx.fillStyle = '#CC0000';
ctx.fillRect(trexX + 88  * scale, 2, frameW, hatH);  // hat on run frame 1
ctx.fillRect(trexX + 132 * scale, 2, frameW, hatH);  // hat on run frame 2

// Step 4: Inject the modified image back into the game
var patched = new Image();
patched.onload = function() {
    Runner.prototype.getOrigImageSprite    = function() { return patched; };
    Runner.prototype.getRunnerImageSprite  = function() { return patched; };
    console.log('Sprite patched! 🎩');
};
patched.src = patchCanvas.toDataURL('image/png');
```

Once you run this, your dino sprouts a little red hat on every step. This is a great starting point — tweak the rectangles, change colors, and iterate in real time.

<div class="alert alert-info">
  💡 <b>Why does this work?</b> Every frame the game calls <code>inst.getOrigImageSprite()</code> / <code>getRunnerImageSprite()</code> to obtain the image it draws from. By overriding those methods on <code>Runner.prototype</code>, every subsequent frame picks up our patched artwork automatically — no need to hunt down every cached reference.
</div>

---

## 🎮 Method 2 — Full Sprite Sheet Replacement

For a complete Mario reskin, you need a **full replacement sprite sheet** — a PNG image with all the Mario characters at exactly the same pixel positions as the originals.

### Step 1 — Get the original sprite sheet

While the dino game is running in DevTools, you can extract the current sprite sheet as a PNG data URL:

```js
// Extract the original sprite sheet as a data URL you can save
var origSprite = Runner.getInstance().getOrigImageSprite();
var extractCanvas = document.createElement('canvas');
extractCanvas.width  = origSprite.naturalWidth;
extractCanvas.height = origSprite.naturalHeight;
extractCanvas.getContext('2d').drawImage(origSprite, 0, 0);

// This opens the image in a new tab — right-click → Save As
window.open(extractCanvas.toDataURL('image/png'));
```

This gives you the full sprite sheet as a PNG you can open in any image editor (GIMP, Photoshop, Aseprite, etc.).

### Step 2 — Edit the sprite sheet

Open the PNG in your image editor. The key areas to replace (1x / LDPI coordinates):

```
T-Rex  → x=848,  y=2,  width~310, height~50  (multiple frames)
Ptero  → x=134,  y=2,  width~92,  height~40  (2 wing frames)
Cactus → x=228,  y=2,  width~260, height~52  (small + large types)
```

**Rules:**
- Keep the canvas the **same dimensions** as the original
- Replace sprites at **exactly the same positions**
- Leave non-character areas (text, ground, moon) unless you want to change those too
- Export as **PNG** (not JPEG — transparency matters!)

### Step 3 — Inject the new sprite sheet

Once your sprite sheet is accessible via a URL (uploaded to GitHub, a CDN, or served locally), swap it in with one paste:

```js
var marioSheet = new Image();
marioSheet.crossOrigin = 'anonymous';

marioSheet.onload = function () {
    Runner.prototype.getOrigImageSprite    = function() { return marioSheet; };
    Runner.prototype.getRunnerImageSprite  = function() { return marioSheet; };

    console.log('🍄 Mario sprite sheet loaded! Let\'s-a go!');
};

// Replace this URL with your hosted sprite sheet
marioSheet.src = 'https://your-server.com/mario-dino-sprite-sheet.png';
```

<div class="alert alert-info">
  💡 <b>Hosting tip:</b> The easiest way to host the PNG for free is to commit it to a GitHub repository and use the raw URL:
  <code>https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/mario-dino-sprite-sheet.png</code>
  <br>GitHub raw URLs support <code>crossOrigin = 'anonymous'</code> so they work here.
</div>

---

## 🎨 Method 3 — Real-time Canvas Intercept (Advanced)

Want even more control? You can intercept every `drawImage` call to swap sprites frame-by-frame — no pre-made PNG required. This is more complex, but lets you replace sprites procedurally:

```js
var inst        = Runner.getInstance();
var _origDraw   = CanvasRenderingContext2D.prototype.drawImage;
var _origSprite = inst.getOrigImageSprite();  // capture now so the check stays stable
var scale       = Runner.isHDPI ? 2 : 1;
var trexX       = inst.spriteDef.TREX.x;     // e.g. 848 LDPI, 1678 HDPI

CanvasRenderingContext2D.prototype.drawImage = function (img) {
    var args = Array.prototype.slice.call(arguments);

    // Only intercept draws from the dino sprite sheet
    if (img === _origSprite && args.length === 9) {
        var sx = args[1]; // source x in sprite sheet

        // T-Rex frames start at trexX; allow ~400 scaled pixels for all frames
        if (sx >= trexX && sx < trexX + 400 * scale) {
            var dx = args[5], dy = args[6], dw = args[7], dh = args[8];

            // Draw a simple Mario silhouette instead
            this.fillStyle = '#CC0000';
            this.fillRect(dx, dy, dw, Math.round(dh * 0.3));   // red hat
            this.fillStyle = '#F7BA7C';
            this.fillRect(dx, dy + Math.round(dh * 0.3), dw, Math.round(dh * 0.25)); // face
            this.fillStyle = '#0044AA';
            this.fillRect(dx, dy + Math.round(dh * 0.55), dw, Math.round(dh * 0.45)); // overalls
            return;
        }
    }
    // Pass everything else through unchanged
    _origDraw.apply(this, args);
};

console.log('🎨 Real-time sprite intercept active!');
```

Run this snippet and you'll immediately see the dino replaced by a simple three-color silhouette (red hat, skin face, blue overalls). From here you can build up the detail as much as you like.

To restore the original draw function:

```js
CanvasRenderingContext2D.prototype.drawImage = _origDraw;
```

---

## 📐 Sprite Coordinate Reference

Use this table when editing your sprite sheet — all values are for the **1x (LDPI)** sprite sheet. On HiDPI (Retina) displays Chrome loads a 2x sheet where every coordinate is roughly doubled; use `Runner.isHDPI` and `inst.spriteDef` to read the live values rather than hardcoding these numbers in scripts.

| Sprite | x | y | Width | Height | Notes |
|---|---|---|---|---|---|
| Restart button | 2 | 2 | 36 | 32 | Shown on Game Over screen |
| Cloud | 86 | 2 | 46 | 14 | Repeating background element |
| Pterodactyl frame 1 | 134 | 2 | 46 | 40 | Wing up |
| Pterodactyl frame 2 | 180 | 2 | 46 | 40 | Wing down |
| Small cactus (type 1) | 228 | 2 | 17 | 35 | 1-arm cactus |
| Small cactus (type 2) | 245 | 2 | 34 | 35 | 2-arm cactus |
| Small cactus (type 3) | 279 | 2 | 51 | 35 | 3-arm cactus |
| Large cactus (type 1) | 332 | 2 | 25 | 50 | 1-arm large |
| Large cactus (type 2) | 357 | 2 | 50 | 50 | 2-arm large |
| Large cactus (type 3) | 407 | 2 | 75 | 50 | 3-arm large |
| Moon | 484 | 2 | 40 | 82 | Multiple phase slices |
| Game Over text | 655 | 2 | 191 | 11 | Pixel font sprite |
| Score digits (0–9) | 655 | 28 | 10 | 13 | 10 chars × 10px each |
| T-Rex standing | 848 | 2 | 44 | 47 | Default/waiting pose |
| T-Rex blinking | 892 | 2 | 44 | 47 | Eye-closed blink frame |
| T-Rex running 1 | 936 | 2 | 44 | 47 | Left foot forward |
| T-Rex running 2 | 980 | 2 | 44 | 47 | Right foot forward |
| T-Rex dead | 1024 | 2 | 44 | 47 | Collision frame |
| T-Rex ducking 1 | 1116 | 27 | 59 | 25 | Low profile, frame 1 |
| T-Rex ducking 2 | 1175 | 27 | 59 | 25 | Low profile, frame 2 |
| Ground texture | 2 | 54 | 2400 | 12 | Tiling horizontal strip |

---

## 🕹️ Quick Summary

| Goal | Method | Complexity |
|---|---|---|
| Quickly tint/overlay the dino | Canvas patch (Method 1) | ⭐ Easy |
| Full character replacement | Sprite sheet PNG swap (Method 2) | ⭐⭐ Medium |
| No pre-made image needed | Real-time `drawImage` intercept (Method 3) | ⭐⭐⭐ Advanced |

Start with Method 1 to see immediate results, then graduate to Method 2 for a polished full reskin. All three techniques run entirely in your browser — nothing is installed, nothing is permanent, and refreshing the page brings the original dino back.

Now go make that desert into a Mushroom Kingdom! 🍄

---

*Looking for more Chrome Dino tricks? Check out [Hacking the Chrome Dino Game]({% post_url /blog/2016-11-5-chrome-dino-hack %}) for god mode, speed tweaks, and score hacks — or [Auto-play the Chrome Dino Game]({% post_url /blog/2026-03-14-chrome-dino-autoplay %}) to let the dino play itself!*
