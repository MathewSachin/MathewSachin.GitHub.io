---
title: Hacking the Chrome Dino Game
tags: [chrome, hack, game]
highlight: true
disqus: true
related:
  - /blog/2019/12/07/unhide-password-box
  - /blog/2023/04/09/captura-unmaintained
---

Google Chrome includes an endless runner Dinosaur (T-Rex) game which appears in the absense of internet connection. Let's put on our hacker hats and try to mess with this game.

<div class="alert alert-info">
  If you are unable to get the <b>No Internet page</b>, open a new tab and type <b>chrome://dino</b> and press enter.
</div>

Not too important if you're not a programmer, this game is written in JavaScript and fortunately for us the class and object are globally exposed. Due to JavaScript's dynamic nature, we can override functions on the class to change the functionality. We can do all this from the Chrome console.

## Playing
Just in case, this is your first time seeing this game, it is fairly straightforward to play.

- **Space Bar / Up:** Jump (also to start the game)
- **Down:** Duck (pterodactyls appear after 450 points)
- **Alt:** Pause
- The game enters a black background mode after every multiple of 700 points for the next 100 points.

![Chrome Dino](/images/chromeDino.gif)

## Open Chrome Console
- Make sure you are on the **No Internet Connection** page.<br>
- Right click anywhere on the page and select **Inspect**.
- Go to **Console** tab. This is where we will enter the commands to tweak the game.

> After every command press enter. All the commands are case-sensitive.

If you see `undefined` after entering a command correctly, don't worry that is expected (for those who want to know more, it is the return type of the function we called).

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
