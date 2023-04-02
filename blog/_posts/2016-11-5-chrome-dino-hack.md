---
title: Hacking the Chrome Dino Game
tags: [chrome, hack, game]
highlight: true
disqus: true
related:
  - /blog/2019/12/07/unhide-password-box
---

Google Chrome includes an endless runner Dinosaur game which appears in the absense of internet connection.

<div class="alert alert-info">
  If you are unable to get the <b>No Internet page</b>, open a new tab and type <b>chrome://dino</b> and press enter.
</div>

## Playing
- **Space Bar / Up:** Jump (also to start the game)
- **Down:** Duck (pterodactyls appear after 450 points)
- **Alt:** Pause
- The game enters a black background mode after every multiple of 700 points for the next 100 points.

![Chrome Dino](/images/chromeDino.gif)

## Open Chrome Console
- Make sure you are on the **No Internet Connection** page.<br>
- Right click anywhere on the page and select **Inspect**.
- Go to **Console** tab. This is where we will enter the commands to tweak the game.

## Tweaking Speed
Type the following command in Console and press enter.
You can use any other speed in place of **1000**.

```
Runner.instance_.setSpeed(1000)
```

## Immortality
- After every command press enter. All the commands are case-sensitive.

- We store the original game over function in a variable:
```js
var original = Runner.prototype.gameOver
```

- Then, we make the game over function empty:
```js
Runner.prototype.gameOver = function(){}
```

### Stopping the game after using Immortality
When you want to stop the game, Revert back to the original game over function:
```js
Runner.prototype.gameOver = original
```

## Setting the current score
Let's set the score to 12345. You can set any other score less than 99999.
The current score is reset on game over.

```js
Runner.instance_.distanceRan = 12345 / Runner.instance_.distanceMeter.config.COEFFICIENT
```

## Dino jumping too high?
You can control how high the dino jumps by using the below function. Adjust the value as necessary.

```js
Runner.instance_.tRex.setJumpVelocity(10)
```
