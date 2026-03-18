---
title: Hacking the Chrome Dino Game
tags: [chrome, hack, game]
highlight: true
related:
  - /blog/2026/03/14/chrome-dino-autoplay
  - /blog/2019/12/07/unhide-password-box
  - /blog/2026/03/07/hacking-wordle
  - /blog/2026/03/07/edit-webpage-inspect-element
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

## Opening Developer Tools / Chrome Console

The **Developer Tools** (DevTools) is a panel built right into Chrome that lets you inspect and interact with any web page — including its JavaScript code. Think of it as a secret control room for the browser.

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

## Immortality (God Mode)

Want to make your dino un-killable? Let’s activate **God Mode** using a little JavaScript magic.

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

##### Speed Up the Game
Enter this to crank up the speed to an insane level:

```js
Runner.getInstance().setSpeed(1000)
```

At speed 1000, the game moves so fast that it’s practically unplayable — but it’s hilarious to watch! Feel free to experiment with any value. Try `50` for a challenging but still-playable speed, or `200` for pure chaos.

##### Slow It Down
If you want to dial things back for a relaxed stroll through the desert:

```js
Runner.getInstance().setSpeed(6)
```

This resets the speed to the default starting value. You can also set it even lower (like `1`) to practically pause the game in slow motion — great for getting familiar with the mechanics.

Now you can play at lightning-fast speeds or take your sweet time — the choice is yours!

## Setting the Current Score

Want to jump right into the action with a specific score? You can set the score to any value up to **99999** (but no higher!). Here’s how to set it to **12345**:

```js
Runner.getInstance().distanceRan = 12345 / Config$2.COEFFICIENT
```

##### How does it work?

Internally, the game tracks how far the dino has run using a property called `distanceRan`. The visible score on screen is calculated by multiplying `distanceRan` by a constant called `Config$2.COEFFICIENT` (roughly `0.025`). By dividing your desired score by that constant, you get the right internal value to set.

⚠️ Note: The score resets when the game ends, so don’t forget to re-enter the command if you want to keep the score high!

Experiment with different values to make your dino feel like a seasoned pro right from the start!

## Jumping Height

Want your dino to leap over obstacles in a single bound, or keep jumps tight and controlled? You can tune the jump velocity to your liking.

The default jump velocity is **10**. Increasing it makes your dino launch higher into the air, while decreasing it results in shorter, snappier hops.

```js
Runner.getInstance().tRex.setJumpVelocity(20)
```

Try `20` for floaty, sky-high jumps that easily clear everything on screen, or drop it to `5` for a low, fast hop that’s great for clearing small cacti quickly. Combined with God Mode, a high jump velocity lets you sail through the entire game without a care in the world!

## Walk in Air

Ever wondered what it’s like for the dino to defy gravity? You can make it walk through the sky with this fun trick!

<img alt="Chrome Dino walking in air" src="/images/sky_dino.jpg" width="400">

The `groundYPos` property controls the vertical position where the dino “rests” when not jumping — measured in pixels from the top of the canvas. The normal ground level is **93**. Setting it to `0` moves the dino’s resting position to the very top of the screen.

##### Lift it up

```js
Runner.getInstance().tRex.groundYPos = 0
```

The dino will immediately float up and keep running near the top of the screen. Obstacles will still scroll past below it, so you won’t get hit at all — making this a sneaky alternative to God Mode!

##### Back to the Ground
When you want to bring your dino back down to Earth:

```js
Runner.getInstance().tRex.groundYPos = 93
```

You can also try intermediate values (like `40` or `60`) to position the dino at any height you like. Note that cacti and pterodactyls are generated at fixed heights, so positioning yourself just above the ground can let you glide over ground-level cacti effortlessly.

Now your dino is floating through the sky or back to solid ground, all at your command!

## Auto-play

Want the dino to play itself? There's a JavaScript bot you can paste straight into the Console that detects every cactus and pterodactyl and reacts automatically.

👉 **[Full script + step-by-step explanation → Auto-play the Chrome Dino Game]({% post_url /blog/2026-03-14-chrome-dino-autoplay %})**

## Invisibility

Want to make your dino invisible? It’s easy to do by simply disabling its drawing function! This will prevent the dino from being rendered on the screen, making it fully invisible.

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
