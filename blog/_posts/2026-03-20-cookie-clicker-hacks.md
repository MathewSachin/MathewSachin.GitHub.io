---
title: "Cookie Clicker Hacks: Three Backdoors the Developer Left Wide Open"
icon: "fas fa-cookie-bite"
tags: [cookie-clicker, hack, javascript, browser, devtools, bookmarklet, game]
highlight: true
series: browser-hacks
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2026/03/20/hacking-minesweeper-online
  - /blog/2026/03/20/hacking-typeracer
  - /blog/2026/03/07/hacking-wordle
  - /blog/2026/03/07/edit-webpage-inspect-element
---

*Sometimes the most elegant software architecture is just finding the backdoor the developer forgot to close — or in this case, the one they intentionally left wide open.*

---

## What is Cookie Clicker?

[Cookie Clicker](https://orteil.dashnet.org/cookieclicker/) is a deceptively simple idle game by developer **Orteil**: click the big cookie, earn cookies, spend cookies on buildings and upgrades, earn more cookies, repeat — forever. It sounds absurd, and it is. It's also utterly addictive.

But here's the twist: Cookie Clicker is a browser game written in JavaScript, and its internal state is exposed as global variables on the page. That means anyone with a browser console can reach right in and rewrite the rules.

Below are three hacks — from the nuclear option to the subtle — each a single line of JavaScript.

## Opening the Browser Console

The **Developer Console** lets you run JavaScript directly on any page. To open it on the Cookie Clicker page:

**Windows / Linux:** Press `F12` or `Ctrl + Shift + I`, then click the **Console** tab.  
Direct shortcut: `Ctrl + Shift + J` jumps straight to the Console.

**Mac:** Press `Cmd + Option + I`, then click the **Console** tab.  
Direct shortcut: `Cmd + Option + J` jumps straight to the Console.

You'll see a blinking cursor. Type (or paste) any command and press **Enter** to run it. Commands are case-sensitive — type them exactly as shown. Seeing `undefined` after a command is completely normal.

<div class="alert alert-info">
  📱 <b>On a phone or tablet?</b> Mobile browsers don't have DevTools — but each hack below includes a bookmarklet you can use instead. No computer needed!
</div>

---

## Hack 1: "Ruin The Fun" — The Developer's Own God Mode

This is the nuclear option. Orteil actually built a `RuinTheFun()` function directly into the game's source code — a single call that instantly grants you nearly infinite cookies, every building, every upgrade, and every achievement simultaneously.

```js
Game.RuinTheFun();
```

One line. The game is beaten.

#### How does it work?

`Game.RuinTheFun()` is a built-in convenience function Orteil left in the production code — originally used during development to test the late-game state without grinding. Because `Game` is a global variable, anyone with console access can call it.

#### Bookmarklet

Save this as a bookmark URL to run it in one tap:

```
javascript:Game.RuinTheFun();void(0);
```

---

## Hack 2: The Invisible Auto-Clicker

If "Ruin The Fun" is too destructive and you actually want to *watch* the numbers go up, this is the classic approach. It silently sets up a background loop that clicks the big cookie 100 times a second — no menus, no buttons, no interruptions.

```js
setInterval(function() { Game.ClickCookie(); }, 10);
```

The `10` is the interval in milliseconds — so this fires 100 times per second. You can raise it to `100` (10 clicks/sec) for a more leisurely pace, or drop it even lower for absolute insanity.

#### How does it work?

`Game.ClickCookie()` is the same function the game calls when you physically click the cookie. `setInterval` runs it on a timer in the background. The auto-clicker keeps running until you refresh the page, so you can switch tabs and come back to a mountain of cookies.

#### Bookmarklet

```
javascript:setInterval(function(){Game.ClickCookie();},10);void(0);
```

<div class="alert alert-info">
  💡 <b>Tip:</b> The auto-clicker stacks with upgrades and buildings — so activate it after buying a few cursor upgrades for maximum effect.
</div>

---

## Hack 3: The "Open Sesame" Hidden Dev Menu

Instead of building your own cheat menu, you can just force Cookie Clicker to reveal its *own* hidden developer tools panel. The game has a built-in easter egg: if your bakery name ends with `saysopensesame`, a small wrench icon appears in the top-left corner. Click it to access sliders and buttons for spawning Golden Cookies, manipulating time, and more.

```js
Game.bakeryName = "Hacker saysopensesame";
Game.bakeryNameRefresh();
```

A wrench icon will appear in the top-left of the game. Click it to open the full dev panel.

#### How does it work?

Cookie Clicker checks the bakery name for the string `saysopensesame` and toggles visibility of the dev panel accordingly. `Game.bakeryNameRefresh()` re-evaluates the name immediately, so you don't have to wait for the game to check on its own.

#### Bookmarklet

```
javascript:Game.bakeryName="Hacker saysopensesame";Game.bakeryNameRefresh();void(0);
```

---

## Using Bookmarklets on Mobile

Mobile browsers don't have a developer console — but they do support bookmarklets. A bookmarklet is a bookmark whose URL is JavaScript code. When you tap it, the browser runs the code on the current page.

#### Step 1: Create a New Bookmark

In your mobile browser, bookmark any page. The URL doesn't matter — you'll replace it next.

#### Step 2: Edit the Bookmark

Open your bookmark manager, find the bookmark you just saved, and tap **Edit**:

- Change the **name** to something descriptive (e.g. `Cookie Clicker God Mode`)
- Replace the entire **URL** with one of the bookmarklet codes from above (copy the whole thing — it must be one continuous line)

Save the bookmark.

#### Step 3: Run It on Cookie Clicker

1. Go to [orteil.dashnet.org/cookieclicker](https://orteil.dashnet.org/cookieclicker/) and wait for the game to fully load.
2. Tap the **address bar**, type the bookmark name, and when it appears in the dropdown, tap it.

The script will inject and run instantly.

Want to write your own bookmarklets? The [Bookmarklet Compiler]({{ '/tools/bookmarklet/' | relative_url }}) turns any JavaScript snippet into a ready-to-use bookmarklet in seconds.

---

Enjoy your mountains of cookies — however you choose to earn them!

*Enjoyed this? Check out {% include post_link.html url="/blog/2016/11/05/chrome-dino-hack" text="Hacking the Chrome Dino Game" %}, {% include post_link.html url="/blog/2026/03/20/hacking-minesweeper-online" text="Hacking Minesweeper Online" %}, or {% include post_link.html url="/blog/2026/03/20/hacking-typeracer" text="Hacking TypeRacer" %} for more browser tricks.*
