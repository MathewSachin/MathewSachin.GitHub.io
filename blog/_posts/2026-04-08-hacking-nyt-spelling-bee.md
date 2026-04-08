---
title: "Hacking NYT Spelling Bee: Reveal All Answers and Pangrams Instantly"
icon: "fas fa-bee"
accent_color: "#fce83a"
tags: [nyt, spelling-bee, hack, browser, devtools, javascript, bookmarklet]
series: browser-hacks
related:
  - /blog/2026/04/07/hacking-nyt-connections
  - /blog/2026/03/07/hacking-wordle
  - /blog/2026/03/19/hacking-wordle-mobile-bookmarklet
  - /blog/2026/03/20/cookie-clicker-hacks
  - /blog/2026/03/19/brute-force-dark-mode
---

*NYT Spelling Bee loads the full answer list — every valid word and every pangram — into a JavaScript variable on the page before you type a single letter. One console command reads it all back out, and a bookmarklet turns that into a floating panel you can tap on mobile.*

## What Is NYT Spelling Bee?

[NYT Spelling Bee](https://www.nytimes.com/puzzles/spelling-bee) is a daily word puzzle published by The New York Times. You're given seven letters arranged in a honeycomb — one center letter and six surrounding ones. Your job is to find as many words as possible using those letters, always including the centre letter. Longer words score more points, and every puzzle has at least one **pangram** — a word that uses all seven letters.

Like Wordle and Connections, **the game ships the full answer list to your browser before you make a single move.** It lands in a global JavaScript variable called `window.gameData` — and from the Console, it's yours to read.

## Step 1 — Open the Console

Open [NYT Spelling Bee](https://www.nytimes.com/puzzles/spelling-bee) in your browser, then open DevTools:

| OS | Shortcut |
|---|---|
| Windows / Linux | `F12` or `Ctrl + Shift + I`, then click **Console** |
| Mac | `Cmd + Option + I`, then click **Console** |

Direct shortcut to jump straight to the Console: `Ctrl + Shift + J` (Windows/Linux) or `Cmd + Option + J` (Mac).

## Step 2 — Read the Game Data

The game stores today's puzzle in `window.gameData`. Paste this one-liner and press **Enter**:

```js
console.log(window.gameData.today.answers, window.gameData.today.pangrams);
```

You'll see two arrays printed — all valid answers and the subset that are pangrams. That's the entire puzzle exposed. But reading raw arrays is fiddly, so the next step gives you a much nicer view.

## The Full Overlay Script

Paste the following into the Console and press **Enter**:

```js
(function() {
    const d = window.gameData;
    if (!d) return alert("Game data not found!");

    // Prevent duplicate injections if clicked twice
    if (document.getElementById('bee-helper')) return;

    const a = d.today.answers;
    const p = d.today.pangrams;

    // Main Wrapper
    const wrapper = document.createElement('div');
    wrapper.id = 'bee-helper';
    wrapper.style.cssText = "position:fixed;top:10px;right:10px;background:#fff;border:2px solid #e6e6e6;border-radius:8px;z-index:9999;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.15);overflow:hidden;";

    // The Content Panel
    const content = document.createElement('div');
    content.style.cssText = "padding:15px;max-height:60vh;overflow-y:auto;max-width:60vw;width:220px;display:block;";

    let h = `<p style="margin-top:0;"><b>Total:</b> ${a.length} words</p><div><h4 style="color:#e5b80b;margin-bottom:5px;">Pangrams:</h4><ul style="margin:0;padding-left:20px;">`;
    p.forEach(w => { h += `<li><b>${w}</b></li>` });
    h += `</ul></div><div><h4 style="margin-bottom:5px;">All Words:</h4><p style="font-size:12px;line-height:1.4;color:#555;word-wrap:break-word;">${a.join(', ')}</p></div>`;
    content.innerHTML = h;

    // The Header / Toggle Button
    const header = document.createElement('div');
    header.style.cssText = "padding:10px;background:#fce83a;cursor:pointer;font-weight:bold;user-select:none;display:flex;justify-content:space-between;align-items:center;";
    header.innerHTML = `<span>🐝 Helper</span> <span id="bee-icon">▼</span>`;

    // The Toggle Logic
    let isOpen = true;
    header.onclick = function() {
        isOpen = !isOpen;
        content.style.display = isOpen ? "block" : "none";
        document.getElementById('bee-icon').innerText = isOpen ? "▼" : "▲";
    };

    // Assemble and Inject
    wrapper.appendChild(header);
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);
})();
```

A small floating panel with a yellow header appears in the top-right corner of the page. It shows the total word count, all pangrams in bold, and the full answer list. Click the header to collapse or expand it.

## Mobile Method: Bookmarklet

Mobile browsers don't have a developer console, but they support **bookmarklets** — bookmarks whose URL is a `javascript:` snippet that executes when you tap it from the address bar.

### Step 1 — Create a New Bookmark

In your mobile browser, bookmark any page. The URL doesn't matter — you'll replace it next.

### Step 2 — Edit the Bookmark

Open your bookmarks, find the one you just saved, and tap **Edit**:

- Change the **name** to something like `🐝 Bee Helper`
- Delete the entire **URL** and paste this one-liner in its place (copy the whole thing — it must be one continuous line):

```
javascript:(function(){const d=window.gameData;if(!d)return alert("Game data not found!");if(document.getElementById('bee-helper'))return;const a=d.today.answers,p=d.today.pangrams,w=document.createElement('div');w.id='bee-helper';w.style.cssText="position:fixed;top:10px;right:10px;background:#fff;border:2px solid #e6e6e6;border-radius:8px;z-index:9999;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.15);overflow:hidden;";const c=document.createElement('div');c.style.cssText="padding:15px;max-height:60vh;overflow-y:auto;max-width:60vw;width:220px;display:block;";let h=`<p style="margin-top:0;"><b>Total:</b> ${a.length} words</p><div><h4 style="color:#e5b80b;margin-bottom:5px;">Pangrams:</h4><ul style="margin:0;padding-left:20px;">`;p.forEach(x=>{h+=`<li><b>${x}</b></li>`});h+=`</ul></div><div><h4 style="margin-bottom:5px;">All Words:</h4><p style="font-size:12px;line-height:1.4;color:#555;word-wrap:break-word;">${a.join(', ')}</p></div>`;c.innerHTML=h;const t=document.createElement('div');t.style.cssText="padding:10px;background:#fce83a;cursor:pointer;font-weight:bold;user-select:none;display:flex;justify-content:space-between;align-items:center;";t.innerHTML=`<span>🐝 Helper</span> <span id="b-icon">▼</span>`;let o=true;t.onclick=()=>{o=!o;c.style.display=o?"block":"none";document.getElementById('b-icon').innerText=o?"▼":"▲"};w.appendChild(t);w.appendChild(c);document.body.appendChild(w);})();
```

Save the bookmark.

### Step 3 — Run It

1. Open [NYT Spelling Bee](https://www.nytimes.com/puzzles/spelling-bee) and let the game fully load.
2. Tap the **address bar**, type `🐝 Bee Helper`, and when the bookmark appears in the dropdown, tap it.
3. The floating helper panel appears — pangrams at the top, then the full word list below.

<div class="alert alert-info">
  💡 <b>Tip:</b> Simply tapping the bookmark from the bookmarks menu often won't execute the JavaScript on mobile. Always trigger it via the address bar dropdown.
</div>

Want to generate your own bookmarklets from any script? The [Bookmarklet Compiler]({{ '/tools/bookmarklet/' | relative_url }}) handles the IIFE wrapping, minification, and URI encoding automatically.

---

## How the Code Works

### Reading `window.gameData`

```js
const d = window.gameData;
if (!d) return alert("Game data not found!");
```

When the Spelling Bee page loads, the game's own JavaScript writes the full puzzle payload into `window.gameData` — a property on the global `window` object. This is a common pattern in server-side-rendered apps: the server bakes the data into the page as a JavaScript assignment so the client-side game can read it without an extra network round-trip.

Unlike the {% include post_link.html url="/blog/2026/04/07/hacking-nyt-connections" text="NYT Connections hack" %} — which fetches the answers from a separate JSON endpoint — there's no network request to sniff here. The data is already in memory by the time the page finishes loading. `window.gameData.today.answers` is an alphabetically sorted array of every valid word; `window.gameData.today.pangrams` is the subset that use all seven letters.

The guard `if (!d)` handles the edge case where the script runs before the game has initialised (for example, on a reload that's still in progress) — it aborts with a clear message rather than throwing a cryptic `TypeError`.

### Duplicate-Injection Guard

```js
if (document.getElementById('bee-helper')) return;
```

If you run the bookmarklet twice without reloading the page, this line detects that the panel is already in the DOM (by its unique `id`) and exits early. Without this guard, a second tap would add a second panel on top of the first.

### Building the Overlay Markup

```js
let h = `<p style="margin-top:0;"><b>Total:</b> ${a.length} words</p>...`;
p.forEach(w => { h += `<li><b>${w}</b></li>` });
h += `...${a.join(', ')}...`;
content.innerHTML = h;
```

Instead of creating one DOM element per word, the script builds the full HTML as a single string and assigns it to `innerHTML` in one shot. This is far faster than a loop of `createElement` / `appendChild` calls when the answer list can be 50–100 words long — the browser parses the string and constructs the subtree in a single reflow.

The pangrams are listed first in a `<ul>` so they stand out immediately. The full answer list is rendered as a comma-separated paragraph with a small font size to keep the panel compact.

### Creating the Wrapper and Positioning It

```js
wrapper.style.cssText = "position:fixed;top:10px;right:10px;...z-index:9999;...";
```

`position: fixed` pins the panel to the viewport — it stays in the top-right corner even as the game scrolls. `z-index: 9999` ensures it floats above the game's own UI layers (Spelling Bee uses multiple stacking layers for the honeycomb and dialogs). `overflow: hidden` on the wrapper clips the content panel cleanly inside the rounded border when it's expanded.

### The Toggle Mechanism

```js
let isOpen = true;
header.onclick = function() {
    isOpen = !isOpen;
    content.style.display = isOpen ? "block" : "none";
    document.getElementById('bee-icon').innerText = isOpen ? "▼" : "▲";
};
```

`isOpen` is a boolean that flips on every click. The content panel's `display` property switches between `"block"` (visible) and `"none"` (hidden) — the cheapest possible show/hide toggle that avoids layout reflow of unrelated elements. The chevron icon (`▼` / `▲`) gives a clear visual affordance that the panel is collapsible, which matters on mobile where the panel can cover part of the game board.

### The IIFE Wrapper

```js
(function() {
    // ...
})();
```

The entire script is an **Immediately Invoked Function Expression**. All variables (`d`, `a`, `p`, `wrapper`, `content`, `isOpen`) are scoped inside this function — they don't leak into `window` and can't clash with the game's own globals. This is especially important in a bookmarklet, where you're injecting code into a page you don't control.

---

*For more NYT game tricks, see {% include post_link.html url="/blog/2026/04/07/hacking-nyt-connections" text="Hacking NYT Connections" %} for a network-sniffing approach, or {% include post_link.html url="/blog/2026/03/07/hacking-wordle" text="Hacking Wordle" %} for reading game state out of localStorage.*
