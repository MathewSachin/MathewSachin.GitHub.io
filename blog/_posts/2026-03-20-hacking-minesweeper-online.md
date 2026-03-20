---
title: "Hacking Minesweeper Online: Rigging the RNG"
tags: [minesweeper, hack, javascript, browser, devtools, bookmarklet]
highlight: true
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2026/03/20/hacking-typeracer
  - /blog/2026/03/07/hacking-wordle
  - /blog/2019/12/07/unhide-password-box
---

*What if you could guarantee a safe first click in Minesweeper — every single time? No guessing, no luck. Just a tiny script that takes over the browser's random number generator and stacks the deck in your favour.*

## What is Minesweeper Online?

[Minesweeper Online](https://minesweeperonline.com) is a faithful browser recreation of the classic Windows game. The board hides a fixed number of mines; reveal a mine and it's game over. Reveal every safe cell and you win.

Every game starts fresh — a brand-new random layout of mines, decided the moment you click the very first cell.

That last part is the key.

## How Mines Are Actually Placed

Minesweeper Online uses JavaScript's built-in `Math.random()` to decide where the mines go. When you click the first cell, the game calls `Math.random()` repeatedly to pick random coordinates for each mine, making sure none of them land on the cell you just clicked (so your opening move is always safe).

`Math.random()` returns a floating-point number between `0` (inclusive) and `1` (exclusive). Those numbers are then scaled to fit the board dimensions to produce row and column indices.

Because `Math.random()` is just a regular function sitting on a global JavaScript object, we can replace it with our own version — before the game ever calls it.

## The Hack: A Fake RNG

Our replacement `Math.random()` is about as simple as it gets:

```js
let fakeRandom = 0;

Math.random = function() {
    fakeRandom += 0.000001;
    if (fakeRandom >= 1) fakeRandom = 0;
    return fakeRandom;
};
```

Instead of unpredictable numbers, it returns a perfectly predictable, ever-increasing sequence: `0.000001`, `0.000002`, `0.000003`, …

When the game scales these near-zero values to board coordinates, every mine lands in the **top-left corner** of the board. The rest of the board — and in particular the **bottom-right corner** — stays completely mine-free.

So the strategy becomes:

1. Inject the fake RNG.
2. Start a **new game** (click the smiley face ☺ to reset).
3. Click anywhere in the **bottom-right corner** to make your first move.
4. The game will cascade open from there, giving you a massive head start on a board where all the mines are conveniently bunched in the opposite corner.

## Desktop Method: The Browser Console

This method works on any desktop or laptop browser.

<div class="alert alert-info">
  📱 <b>On a phone or tablet?</b> Mobile browsers don't have DevTools — skip to the <a href="#mobile-method-bookmarklet">Mobile Bookmarklet</a> section below instead!
</div>

#### Step 1: Open Minesweeper Online

Go to [minesweeperonline.com](https://minesweeperonline.com) and let the page fully load.

#### Step 2: Open the Browser Console

| OS | Shortcut |
|---|---|
| Windows / Linux | `F12` or `Ctrl + Shift + I`, then click the **Console** tab |
| Mac | `Cmd + Option + I`, then click the **Console** tab |

Direct shortcut: `Ctrl + Shift + J` (Windows/Linux) or `Cmd + Option + J` (Mac) jumps straight to the Console.

#### Step 3: Paste and Run the Script

Copy the script below, paste it into the Console, and press **Enter**:

```js
(function() {
    let fakeRandom = 0;

    // Overwrite the browser's native random number generator
    Math.random = function() {
        // Increment by a tiny amount so it generates sequential coordinates
        fakeRandom += 0.000001;

        // Loop back to 0 before it hits 1 to prevent array out-of-bounds errors
        if (fakeRandom >= 1) fakeRandom = 0;

        return fakeRandom;
    };

    alert("RNG Hijacked! Click the Smiley Face to start a new game, then click the bottom-right corner.");
})();
```

You'll see an alert: **"RNG Hijacked! Click the Smiley Face to start a new game, then click the bottom-right corner."**

#### Step 4: Start a New Game

Click the **smiley face ☺** button at the top of the board. This resets the game without refreshing the page, so our fake RNG stays in place.

#### Step 5: Click the Bottom-Right Corner

Click any cell near the **bottom-right corner** of the board. Because all mines are now clustered in the top-left, this region is entirely safe. The game will cascade open, clearing a huge chunk of the board instantly.

<div class="alert alert-info">
  💡 <b>Tip:</b> If the cascade doesn't open up much, try clicking a cell closer to the very corner — the further from the top-left, the safer.
</div>

## Mobile Method: Bookmarklet

Mobile browsers don't have a developer console — but they *do* support bookmarklets. A bookmarklet is a bookmark that runs JavaScript instead of navigating to a URL.

#### Step 1: Create a New Bookmark

In your mobile browser, bookmark any page. The URL doesn't matter — you'll replace it in the next step.

#### Step 2: Edit the Bookmark

Open your browser's bookmark manager and **edit the bookmark you just created**:

- Change the **name** to something like `Minesweeper Hack`
- Replace the entire **URL** with the code below (copy the whole thing — it must be one continuous line):

```
javascript:(function(){let fakeRandom=0;Math.random=function(){fakeRandom+=0.000001;if(fakeRandom>=1)fakeRandom=0;return fakeRandom;};alert("RNG Hijacked! Click the Smiley Face to start a new game, then click the bottom-right corner.");})();
```

Save the bookmark.

#### Step 3: Run It on Minesweeper Online

1. Go to [minesweeperonline.com](https://minesweeperonline.com) and wait for the page to fully load.
2. Tap the **address bar**, type `Minesweeper Hack`, and when the bookmark appears in the dropdown, tap it.
3. An alert will pop up confirming the RNG is hijacked — tap **OK**.
4. Tap the **smiley face ☺** to start a new game.
5. Tap anywhere near the **bottom-right corner** of the board.

## Under the Hood

### Why Replacing `Math.random()` Works

In JavaScript, `Math` is just a plain object, and `Math.random` is just a property on it — a regular function reference. There's nothing preventing you from assigning a different function to `Math.random`. As far as the page is concerned, it's calling the standard API; it has no way to tell the difference.

This is one of JavaScript's most powerful (and occasionally dangerous) features: the ability to **monkey-patch** built-in globals at runtime.

### Why Start a New Game After Injecting?

The fake RNG needs to be in place *before* the game places the mines. Mines are placed when you click the first cell of each game — not when the page loads. So by starting a fresh game after injecting, we guarantee that `Math.random()` is already hijacked when the mine-placement code runs.

If you skip the reset step and click immediately, the mines from the *previous* game (placed with the real RNG) are still on the board.

### Why the Bottom-Right Corner?

The fake RNG starts at `0.000001` and increases in tiny steps. When the game converts these values to coordinates, the smallest values map to the smallest row and column indices — i.e., the **top-left** of the board. So the top-left corner is where all the mines pile up, and the bottom-right corner is the furthest point from the danger zone.

### The `>= 1` Guard

Without the `if (fakeRandom >= 1) fakeRandom = 0` line, the counter would eventually reach `1.0`. Since `Math.random()` is defined to return values *strictly less than* `1`, returning exactly `1` could cause the game's array index calculations to go out of bounds. The guard keeps our fake values safely in the valid `[0, 1)` range.

---

Now go enjoy your (totally legitimate) winning streak! 🏆

*Enjoyed this? Check out [Hacking the Chrome Dino Game](/blog/2016/11/05/chrome-dino-hack), [Hacking TypeRacer]({% post_url /blog/2026-03-20-hacking-typeracer %}), or [Hacking Wordle]({% post_url /blog/2026-03-07-hacking-wordle %}) for more fun browser tricks.*
