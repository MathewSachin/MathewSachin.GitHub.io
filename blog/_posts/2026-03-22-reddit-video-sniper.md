---
title: "Reddit Video Sniper: Download Any Reddit Video Directly from Your Browser"
icon: "fab fa-reddit"
accent_color: "#FF4500"
tags: [reddit, hack, javascript, browser, devtools]
series: browser-hacks
related:
  - /blog/2026/03/21/twitter-x-video-sniper
  - /blog/2026/03/21/youtube-shorts-sniper
  - /blog/2026/03/21/instagram-reel-sniper
  - /blog/2026/03/22/instagram-story-sniper
  - /blog/2026/03/07/edit-webpage-inspect-element
---

*Reddit has no download button for native videos. This script exploits Reddit's own public JSON API to pull the direct MP4 link — no re-encoding, no waiting, no third-party services required.*

---

Reddit hosts native video through its own CDN, `v.redd.it`. Every video you watch on reddit.com is served from this infrastructure, and Reddit never exposes a "Save Video" button. The workaround people normally reach for — third-party downloader sites — requires you to paste a URL, wait for a server-side process, and hand over your browsing context to an unknown service.

This script takes a different path entirely. Reddit has a documented (and very much intentional) backdoor built into every post URL: append `.json` to any post address and you get the full post metadata as a machine-readable JSON response. That metadata includes the raw CDN link for the video. The script fetches it, extracts the URL, and triggers a direct download — all in one step from the browser console.

---

## Using it on Desktop

### Step 1 — Navigate to the Reddit post

Open the specific Reddit post that contains the video you want to save. The URL should look like:

```
https://www.reddit.com/r/subredditname/comments/abc123/post_title/
```

The script requires you to be on an individual post page — not the subreddit feed.

### Step 2 — Open the Browser Console

**Windows / Linux:** Press `F12` or `Ctrl + Shift + I`, then click the **Console** tab.  
Direct shortcut: `Ctrl + Shift + J` (Chrome) jumps straight to the Console.

**Mac:** Press `Cmd + Option + I`, then click the **Console** tab.  
Direct shortcut: `Cmd + Option + J` (Chrome) jumps straight to the Console.

<div class="alert alert-info">
  ⚠️ <b>Console warning:</b> Some browsers display a warning like "Don't paste code here unless you trust it." That warning exists to protect users from social-engineering attacks. You're pasting code you can read and verify — proceed.
</div>

### Step 3 — Paste and Run the Script

Paste the following code into the console and press **Enter**:

```js
javascript:(async function() {
    console.log("🚀 Initializing Reddit JSON Sniper...");

    /* 1. Sanitize the Current URL */
    let url = window.location.href.split('?')[0].split('#')[0];
    if (!url.includes('reddit.com/r/')) {
        return alert("Please run this on a specific Reddit post page!");
    }
    if (url.endsWith('/')) url = url.slice(0, -1);

    try {
        /* 2. The Backdoor: Fetch the raw JSON representation */
        console.log(`Fetching: ${url}.json`);
        const response = await fetch(url + '.json');
        const json = await response.json();

        /* 3. Traverse the JSON Tree */
        // Reddit's JSON returns an array. [0] is the post, [1] are the comments.
        const post = json[0].data.children[0].data;

        /* Check if it's a native v.redd.it video */
        if (!post.secure_media || !post.secure_media.reddit_video) {
            return alert("No native Reddit video found. It might be a YouTube link or an image.");
        }

        /* 4. Extract the Target */
        let fallbackUrl = post.secure_media.reddit_video.fallback_url;
        
        // Clean up any trailing query parameters Reddit adds for tracking
        fallbackUrl = fallbackUrl.split('?')[0];

        console.log("✅ Fallback URL Extracted:", fallbackUrl);

        /* 5. Trigger the Download Bypass */
        const a = document.createElement('a');
        a.href = fallbackUrl;
        a.target = '_blank';
        a.download = `Reddit_Post_${post.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

    } catch (err) {
        console.error("Sniper Error:", err);
        alert("Fetch failed. See console for details.");
    }
})();
```

Your browser will open a new tab or trigger a download prompt for the `.mp4` file directly from Reddit's CDN.

---

## How the Code Works

This script takes a fundamentally different approach from the {% include post_link.html url="/blog/2026/03/21/instagram-reel-sniper" text="Instagram Reel Sniper" %} or {% include post_link.html url="/blog/2026/03/21/youtube-shorts-sniper" text="YouTube Shorts Sniper" %}, which use `captureStream` and `MediaRecorder` to re-record the video as it plays. The Reddit approach is a **direct URL extraction** — no re-encoding, just retrieving the link that Reddit already knows about.

### Step 1: Sanitizing the URL

```js
let url = window.location.href.split('?')[0].split('#')[0];
if (!url.includes('reddit.com/r/')) {
    return alert("Please run this on a specific Reddit post page!");
}
if (url.endsWith('/')) url = url.slice(0, -1);
```

Reddit post URLs often contain query parameters (like `?utm_source=share`) and anchor fragments (`#comment123`). These would break the `.json` request. The script strips everything after `?` and `#` first, validates that you're on a post in a subreddit (the `reddit.com/r/` check), and removes any trailing slash. A clean base URL is essential for the next step.

### Step 2: Reddit's JSON Backdoor

```js
const response = await fetch(url + '.json');
const json = await response.json();
```

This is the core insight. Reddit's backend exposes the complete data for any post by appending `.json` to its URL. For example:

```
https://www.reddit.com/r/videos/comments/abc123/title/.json
```

This is not a hack — it's a documented, intentional API endpoint that Reddit uses for its own mobile apps and third-party clients. The response is a JSON array containing all post metadata, including media information.

Because this is a same-origin `fetch` call made from within the reddit.com page itself, it inherits your existing session cookie. Reddit's CORS policy permits this without any special headers.

### Step 3: Traversing the JSON Tree

```js
const post = json[0].data.children[0].data;
```

Reddit's JSON response is an array of two elements:
- `json[0]` — the post listing (contains the main post as its first child)
- `json[1]` — the comment tree

Drilling down: `json[0].data` is the listing wrapper, `.children` is the array of posts (there's only one, the post itself), `[0].data` is the actual post object with all its properties.

### Step 4: Finding the Native Video

```js
if (!post.secure_media || !post.secure_media.reddit_video) {
    return alert("No native Reddit video found. It might be a YouTube link or an image.");
}
let fallbackUrl = post.secure_media.reddit_video.fallback_url;
fallbackUrl = fallbackUrl.split('?')[0];
```

Reddit's post object uses `secure_media.reddit_video` specifically for native `v.redd.it` videos. Posts that embed a YouTube video, a GIF, or an image will not have this field. The script checks for its presence and exits early with a clear message if it's missing.

The `fallback_url` property is a direct link to the highest-resolution `DASH_xxx.mp4` version available. Reddit appends tracking query parameters to this URL; stripping them with `.split('?')[0]` produces a clean, stable CDN link.

### Step 5: Triggering the Download

```js
const a = document.createElement('a');
a.href = fallbackUrl;
a.target = '_blank';
a.download = `Reddit_Post_${post.id}.mp4`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
```

This is the standard browser download pattern: create a temporary `<a>` element with a `download` attribute (which tells the browser to save the file rather than navigate to it), briefly attach it to the DOM, programmatically click it, then remove it. The filename uses the post's unique `id` property so you can identify the source later. The link is opened in `_blank` as a fallback for browsers that do not honour the `download` attribute for cross-origin URLs.

<div class="alert alert-info">
  💡 <b>Why no audio?</b> Reddit stores video and audio as separate tracks in its DASH format. The <code>fallback_url</code> contains only the video track. The audio lives at a parallel URL (typically the same path with <code>DASH_audio.mp4</code>). Most casual downloads won't need the audio, but if you do, you would need to download both tracks and merge them with a tool like ffmpeg.
</div>

---

## Comparison with Other Video Downloaders

This script's approach is architecturally distinct from the recorder-based scripts used on other platforms:

| | Reddit Video Sniper | Instagram / YouTube Shorts / Twitter Sniper |
|---|---|---|
| **Method** | JSON API extraction — fetches the direct CDN URL | `captureStream` + `MediaRecorder` — re-records as the video plays |
| **Speed** | Near-instant — no playback required | Real-time — must play through the full video |
| **Output quality** | Original upload quality | Re-encoded at 5 Mbps (may differ from source) |
| **Output format** | `.mp4` (Reddit's native format) | `.webm` (browser recording format) |
| **Audio** | Video-only (DASH separation) | Audio included (stream is already merged) |
| **Why different** | Reddit publicly exposes metadata via `.json` API | Other platforms do not expose direct CDN links |

The {% include post_link.html url="/blog/2026/03/21/twitter-x-video-sniper" text="Twitter/X Video Sniper" %} has a Method 2 (High-Res Scraper) that also extracts a direct URL via React internals — that's the closest conceptual equivalent. The Reddit approach is simpler because the metadata is available through an official public endpoint rather than internal component state.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Alert: "Please run this on a specific Reddit post page!" | Script was run from the subreddit feed or the Reddit home page | Navigate to the individual post (click the post title to open it), then run the script |
| Alert: "No native Reddit video found" | The post contains a YouTube embed, a GIF, or only images | This script only works on native `v.redd.it` videos; YouTube embeds have no `reddit_video` field |
| Fetch failed — network error in console | Ad blocker or browser extension is blocking the `.json` request | Temporarily disable your ad blocker for reddit.com, or add an exception for `reddit.com/*.json` |
| New tab opens but video has no sound | Expected — Reddit uses DASH with separate audio/video tracks | Download the audio track separately and merge with ffmpeg if needed |
| File saves as `Reddit_Post_abc123.mp4` but won't play | Incomplete download or corrupt file | Re-run the script; if the issue persists, the CDN URL may have changed |
| Download doesn't start | Browser blocked the `<a>.click()` | Allow pop-ups / automatic downloads for reddit.com in browser settings |

*Using the same browser-only approach, you can also {% include post_link.html url="/blog/2026/03/21/instagram-reel-sniper" text="download Instagram Reels" %}, {% include post_link.html url="/blog/2026/03/22/instagram-story-sniper" text="download Instagram Stories" %}, {% include post_link.html url="/blog/2026/03/21/youtube-shorts-sniper" text="download YouTube Shorts" %}, {% include post_link.html url="/blog/2026/03/21/twitter-x-video-sniper" text="download Twitter/X videos" %}, and {% include post_link.html url="/blog/2026/03/21/save-instagram-photos" text="save Instagram photos" %}.*

---

> **Disclaimer:** This script is provided for **educational purposes only**. It uses Reddit's own public `.json` API endpoint — the same interface Reddit's official apps and authorised third-party clients use — to read post metadata. Downloading content from Reddit may be against [Reddit's User Agreement](https://www.redditinc.com/policies/user-agreement). Only use this on content you own, have explicit permission to download, or that is explicitly licensed for offline use. Respect copyright and the work of content creators.
