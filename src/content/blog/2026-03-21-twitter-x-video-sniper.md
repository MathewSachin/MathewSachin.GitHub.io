---
title: "Twitter/X Video Sniper: Download Any Video Directly from Your Browser"
icon: "fab fa-twitter"
accent_color: "#1D9BF0"
tags: [twitter, hack, javascript, browser, devtools]
series: browser-hacks
related:
  - /blog/2026/03/22/reddit-video-sniper
  - /blog/2026/03/21/instagram-reel-sniper
  - /blog/2026/03/21/youtube-shorts-sniper
  - /blog/2026/03/21/save-instagram-photos
  - /blog/2026/03/07/edit-webpage-inspect-element
  - /blog/2016/11/05/chrome-dino-hack
---

*Twitter/X has never offered a native download button. This script captures any video playing in your browser — no extensions, no third-party sites required.*

---

Twitter/X hosts a huge volume of video content: news clips, memes, sports highlights, short-form commentary. The platform intentionally omits a download button, nudging you toward third-party downloader sites that require you to paste a URL, wait for a server-side conversion, and trust an unknown service with your browsing activity.

Two scripts cover this, and together they handle every situation:

- **Method 1 — Delta-Sync Recorder:** uses the browser's recording API to re-encode the video as it plays, saving it as a `.webm` file. Reliable, but you wait through the full video duration.
- **Method 2 — High-Res Scraper:** reaches into Twitter/X's internal React data structures, extracts the original `.mp4` URL that was already fetched, and opens it directly. Near-instant, and preserves the original upload quality — but depends on the platform's internals being accessible.

Both scripts run entirely in your browser. Nothing leaves your machine.

---

## Using it on Desktop

*This is Method 1 — the Delta-Sync Recorder.* If it completes successfully, skip to the end. If the video is very long or you want the original upload quality, try [Method 2](#method-2-the-instant-high-res-scraper) instead.

### Step 1 — Open Twitter/X and find your video

Go to [x.com](https://x.com) and scroll to the video you want to save. Make sure it is **playing and visible in the center of the screen** — the script targets the video closest to the vertical midpoint of the viewport.

### Step 2 — Open the Browser Console

**Windows / Linux:** Press `F12` or `Ctrl + Shift + I`, then click the **Console** tab.  
Direct shortcut: `Ctrl + Shift + J` (Chrome) jumps straight to the Console.

**Mac:** Press `Cmd + Option + I`, then click the **Console** tab.  
Direct shortcut: `Cmd + Option + J` (Chrome) jumps straight to the Console.

<div class="alert alert-info">
  ⚠️ <b>Console warning:</b> Some browsers display a warning like "Don't paste code here unless you trust it." That warning exists to protect users from social-engineering attacks. You're pasting your own code that you can read and verify — proceed.
</div>

### Step 3 — Paste and Run the Script

Paste the following code into the console and press **Enter**:

```js
(function() {
    /* 1. Spatial Targeting: Find the video closest to the center of the viewport */
    const allVideos = document.querySelectorAll('video');
    let targetVideo = null;
    let minDistance = Infinity;
    const centerY = window.innerHeight / 2;

    allVideos.forEach(v => {
        const rect = v.getBoundingClientRect();
        const videoCenter = rect.top + (rect.height / 2);
        const distance = Math.abs(centerY - videoCenter);

        /* Only consider videos that are actually visible */
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            if (distance < minDistance) {
                minDistance = distance;
                targetVideo = v;
            }
        }
    });

    if (!targetVideo) return alert("No visible video found in the center of the screen!");

    /* 2. Housekeeping: Pause everyone else so audio doesn't bleed */
    allVideos.forEach(v => { if(v !== targetVideo) v.pause(); });

    /* 3. Standard Delta-Sync Logic on the Target */
    targetVideo.pause();
    targetVideo.currentTime = 0;
    targetVideo.muted = false;
    
    let previousTime = 0;
    let isFinished = false;

    const startCapture = () => {
        const stream = targetVideo.captureStream ? targetVideo.captureStream() : targetVideo.mozCaptureStream();
        const recorder = new MediaRecorder(stream, { 
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond : 8000000 
        });
        
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `X_Targeted_Capture_${Date.now()}.webm`;
            a.click();
            targetVideo.pause();
        };

        const trackProgress = () => {
            if ((targetVideo.currentTime < previousTime || targetVideo.ended) && !isFinished && previousTime > 0) {
                isFinished = true;
                recorder.stop();
                targetVideo.removeEventListener('timeupdate', trackProgress);
            }
            previousTime = targetVideo.currentTime;
        };

        targetVideo.addEventListener('timeupdate', trackProgress);
        recorder.start();
        targetVideo.play();
        console.log("Sniper: Locked on center video.");
    };

    targetVideo.addEventListener('seeked', () => {
        setTimeout(startCapture, 600);
    }, { once: true });
})();
```

The video will rewind to the start, play through once, and your browser will automatically download the file as `X_Targeted_Capture_<timestamp>.webm`.

---

## How the Code Works

### 1. Spatial Targeting

Twitter/X is a scrollable feed — at any given moment the DOM contains many `<video>` elements: the one you're watching, ads above and below, pre-loaded posts, and embedded media inside quoted tweets. Simply grabbing `document.querySelector('video')` would hit whichever element the DOM happened to encounter first, not necessarily the one you care about.

The script solves this with a geometric approach:

```js
const centerY = window.innerHeight / 2;

allVideos.forEach(v => {
    const rect = v.getBoundingClientRect();
    const videoCenter = rect.top + (rect.height / 2);
    const distance = Math.abs(centerY - videoCenter);

    if (rect.top < window.innerHeight && rect.bottom > 0) {
        if (distance < minDistance) {
            minDistance = distance;
            targetVideo = v;
        }
    }
});
```

`getBoundingClientRect()` returns the pixel position of each element relative to the current viewport. For each visible video, the script computes the distance between the video's center and the vertical midpoint of the screen. The video with the shortest distance wins. The visibility check (`rect.top < window.innerHeight && rect.bottom > 0`) filters out pre-loaded videos that are entirely above or below the current viewport.

This is more robust than a strict "fully on screen" check — it works even if a tall video overflows the viewport slightly, as long as its center is closer to the middle of the screen than any competitor.

### 2. Audio Housekeeping

Before capturing, the script pauses every other video on the page:

```js
allVideos.forEach(v => { if(v !== targetVideo) v.pause(); });
```

Without this, audio from pre-loaded posts could bleed into the recording. It also explicitly unmutes the target (`targetVideo.muted = false`) because Twitter/X videos autoplay muted by default, and a silent recording is rarely what you want.

### 3. The Seek + 600 ms Delay

```js
targetVideo.addEventListener('seeked', () => {
    setTimeout(startCapture, 600);
}, { once: true });
```

Setting `currentTime = 0` triggers a seek operation. The script waits for the `seeked` event — confirmation that the seek completed — and then waits an additional 600 ms before starting the recorder. This stabilization window gives Twitter/X's player time to re-buffer and normalize the stream after the seek. Starting too early can produce corrupted frames or a stutter at the head of the recorded file.

The 600 ms window is deliberately longer than the 500 ms used for YouTube Shorts and the 400 ms used for Instagram, because Twitter's video player infrastructure is heavier and more unpredictable in seek recovery time.

### 4. The Hybrid Delta-Sync Stop Condition

The original {% include post_link.html url="/blog/2026/03/21/youtube-shorts-sniper" text="YouTube Shorts Sniper" %} introduced the Delta-Check to detect a loop restart — because Shorts loop by default and never fire `ended`. The {% include post_link.html url="/blog/2026/03/21/instagram-reel-sniper" text="Instagram Reel Sniper" %} used the simpler `video.onended`, because Reels play exactly once and then stop cleanly.

Twitter/X videos are unpredictable. Some loop, some don't. The script handles both with a single combined condition:

```js
const trackProgress = () => {
    if ((targetVideo.currentTime < previousTime || targetVideo.ended) && !isFinished && previousTime > 0) {
        isFinished = true;
        recorder.stop();
        targetVideo.removeEventListener('timeupdate', trackProgress);
    }
    previousTime = targetVideo.currentTime;
};
```

- **`currentTime < previousTime`** — catches a loop restart: the timestamp went backwards, meaning the video wrapped around.
- **`targetVideo.ended`** — catches a clean stop: the video played to the end and stopped, as a non-looping clip would.

Either condition fires the recorder stop. The `isFinished` flag ensures the recorder is stopped exactly once regardless of which branch triggers first and how many more `timeupdate` events fire afterward.

---

## How it Compares to Instagram Reels and YouTube Shorts

The three scripts share the same core pipeline — `captureStream` → `MediaRecorder` → VP9 + Opus → Blob download — but each platform required a different strategy for two key problems: *finding the right video* and *knowing when to stop*.

| | Twitter/X Sniper | YouTube Shorts Sniper | Instagram Reel Sniper |
|---|---|---|---|
| **Finding the video** | Spatial targeting: video with center closest to viewport midpoint | `ytd-reel-video-renderer[is-active] video` — semantic attribute | `getBoundingClientRect()` loop — must be fully within viewport |
| **Stop condition** | Hybrid: `currentTime < previousTime` **OR** `video.ended` | Delta-Check only: `currentTime < previousTime` | `video.onended` — fires once when the Reel ends |
| **Why different** | X videos may loop or play once — both cases must be handled | Shorts always loop; `ended` never fires | Reels play once and always fire `ended` cleanly |
| **Bitrate** | 8 Mbps | 5 Mbps | 5 Mbps |
| **Seek stabilization delay** | 600 ms | 500 ms | 400 ms |
| **Mute handling** | Explicit `muted = false` | Not required | Explicit `muted = false` |
| **Multi-video cleanup** | Pauses all other videos | Not needed — `is-active` isolates the target | Pauses all other videos |
| **Mobile bookmarklet** | Not provided | Not provided | Provided |
| **Output filename** | `X_Targeted_Capture_<timestamp>.webm` | `YT_Short_Delta_Safe_<timestamp>.webm` | `IG_Targeted_Capture_<timestamp>.webm` |

The clearest illustration of the platform differences is in the targeting strategy. YouTube's engineers gave their Shorts player an explicit `is-active` attribute — there's a clean semantic hook. Instagram lacks that, so the Instagram script has to check pixel coordinates and insist the video is entirely on screen. Twitter/X is messier still: the feed has many video types coexisting (inline clips, quote-tweet embeds, ads), with no unique attribute to latch onto, so the script uses a geometric centre-of-screen heuristic that works regardless of what else is in the DOM.

---

## Method 2: The Instant High-Res Scraper

The Delta-Sync Recorder in Method 1 is reliable but slow: you wait through the entire video in real-time while `MediaRecorder` captures it frame-by-frame. For a 2-minute clip, that's 2 minutes of waiting before the download appears.

This script takes a completely different route. Instead of recording what the browser renders, it reaches directly into Twitter/X's internal data structures — specifically the React component tree attached to the video's DOM node — and extracts the original `.mp4` URL that the platform already fetched. The download starts in seconds, and the file is the original upload quality, not a re-encoded recording.

### The Script

Paste the following code into the console and press **Enter**:

```js
(function() {
    /* 1. Spatial Targeting (Find the center video) */
    const allVideos = document.querySelectorAll('video');
    let targetVideo = null;
    let minDistance = Infinity;
    const centerY = window.innerHeight / 2;

    allVideos.forEach(v => {
        const rect = v.getBoundingClientRect();
        const distance = Math.abs(centerY - (rect.top + rect.height / 2));
        if (rect.top < window.innerHeight && rect.bottom > 0 && distance < minDistance) {
            minDistance = distance;
            targetVideo = v;
        }
    });

    if (!targetVideo) return alert("No video found in center!");

    /* 2. Advanced High-Res Scraper */
    const urls = [];
    const collectUrls = (obj, depth = 0) => {
        if (depth > 12 || !obj || typeof obj !== 'object' || obj instanceof HTMLElement) return;
        
        for (let key in obj) {
            const val = obj[key];
            if (typeof val === 'string' && val.includes('.mp4')) {
                urls.push(val);
            } else if (val && typeof val === 'object') {
                collectUrls(val, depth + 1);
            }
        }
    };

    /* 3. Execute and Rank Results */
    let current = targetVideo;
    while (current && urls.length === 0) {
        const keys = Object.keys(current);
        const fiberKey = keys.find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
        if (fiberKey) {
            collectUrls(current[fiberKey]);
        }
        current = current.parentElement;
    }

    if (urls.length > 0) {
        /* X-specific sorting: Higher resolution strings usually have higher bitrates */
        /* We look for the URL with the largest width/height dimensions in the string */
        const highResUrl = urls.sort((a, b) => {
            const getRes = (str) => {
                const match = str.match(/\/(\d+)x(\d+)\//);
                return match ? parseInt(match[1]) * parseInt(match[2]) : 0;
            };
            return getRes(b) - getRes(a);
        })[0];

        console.log("High-Res Selected:", highResUrl);
        window.open(highResUrl, '_blank');
    } else {
        alert("Metadata blocked. Use the 'Delta-Sync' recorder script for this one.");
    }
})();
```

A new tab opens with the highest-resolution version of the video. Right-click → **Save Video As** to save it, or the browser may prompt a download directly depending on how X serves the URL.

---

## How Method 2 Works

### 1. Spatial Targeting

Identical to Method 1 — the same geometric centre-of-viewport heuristic selects the target `<video>` element. See the [explanation above](#1-spatial-targeting) for the full breakdown.

### 2. React Fiber Traversal

React, the JavaScript framework X uses to build its UI, attaches internal metadata to every DOM element it manages. This metadata is stored directly on the DOM node as properties with names like `__reactFiber$abc123` or `__reactProps$abc123` (the `$`-suffix is a random hash that changes between page loads but the prefix is stable). These properties hold the component's props, state, and the rendered subtree — including any video URLs passed down to the player component.

The script finds this entry point by scanning the node's own property keys:

```js
const fiberKey = keys.find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
```

It then recursively walks the object, collecting any string value that contains `.mp4`:

```js
const collectUrls = (obj, depth = 0) => {
    if (depth > 12 || !obj || typeof obj !== 'object' || obj instanceof HTMLElement) return;
    
    for (let key in obj) {
        const val = obj[key];
        if (typeof val === 'string' && val.includes('.mp4')) {
            urls.push(val);
        } else if (val && typeof val === 'object') {
            collectUrls(val, depth + 1);
        }
    }
};
```

Three guard conditions prevent the traversal from spiralling out of control:

- **`depth > 12`** — the fiber tree can be very deep, but video URLs sit within a dozen levels of the attachment point. Capping at 12 avoids performance-killing deep recursion.
- **`!obj`** — null/undefined guard.
- **`obj instanceof HTMLElement`** — fiber objects contain back-references to DOM nodes, which themselves have fiber properties. Without this check the traversal would loop forever between the DOM and the React tree.

### 3. DOM Ancestry Walk

React components are often structured so that video URLs live on a wrapper container rather than the `<video>` element itself — the player component, the tweet component, or the media container one or two levels up. If the first probe finds nothing, the script walks up the DOM tree until URLs appear or the top is reached:

```js
let current = targetVideo;
while (current && urls.length === 0) {
    const keys = Object.keys(current);
    const fiberKey = keys.find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
    if (fiberKey) {
        collectUrls(current[fiberKey]);
    }
    current = current.parentElement;
}
```

### 4. Resolution Ranking

Twitter/X typically provides the same video at multiple resolutions. The URLs embed the resolution in their path — something like `/ext_tw_video/.../480x270/` or `/ext_tw_video/.../1280x720/`. The script extracts the width and height with a regex and multiplies them to get a total pixel count, then sorts descending:

```js
const getRes = (str) => {
    const match = str.match(/\/(\d+)x(\d+)\//);
    return match ? parseInt(match[1]) * parseInt(match[2]) : 0;
};
```

The URL with the highest pixel count — the best available resolution — wins.

### 5. Opening the Result

```js
window.open(highResUrl, '_blank');
```

Rather than constructing a `Blob` and faking a click on an `<a>` element, the script opens the MP4 URL directly in a new tab. There is nothing to re-encode; the browser streams the original file straight from X's CDN.

---

## Method 1 vs Method 2

| | Method 1 — Delta-Sync Recorder | Method 2 — High-Res Scraper |
|---|---|---|
| **Mechanism** | Re-records rendered frames with `captureStream` + `MediaRecorder` | Extracts the original MP4 URL from React fiber metadata |
| **Speed** | Real-time — you wait through the full video duration | Near-instant — URL extracted and opened in seconds |
| **Output quality** | Re-encoded VP9/Opus at 8 Mbps — bounded by render resolution | Original upload quality — exactly what X stored |
| **Output format** | `.webm` | `.mp4` |
| **Reliability** | Works on any video the browser can render | Depends on React fiber properties being accessible |
| **Failure mode** | Rarely fails; always produces a usable file if the video plays | Alerts "Metadata blocked" and tells you to use Method 1 |
| **Best for** | Long videos, obfuscated metadata, or when Method 2 fails | Most standard posts — faster and higher quality when it works |

<div class="alert alert-info">
  💡 <b>Recommended workflow:</b> Try Method 2 first. If it alerts "Metadata blocked", fall back to Method 1. You get the best quality when Method 2 succeeds, and a reliable fallback when it doesn't.
</div>

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Alert: "No visible video found" | No video is currently in the viewport | Scroll until the video is playing and visible on screen |
| Recording captures the wrong video (Method 1) | Another video is closer to the centre of the screen | Scroll so your intended video is as close to the vertical midpoint as possible |
| File downloads but is silent (Method 1) | Video was muted and `muted = false` didn't apply in time | Manually unmute the video on screen before running the script |
| Stutter or corruption at the start (Method 1) | CPU spike during seek + recorder initialization | The 600 ms delay usually handles this; if not, enable Hardware Acceleration in browser settings |
| Recording stops too early (Method 1) | `timeupdate` fired with a minor backward jump before the video played | Reload the page and try again; avoid scrubbing the video manually before running the script |
| Download doesn't start (Method 1) | Browser blocked the `<a>.click()` | Allow pop-ups / automatic downloads for x.com in browser settings |
| `captureStream` not available (Method 1) | Script was run from an `http://` page, or the browser doesn't support the API | Use Chrome or Edge on `https://x.com`; Firefox uses `mozCaptureStream()` which the script already falls back to, but some Firefox builds restrict it for cross-origin media |
| Alert: "Metadata blocked" (Method 2) | React fiber properties are inaccessible on this video | Use Method 1 instead |
| New tab opens but the video won't save (Method 2) | Browser blocked the popup | Allow popups for x.com in browser settings, or copy the URL from the console log and paste it into a new tab manually |
| New tab shows a lower resolution than expected (Method 2) | Resolution regex didn't match the URL format for this video | Open the browser console — all collected URLs are logged; copy a higher-res one manually |

*Using the same browser-only approach, you can also {% include post_link.html url="/blog/2026/03/22/reddit-video-sniper" text="download Reddit videos" %}, {% include post_link.html url="/blog/2026/03/21/instagram-reel-sniper" text="download Instagram Reels" %}, {% include post_link.html url="/blog/2026/03/21/youtube-shorts-sniper" text="download YouTube Shorts" %}, and {% include post_link.html url="/blog/2026/03/21/save-instagram-photos" text="save Instagram photos" %}.*

---

> **Disclaimer:** Both scripts are provided for **educational purposes only**. They demonstrate browser APIs (`getBoundingClientRect`, `captureStream`, `MediaRecorder`, `timeupdate`) and React's internal fiber metadata — all freely observable in the browser. Downloading content from Twitter/X may be against [X's Terms of Service](https://x.com/en/tos). Only use these on content you own, have explicit permission to download, or that is explicitly available for download. Respect copyright and the work of content creators.
