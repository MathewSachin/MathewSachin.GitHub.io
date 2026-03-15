---
title: "Auto-play the Chrome Dino Game with JavaScript"
tags: [chrome, hack, game, javascript]
highlight: true
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2026/03/07/edit-webpage-inspect-element
  - /blog/2019/12/07/unhide-password-box
---

*Want the dino to play itself? Here's a bot you can drop into the Chrome DevTools Console — no installs, no extensions, just JavaScript.*


## The Full Auto-play Script

Paste this into the Chrome DevTools Console (press `F12` → **Console** tab) while the Dino game is running, then press **Enter**. The dino will start dodging obstacles automatically.

```js
function dispatchKey(type, key) {
    document.dispatchEvent(new KeyboardEvent(type, {keyCode: key}));
}
const autoPlay = setInterval(function () {
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

That's it — copy, paste, run, and watch your dino become a pro! 🦕

If you want to understand how each piece works, read on.

## Simulating Keyboard Input

```js
function dispatchKey(type, key) {
    document.dispatchEvent(new KeyboardEvent(type, {keyCode: key}));
}
```

The Dino game listens for real keyboard events (`keydown` / `keyup`) on the `document`. Instead of physically pressing a key, we fire a synthetic `KeyboardEvent` that looks exactly like the real thing to the game.

- `type` is `"keydown"` or `"keyup"`.
- `key` is the numeric key code — **32** for Space Bar (jump) and **40** for Arrow Down (duck).

By dispatching these events programmatically, the bot can trigger jumps and ducks at precisely the right moment.

## The Game Loop

```js
const autoPlay = setInterval(function () {
    // ... check and react to obstacles
}, Runner.getInstance().msPerFrame);
```

`setInterval` runs our callback repeatedly at the interval we specify. Instead of a hard-coded value like 16 ms, we use `Runner.getInstance().msPerFrame` — the exact frame duration the game itself uses.

This means the bot checks for obstacles **once per frame**, keeping it perfectly in sync with the game's own rendering loop and avoiding both over-checking and under-checking.

We store the return value in `autoPlay` so we can stop the bot later — see [Stopping Auto-play](#-stopping-auto-play) below.

## Finding the Nearest Obstacle

```js
const obstacle = Runner.getInstance().horizon.obstacles[0]
```

The game stores all active obstacles in `Runner.getInstance().horizon.obstacles`, an array ordered from left to right. Index `0` is always the closest obstacle ahead of the dino — the one we need to react to first.

If the array is empty (no obstacles on screen yet), `obstacle` will be `undefined` and the whole `if (obstacle)` block is skipped safely.

## Deciding When to React

```js
const w = obstacle.width
const x = obstacle.xPos // measured from left of canvas
const isObstacleNearby = x < 25 * speed - w / 2
```

We don't want to jump the moment an obstacle appears — that would be far too early. Instead, we calculate a **reaction threshold** based on the current game speed:

- `speed` is `Runner.getInstance().currentSpeed` — it increases as the game progresses.
- The threshold `25 * speed - w / 2` grows with speed, so the bot reacts earlier when things are moving faster (giving it enough time to complete the jump or duck before the obstacle arrives).
- Subtracting half the obstacle's width (`w / 2`) centres the threshold on the obstacle rather than its left edge.

The bot only acts when `x` (the obstacle's left edge, measured from the left of the canvas) drops below this threshold.

## Jump, Duck, or Do Nothing?

```js
const yFromBottom = CANVAS_HEIGHT - y - obstacle.typeConfig.height
const DINO_HEIGHT = Runner.getInstance().tRex.config.height

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
```

Obstacle positions use the top-left corner as origin, so we compute `yFromBottom` — how far the obstacle's bottom edge is from the ground. This tells us whether the obstacle is flying high or sitting on the ground.

**Three cases:**

1. **Pterodactyl flying high** (`yFromBottom > DINO_HEIGHT`): the obstacle is high enough that the dino can run under it standing up. Do nothing.

2. **Ground-level obstacle** (`y > CANVAS_HEIGHT / 2`): the obstacle is in the lower half of the canvas — a cactus or low-flying pterodactyl. Send a `keyup` Arrow Down first (to cancel any active duck), then `keydown` Space Bar to jump.

3. **Mid-height obstacle** (everything else): the obstacle is hovering at mid-height — a pterodactyl the dino can't jump over but can duck under. Send `keydown` Arrow Down to duck.

## Stopping Auto-play

Because we stored the interval ID in `autoPlay`, stopping the bot is a single line:

```js
clearInterval(autoPlay)
```

Run this in the Console whenever you want to take back control of the dino.

## Putting It All Together

Every frame the bot:
1. Looks at the first obstacle in the queue.
2. Calculates whether it's close enough to warrant a reaction.
3. Reads the obstacle's vertical position to decide: ignore it, jump over it, or duck under it.
4. Fires the appropriate synthetic keyboard event.

The result is a dino that plays indefinitely, reacting to every cactus and pterodactyl the game throws at it.

*This auto-play script is just one of many tricks you can pull off in the Chrome Dino game. Check out [Hacking the Chrome Dino Game]({% post_url /blog/2016-11-5-chrome-dino-hack %}) for god mode, speed tweaks, score manipulation, and more!*
