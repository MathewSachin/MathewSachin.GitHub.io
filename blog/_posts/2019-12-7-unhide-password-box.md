---
title: Hacking a password box
tags: [chrome, hack]
related:
  - /blog/2016/11/05/chrome-dino-hack
---

It might happen that sometimes you forgot a password for a website but your browser had saved it for you. The next time you visit the login page of that website, you can follow the steps below to view the password even without going to browser settings and entering the operating system user-account's password.

![1](/images/unhide-psw.gif)

1. Right-click anywhere on the page and select Inspect element. This opens up the Inspect window.

2. Now, we have to find the password box's `<input>` element.  
   In chrome, you can use an icon on top-left corner of Inspect window which says '*Select an element on the page to inspect it*' and then click on the password box.

3. Now, double-click over `type="password"` shown in the highlighted text in Inspect window.

4. Replace `password` with `text`.

5. Press Enter. Now, you can view the password as if it was a simple text box.