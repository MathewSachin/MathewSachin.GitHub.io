---
title: "Brute-Force Dark Mode on Any Website — Desktop and Mobile"
tags: [hack, browser, devtools, css, mobile]
highlight: true
related:
  - /blog/2026/03/07/edit-webpage-inspect-element
  - /blog/2026/03/07/hacking-wordle
  - /blog/2026/03/19/hacking-wordle-mobile-bookmarklet
  - /blog/2026/03/19/chrome-dino-hack-mobile-bookmarklet
---

*Some websites still don't have a dark mode. Your eyes suffer at midnight. Here's a two-second fix that works on any page — desktop or mobile.*

---

## The Trick

The trick uses a single CSS rule injected into the page:

```css
html {
  filter: invert(100%) hue-rotate(180deg) !important;
}
img, video, picture, canvas {
  filter: invert(100%) hue-rotate(180deg) !important;
}
```

`invert(100%)` flips every colour to its opposite — white becomes black, black becomes white. That alone would also invert photos and videos, turning them into negatives. The second `hue-rotate(180deg)` cancels out the colour shift on images and videos by rotating hues back around the colour wheel, so photos look natural while the UI is dark.

The result: a convincing dark mode on literally any website, with no extension needed.

## On Desktop — Using the DevTools Console

Every major desktop browser has a built-in JavaScript console. Open it, paste one line, and the page goes dark.

### Open the Console

| Browser | Shortcut |
|---|---|
| Chrome / Edge | `Ctrl + Shift + J` (Windows/Linux) or `Cmd + Option + J` (Mac) |
| Firefox | `Ctrl + Shift + K` (Windows/Linux) or `Cmd + Option + K` (Mac) |
| Safari | Enable DevTools first (Safari → Settings → Advanced → Show features for web developers), then `Cmd + Option + C` |

You can also reach it via `F12` → click the **Console** tab.

### Inject Dark Mode

Click in the console, paste the following, and press **Enter**:

```javascript
(function () {
  let style = document.createElement('style');
  style.id = '__brute-dark';
  style.innerHTML = 'html { filter: invert(100%) hue-rotate(180deg) !important; } img, video, picture, canvas { filter: invert(100%) hue-rotate(180deg) !important; }';
  document.head.appendChild(style);
})();
```

The page immediately switches to dark mode. No extensions, no settings — just paste and go.

### Revert It

To put the page back to normal without refreshing, paste this into the console:

```javascript
(function () {
  let el = document.getElementById('__brute-dark');
  if (el) el.remove();
})();
```

Or just refresh the page — the injected style only lives in memory and disappears on reload.

### Try It Right Here

See it in action on this page before you copy the code anywhere:

<div class="my-3">
  <button class="btn btn-dark me-2" onclick="bruteDarkOn()">🌙 Dark Mode ON</button>
  <button class="btn btn-secondary" onclick="bruteDarkOff()">☀️ Dark Mode OFF</button>
</div>

## On Mobile — Using a Bookmarklet

On a phone or tablet there's no DevTools. But there is another trick: **bookmarklets**. A bookmarklet is a bookmark whose "URL" is a snippet of JavaScript. Tapping it runs the code on the current page.

<div class="alert alert-info">
  💡 <b>New to bookmarklets?</b> See <a href="{% post_url /blog/2026-03-19-chrome-dino-hack-mobile-bookmarklet %}">Hack the Chrome Dino on Mobile</a> for a detailed walkthrough of how to create and trigger bookmarklets on iOS and Android.
</div>

### Step 1 — Create the Dark Mode Bookmarklet

Bookmark any page, then edit that bookmark:

- **Name:** `Dark Mode ON`
- **URL:** delete everything and paste this exactly:

```
javascript:(function(){let s=document.createElement('style');s.id='__brute-dark';s.innerHTML='html{filter:invert(100%) hue-rotate(180deg) !important;}img,video,picture,canvas{filter:invert(100%) hue-rotate(180deg) !important;}';document.head.appendChild(s);})();
```

Save it.

### Step 2 — Create the Revert Bookmarklet

Create a second bookmark:

- **Name:** `Dark Mode OFF`
- **URL:**

```
javascript:(function(){let e=document.getElementById('__brute-dark');if(e)e.remove();})();
```

Save it.

### Step 3 — Use Them

Navigate to any page you want to darken. Tap your **address bar**, type **Dark Mode ON**, and select the bookmark from the suggestions when it appears.

To restore the original look, do the same with **Dark Mode OFF**.

<div class="alert alert-info">
  ⚠️ <b>Crucial step:</b> Simply tapping the bookmark in your bookmarks list won't work on most mobile browsers — it tries to navigate instead of running the code. You must trigger it from the <b>address bar suggestions</b>.
</div>

## Why This Works

Browsers let any JavaScript running on a page freely modify the page's HTML and CSS. Injecting a `<style>` tag is the same thing web developers do all the time — we're just doing it at runtime from the outside.

The `!important` flag overrides whatever CSS the site already applied, so the filter wins even on sites with complex stylesheets.

Because the style is tagged with a unique `id`, the revert script can find and remove it precisely without disturbing the rest of the page.

## Caveats

- **Doesn't survive a refresh.** Each page load starts fresh, so you'll need to re-run the bookmarklet. If you want a permanent solution, a browser extension like [Dark Reader](https://darkreader.org/) is the right tool.
- **Some pages look a little odd.** Sites that use SVG icons or CSS gradients may look slightly off, but it usually works well enough for reading.
- **Videos stay natural.** The double-invert trick keeps photos and videos looking correct, so you won't be watching a negative-colour film.

---

Want more browser hacks you can pull off without installing anything? Check out [Edit Any Webpage in Seconds]({% post_url /blog/2026-03-07-edit-webpage-inspect-element %}) and [Hacking Wordle with DevTools]({% post_url /blog/2026-03-07-hacking-wordle %}).

<script>
function bruteDarkOn() {
  if (!document.getElementById('__brute-dark')) {
    var s = document.createElement('style');
    s.id = '__brute-dark';
    s.innerHTML = 'html { filter: invert(100%) hue-rotate(180deg) !important; } img, video, picture, canvas { filter: invert(100%) hue-rotate(180deg) !important; }';
    document.head.appendChild(s);
  }
}
function bruteDarkOff() {
  var el = document.getElementById('__brute-dark');
  if (el) el.remove();
}
</script>
