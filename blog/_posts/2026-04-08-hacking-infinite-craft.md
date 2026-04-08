---
title: "Hacking Infinite Craft: Inject Any Item by Spoofing the API Response"
icon: "fas fa-flask"
accent_color: "#f38ba8"
tags: [infinite-craft, hack, browser, devtools, javascript, fetch, api, monkey-patch]
series: browser-hacks
related:
  - /blog/2026/03/20/hacking-minesweeper-online
  - /blog/2026/03/20/cookie-clicker-hacks
  - /blog/2026/04/07/hacking-nyt-connections
  - /blog/2026/04/08/hacking-nyt-strands
  - /blog/2026/03/07/hacking-wordle
---

*Infinite Craft checks a server every time you combine two elements. What if you could step in between your browser and that server, and replace the real answer with whatever you want? This script does exactly that — by monkey-patching `window.fetch` before the game can use it.*

## What Is Infinite Craft?

[Infinite Craft](https://neal.fun/infinite-craft/) is a browser-based crafting game by Neal Agarwal. You start with four base elements — Water, Fire, Wind, and Earth — and combine them to discover new items. Combining Fire and Water makes Steam; combine Steam and Earth and you get a Swamp; keep going and you can eventually craft almost anything you can imagine.

The interesting part for us: **every combination is an API call.** When you drag one element onto another, the game sends a request to `https://neal.fun/api/infinite-craft/pair` with the two item names and waits for the server to return the result. The result isn't baked into the page — it comes from the network, live, every single time.

That's our attack surface.

## Why You Can't Just Edit localStorage

Most browser game hacks work by editing `localStorage` or a global JavaScript object. Infinite Craft does store your discovered items in IndexedDB (the browser's larger, structured client-side database), but writing a fake item directly into IndexedDB isn't enough. When you drag two elements together, the game still calls the server API to validate the combination result. A fake IndexedDB entry for an item you haven't legitimately crafted won't get you a new combination — the server decides what comes out.

To create an item that doesn't exist in your real discovery tree, you need to **intercept the API call itself** and return a response of your own choosing before it ever leaves your browser.

## The Tool: Fetch API Mocker

The script below injects a collapsible floating panel into the Infinite Craft page. You type in the name and emoji of the item you want to create, click **Queue Injection**, and then drag any two elements together in the game. The next API call is intercepted and replaced with your queued item — the game receives it exactly as if the server sent it, marks it as a new discovery, and adds it to your collection.

Open [Infinite Craft](https://neal.fun/infinite-craft/), then open the browser Console:

| OS | Shortcut |
|---|---|
| Windows / Linux | `F12` or `Ctrl + Shift + I`, then click **Console** |
| Mac | `Cmd + Option + I`, then click **Console** |

Paste the script and press **Enter**:

```js
(function() {
    if (document.getElementById('ic-injector')) return;

    // 1. Setup the Injection Queue and Patch window.fetch
    window.queuedGodItem = null;
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
        const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
        
        if (url.includes('/api/infinite-craft/pair') && window.queuedGodItem) {
            const fakeData = {
                result: window.queuedGodItem.name,
                emoji: window.queuedGodItem.emoji,
                isNew: true
            };
            
            window.queuedGodItem = null;
            const statusEl = document.getElementById('ic-status');
            if (statusEl) {
                statusEl.innerText = "Status: Idle";
                statusEl.style.color = "#a6adc8";
            }

            return new Response(JSON.stringify(fakeData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return originalFetch.apply(this, args);
    };

    // 2. Build the Wrapper (Now with overflow:hidden so it shrinks cleanly)
    const wrapper = document.createElement('div');
    wrapper.id = 'ic-injector';
    wrapper.style.cssText = "position:fixed;top:20px;right:20px;background:#1e1e2e;border:2px solid #f38ba8;border-radius:8px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.5);font-family:sans-serif;color:#cdd6f4;width:250px;overflow:hidden;";

    // 3. The Content Panel (Contains the form)
    const content = document.createElement('div');
    content.style.cssText = "padding:15px;display:block;";
    content.innerHTML = `
        <p style="font-size:11px;color:#a6adc8;margin-top:0;margin-bottom:10px;">Bypasses IndexedDB by hijacking the server response.</p>
        <div style="margin-bottom:10px;">
            <label style="font-size:12px;color:#a6adc8;">Item Name:</label>
            <input id="ic-name" type="text" placeholder="e.g. AWS Data Center" style="width:100%;padding:5px;margin-top:3px;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:15px;">
            <label style="font-size:12px;color:#a6adc8;">Emoji:</label>
            <input id="ic-emoji" type="text" placeholder="e.g. ☁️" style="width:100%;padding:5px;margin-top:3px;background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;box-sizing:border-box;">
        </div>
        <button id="ic-inject-btn" style="width:100%;padding:8px;background:#f38ba8;color:#11111b;border:none;border-radius:4px;font-weight:bold;cursor:pointer;">Queue Injection</button>
        <p id="ic-status" style="margin-top:10px;margin-bottom:0;font-size:12px;text-align:center;color:#a6adc8;">Status: Idle</p>
    `;

    // 4. The Header / Toggle Button
    const header = document.createElement('div');
    header.style.cssText = "padding:10px;background:#f38ba8;color:#11111b;cursor:pointer;font-weight:bold;user-select:none;display:flex;justify-content:space-between;align-items:center;";
    header.innerHTML = `<span>✨ API Mocker</span> <span id="ic-icon">▼</span>`;

    // 5. Toggle Logic
    let isOpen = true;
    header.onclick = function() {
        isOpen = !isOpen;
        content.style.display = isOpen ? "block" : "none";
        document.getElementById('ic-icon').innerText = isOpen ? "▼" : "▲";
    };

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);

    // 6. Queue Logic
    document.getElementById('ic-inject-btn').onclick = function() {
        window.queuedGodItem = {
            name: document.getElementById('ic-name').value || "Hacker",
            emoji: document.getElementById('ic-emoji').value || "💻"
        };
        const statusEl = document.getElementById('ic-status');
        statusEl.innerText = "Status: Ready! Combine 2 items.";
        statusEl.style.color = "#a6e3a1"; 
        
        // Auto-collapse the UI once queued so they can see the game board
        isOpen = false;
        content.style.display = "none";
        document.getElementById('ic-icon').innerText = "▲";
    };
})();
```

A pink-bordered dark panel appears in the top-right corner of the page. Type in your desired item name and emoji, click **Queue Injection**, and then drag any two elements together in the game. The panel auto-collapses so you can see the board. On the next combination, your injected item appears as a brand-new discovery.

---

## How the Code Works

### The IIFE Guard

```js
(function() {
    if (document.getElementById('ic-injector')) return;
    // ...
})();
```

The entire script runs inside an **Immediately Invoked Function Expression (IIFE)** — a function that defines and calls itself in one step. This scopes every variable inside the function so they don't leak into the global `window` object and collide with the game's own code.

The very first line inside that IIFE checks whether the injector panel is already present in the DOM. If you paste the script a second time without reloading, this guard fires immediately and exits — preventing a second panel from stacking on top of the first.

### Monkey-Patching `window.fetch`

```js
window.queuedGodItem = null;
const originalFetch = window.fetch;

window.fetch = async function(...args) {
    // ...
    return originalFetch.apply(this, args);
};
```

This is the core technique. `window.fetch` is just a regular property on the global `window` object — and JavaScript lets you replace any property with your own value. The script saves a reference to the real `fetch` in `originalFetch`, then installs its own `async function` in its place.

From this moment on, every `fetch()` call made anywhere on the page — including the calls the Infinite Craft game makes internally — goes through our wrapper first. This is called **monkey-patching**: replacing a built-in function at runtime with a modified version that runs extra logic before (or instead of) calling the original.

The `...args` rest parameter captures everything the caller passed, so we can forward those arguments to `originalFetch` unchanged for any call we don't want to intercept.

### URL Extraction and Interception

```js
const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

if (url.includes('/api/infinite-craft/pair') && window.queuedGodItem) {
```

`fetch()` is flexible about its first argument — it can be a plain string URL, or a [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object (which stores the URL in its `.url` property). The ternary expression handles both: if `args[0]` is a string, use it directly; if it's an object with a `.url` field, use that; otherwise default to an empty string.

The `includes('/api/infinite-craft/pair')` check targets only the combination endpoint, leaving every other network request (images, fonts, analytics) completely unaffected. The `window.queuedGodItem` check is a second gate — the interception only fires if you've actually queued an item. Without this, dragging elements together before queuing an item would produce no response at all, breaking the game.

### Returning a Fake Response

```js
const fakeData = {
    result: window.queuedGodItem.name,
    emoji: window.queuedGodItem.emoji,
    isNew: true
};

window.queuedGodItem = null;

return new Response(JSON.stringify(fakeData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
});
```

Instead of forwarding the request to Neal's server, the function constructs and returns a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object directly. `new Response()` is part of the Fetch API spec — it's the same type of object a real server response produces. The Infinite Craft code receives it and can't tell the difference.

The response body is a JSON string matching the structure the game expects: `result` (the item name), `emoji`, and `isNew: true`. Setting `isNew: true` is the key detail — it tells the game to treat this as a brand-new discovery and add it to your collection with the "first discovery" animation, rather than just showing a plain result.

After building the fake response, `window.queuedGodItem` is immediately cleared so that only one combination is intercepted. Every subsequent drag goes back to hitting the real server normally.

### Status Feedback

```js
const statusEl = document.getElementById('ic-status');
if (statusEl) {
    statusEl.innerText = "Status: Idle";
    statusEl.style.color = "#a6adc8";
}
```

After firing the injection, the script finds the status paragraph by its ID and resets it back to "Idle" in the muted grey colour. The `if (statusEl)` guard is defensive programming — if for some reason the DOM element was removed between queuing and firing, the code won't crash with a `TypeError: Cannot set properties of null`.

### Building the UI

```js
const wrapper = document.createElement('div');
wrapper.id = 'ic-injector';
wrapper.style.cssText = "position:fixed;top:20px;right:20px;...;overflow:hidden;";
```

The panel is a `position:fixed` element anchored to the top-right corner of the viewport so it floats above the game board regardless of scroll position. `overflow:hidden` on the wrapper means that when the content panel is hidden, the wrapper collapses down to exactly the height of the header — no padding gap, no awkward empty space.

The dark colour scheme (`#1e1e2e` background, `#cdd6f4` text, `#f38ba8` accent) deliberately mirrors the [Catppuccin Mocha](https://catppuccin.com/) palette — a developer-friendly dark theme that reads well against Infinite Craft's own light background.

### The Queue Logic

```js
document.getElementById('ic-inject-btn').onclick = function() {
    window.queuedGodItem = {
        name: document.getElementById('ic-name').value || "Hacker",
        emoji: document.getElementById('ic-emoji').value || "💻"
    };
    const statusEl = document.getElementById('ic-status');
    statusEl.innerText = "Status: Ready! Combine 2 items.";
    statusEl.style.color = "#a6e3a1";

    isOpen = false;
    content.style.display = "none";
    document.getElementById('ic-icon').innerText = "▲";
};
```

Clicking **Queue Injection** stores the name and emoji into `window.queuedGodItem`. The `|| "Hacker"` and `|| "💻"` fallbacks mean that if either input is left blank, the item still gets a sensible default rather than an empty string.

Immediately after queuing, the panel auto-collapses. This is a deliberate UX choice — once an injection is queued you need to interact with the game board, and the open panel would cover part of it. The chevron flips from ▼ to ▲ so you can tell at a glance that the panel is collapsed but still active.

### The Toggle Mechanism

```js
let isOpen = true;
header.onclick = function() {
    isOpen = !isOpen;
    content.style.display = isOpen ? "block" : "none";
    document.getElementById('ic-icon').innerText = isOpen ? "▼" : "▲";
};
```

The same collapsible-panel pattern used in the {% include post_link.html url="/blog/2026/04/08/hacking-nyt-strands" text="Strands" %} and {% include post_link.html url="/blog/2026/04/08/hacking-nyt-spelling-bee" text="Spelling Bee" %} helpers. `isOpen` is a boolean that flips on every header click. `display: none` / `"block"` is the cheapest possible show/hide — no animation overhead, no layout reflow of other elements. The chevron syncs with the state for a clear visual affordance.

---

*The fetch monkey-patch is the most powerful technique in this series so far — rather than reading what a server says, you replace what it says entirely. The same pattern works on any site that relies on `window.fetch` for its core loop: queue a fake response, trigger a call, and the game doesn't know the difference.*

*For a gentler form of API exploitation — reading answers without injecting anything — see {% include post_link.html url="/blog/2026/04/07/hacking-nyt-connections" text="Hacking NYT Connections" %} or {% include post_link.html url="/blog/2026/04/08/hacking-nyt-strands" text="Hacking NYT Strands" %}.*
