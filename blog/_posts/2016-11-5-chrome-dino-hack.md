---
title: Hacking the Chrome Dino Game
tags: [chrome, hack, game]
highlight: true
disqus: true
related:
  - /blog/2019/12/07/unhide-password-box
  - /blog/2023/04/09/captura-unmaintained
---

*Tired of just jumping over cacti? Let’s take it to the next level with some simple hacks you can try right in your browser!*

## 🕹️ What is the Chrome Dino Game?
When you lose internet connection in Chrome, a hidden endless runner game appears. Tap space to start, and our pixelated dino begins a desert adventure!

But… what if we could cheat?

Even if you’re not a programmer, here’s something cool: the Chrome Dino game is built using JavaScript, and its internal game code is exposed globally. That means we can actually poke around and change how the game works — right from the browser!

Thanks to JavaScript’s flexible (and kinda wild) nature, we can override built-in functions and tweak the game’s behavior without needing to dig into the source files. All you need is the Chrome Developer Console, and a few clever lines of code.

---

## 🎮 How to Play the Chrome Dino Game?
<div class="alert alert-info">
  💡 <b>Pro Tip:</b> Can’t get the <i>“No Internet”</i> screen to show up? <br>
  Just open a new tab and go to <b>chrome://dino</b> — the game works even when you're online!
</div>

If this is your first time discovering the Dino game, welcome! It's super easy to play:  
⬆️ **Jump:** Press Spacebar or Up Arrow (this also starts the game)  
⬇️ **Duck:** Press Down Arrow (useful when those sneaky pterodactyls appear after 450 points)  
⏸️ **Pause:** Press Alt  
🌙 **Night Mode:** Every 700 points, the background switches to black for 100 points — just to keep you on your toes!

![Chrome Dino](/images/chromeDino.gif)

---

## 🔧 Opening Developer Tools / Chrome console
- Press `F12` (or `Ctrl + Shift + I`) to open DevTools.
- Navigate to the `Console` tab.

🛠️ Note: After entering each command in the Console, press Enter to run it.  

✅ The commands are case-sensitive, so make sure you type them exactly as shown.  

❓ Seeing undefined after running a command? Don’t worry — that’s totally normal! It just means the function didn’t return a value, which is expected in this case.

---

## 🛡️ Immortality (God Mode)

Want to make your dino un-killable? Let’s activate **God Mode** using a little JavaScript magic.

#### 🧩 Step 1: Save the Original Function  
This is **very important** if you want to bring the game back to normal later.

```js
var original = Runner.prototype.gameOver;
```

#### 🧨 Step 2: Disable Game Over  
Now, we override the `gameOver` function so that it does… nothing.

```js
Runner.prototype.gameOver = function() {};
```

Boom — your dino is now immortal. It’ll just run through cacti like a champ.

#### 🛑 How to Stop It

If you want to restore the game to normal (or get bored of being a god), use this:

```js
Runner.prototype.gameOver = original;
```

This only works if you **saved the original function** first (step 1). Otherwise, go ahead and refresh the page.

#### How does it work?

In JavaScript, functions are just objects — and they can be replaced on the fly.

The `gameOver` function is normally triggered when the dino crashes. By saving it first (`var original = ...`) and then replacing it with an empty function (`function() {}`), we stop the game from ending.

When you're done, you just restore the original function by assigning it back. Think of it like temporarily muting the crash handler!

This works only because JavaScript allows us to override methods of objects while the game is still running in the browser.

---

## ⚡ Tweaking Speed

Want to put the pedal to the metal? Or maybe slow things down for a challenge? You can easily adjust the game speed using a simple command in the Console.

#### 🚀 Speed Up the Game
Enter this to crank up the speed:

```js
Runner.instance_.setSpeed(1000)
```

Feel free to replace `1000` with any value for an extra boost!

#### 🐢 Slow It Down
If you want to return to the regular pace, use:

```js
Runner.instance_.setSpeed(10)
```

Now you can play at lightning-fast speeds or take your time — the choice is yours!

---

## Setting the current score
Let's set the score to 12345. You can set any other score less than 99999.
The current score is reset on game over.

```js
Runner.instance_.distanceRan = 12345 / Runner.instance_.distanceMeter.config.COEFFICIENT
```

<br>

## Jumping height
You can control how high the dino jumps by using the below function. Adjust the value as necessary.

```js
Runner.instance_.tRex.setJumpVelocity(10)
```

<br>

## Walk in air

<img alt="Chrome Dino walking in air" src="/images/sky_dino.jpg" width="400">

```js
Runner.instance_.tRex.groundYPos = 0
```

Back to ground:

```js
Runner.instance_.tRex.groundYPos = 93
```

<br>

## Auto-play

This code periodically checks for the closest obstacle (cactus or pterodactyl) and then jumps or ducks based on the obstacle's position.

```js
function dispatchKey(type, key) {
    document.dispatchEvent(new KeyboardEvent(type, {keyCode: key}));
}
setInterval(function () {
    const KEY_CODE_SPACE_BAR = 32
    const KEY_CODE_ARROW_DOWN = 40
    const CANVAS_HEIGHT = Runner.instance_.dimensions.HEIGHT
    const DINO_HEIGHT = Runner.instance_.tRex.config.HEIGHT

    const obstacle = Runner.instance_.horizon.obstacles[0]
    const speed = Runner.instance_.currentSpeed

    if (obstacle) {
        const w = obstacle.width
        const x = obstacle.xPos // measured from left of canvas
        const y = obstacle.yPos // measured from top of canvas
        const yFromBottom = CANVAS_HEIGHT - y - obstacle.typeConfig.height
        const isObstacleNearby = x < 25 * speed - w / 2

        if (isObstacleNearby) {
            if (yFromBottom > DINO_HEIGHT) {
                // Pterodactyl going from above, do nothing
            } else if (y > CANVAS_HEIGHT / 2) {
                // Jump
                dispatchKey("keyup", KEY_CODE_ARROW_DOWN)
                dispatchKey("keydown", KEY_CODE_SPACE_BAR)
            } else {
                // Duck
                dispatchKey("keydown", KEY_CODE_ARROW_DOWN)
            }
        }
    }
}, Runner.instance_.msPerFrame);
```

<br>

That's all for now! Share this page around if you had fun!
