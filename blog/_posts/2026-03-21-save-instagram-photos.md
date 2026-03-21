---
title: "Save Instagram Photos: Remove the Right-Click Block"
tags: [instagram, hack, javascript, browser, devtools, bookmarklet, social-media]
highlight: true
related:
  - /blog/2026/03/21/instagram-reel-sniper
  - /blog/2026/03/07/edit-webpage-inspect-element
  - /blog/2019/12/07/unhide-password-box
  - /blog/2016/11/05/chrome-dino-hack
---

*Instagram prevents right-clicking on photos and dragging them to your desktop. This script strips those CSS restrictions in one go — no extensions, no third-party sites required.*

<div class="alert alert-info">
  ⚠️ <b>Educational purposes only.</b> This post explains how browser CSS properties work and how websites use them to restrict interaction. Downloading content from Instagram may be against <a href="https://help.instagram.com/581066165581870">Instagram's Terms of Service</a>. Only save photos you own, have explicit permission to download, or that are explicitly made available for download. Respect copyright and the work of creators.
</div>

---

## Why Can't You Right-Click Instagram Photos?

If you try to right-click a photo on Instagram you'll notice the context menu either doesn't appear at all, or the "Save image as…" option is missing. Open DevTools and inspect any image — you'll see something like this layered on top of it:

```css
pointer-events: none;
user-select: none;
z-index: 1;
```

Instagram doesn't hide the image or encrypt it. The full-resolution photo is already sitting in your browser's memory — the browser already downloaded it to display it. Instagram just places invisible overlay elements on top of images and then sets `pointer-events: none` on the `<img>` elements themselves so that your mouse clicks land on the overlay (which does nothing) instead of on the image.

This script reverses those CSS overrides directly in the page.

---

## Using it on Desktop

### Step 1 — Open Instagram

Go to [instagram.com](https://instagram.com) and navigate to the photo or profile page you want.

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
    // Force all images to be "clickable" and at the front
    document.querySelectorAll('img').forEach(img => {
        img.style.setProperty('z-index', '999', 'important');
        img.style.setProperty('pointer-events', 'auto', 'important');
        img.style.setProperty('position', 'relative', 'important');
        
        // Remove the 'no-select' restriction often found on profile pages
        img.style.setProperty('-webkit-user-select', 'auto', 'important');
        img.style.setProperty('user-select', 'auto', 'important');
    });

    console.log("Instagram Image Shields Removed.");
})();
```

You'll see **"Instagram Image Shields Removed."** logged in the console. Every image on the page is now right-clickable and draggable.

### Step 4 — Save the Photo

Right-click any photo and choose **Save image as…** — or drag it straight to your desktop or a folder.

<div class="alert alert-info">
  💡 <b>Tip:</b> The script only affects images that are already loaded in the page. If you scroll down to load more photos, run the script again to unlock the newly loaded ones.
</div>

---

## Using it on Mobile (Bookmarklet)

Mobile browsers don't have a DevTools console, but they support **bookmarklets** — bookmarks whose URL is a JavaScript snippet that runs on the current page when you tap it.

### Step 1 — Create a New Bookmark

In your mobile browser, bookmark any page. The URL doesn't matter — you'll replace it in the next step.

### Step 2 — Edit the Bookmark

Open your bookmarks, find the one you just saved, and tap **Edit**:

- Change the **name** to something like `IG Image Unblock`
- Delete the entire **URL** and paste this one-liner in its place (copy the whole thing — it must be one continuous line):

```
javascript:(function(){document.querySelectorAll('img').forEach(img=>{img.style.setProperty('z-index','999','important');img.style.setProperty('pointer-events','auto','important');img.style.setProperty('position','relative','important');img.style.setProperty('-webkit-user-select','auto','important');img.style.setProperty('user-select','auto','important');});console.log("Instagram Image Shields Removed.");})();
```

Save the bookmark.

### Step 3 — Run It on Instagram

1. Open Instagram in your mobile browser and navigate to the photo you want.
2. Tap the **address bar**, type the name you gave the bookmark (e.g. `IG Image Unblock`), and when it appears in the dropdown, tap it.
3. Long-press the photo — the system image-save option should now appear.

<div class="alert alert-info">
  💡 <b>Tip:</b> Simply tapping the bookmark from the bookmarks menu often won't execute the JavaScript on mobile. Always trigger it via the address bar dropdown.
</div>

---

## How the Code Works

Here's a plain-English breakdown for the curious.

### The IIFE Wrapper

```js
(function() {
    // ...
})();
```

This is an **Immediately Invoked Function Expression (IIFE)**. Wrapping the code in a function and calling it immediately keeps all variables scoped locally, so the script doesn't pollute the page's global namespace or accidentally clash with Instagram's own JavaScript variables.

### Selecting Every Image

```js
document.querySelectorAll('img').forEach(img => { ... });
```

`querySelectorAll('img')` returns a list of every `<img>` element currently in the DOM. The `forEach` loop then applies style changes to each one individually. This is intentionally broad — it catches photos in the feed, profile grids, Stories previews, and anywhere else an `<img>` appears.

### Restoring Pointer Events

```js
img.style.setProperty('pointer-events', 'auto', 'important');
```

`pointer-events: none` is the main tool Instagram uses to make images "un-clickable". When this property is set to `none` on an element, the browser ignores all mouse input on it — clicks, right-clicks, hover, drag — and passes those events straight through to whatever is underneath (typically an invisible overlay div). Setting it back to `auto` re-enables normal mouse interaction.

The `'important'` flag is the third argument to `setProperty`. It's the programmatic equivalent of writing `!important` in a CSS rule, which overrides any stylesheet rule — including Instagram's — regardless of specificity.

### Bringing Images to the Front

```js
img.style.setProperty('z-index', '999', 'important');
img.style.setProperty('position', 'relative', 'important');
```

`z-index` controls which elements are drawn on top of others in the same stacking context. A higher number means "closer to the viewer". By setting `z-index: 999` on each image, the script pushes photos in front of the overlay elements Instagram stacks on top of them. The value 999 is used as a pragmatically high number that exceeds the z-index values Instagram typically assigns to its overlay divs (usually in the single or double digits). If you find a page where 999 isn't enough, you can substitute `2147483647` — the maximum value browsers accept for `z-index`.

**Important detail:** `z-index` only works on *positioned* elements — elements with `position` set to anything other than `static` (the default). The `position: relative` line ensures each `<img>` participates in the stacking context so the `z-index` change actually takes effect.

### Re-enabling Selection

```js
img.style.setProperty('-webkit-user-select', 'auto', 'important');
img.style.setProperty('user-select', 'auto', 'important');
```

`user-select: none` is a CSS property that prevents users from selecting (highlighting) content — including dragging an image to the desktop. Instagram applies this on profile pages in particular. Setting both the standard `user-select` and the `-webkit-` prefixed version (used by Chrome and Safari) covers all major browsers and re-enables drag-and-select.

---

## Why Does Instagram Block This?

Platforms restrict right-clicking and image saving for a few reasons:

- **Copyright protection** — Many photos are the intellectual property of the creator or a brand, and the platform wants to discourage easy copying.
- **Engagement funnel** — Keeping content inside the platform (via "Share" or "Save to Collection") keeps users on-site and feeds their recommendation algorithms.
- **DRM theatre** — In practice these restrictions are CSS-only and trivially bypassed (as this post demonstrates), so they function more as a mild friction than a real technical barrier.

None of these measures prevent the browser from downloading the image — they only restrict what you can do with it once it's rendered on screen. The image data is already on your machine the moment it appears in your browser.

---

> **Disclaimer:** This script is provided for **educational purposes only**. It demonstrates standard browser CSS properties (`pointer-events`, `z-index`, `user-select`) that are freely documented and publicly available. Downloading content from Instagram may be against [Instagram's Terms of Service](https://help.instagram.com/581066165581870). Only save photos you own, have explicit permission to download, or that are explicitly made available for download. Respect copyright and the work of content creators.
