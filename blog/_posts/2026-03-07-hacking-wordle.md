---
title: "Hacking Wordle: Solve It in One Try Using Browser DevTools"
tags: [wordle, hack, browser, devtools]
highlight: true
disqus: true
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2019/12/07/unhide-password-box
---

*What if you could solve Wordle on your very first guess — every single day? No tricks, no guessing. Just the answer, handed to you by your own browser. Let's do this.*

---

## 🟩 What's Wordle?

<img alt="Wordle game board showing a solved puzzle with green tiles" src="/images/wordle-hero.svg" width="320" style="display:block;margin:1rem auto;">

Wordle is a hugely popular word-guessing game. Every day there's a new secret 5-letter word, and you get 6 attempts to figure it out. Green tiles mean the right letter in the right spot, yellow means right letter but wrong place, and grey means that letter isn't in the word at all.

But here's a little secret: **your browser already knows the answer before you even start typing.** 🤫

When you open Wordle, the game quietly asks the server, *"Hey, what's today's word?"* The server sends back the answer — and your browser receives it. We're going to intercept that conversation.

---

## 🕵️ Opening Developer Tools

This is the magic panel that web developers use to peek under the hood of any website. Don't be intimidated — you're about to use it like a pro.

<img alt="Browser window with DevTools panel open showing the Elements tab" src="/images/wordle-devtools-open.svg" width="480" style="display:block;margin:1rem auto;">

1. Open [Wordle](https://www.nytimes.com/games/wordle/index.html) in your browser.
2. Press **`F12`** on your keyboard (or **`Ctrl + Shift + I`** on Windows/Linux, **`Cmd + Option + I`** on Mac).
3. A panel will slide open on the side (or bottom) of your screen. Welcome to DevTools! 🎉

---

## 🌐 Navigating to the Network Tab

At the top of the DevTools panel, you'll see a row of tabs: *Elements, Console, Sources, Network...* Click on **Network**.

<img alt="DevTools Network tab showing Fetch/XHR filter and the date-named JSON file highlighted" src="/images/wordle-network-tab.svg" width="480" style="display:block;margin:1rem auto;">

This tab shows you every single request your browser makes — every image, script, and piece of data it fetches from the internet.

---

## 🔄 Refreshing the Page to Capture Traffic

The Network tab only records requests made *while it's open*. Since we opened DevTools after the page loaded, we need to reload the page so it captures everything fresh.

Press **`Ctrl + R`** (or **`Cmd + R`** on Mac) to refresh the page, or just click the refresh button in your browser.

You'll see the Network tab fill up with a long list of items — all the stuff your browser downloaded to show you the Wordle page. Don't panic, we're going to filter this down!

---

## 🔍 Filtering by Fetch/XHR

See the filter buttons near the top of the Network tab? They look like: **All, Fetch/XHR, JS, CSS, Img...**

Click **Fetch/XHR**.

This filters the list to show only the *data requests* — the bits of information the page fetched from a server. This is where the good stuff hides.

---

## 📅 Finding Today's JSON File

Now look through the filtered list for a file that includes today's date in its name. It will look something like:

```
2026-03-07.json
```

(with today's date, of course)

Click on it. You've found the answer file! 🎯

> 💡 **Tip:** If you don't see it immediately, try scrolling through the list. You can also type `.json` in the filter/search box at the top of the Network tab to narrow things down further.

---

## 👀 Peeking at the Answer in the Preview Tab

Once you've clicked on the `.json` file, a new panel opens on the right. You'll see tabs: **Headers, Preview, Response...**

Click on **Preview**.

<img alt="DevTools Preview tab showing the JSON response with the solution field highlighted" src="/images/wordle-preview-answer.svg" width="480" style="display:block;margin:1rem auto;">

You'll see something like this:

```json
{
  "solution": "crane",
  ...
}
```

There it is. **`solution`** — that's today's Wordle answer. 🏆

Go ahead and type it in as your first guess and watch all five tiles go green. You're basically a hacker now.

---

## 🎉 You Did It!

You just used **browser developer tools** to intercept live data from a website — the same technique web developers and security researchers use every day.

No coding required. No special software. Just you, your browser, and a little curiosity.

---

*Want more browser tricks like this? Check out [Hacking the Chrome Dino Game](/blog/2016/11/05/chrome-dino-hack) for more fun ways to bend the web to your will!*
