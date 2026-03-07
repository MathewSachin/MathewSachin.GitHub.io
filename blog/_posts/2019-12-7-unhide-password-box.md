---
title: "Reveal a Saved Password Hidden Behind Dots"
tags: [chrome, hack, browser, devtools]
highlight: true
disqus: true
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2026/03/07/hacking-wordle
  - /blog/2026/03/07/edit-webpage-inspect-element
---

*You know that maddening situation — your browser auto-fills a password box with a row of dots, but you can't remember what the actual password is? Here's a neat trick to reveal it in about 10 seconds, no special software needed.*

---

## 🔐 Why Are Passwords Hidden in the First Place?

When a website creates a login form, the developer marks the password field with a special HTML attribute:

```html
<input type="password" name="pass" />
```

The `type="password"` tells your browser: *"render this as dots so nobody peeks at the screen."* That's the only thing making it look like `••••••••` — the actual text is right there in the page's HTML, unencrypted, just visually hidden.

Which means… we can un-hide it just as easily. 😏

---

## 📋 When Is This Useful?

- Your browser auto-filled a password you've since forgotten
- You want to copy the password to use in another app or device
- You need to check what password was actually saved

<div class="alert alert-info">
  ⚠️ <b>Important:</b> This only reveals passwords that your browser has <i>already saved and auto-filled</i> on <b>your own computer</b>. It can't crack passwords you don't know, and nobody else on the internet can use this trick on you remotely.
</div>

---

## 🛠️ Step 1 — Open Developer Tools

Every major browser ships with built-in Developer Tools (DevTools). Here's how to open them:

### 🌐 Google Chrome / Microsoft Edge

| OS | Shortcut |
|---|---|
| Windows / Linux | `F12` or `Ctrl + Shift + I` |
| Mac | `Cmd + Option + I` |
| Any OS | Right-click anywhere on the page → **Inspect** |

### 🦊 Mozilla Firefox

| OS | Shortcut |
|---|---|
| Windows / Linux | `F12` or `Ctrl + Shift + I` |
| Mac | `Cmd + Option + I` |
| Any OS | Right-click anywhere on the page → **Inspect Element** |

### 🍎 Safari (Mac only)

Safari hides DevTools by default. Enable it once:

1. Go to **Safari → Settings** (or **Preferences** on older macOS)
2. Click the **Advanced** tab
3. Check **"Show features for web developers"** (older macOS: *"Show Develop menu in menu bar"*)

Now you can right-click anywhere → **Inspect Element**, or use `Cmd + Option + I`.

### 📱 Android (Chrome)

DevTools on mobile require a desktop Chrome browser connected via USB debugging. For a quick password reveal on Android, use the Console method described at the end of this post instead.

---

## 🔍 Step 2 — Select the Password Field

Once DevTools is open, you'll see the **Elements** tab (called **Inspector** in Firefox) which shows the HTML of the page.

The fastest way to jump to the password field:

1. Click the **element picker** icon — the cursor/box icon in the top-left corner of the DevTools panel (keyboard shortcut: `Ctrl + Shift + C` on Windows/Linux, `Cmd + Shift + C` on Mac)
2. Move your mouse over the password box on the page — it'll highlight in blue
3. Click on the password box

DevTools will jump straight to the `<input>` element for that field.

![Revealing password with DevTools](/images/unhide-psw.gif)

<div class="alert alert-info">
  💡 <b>Tip:</b> Can't find the element picker? You can also right-click <i>directly on the password box</i> and choose <b>Inspect</b> — this opens DevTools with that element already highlighted.
</div>

---

## ✏️ Step 3 — Change `type="password"` to `type="text"`

With the `<input>` element highlighted in DevTools, you'll see something like:

```html
<input type="password" name="password" autocomplete="current-password">
```

Now:

1. **Double-click** on the word `password` inside `type="password"` in the Elements panel
2. It becomes an editable text field
3. Type `text` to replace `password`
4. Press **Enter**

The password box on the page instantly shows the real password as plain text. 🎉

---

## ⚡ Alternative: The Console Method (One Command)

If you prefer a one-liner, switch to the **Console** tab in DevTools and paste this:

```js
document.querySelectorAll('input[type=password]').forEach(el => el.type = 'text');
```

Press **Enter** — all password fields on the page are revealed at once. This works in every browser and is especially handy on pages with more than one password field.

<div class="alert alert-info">
  💡 <b>Not seeing the Console tab?</b> Press <code>Esc</code> while DevTools is open to toggle a Console drawer at the bottom, or click the <b>Console</b> tab at the top of the DevTools panel.
</div>

---

## 🔧 How Does It Actually Work?

`type="password"` is just a CSS-level rendering hint. The browser stores the actual text in memory and submits it to the server on login — it simply chooses not to display it. By changing the type to `text`, you tell the browser: *"actually, display this normally"* — and it does, no questions asked.

This is also why browser-saved passwords are accessible through Settings: the browser already has the plaintext; it's just a matter of where it shows it.

---

## 🔒 A Note on Privacy

This only works on your own browser with passwords it has already filled in. If someone else's computer is auto-filling a password box, you'd need physical access to that machine and the time to open DevTools — which is not a remote exploit at all.

That said: **always use a password manager** to keep your credentials safe, and consider enabling two-factor authentication on important accounts so that a revealed password alone isn't enough for a break-in.

---

Give it a try the next time your browser remembers a password you don't!

Drop a comment below if you found it useful, or if you know another handy browser trick. 👇