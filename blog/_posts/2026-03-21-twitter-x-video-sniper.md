---
title: "Twitter/X Video Sniper: Download Any Video Directly from Your Browser"
tags: [twitter, hack, javascript, browser, devtools]
highlight: true
related:
  - /blog/2026/03/21/instagram-reel-sniper
  - /blog/2026/03/21/youtube-shorts-sniper
  - /blog/2026/03/07/edit-webpage-inspect-element
  - /blog/2016/11/05/chrome-dino-hack
---

*Twitter/X has never offered a native download button. This script captures any video playing in your browser — no extensions, no third-party sites required.*

---

Twitter/X hosts a huge volume of video content: news clips, memes, sports highlights, short-form commentary. The platform intentionally omits a download button, nudging you toward third-party downloader sites that require you to paste a URL, wait for a server-side conversion, and trust an unknown service with your browsing activity.

This script bypasses all of that. It runs entirely in your browser, uses the browser's own recording API to capture the video that's already playing on your screen, and saves it as a `.webm` file. Nothing leaves your machine.

---

## Using it on Desktop

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

The original [YouTube Shorts Sniper]({% post_url /blog/2026-03-21-youtube-shorts-sniper %}) introduced the Delta-Check to detect a loop restart — because Shorts loop by default and never fire `ended`. The [Instagram Reel Sniper]({% post_url /blog/2026-03-21-instagram-reel-sniper %}) used the simpler `video.onended`, because Reels play exactly once and then stop cleanly.

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

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Alert: "No visible video found" | No video is currently in the viewport | Scroll until the video is playing and visible on screen |
| Recording captures the wrong video | Another video is closer to the centre of the screen | Scroll so your intended video is as close to the vertical midpoint as possible |
| File downloads but is silent | Video was muted and `muted = false` didn't apply in time | Manually unmute the video on screen before running the script |
| Stutter or corruption at the start | CPU spike during seek + recorder initialization | The 600 ms delay usually handles this; if not, enable Hardware Acceleration in browser settings |
| Recording stops too early | `timeupdate` fired with a minor backward jump before the video played | Reload the page and try again; avoid scrubbing the video manually before running the script |
| Download doesn't start | Browser blocked the `<a>.click()` | Allow pop-ups / automatic downloads for x.com in browser settings |
| `captureStream` not available | Script was run from an `http://` page, or the browser doesn't support the API | Use Chrome or Edge on `https://x.com`; Firefox uses `mozCaptureStream()` which the script already falls back to, but some Firefox builds restrict it for cross-origin media |

---

> **Disclaimer:** This script is provided for **educational purposes only**. It demonstrates browser APIs (`getBoundingClientRect`, `captureStream`, `MediaRecorder`, `timeupdate`) that are freely documented and publicly available. Downloading content from Twitter/X may be against [X's Terms of Service](https://x.com/en/tos). Only use this on content you own, have explicit permission to download, or that is explicitly available for download. Respect copyright and the work of content creators.
