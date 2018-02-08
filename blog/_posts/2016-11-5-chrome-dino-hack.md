---
title: Hacking the Chrome Dino Game
tags: [chrome, hack, game]
highlight: true
---

Google Chrome includes an endless runner Dinosaur game which appears in the absense of internet connection.

**Edited: 12-09-17**

If you are unable to get the **No Internet page**, open a new tab and paste `chrome://dino` and press enter.

## Playing
- **Space Bar / Up:** Jump (also to start the game)
- **Down:** Duck (pterodactyls appear after 450 points)
- **Alt:** Pause
- The game enters a black background mode after every multiple of 700 points for the next 100 points.

![Chrome Dino](/images/chromeDino.gif)

## Open Chrome Console
- Make sure you are on the **No Internet Connection** page.
- Right click anywhere on the page and select *Inspect*.
- Go to *Console* tab. This is where we will enter the commands to tweak the game.

## Tweaking Speed
Type: `Runner.instance_.setSpeed(1000)`, or any other speed other than 1000 and press enter.

## Immortality
- After every command press enter.

> If the following commands don't work, try again by changing `gameover` to `gameOver`.

- We store the original game over function in a variable:
```js
var original = Runner.prototype.gameover
```

- Then, we make the game over function empty:
```js
Runner.prototype.gameover = function(){}
```

- Revert back to the original game over function when you want to stop the game:
```js
Runner.prototype.gameover = original
```