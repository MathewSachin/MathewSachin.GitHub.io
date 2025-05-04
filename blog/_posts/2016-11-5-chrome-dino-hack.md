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

## 🔧 Opening Developer Tools / Chrome console
- Press `F12` (or `Ctrl + Shift + I`) to open DevTools.
- Navigate to the `Console` tab.

🛠️ Note: After entering each command in the Console, press Enter to run it.  

✅ The commands are case-sensitive, so make sure you type them exactly as shown.  

❓ Seeing undefined after running a command? Don’t worry — that’s totally normal! It just means the function didn’t return a value, which is expected in this case.

<br>

## Immortality (God mode)
Follow the commands to make the dino un-killable.

We store the original game over function in a variable. This step is **IMPORTANT** if you want to stop the game later and needs to be done before you reset the gameOver function.
```js
var original = Runner.prototype.gameOver
```

Then, we make the game over function empty:
```js
Runner.prototype.gameOver = function(){}
```

#### How to stop?
When you want to stop the game, Revert back to the original game over function. This would only work if you had entered both commands in order for **Immortality**.
```js
Runner.prototype.gameOver = original
```

<br>

## Tweaking Speed
Type the following command in Console and press enter.
You can use any other speed in place of **1000**.

```
Runner.instance_.setSpeed(1000)
```

To go back to normal speed:
```
Runner.instance_.setSpeed(10)
```

<br>

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
