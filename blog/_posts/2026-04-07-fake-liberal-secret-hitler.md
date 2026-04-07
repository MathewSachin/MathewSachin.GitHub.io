---
title: "Fake Being a Liberal in Secret Hitler (Browser Hack)"
icon: "fas fa-user-secret"
tags: [secret-hitler, hack, javascript, browser, bookmarklet, game]
series: browser-hacks
related:
  - /blog/2026/03/21/save-instagram-photos
  - /blog/2026/03/19/brute-force-dark-mode
  - /blog/2026/03/20/hacking-minesweeper-online
  - /blog/2026/03/07/edit-webpage-inspect-element
  - /blog/2016/11/05/chrome-dino-hack
---

*You drew a Fascist card on [secret-hitler.com](https://www.secret-hitler.com). Nobody needs to know that. A single script swaps your role images and scrubs your teammate list — and stays in place even when the game reloads the dialog on mobile.*

<div class="alert alert-warning">
  ⚠️ <b>Warning:</b> This only hacks your eyes, not the game server. If you start acting like a Fascist while your screen says "Liberal," that's on your social engineering skills, not my code.
</div>

---

## What Is Secret Hitler?

[Secret Hitler](https://www.secret-hitler.com) is a social deduction game for 5–10 players. At the start of each round, every player is secretly assigned a role: **Liberal** or **Fascist** (one player is secretly Hitler). The Fascists know who each other are; the Liberals don't. The Fascists win by either enacting enough Fascist policies or getting Hitler elected Chancellor.

The game runs in the browser at `secret-hitler.com`. When your role is revealed, the page displays a role card with an image and a heading — things like `bad.jpg` for a regular Fascist or `boss.jpg` for Hitler, alongside a heading that reads **"You are a Fascist"** and the names of your fellow Fascists.

All of that is just HTML and `<img>` tags sitting in your DOM. And you know what that means.

---

## What the Script Does

The script targets three things on the role-reveal screen:

1. **Image swap** — replaces the Fascist role images (`bad.jpg`, `boss.jpg`, `a-bad.jpg`) with the Liberal equivalents (`good.jpg`, `a-good.jpg`)
2. **Heading scrub** — rewrites `"You are a Fascist"` to `"You are a liberal"`
3. **Teammate purge** — removes the `<h4>` elements that list your Fascist teammates, so no names leak through

---

## Desktop Method: Browser Console

### Step 1 — Open secret-hitler.com

Go to [secret-hitler.com](https://www.secret-hitler.com) and join or start a game as normal.

### Step 2 — Open the Browser Console

| OS | Shortcut |
|---|---|
| Windows / Linux | `F12` or `Ctrl + Shift + I`, then click the **Console** tab |
| Mac | `Cmd + Option + I`, then click the **Console** tab |

Direct shortcut: `Ctrl + Shift + J` (Windows/Linux) or `Cmd + Option + J` (Mac) jumps straight to the Console.

### Step 3 — Paste and Run the Script

Paste the following code into the Console and press **Enter**:

```js
(function() {
    const applyMask = () => {
        // 1. Image Swaps (bad/boss -> good)
        document.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src === '/images/original/bad.jpg' || src === '/images/original/boss.jpg') {
                img.src = '/images/original/good.jpg';
            } else if (src === '/images/original/a-bad.jpg') {
                img.src = '/images/original/a-good.jpg';
            }
        });

        // 2. Heading Scrubbing
        document.querySelectorAll('h4').forEach(h4 => {
            if (h4.innerText.includes("You are a Fascist")) {
                h4.innerText = "You are a liberal";

                // Get all siblings of this h4
                const siblings = Array.from(h4.parentNode.children);
                siblings.forEach(sibling => {
                    // Remove all other h4 siblings to clear teammate info
                    if (sibling !== h4 && sibling.tagName === 'H4') {
                        sibling.remove();
                    }
                });
            }
        });
    };

    // Initial run
    applyMask();

    // Persistent observer for mobile dialog resets
    const observer = new MutationObserver(() => applyMask());
    observer.observe(document.body, { childList: true, subtree: true });

    console.log("Stealth Mask Active: All Fascist siblings purged.");
})();
```

You'll see **"Stealth Mask Active: All Fascist siblings purged."** in the console. From this point on, any Fascist role card that appears — now or after a dialog reset — will display as Liberal.

---

## Mobile Method: Bookmarklet

Mobile browsers don't have a developer console, but they support **bookmarklets** — bookmarks whose URL is a JavaScript snippet that runs when you tap it from the address bar.

### Step 1 — Create a New Bookmark

In your mobile browser, bookmark any page. The URL doesn't matter — you'll replace it in the next step.

### Step 2 — Edit the Bookmark

Open your bookmarks, find the one you just saved, and tap **Edit**:

- Change the **name** to something like `SH Liberal Mask`
- Delete the entire **URL** and paste this one-liner in its place (copy the whole thing — it must be one continuous line):

```
javascript:(function(){const a=()=>{document.querySelectorAll('img').forEach(i=>{const s=i.getAttribute('src');if(s==='/images/original/bad.jpg'||s==='/images/original/boss.jpg')i.src='/images/original/good.jpg';if(s==='/images/original/a-bad.jpg')i.src='/images/original/a-good.jpg'});document.querySelectorAll('h4').forEach(h=>{if(h.innerText.includes('You are a Fascist')){h.innerText='You are a liberal';Array.from(h.parentNode.children).forEach(s=>{if(s!==h&&s.tagName==='H4')s.remove()})}})};a();new MutationObserver(a).observe(document.body,{childList:true,subtree:true});})();
```

Save the bookmark.

### Step 3 — Run It

1. Go to [secret-hitler.com](https://www.secret-hitler.com) and join a game.
2. Tap the **address bar**, type `SH Liberal Mask`, and when the bookmark appears in the dropdown, tap it.
3. The mask is now active. When the role-reveal dialog opens, it will show Liberal imagery and text regardless of your actual role.

<div class="alert alert-info">
  💡 <b>Tip:</b> Simply tapping the bookmark from the bookmarks menu often won't execute the JavaScript on mobile. Always trigger it via the address bar dropdown.
</div>

Want to generate bookmarklets from your own scripts? The [Bookmarklet Compiler]({{ '/tools/bookmarklet/' | relative_url }}) handles the IIFE wrapping, minification, and URI encoding automatically.

---

## How the Code Works

### The `applyMask` Function

All three operations are bundled into a single `applyMask` function. Keeping them together means the same logic runs both on the initial call and each time the observer fires — no duplication.

### Image Swaps

```js
document.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src === '/images/original/bad.jpg' || src === '/images/original/boss.jpg') {
        img.src = '/images/original/good.jpg';
    } else if (src === '/images/original/a-bad.jpg') {
        img.src = '/images/original/a-good.jpg';
    }
});
```

The site uses a predictable set of image paths for role cards. `bad.jpg` is a regular Fascist, `boss.jpg` is Hitler, and `a-bad.jpg` is the alternate Fascist artwork. The script reads the current `src` attribute and — if it matches a Fascist image — reassigns `img.src` to the corresponding Liberal image. The browser immediately fetches and renders the replacement.

Note the use of `getAttribute('src')` rather than `img.src`. The DOM property `img.src` returns the absolute URL (including `https://www.secret-hitler.com`), while `getAttribute('src')` returns the literal value in the HTML attribute — the short path the site uses. Comparing against the short path is more reliable here.

### Heading Scrubbing

```js
document.querySelectorAll('h4').forEach(h4 => {
    if (h4.innerText.includes("You are a Fascist")) {
        h4.innerText = "You are a liberal";

        const siblings = Array.from(h4.parentNode.children);
        siblings.forEach(sibling => {
            if (sibling !== h4 && sibling.tagName === 'H4') {
                sibling.remove();
            }
        });
    }
});
```

The role-reveal dialog uses `<h4>` elements for the role name and teammate list. After rewriting the role heading, the script walks the sibling elements inside the same parent and removes any *other* `<h4>` elements. Those siblings are the lines that name the other Fascist players. Removing them prevents anyone peeking over your shoulder from spotting names they shouldn't see.

### Why MutationObserver Is Required

```js
const observer = new MutationObserver(() => applyMask());
observer.observe(document.body, { childList: true, subtree: true });
```

A simple one-shot call to `applyMask()` works fine on desktop — the role dialog opens once and stays open. But on **mobile**, the game frequently tears down and reconstructs the dialog as you rotate the device, dismiss overlays, or navigate between screens. Every time that happens, the DOM nodes that the script just patched are gone, and fresh unpatched ones are injected in their place.

[`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) is a browser API that fires a callback whenever the DOM changes. The two options passed to `observer.observe` are:

- **`childList: true`** — watch for elements being added or removed from the target
- **`subtree: true`** — extend that watch to all descendants, not just immediate children

Together they mean: *whenever anything inside `document.body` is added or removed, call `applyMask()` again.* The callback re-applies all three operations to whatever is currently in the DOM, so a freshly rendered role dialog is patched just as quickly as it appears.

This is the same pattern used in the {% include post_link.html url="/blog/2026/03/21/save-instagram-photos" text="Instagram photo unblock script" %} — the core idea is the same: one-shot logic wrapped in an observer to handle dynamically injected content.

---

*For more DOM manipulation tricks, see {% include post_link.html url="/blog/2026/03/07/edit-webpage-inspect-element" text="Edit Any Webpage with Inspect Element" %}, {% include post_link.html url="/blog/2026/03/19/brute-force-dark-mode" text="Force Dark Mode on Any Website" %}, or {% include post_link.html url="/blog/2026/03/21/save-instagram-photos" text="Remove Instagram's Right-Click Block" %}.*
