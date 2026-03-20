---
title: "Hacking TypeRacer: The Human-Mimic Bot"
tags: [typeracer, hack, javascript, browser, devtools, bookmarklet]
highlight: true
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2026/03/07/hacking-wordle
  - /blog/2019/12/07/unhide-password-box
---

*What if you could finish a TypeRacer race at a perfectly human 85 WPM — without typing more than a single letter yourself? Meet the Human-Mimic Bot: a script that takes over after your very first keystroke and types the rest of the passage for you, with just enough randomness to look completely natural.*

## What is TypeRacer?

[TypeRacer](https://typeracer.com) is one of the most popular online typing speed games. You race against other players by typing a passage of text as fast and accurately as possible. Your score is measured in WPM (Words Per Minute), and top players appear on public leaderboards.

The entire game runs in your browser using JavaScript — which means we can bend its rules with a clever script.

## The isTrusted Problem

Before diving in, there's one critical obstacle to understand — and it's actually what makes this bot *elegant*.

When a human physically presses a key on a keyboard, the browser generates a hardware-level event with the `isTrusted` property set to `true`. When JavaScript creates a synthetic event using `new Event()`, that property is permanently locked to `false`. The browser hardcodes this — **it cannot be spoofed**.

TypeRacer's front-end validates that the very first keystroke initializing the race is a trusted, hardware-level event. If the game state tries to start via an untrusted script injection, it throws the cheat flag immediately.

This is why our bot takes a clever approach: **it waits for you to press the first key yourself.** Once it detects that you've typed the correct first character, it seamlessly takes over from that point on. TypeRacer sees a real human start the race — and then just a very fast human finishing it.

## Desktop Method: The Browser Console

This method works on any desktop or laptop browser.

<div class="alert alert-info">
  📱 <b>On a phone or tablet?</b> Mobile browsers don't have DevTools — skip to the <a href="#mobile-method-bookmarklet">Mobile Bookmarklet</a> section below instead!
</div>

#### Step 1: Join a Race

Go to [typeracer.com](https://typeracer.com) and join a race. **Wait for the race to begin** before running the script — the passage text must be visible on screen for the bot to read it.

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
    let textNodes = document.querySelectorAll('span[unselectable="on"]');
    if (textNodes.length === 0) {
        alert('Could not find the text. Wait for the race to start!');
        return;
    }

    let targetText = Array.from(textNodes).map(span => span.textContent).join('');
    let inputField = document.querySelector('.txtInput');

    if (!inputField) {
        alert('Could not find the input field!');
        return;
    }

    let targetWPM = 85;
    let baseDelay = 1000 / ((targetWPM * 5) / 60);

    function checkAndStart() {
        let currentVal = inputField.value;

        if (currentVal.length > 0 && targetText.startsWith(currentVal)) {
            inputField.removeEventListener('input', checkAndStart);

            let i = currentVal.length;

            function typeChar() {
                if (i < targetText.length) {
                    inputField.value += targetText[i];
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                    i++;

                    let variation = baseDelay * 0.2 * (Math.random() - 0.5);
                    setTimeout(typeChar, baseDelay + variation);
                }
            }

            setTimeout(typeChar, baseDelay);
        }
    }

    inputField.addEventListener('input', checkAndStart);
    inputField.style.backgroundColor = "#e8f5e9";
    console.log("Bot armed! Type the correct first letter(s) to unleash it.");
})();
```

<div class="alert alert-warning">
  ⚠️ <b>Keep <code>targetWPM</code> under 100.</b> Pushing it to 200 WPM is fun to watch once, but it will result in an immediate IP shadowban from the leaderboards. The sweet spot is 70–95 WPM — fast enough to win races, low enough to stay invisible.
</div>

#### Step 4: Type the First Letter

You'll see this message in the console:

```
Bot armed! Type the correct first letter(s) to unleash it.
```

The input box will also turn **light green** 🟢 — a visual indicator that the bot is armed and waiting.

When the race starts, **type the first letter of the passage yourself**. The moment the bot detects a correct character in the input field, it seamlessly takes over and finishes the rest of the passage automatically.

## Mobile Method: Bookmarklet

Mobile browsers don't have a developer console — but they *do* support bookmarklets. A bookmarklet is a bookmark that runs JavaScript instead of navigating to a URL.

#### Step 1: Create a New Bookmark

In your mobile browser, bookmark any page (the URL doesn't matter — you'll replace it in the next step).

#### Step 2: Edit the Bookmark

Open your browser's bookmark manager and **edit the bookmark you just created**:

- Change the **name** to something memorable like `TypeRacer Bot`
- Replace the entire **URL** with the script below (copy the whole thing — it must be one continuous line):

```
javascript:(function(){let textNodes=document.querySelectorAll('span[unselectable="on"]');if(textNodes.length===0){alert('Could not find the text. Wait for the race to start!');return;}let targetText=Array.from(textNodes).map(span=>span.textContent).join('');let inputField=document.querySelector('.txtInput');if(!inputField){alert('Could not find the input field!');return;}let targetWPM=85;let baseDelay=1000/((targetWPM*5)/60);function checkAndStart(){let currentVal=inputField.value;if(currentVal.length>0&&targetText.startsWith(currentVal)){inputField.removeEventListener('input',checkAndStart);let i=currentVal.length;function typeChar(){if(i<targetText.length){inputField.value+=targetText[i];inputField.dispatchEvent(new Event('input',{bubbles:true}));i++;let variation=baseDelay*0.2*(Math.random()-0.5);setTimeout(typeChar,baseDelay+variation);}}setTimeout(typeChar,baseDelay);}}inputField.addEventListener('input',checkAndStart);inputField.style.backgroundColor="#e8f5e9";console.log("Bot armed! Type the correct first letter(s) to unleash it.");})();
```

#### Step 3: Run It on TypeRacer

1. Go to [typeracer.com](https://typeracer.com) and join a race
2. **Wait for the race countdown to finish** — the passage must be on screen
3. Tap your browser's address bar and type `TypeRacer Bot` to find the bookmarklet, then tap it
4. The input box turns **light green** 🟢 — the bot is armed!
5. Type the first letter of the passage yourself to trigger the bot

## Under the Hood

### The Randomization Factor

This is the secret sauce. Every keystroke delay is calculated like this:

```js
let variation = baseDelay * 0.2 * (Math.random() - 0.5);
setTimeout(typeChar, baseDelay + variation);
```

A bot typing *exactly* one character every 141 milliseconds is a dead giveaway in a server log — the cadence is impossibly perfect. By adding a dynamic **±20% fluctuation to every single keystroke**, the timing looks beautifully chaotic — exactly like a human who speeds up on easy words and slows down on tricky punctuation.

The result is a timing signature that's statistically indistinguishable from a real human typist.

### The isTrusted Shield

`isTrusted` is a read-only property on every browser event. Hardware-generated events (real keypresses) have it set to `true`. Synthetic events created by JavaScript (`new Event()`, `new KeyboardEvent()`) are permanently locked to `false`.

This is hardcoded into the browser's security model — no amount of JavaScript can override it. TypeRacer uses this to detect bots that try to start a race programmatically.

By waiting for you to press the first key yourself, the script sidesteps this restriction entirely. The race starts with a legitimate trusted event, and the bot only takes over once the race is already underway.

### Listening on `input`, Not `keydown`

The script attaches a listener to the `input` event rather than `keydown`. This is deliberate — `input` fires *after* the browser has updated the field's value, so the bot can read exactly what's in the box. `keydown` fires before the value updates, which would introduce a subtle timing issue where the bot reads a stale value and starts one character too early.

---

Happy racing! 🏁

*Enjoyed this? Check out [Hacking the Chrome Dino Game](/blog/2016/11/05/chrome-dino-hack) or [Hacking Wordle]({% post_url /blog/2026-03-07-hacking-wordle %}) for more fun browser tricks.*
