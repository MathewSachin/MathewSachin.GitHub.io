---
title: "Hack the Chrome Dino on Mobile — No Computer Needed (Bookmarklet Method)"
icon: "fas fa-mobile-alt"
tags: [chrome, hack, game, mobile]
highlight: true
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2026/03/14/chrome-dino-autoplay
  - /blog/2026/03/07/hacking-wordle
  - /blog/2026/03/07/edit-webpage-inspect-element
---

*You've found the Chrome Dino hack — but your phone doesn't have DevTools. No problem. There's a trick that works entirely from your mobile browser.*

---

The {% include post_link.html url="/blog/2016/11/05/chrome-dino-hack" text="classic Dino hacks" %} rely on the Chrome Developer Console to run JavaScript. On a desktop that's one keyboard shortcut away, but on a phone or tablet the console simply isn't available. That's where **bookmarklets** come in.

## What Is a Bookmarklet?

A bookmarklet is a regular web bookmark — but instead of a website URL, it contains JavaScript code. When you tap the bookmark, the browser executes that code on whatever page you're currently viewing.

It's a technique that has been around for decades and works in virtually every mobile browser, because tapping a bookmark is just a normal browser action, not a developer feature.

## The Catch — Native `chrome://dino` Won't Work

For security reasons, modern mobile Chrome blocks bookmarklets from running on native `chrome://` pages. So you **cannot** use this method on the built-in `chrome://dino` page.

<div class="alert alert-info">
  🎮 <b>Use a hosted mirror instead.</b> Head to <a href="https://chromedino.com" target="_blank" rel="noopener">chromedino.com</a> (or any other web-hosted copy of the game). The bookmarklet will work perfectly there.
</div>

## Setting It Up

### Step 1 — Create a New Bookmark

Open your mobile browser and bookmark any random page. The URL doesn't matter; you'll replace it in the next step.

### Step 2 — Edit the Bookmark

Open your bookmarks, find the one you just saved, and tap **Edit**.

- Change the **name** to: `Dino God Mode`
- Delete the **URL** completely and paste this exact code in its place:

```
javascript:var originalGameOver=Runner.prototype.gameOver;Runner.prototype.gameOver=function(){};
```

Save the bookmark.

### Step 3 — Go to the Hosted Game

Navigate to [chromedino.com](https://chromedino.com) (or another hosted mirror). Start a game so the dino is running.

### Step 4 — Inject the Script

<div class="alert alert-info">
  ⚠️ <b>Crucial step:</b> Simply tapping the bookmark in your bookmarks menu won't work on mobile. You need to trigger it through the address bar.
</div>

Tap your **address bar**, type **Dino God Mode**, and when the bookmark appears in the dropdown suggestions, tap it.

The script will inject instantly — your dino is now invincible. Cacti and pterodactyls will pass right through it without ending the game.

## How It Works

The bookmarklet runs the same JavaScript you'd type into a desktop DevTools console — it just uses a different delivery mechanism. The `javascript:` URL scheme tells the browser to evaluate the code as a script rather than navigate to a page.

The code itself does two things in one line:

1. Saves the original `gameOver` function to `originalGameOver` (so you can restore it later if you want).
2. Replaces `Runner.prototype.gameOver` with an empty function, which means crashing now does nothing.

Because the game's code is exposed globally on the page, any JavaScript running in that tab — whether from the console or a bookmarklet — can reach in and override it.

## Restoring Normal Play

If you want the game to end normally again, create a second bookmarklet with this code:

```
javascript:Runner.prototype.gameOver=originalGameOver;
```

Or simply refresh the page to start fresh.

---

Want to go further? Check out the full {% include post_link.html url="/blog/2016/11/05/chrome-dino-hack" text="Chrome Dino Hack guide" %} for speed control, score manipulation, auto-play, and more tricks you can use on desktop!
