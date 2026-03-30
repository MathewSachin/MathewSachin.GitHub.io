---
title: "Instagram Download Buttons: A Userscript That Adds ⬇ to Every Post, Reel, and Story"
icon: "fab fa-instagram"
tags: [instagram, hack, javascript, browser, userscript, social-media]
highlight: true
related:
  - /blog/2026/03/22/instagram-story-sniper
  - /blog/2026/03/21/instagram-reel-sniper
  - /blog/2026/03/21/save-instagram-photos
  - /blog/2026/03/22/reddit-video-sniper
  - /blog/2026/03/21/youtube-shorts-sniper
  - /blog/2026/03/21/twitter-x-video-sniper
---

*The three earlier Instagram posts — {% include post_link.html url="/blog/2026/03/21/save-instagram-photos" text="photo saving" %}, {% include post_link.html url="/blog/2026/03/21/instagram-reel-sniper" text="reel downloading" %}, and {% include post_link.html url="/blog/2026/03/22/instagram-story-sniper" text="story downloading" %} — each require you to open the browser console, paste a snippet, and press Enter every single time you want to save something. This post bundles all three techniques into one persistent userscript that injects a **⬇ button** directly into the Instagram UI — no console, no paste, no repeat setup.*

---

## Bookmarklets vs. Userscripts

The previous posts use **bookmarklets**: a piece of JavaScript stored as a browser bookmark. You navigate to the page, tap the bookmark, and the script runs once. It is a great tool for occasional one-off tasks, but it has friction: you have to remember to trigger it, and it vanishes the moment the page navigates away.

A **userscript** is different. It is a JavaScript file managed by a browser extension called a *userscript manager*. You install the script once, and the manager automatically injects it into every matching page (here, every `instagram.com` URL) before the page's own scripts run. The script stays active across navigations, handles Instagram's infinite-scroll feed, and requires zero manual interaction. The ⬇ button is just there.

| | Bookmarklet | Userscript |
|---|---|---|
| **How it runs** | You trigger it manually each visit | Auto-injected on page load |
| **Persists across navigation** | ❌ Re-run per page | ✅ Survives SPA navigation |
| **Mobile support** | ⚠️ Must be set up as a bookmark and tapped each time | ✅ Works automatically with Firefox for Android, Kiwi Browser, or iOS Userscripts |
| **Setup** | One bookmark per script | One manager + one install |
| **Best for** | One-time tasks | Recurring enhancements |

---

## Choosing a Userscript Manager

A userscript manager is a browser extension that stores, manages, and injects your scripts. There are several options — the right one depends on your browser and platform.

### Desktop

| Manager | Chrome / Edge / Brave | Firefox | Safari (macOS) | Opera |
|---|---|---|---|---|
| **[Tampermonkey](https://www.tampermonkey.net/)** | ✅ | ✅ | ✅ (via App Store) | ✅ |
| **[Violentmonkey](https://violentmonkey.github.io/)** | ✅ | ✅ | ❌ | ✅ |
| **[Greasemonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/)** | ❌ | ✅ | ❌ | ❌ |

**Tampermonkey** is the most widely used, has the richest feature set (script sync, update checking, a polished dashboard), and is well-maintained. It is the safe default for most users.

**Violentmonkey** is fully open-source and has no telemetry. If you prefer to audit every line of the extension code, Violentmonkey is the better choice. Feature parity with Tampermonkey is high.

**Greasemonkey** is the original userscript manager — it pioneered the concept. It is Firefox-only and has fallen behind Tampermonkey and Violentmonkey in features, so it is recommended only if you already have it installed and are comfortable with it.

### Mobile

Mobile browsers traditionally block extensions entirely, which rules out userscript managers. However, a few options exist:

| Platform | Option | Notes |
|---|---|---|
| **Android** | **Firefox for Android** + Tampermonkey or Violentmonkey | Firefox on Android supports the full AMO extension catalogue, including both managers. Best mobile option on Android. |
| **Android** | **Kiwi Browser** + Tampermonkey | Kiwi is a Chromium-based browser that accepts Chrome extensions. Install Tampermonkey from the Chrome Web Store, then install the script normally. |
| **iOS / iPadOS** | **[Userscripts](https://apps.apple.com/app/userscripts/id1463298887)** + Safari | A free, open-source Safari extension from the App Store. Supports Greasemonkey-compatible `@match` / `@grant` headers. |
| **iOS / iPadOS** | **[Hyperweb](https://apps.apple.com/app/hyperweb/id1581824571)** + Safari | An alternative paid Safari extension manager with a polished UI. |

<div class="alert alert-info">
  💡 <b>Recommendation by platform:</b><br>
  Desktop Chrome/Edge/Brave/Opera → <b>Tampermonkey</b> or <b>Violentmonkey</b><br>
  Desktop Firefox → <b>Tampermonkey</b> or <b>Violentmonkey</b><br>
  Desktop Safari → <b>Tampermonkey</b> (App Store)<br>
  Android → <b>Firefox for Android + Tampermonkey</b><br>
  iOS / iPadOS → <b>Userscripts + Safari</b>
</div>

---

## Installing the Script in Tampermonkey

The steps are nearly identical for Violentmonkey and Userscripts — swap the extension name where appropriate.

### Step 1 — Install Tampermonkey

Go to the extension store for your browser and install [Tampermonkey](https://www.tampermonkey.net/). After installation a small icon (a circle with two overlapping dots) appears in your toolbar.

### Step 2 — Create a New Script

Click the Tampermonkey icon and choose **Create a new script…** (or **Dashboard → + New Script**). The script editor opens with a default template.

### Step 3 — Paste the Script

Delete the default template entirely and paste the full script below. Then click the **Save** button (or press `Ctrl + S` / `Cmd + S`).

### Step 4 — Open Instagram

Navigate to [instagram.com](https://instagram.com). Browse your feed, open a Reel, or visit someone's Story. The **⬇** button appears automatically in the top-right corner of each piece of media. Click it to download.

---

## The Script

```js
// ==UserScript==
// @name         Instagram Download Buttons
// @namespace    https://mathewsachin.github.io/
// @version      1.1
// @description  Adds ⬇ download buttons for photos, reels, and stories on Instagram
// @author       Mathew Sachin
// @match        https://www.instagram.com/*
// @grant        GM_xmlhttpRequest
// @connect      cdninstagram.com
// @connect      instagram.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /* Class added to every button we create — used to filter our own     */
    /* DOM insertions out of the MutationObserver, preventing a feedback  */
    /* loop that would hang scrolling.                                     */
    const BTN_CLASS = 'ig-dl-btn';

    const BTN_STYLE = [
        'background:rgba(0,0,0,0.6)',
        'border:none',
        'border-radius:6px',
        'color:white',
        'cursor:pointer',
        'font-size:18px',
        'line-height:1',
        'padding:6px 8px',
        'position:absolute',
        'z-index:9999',
    ].join(';');

    /* ── Direct download via GM_xmlhttpRequest ───────────────────────── */
    /* Fetches the CDN URL from the extension context (bypasses CORS),    */
    /* creates a same-origin blob URL, and triggers <a download> so the   */
    /* file saves directly instead of opening in a new tab.               */
    function downloadBlob(url, filename) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                responseType: 'blob',
                onload: r => {
                    const blobUrl = URL.createObjectURL(r.response);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
                    resolve();
                },
                onerror: reject,
            });
        });
    }

    /* ── Shared React Fiber scraper ─────────────────────────────────── */
    /* Walks up the DOM from startEl looking for __reactFiber$ props,    */
    /* then recursively crawls the fiber tree to find CDN URLs.          */
    function scrapeReactFiber(startEl) {
        const videoUrls = [], imageUrls = [];

        const collect = (obj, depth = 0) => {
            if (depth > 15 || !obj || typeof obj !== 'object' || obj instanceof HTMLElement) return;
            for (const key in obj) {
                const val = obj[key];
                if (typeof val === 'string' && val.startsWith('https://') && !val.includes('<?xml')) {
                    if (val.includes('.mp4'))
                        videoUrls.push({ url: val, area: (obj.width || 0) * (obj.height || 0) });
                    else if (val.includes('.jpg') || val.includes('.webp'))
                        imageUrls.push({ url: val, area: (obj.width || 0) * (obj.height || 0) });
                } else if (val && typeof val === 'object') {
                    collect(val, depth + 1);
                }
            }
        };

        let el = startEl;
        while (el && videoUrls.length === 0 && imageUrls.length === 0) {
            const fk = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
            if (fk) collect(el[fk]);
            el = el.parentElement;
        }

        const best = arr => arr.length ? arr.sort((a, b) => b.area - a.area)[0].url : null;
        return videoUrls.length > 0 ? best(videoUrls) : best(imageUrls);
    }

    /* ── MediaRecorder fallback for reels when CDN URL is not in Fiber ─ */
    function recordReel(videoEl) {
        return new Promise((resolve, reject) => {
            videoEl.muted = true;
            videoEl.pause();
            videoEl.currentTime = 0;

            setTimeout(() => {
                let stream;
                try { stream = videoEl.captureStream(); }
                catch (e) { return reject(new Error('captureStream not supported')); }

                const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
                    ? 'video/webm;codecs=vp9,opus'
                    : 'video/webm';
                const chunks = [];
                const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
                rec.ondataavailable = e => e.data.size > 0 && chunks.push(e.data);
                rec.onstop = () => resolve(URL.createObjectURL(new Blob(chunks, { type: mimeType })));
                videoEl.play();
                rec.start();
                videoEl.addEventListener('ended', () => rec.stop(), { once: true });
            }, 400);
        });
    }

    /* ── Button factory ──────────────────────────────────────────────── */
    function makeBtn(emoji, title, onClick) {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.title = title;
        btn.className = BTN_CLASS; // marks button so MutationObserver ignores it
        btn.style.cssText = BTN_STYLE;
        btn.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); onClick(btn); });
        return btn;
    }

    /* ── Guess file extension from a CDN URL ────────────────────────── */
    function extFromUrl(url) {
        const m = url.match(/\.(mp4|jpg|jpeg|webp|png)(\?|$)/i);
        return m ? m[1] : 'jpg';
    }

    /* ── CSS shield removal — restores right-click on all images ─────── */
    /* Instagram sets pointer-events:none on <img> elements and places    */
    /* invisible overlay divs on top. This reverses those overrides so    */
    /* right-click "Save image as…" works again.                          */
    function killShields() {
        document.querySelectorAll('img').forEach(img => {
            img.style.setProperty('pointer-events', 'auto', 'important');
            img.style.setProperty('user-select', 'auto', 'important');
            img.style.setProperty('z-index', '999', 'important');
            img.style.setProperty('position', 'relative', 'important');
        });
    }

    /* ══ PHOTO HANDLER — Feed posts and Profile grid ════════════════════ */
    function addPhotoButton(article) {
        if (article.dataset.igDl) return;
        article.dataset.igDl = '1';

        // Prefer <img srcset> (full-res post image); fall back to <img src> with size check
        const img = article.querySelector('img[srcset]')
            || Array.from(article.querySelectorAll('img[src]')).find(i => i.naturalWidth > 100);
        if (!img) return;

        const wrapper = img.parentElement;
        if (!wrapper) return;
        const pos = getComputedStyle(wrapper).position;
        if (!['relative', 'absolute', 'fixed', 'sticky'].includes(pos))
            wrapper.style.setProperty('position', 'relative', 'important');

        const btn = makeBtn('⬇', 'Download photo', async () => {
            btn.textContent = '⏳';
            try {
                let url = scrapeReactFiber(img);
                if (!url) {
                    const srcset = img.getAttribute('srcset') || '';
                    const candidates = srcset.split(',').map(s => s.trim().split(/\s+/)).filter(p => p.length);
                    url = candidates.length ? candidates[candidates.length - 1][0] : img.src;
                }
                await downloadBlob(url, `photo.${extFromUrl(url)}`);
                btn.textContent = '✅';
            } catch (err) {
                btn.textContent = '❌';
                console.error('[IG-DL] Photo download failed:', err);
            }
            setTimeout(() => { btn.textContent = '⬇'; }, 2000);
        });
        btn.style.top = '8px';
        btn.style.right = '8px';
        wrapper.appendChild(btn);
    }

    /* ══ REEL HANDLER — Reel player ══════════════════════════════════════ */
    function addReelButton(videoEl) {
        if (videoEl.dataset.igDl) return;
        videoEl.dataset.igDl = '1';

        const wrapper = videoEl.parentElement;
        if (!wrapper) return;
        const pos = getComputedStyle(wrapper).position;
        if (!['relative', 'absolute', 'fixed', 'sticky'].includes(pos))
            wrapper.style.setProperty('position', 'relative', 'important');

        const btn = makeBtn('⬇', 'Download reel', async () => {
            btn.textContent = '⏳';
            try {
                const url = scrapeReactFiber(videoEl);
                if (url) {
                    // Fiber gave us the CDN URL — download it directly
                    await downloadBlob(url, `reel.${extFromUrl(url)}`);
                } else {
                    // MediaRecorder path: play through and record frames
                    const blobUrl = await recordReel(videoEl);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = 'reel.webm';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
                }
                btn.textContent = '✅';
            } catch (err) {
                btn.textContent = '❌';
                console.error('[IG-DL] Reel download failed:', err);
            }
            setTimeout(() => { btn.textContent = '⬇'; }, 3000);
        });
        btn.style.top = '8px';
        btn.style.right = '8px';
        wrapper.appendChild(btn);
    }

    /* ══ STORY HANDLER — /stories/ URL ══════════════════════════════════ */
    function addStoryButton(mediaEl) {
        if (mediaEl.dataset.igDl) return;
        mediaEl.dataset.igDl = '1';

        const wrapper = mediaEl.parentElement;
        if (!wrapper) return;
        const pos = getComputedStyle(wrapper).position;
        if (!['relative', 'absolute', 'fixed', 'sticky'].includes(pos))
            wrapper.style.setProperty('position', 'relative', 'important');

        const btn = makeBtn('⬇', 'Download story', async () => {
            btn.textContent = '⏳';
            const url = scrapeReactFiber(mediaEl);
            if (url) {
                try {
                    await downloadBlob(url, `story.${extFromUrl(url)}`);
                    btn.textContent = '✅';
                } catch (err) {
                    btn.textContent = '❌';
                    console.error('[IG-DL] Story download failed:', err);
                }
            } else {
                btn.textContent = '❌';
                console.warn('[IG-DL] Story CDN URL not found in React Fiber');
            }
            setTimeout(() => { btn.textContent = '⬇'; }, 2000);
        });
        // Place above the story progress bar (~40 px tall) at the bottom of the story
        btn.style.bottom = '48px';
        btn.style.right = '12px';
        wrapper.appendChild(btn);
    }

    /* ══ PAGE SCANNER — Detect context and add the right buttons ════════ */
    function scan() {
        killShields(); // always re-apply CSS overrides for right-click support

        if (location.href.includes('/stories/')) {
            // Stories are pre-loaded horizontally; pick the one nearest the viewport centre
            const allMedia = Array.from(document.querySelectorAll('video, img'));
            const cx = window.innerWidth / 2;
            let best = null, minDist = Infinity;
            allMedia
                .sort((a, b) => (a.tagName === 'VIDEO' ? -1 : 1))
                .forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.width > 0 && r.left >= 0 && r.right <= window.innerWidth) {
                        const dist = Math.abs(cx - (r.left + r.width / 2));
                        if (dist < minDist) { minDist = dist; best = el; }
                    }
                });
            if (best) addStoryButton(best);
            return;
        }

        // Reel videos (tall, in-viewport)
        document.querySelectorAll('video').forEach(v => {
            if (v.getBoundingClientRect().height > 100) addReelButton(v);
        });

        // Photo posts inside <article> (no <video> child = photo post)
        document.querySelectorAll('article').forEach(article => {
            if (!article.querySelector('video')) addPhotoButton(article);
        });
    }

    /* ══ SPA NAVIGATION WATCHER ══════════════════════════════════════════ */
    /* Instagram is a React SPA: URLs change via pushState without a full   */
    /* page reload. We debounce DOM mutations + intercept history methods    */
    /* to re-run scan() after each navigation.                               */

    let scanTimer;

    /* Use requestIdleCallback when available so scan() runs during idle   */
    /* time and doesn't compete with scroll animation frames.              */
    const scheduleIdle = typeof requestIdleCallback === 'function'
        ? cb => requestIdleCallback(cb, { timeout: 1000 })
        : cb => setTimeout(cb, 600);

    const scheduleScan = () => {
        clearTimeout(scanTimer);
        scanTimer = scheduleIdle(scan);
    };

    /* Only react to mutations caused by Instagram's own code — not by    */
    /* our own button insertions (which carry BTN_CLASS). Without this     */
    /* filter, each appendChild(btn) would re-trigger the observer and     */
    /* reset the debounce timer, causing continuous work during scrolling. */
    new MutationObserver(mutations => {
        if (mutations.some(m =>
            Array.from(m.addedNodes).some(n => n.nodeType === 1 && !n.classList.contains(BTN_CLASS))
        )) scheduleScan();
    }).observe(document.body, { childList: true, subtree: true });

    const _push = history.pushState.bind(history);
    history.pushState = (...a) => { _push(...a); scheduleScan(); };
    const _replace = history.replaceState.bind(history);
    history.replaceState = (...a) => { _replace(...a); scheduleScan(); };
    window.addEventListener('popstate', scheduleScan);

    scan(); // initial run
})();
```

---

## How the Script Works

The script is structured in five layers. Each layer builds on techniques introduced in the individual Instagram posts; the userscript simply wires them all together.

### The `==UserScript==` Header

```js
// @match        https://www.instagram.com/*
// @grant        GM_xmlhttpRequest
// @connect      cdninstagram.com
// @connect      instagram.com
// @run-at       document-idle
```

The header is a structured comment that the userscript manager reads — not JavaScript. `@match` is a URL glob: the manager only injects the script when the current URL matches `https://www.instagram.com/*`. `@run-at document-idle` waits until the page's DOM is ready before injecting (equivalent to `DOMContentLoaded`).

`@grant GM_xmlhttpRequest` opts into the special `GM_xmlhttpRequest` API, which lets the script make HTTP requests from the extension's background context — bypassing the same-origin restrictions that the page itself faces. This is required for direct downloads (see below). `@connect` declares which domains `GM_xmlhttpRequest` is allowed to contact; Tampermonkey matches subdomains, so `cdninstagram.com` covers `scontent-lga3-1.cdninstagram.com` and all other Instagram CDN hostnames.

### Direct Download via `GM_xmlhttpRequest`

```js
function downloadBlob(url, filename) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            responseType: 'blob',
            onload: r => {
                const blobUrl = URL.createObjectURL(r.response);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                // ...
            },
        });
    });
}
```

The `<a download>` attribute is the standard way to trigger a browser download rather than opening a URL. However, **browsers ignore `download` on cross-origin URLs** — if the link points to a different domain (such as Instagram's CDN), the attribute is silently dropped and the URL opens in a new tab instead.

`GM_xmlhttpRequest` sidesteps this. Because the request runs from the extension context rather than the page context, it is not subject to the same-origin policy. The CDN response arrives as a `Blob`; `URL.createObjectURL` converts it to a same-origin `blob:` URL, and `<a download>` works correctly on same-origin URLs. The blob URL is revoked after 60 seconds to free memory.

### CSS Shield Removal — Restoring Right-Click

```js
function killShields() {
    document.querySelectorAll('img').forEach(img => {
        img.style.setProperty('pointer-events', 'auto', 'important');
        img.style.setProperty('user-select', 'auto', 'important');
        img.style.setProperty('z-index', '999', 'important');
        img.style.setProperty('position', 'relative', 'important');
    });
}
```

Instagram sets `pointer-events: none` on `<img>` elements and places invisible overlay `<div>`s on top to intercept right-clicks. `killShields` reverses those overrides with `!important` so the browser's native context menu ("Save image as…") is restored. The function runs at the start of every `scan()` call, which means it re-applies as new posts load during infinite-scroll — the same persistent approach as the {% include post_link.html url="/blog/2026/03/21/save-instagram-photos" text="Save Instagram Photos" %} post.

### The React Fiber Scraper

```js
const fk = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
if (fk) collect(el[fk]);
```

Every DOM element rendered by React has a hidden property whose name starts with `__reactFiber$` or `__reactProps$` (followed by a random suffix that changes with each React build). This property holds the component's internal state — including the CDN URLs Instagram retrieved from its servers. The scraper walks up the DOM from the target element, finds these hidden properties, and recursively crawls their object trees looking for `.mp4`, `.jpg`, or `.webp` URLs. This approach is shared by both the photo handler and the story handler; it comes directly from the {% include post_link.html url="/blog/2026/03/22/instagram-story-sniper" text="Story Sniper" %}.

When multiple resolutions are present (Instagram often includes several), the scraper ranks them by `width × height` and returns the largest.

### The MediaRecorder Fallback

```js
const blobUrl = await recordReel(videoEl);
```

The Fiber scraper does not always find a CDN URL for Reels — Instagram sometimes serves the video in encrypted segments or keeps the URL deeper in the fiber tree than the scraper can reach. In that case the Reel handler falls back to the approach from the {% include post_link.html url="/blog/2026/03/21/instagram-reel-sniper" text="Reel Sniper" %}: it calls `videoEl.captureStream()` and records the decoded frames with `MediaRecorder` (VP9 + Opus, 5 Mbps) as the video plays from the beginning. The result is a `.webm` file rather than the original `.mp4`, but it captures whatever the browser is actually displaying.

### The Story Axis Fix

```js
const dist = Math.abs(cx - (r.left + r.width / 2));
if (r.left >= 0 && r.right <= window.innerWidth)
```

Stories pre-load the previous and next stories **horizontally** — they sit off-screen to the left and right, outside the horizontal viewport bounds. The story handler measures horizontal distance to the viewport centre and only considers elements fully within the horizontal bounds, exactly as the {% include post_link.html url="/blog/2026/03/22/instagram-story-sniper" text="Story Sniper" %} does. This prevents the button from being attached to a pre-loaded off-screen story instead of the one you are actually viewing.

### The SPA Navigation Watcher

```js
new MutationObserver(mutations => {
    if (mutations.some(m =>
        Array.from(m.addedNodes).some(n => n.nodeType === 1 && !n.classList.contains(BTN_CLASS))
    )) scheduleScan();
}).observe(document.body, { childList: true, subtree: true });

history.pushState = (...a) => { _push(...a); scheduleScan(); };
history.replaceState = (...a) => { _replace(...a); scheduleScan(); };
window.addEventListener('popstate', scheduleScan);
```

Instagram never does a full page reload — it is a React single-page application. Every navigation (clicking a post, opening a Reel, tapping a Story) changes the URL via `history.pushState` and then swaps in new DOM nodes. A userscript that only ran `scan()` at page load would inject buttons on the first page, then miss everything after the first navigation.

The watcher uses two complementary strategies:

1. **`MutationObserver`** — fires whenever new DOM nodes are added anywhere under `<body>`. This catches Instagram's lazy-loading of feed posts as you scroll, and also catches the DOM swap that happens on navigation.
2. **`pushState` / `replaceState` intercepts** — wrap the native history API methods so that `scheduleScan()` is called whenever Instagram programmatically navigates. This is more reliable than `MutationObserver` alone for catching navigation that starts with a URL change before new DOM has been inserted.

**The `BTN_CLASS` scroll-hang fix.** Every `wrapper.appendChild(btn)` call would previously re-trigger the observer (it is a child insertion, which is exactly what `childList: true` watches for). This reset the debounce timer continuously during the initial scan, and every new button added during infinite-scroll caused yet another scan to be scheduled. The result was near-constant work that competed with Instagram's scroll animation. The fix is to give every button we create a CSS class (`ig-dl-btn`) and then check, in the observer callback, that at least one of the added nodes does *not* carry that class — meaning it was added by Instagram, not by us — before scheduling a scan. Since the guard checks `nodeType === 1` first (ensuring an element node), `classList` is guaranteed to exist and can be accessed without a null check.

**`requestIdleCallback`.** `scheduleScan` switches from `setTimeout(scan, 600)` to `requestIdleCallback(scan, { timeout: 1000 })` when the browser supports it. `requestIdleCallback` defers execution to periods when the main thread is not busy — specifically, not during scroll frames. This prevents `scan()` from running at a moment when it would force a layout (from the `getBoundingClientRect()` calls inside) mid-scroll. The 1-second timeout ensures the callback is never delayed indefinitely.

### The `data-igDl` Guard

```js
if (article.dataset.igDl) return;
article.dataset.igDl = '1';
```

Every handler checks for a `data-ig-dl` attribute on the element before doing anything. Once a button has been attached, the attribute is set. The next time `scan()` runs — after a DOM mutation or navigation — the guard prevents a second button from being added to the same element.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No ⬇ button appears anywhere | Script is not active | Open the Tampermonkey dashboard and confirm the script is enabled and the `@match` line is correct |
| Button appears but clicking shows ❌ | React Fiber tree did not contain a URL (and `captureStream` failed for reels) | Instagram may have updated their internal structure; try the individual console scripts from the linked posts |
| Right-click still blocked on images | `killShields` has not run yet | Scroll slightly — any new post load triggers `scan()` which re-runs `killShields()` |
| Button appears in the wrong spot | The wrapper element's position style changed | The `wrapper.style.position = 'relative'` override may conflict with Instagram's own layout — adjust the button's `top` / `right` values in the script |
| Tampermonkey shows a domain-not-allowed error | `@connect` list doesn't cover the CDN hostname | Add `@connect *` to the header as a temporary catch-all while you identify the exact CDN domain from DevTools |
| Reel button shows ⏳ for a long time | MediaRecorder path: the full reel must play through before the file is ready | Let the video finish playing — duration depends on reel length |
| Script breaks after an Instagram update | Instagram periodically changes their React component structure | Check for an updated version of this script; the Fiber key prefix (`__reactFiber$`) is stable but the object layout inside can shift |

---

*For the individual console-based versions of each technique, see {% include post_link.html url="/blog/2026/03/21/save-instagram-photos" text="Save Instagram Photos" %}, {% include post_link.html url="/blog/2026/03/21/instagram-reel-sniper" text="Instagram Reel Sniper" %}, and {% include post_link.html url="/blog/2026/03/22/instagram-story-sniper" text="Instagram Story Sniper" %}. You can also {% include post_link.html url="/blog/2026/03/22/reddit-video-sniper" text="download Reddit videos" %} and {% include post_link.html url="/blog/2026/03/21/youtube-shorts-sniper" text="download YouTube Shorts" %} with the same browser-only approach.*

---

> **Disclaimer:** This script is provided for **educational purposes only**. It demonstrates publicly documented browser APIs (`MutationObserver`, `history.pushState`, `captureStream`, `MediaRecorder`) and React internals that are observable in any browser's DevTools. Downloading content from Instagram may be against [Instagram's Terms of Service](https://help.instagram.com/581066165581870). Only download content you own, have explicit permission to save, or that is explicitly made available for download. Respect copyright and the work of content creators.
