---
title: "Reveal a Saved Password Hidden Behind Dots"
icon: "fas fa-eye"
tags: [chrome, hack, browser, devtools]
highlight: true
series: browser-hacks
related:
  - /blog/2016/11/05/chrome-dino-hack
  - /blog/2026/03/07/hacking-wordle
  - /blog/2026/03/07/edit-webpage-inspect-element
---

*You know that maddening situation — your browser auto-fills a password box with a row of dots, but you can't remember what the actual password is? Here's a neat trick to reveal it in about 10 seconds, no special software needed.*

## Why Are Passwords Hidden in the First Place?

When a website creates a login form, the developer marks the password field with a special HTML attribute:

```html
<input type="password" name="pass" />
```

The `type="password"` tells your browser: *"render this as dots so nobody peeks at the screen."* That's the only thing making it look like `••••••••` — the actual text is right there in the page's HTML, unencrypted, just visually hidden.

Which means… we can un-hide it just as easily. 😏

## When Is This Useful?

- Your browser auto-filled a password you've since forgotten
- You want to copy the password to use in another app or device
- You need to check what password was actually saved

<div class="alert alert-info">
  ⚠️ <b>Important:</b> This only reveals passwords that your browser has <i>already saved and auto-filled</i> on <b>your own computer</b>. It can't crack passwords you don't know, and nobody else on the internet can use this trick on you remotely.
</div>

## Step 1 — Open Developer Tools

Every major browser ships with built-in Developer Tools (DevTools). Here's how to open them:

#### Google Chrome / Microsoft Edge

| OS | Shortcut |
|---|---|
| Windows / Linux | `F12` or `Ctrl + Shift + I` |
| Mac | `Cmd + Option + I` |
| Any OS | Right-click anywhere on the page → **Inspect** |

#### Mozilla Firefox

| OS | Shortcut |
|---|---|
| Windows / Linux | `F12` or `Ctrl + Shift + I` |
| Mac | `Cmd + Option + I` |
| Any OS | Right-click anywhere on the page → **Inspect Element** |

## Step 2 — Select the Password Field

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

## Step 3 — Change `type="password"` to `type="text"`

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

## Alternative: The Console Method (One Command)

If you prefer a one-liner, switch to the **Console** tab in DevTools and paste this:

```js
document.querySelectorAll('input[type=password]').forEach(el => el.type = 'text');
```

Press **Enter** — all password fields on the page are revealed at once. This works in every browser and is especially handy on pages with more than one password field.

<div class="alert alert-info">
  💡 <b>Not seeing the Console tab?</b> Press <code>Esc</code> while DevTools is open to toggle a Console drawer at the bottom, or click the <b>Console</b> tab at the top of the DevTools panel.
</div>

## Mobile: Use a Bookmarklet

Desktop browsers have DevTools, but **mobile browsers don't**. The workaround is a *bookmarklet* — a bookmark whose URL is a snippet of JavaScript that runs when you tap it.

**The bookmarklet:**

```
javascript:(function(){let inputs=document.querySelectorAll('input[type="password"]');inputs.forEach(input=>input.type='text');})();
```

### How to install it on mobile

1. **Bookmark any page** — open your mobile browser and bookmark any page (e.g. this one).
2. **Edit the bookmark** — open your bookmarks list, long-press the new bookmark, and choose **Edit**.
3. **Replace the URL** — clear the URL field and paste the JavaScript snippet above as the address. Give it a memorable name like *Reveal Passwords*.
4. **Save** — confirm the edit.

### How to use it

Navigate to the page with the password box, then open your bookmarks and tap **Reveal Passwords**. All password fields on that page will switch to plain text instantly.

<div class="alert alert-info">
  💡 <b>On desktop browsers</b> you can also drag the link below straight to your bookmarks bar: <a href="javascript:(function(){let inputs=document.querySelectorAll('input[type=&quot;password&quot;]');inputs.forEach(input=&gt;input.type='text');})();" title="Reveal Passwords">Reveal Passwords</a>
</div>

Want to write your own bookmarklets? The [Bookmarklet Compiler]({{ '/tools/bookmarklet/' | relative_url }}) turns any JavaScript snippet into a ready-to-use bookmarklet in seconds.

## Try It Right Here!

No need to hunt for a login page — practice the trick on this form. The password field below is already filled in. Use DevTools (or the Console snippet above) to reveal what's hiding behind the dots. 👀

<div class="card shadow-sm my-4" style="max-width:400px;">
  <div class="card-header fw-semibold">🔐 Demo Login Form</div>
  <div class="card-body">
    <form onsubmit="return false;">
      <div class="mb-3">
        <label for="demo-username" class="form-label">Username</label>
        <input id="demo-username" type="text" class="form-control" value="neo" autocomplete="off">
      </div>
      <div class="mb-3">
        <label for="demo-password" class="form-label">Password</label>
        <input id="demo-password" type="password" class="form-control" value="TheMatrixHasYou!" autocomplete="off">
      </div>
      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-primary btn-sm">Log In</button>
        <button type="button" id="demo-reveal-btn" class="btn btn-outline-secondary btn-sm"
          onclick="toggleDemoPassword(this)">
          Reveal
        </button>
      </div>
    </form>
  </div>
</div>

<script>
function toggleDemoPassword(btn) {
  var field = document.getElementById('demo-password');
  var isHidden = field.type === 'password';
  field.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? 'Hide' : 'Reveal';
}
</script>

## How Does It Actually Work?

`type="password"` is just a CSS-level rendering hint. The browser stores the actual text in memory and submits it to the server on login — it simply chooses not to display it. By changing the type to `text`, you tell the browser: *"actually, display this normally"* — and it does, no questions asked.

This is also why browser-saved passwords are accessible through Settings: the browser already has the plaintext; it's just a matter of where it shows it.

## A Note on Privacy

This only works on your own browser with passwords it has already filled in. If someone else's computer is auto-filling a password box, you'd need physical access to that machine and the time to open DevTools — which is not a remote exploit at all.

That said: **always use a password manager** to keep your credentials safe, and consider enabling two-factor authentication on important accounts so that a revealed password alone isn't enough for a break-in.

Give it a try the next time your browser remembers a password you don't!

Drop a comment below if you found it useful, or if you know another handy browser trick. 👇