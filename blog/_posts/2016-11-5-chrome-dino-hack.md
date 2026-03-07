---
title: Hacking the Chrome Dino Game
tags: [chrome, hack, game]
highlight: true
disqus: true
related:
  - /blog/2019/12/07/unhide-password-box
  - /blog/2026/03/07/hacking-wordle
  - /blog/2026/03/07/edit-webpage-inspect-element
---

*All hacks updated as of 8th March 2026 based on game changes.*

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

##### 🧩 Step 1: Save the Original Function  
This is **very important** if you want to bring the game back to normal later.

```js
var original = Runner.prototype.gameOver;
```

##### 🧨 Step 2: Disable Game Over  
Now, we override the `gameOver` function so that it does… nothing.

```js
Runner.prototype.gameOver = function() {};
```

Boom — your dino is now immortal. It’ll just run through cacti like a champ.

##### 🛑 How to Stop It

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

---

## ⚡ Tweaking Speed

Want to put the pedal to the metal? Or maybe slow things down for a challenge? You can easily adjust the game speed using a simple command in the Console.

##### 🚀 Speed Up the Game
Enter this to crank up the speed:

```js
Runner.getInstance().setSpeed(1000)
```

Feel free to replace `1000` with any value for an extra boost!

##### 🐢 Slow It Down
If you want to return to the regular pace, use:

```js
Runner.getInstance().setSpeed(10)
```

Now you can play at lightning-fast speeds or take your time — the choice is yours!

---

## 🎯 Setting the Current Score

Want to jump right into the action with a specific score? You can set the score to any value up to **99999** (but no higher!). Here’s how to set it to **12345**:

```js
Runner.getInstance().distanceRan = 12345 / Config$2.COEFFICIENT
```

⚠️ Note: The score resets when the game ends, so don’t forget to re-enter the command if you want to keep the score high!

Experiment with different values to make your dino feel like a pro right from the start!

---

## 🦘 Jumping Height

Want your dino to jump higher (or lower)? You can easily adjust the jump height with this command. Just change the value to suit your style.

```js
Runner.getInstance().tRex.setJumpVelocity(20)
```

Increase the number for higher jumps, or lower it for a more controlled hop. The power is in your hands!

---

## 🌤️ Walk in Air

Ever wondered what it’s like for the dino to defy gravity? You can make it walk through the sky with this fun trick!

<img alt="Chrome Dino walking in air" src="/images/sky_dino.jpg" width="400">

##### 🕺 Dino Walking in the Air

```js
Runner.getInstance().tRex.groundYPos = 0
```

##### 🌍 Back to the Ground
If you want to bring it back to Earth:

```js
Runner.getInstance().tRex.groundYPos = 93
```

Now your dino is floating through the sky or back to solid ground, all at your command!

---

## 🤖 Auto-play

This code automatically controls the dino by checking for obstacles and making it jump or duck based on the obstacle's position. It runs periodically to keep the game going without you!

```js
function dispatchKey(type, key) {
    document.dispatchEvent(new KeyboardEvent(type, {keyCode: key}));
}
setInterval(function () {
    const KEY_CODE_SPACE_BAR = 32
    const KEY_CODE_ARROW_DOWN = 40
    const CANVAS_HEIGHT = Runner.getInstance().dimensions.height
    const DINO_HEIGHT = Runner.getInstance().tRex.config.height

    const obstacle = Runner.getInstance().horizon.obstacles[0]
    const speed = Runner.getInstance().currentSpeed

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
}, Runner.getInstance().msPerFrame);
```

This script continuously checks for obstacles like cacti or pterodactyls. When an obstacle is near, the script determines if the dino should jump or duck depending on the obstacle's position. If it’s a pterodactyl flying above, it does nothing. If it’s an obstacle at a lower height, it jumps. Otherwise, the dino ducks to avoid the hazard. It's like a bot taking control of your dino — no more manual intervention needed!

---

## 👻 Invisibility

Want to make your dino invisible? It’s easy to do by simply disabling its drawing function! This will prevent the dino from being rendered on the screen, making it fully invisible.

##### 🧑‍💻 Make the Dino Invisible

```js
const originalDraw = Runner.getInstance().tRex.draw;
Runner.getInstance().tRex.draw = function() {};
```

This code replaces the dino's draw function with an empty one, meaning the dino won’t be drawn on the canvas.

**Note:** The dino can still die if it collides with obstacles

##### 🔙 Restore the Dino
To bring the dino back, simply restore the original draw function:

```js
Runner.getInstance().tRex.draw = originalDraw;
```

Now the dino is visible again, and the game continues as usual!

---

Keep having fun and may your dino run forever!

Share this page around and comment down if you have tricks of your own!
