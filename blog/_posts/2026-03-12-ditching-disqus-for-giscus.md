---
title: "Ditching Disqus for giscus — and I Should Have Done It Sooner"
tags: [giscus, disqus, comments, jekyll, github-pages, github]
highlight: true
related:
  - /blog/2023/04/09/captura-unmaintained
  - /blog/2026/03/09/luddites-vs-developers
---

*Comment sections are supposed to be the friendly bit at the bottom of a post. A place to ask questions, share thoughts, push back. So why did mine feel like a billboard?*

---

## 😤 The Problem with Disqus

I had Disqus on this blog for years. It worked — technically. But every time I thought about it too hard, something felt off.

Here's what was actually going on behind the scenes on every page load:

| Issue | What it means for you |
|---|---|
| **Ads** | Disqus injects its own ads into the comment section *on top of* any ads you already run |
| **Tracking** | Third-party cookies, pixel trackers, cross-site fingerprinting |
| **Weight** | ~1 MB of JavaScript on every page, even if nobody comments |
| **Slow load** | The whole comment widget deferred to a sluggish external server |
| **Privacy** | Every visitor's data handed to Disqus, then used for ad targeting |

The blog already runs Google AdSense — that's deliberate and I'm comfortable with it. But Disqus was bolting its own ad network *on top of that*, injecting third-party ads directly inside the comment section. So every post ended up with two separate ad systems running simultaneously, both loading tracking scripts, both fighting for space and bandwidth.

Not great.

<div class="alert alert-info">
  🔍 <b>Try it yourself:</b> Open DevTools on any Disqus-powered site and check the Network tab. Filter by <b>Fetch/XHR</b>. Count the requests. It's a lot.
</div>

---

## 💡 Enter giscus

[giscus](https://giscus.app) is an open-source comment system that stores comments as **GitHub Discussions** on your repository. That's it. No third-party servers, no ads, no tracking, no cost.

The idea is beautifully simple:

- Each blog post maps to a GitHub Discussion thread
- Readers sign in with their GitHub account to comment
- Comments are stored directly in your repo's Discussions tab
- You own the data — it lives in GitHub, not on someone else's ad platform
- The whole widget is a single lightweight `<script>` tag

It's built on the [GitHub Discussions API](https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions), which means reactions (👍 ❤️ 🎉) work too.

---

## 🛠️ The Setup (It Really Is This Simple)

### Step 1: Enable GitHub Discussions on your repo

Go to your repository on GitHub → **Settings** → **General** → scroll down to the **Features** section → tick **Discussions**.

That's it for the repo side.

### Step 2: Install the giscus GitHub App

Head to [github.com/apps/giscus](https://github.com/apps/giscus) and install it on your repository. This gives giscus permission to create and read Discussion threads on your behalf.

### Step 3: Generate your config snippet

Go to [giscus.app](https://giscus.app), fill in:

- Your repository name (e.g. `MathewSachin/MathewSachin.GitHub.io`)
- How to map pages to Discussions (I use **pathname** — each URL gets its own thread)
- Which Discussion category to use (I created a dedicated **Announcements** category)
- Your preferred theme and language

giscus generates a `<script>` tag for you. Mine looked like this:

```html
<script src="https://giscus.app/client.js"
        data-repo="MathewSachin/MathewSachin.GitHub.io"
        data-repo-id="MDEwOlJlcG9zaXRvcnk0ODg1MDA2Mw=="
        data-category="Announcements"
        data-category-id="DIC_kwDOAulkj84C4PRo"
        data-mapping="pathname"
        data-strict="1"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="top"
        data-theme="light"
        data-lang="en"
        data-loading="lazy"
        crossorigin="anonymous"
        async>
</script>
```

### Step 4: Drop it into your layout

For this Jekyll site, I saved that script to `_includes/giscus.html` and added one line to `_layouts/post.html`:

```liquid
{% include giscus.html %}
```

Done. Every post now has a fully functional, privacy-respecting comment section. The entire change took about ten minutes.

<div class="alert alert-info">
  ✅ <b>Bonus:</b> Because comments live in GitHub Discussions, you get email notifications for new comments for free — no extra configuration needed.
</div>

---

## 📊 Disqus vs giscus at a Glance

| | Disqus | giscus |
|---|---|---|
| **Cost** | Free (with ads) or paid | Free, always |
| **Ads** | Yes, unless you pay | None |
| **Tracking** | Extensive | None |
| **Data ownership** | Disqus owns it | You own it (GitHub) |
| **Login required** | Optional (but noisy) | GitHub account |
| **Page weight** | ~1 MB+ | ~50 KB |
| **Open source** | No | Yes |
| **Self-hostable** | No | Yes |

The only real trade-off with giscus is that readers need a GitHub account to comment. For a developer-focused blog, that's basically everyone already. If your audience is primarily non-developers, this is worth thinking about — but for me it's a non-issue.

---

## 🧹 Removing Disqus

Once giscus was live, I removed the `disqus` settings from `_config.yml` and trimmed the Disqus script from the layout. Less code, fewer dependencies, cleaner page loads.

The old Disqus comments? Disqus lets you [export your comment data](https://help.disqus.com/en/articles/1717164-comments-export) as an XML file, and giscus has a migration path. Mine was sparse enough that I didn't bother, but the option is there if you need it.

---

## 🎉 The Result

Every post on this blog now loads faster, respects your privacy, and has a comment section I'm actually happy to stand behind.

No Disqus ads. No extra trackers. No regrets.

---

*If you've been putting off switching away from Disqus — don't. It genuinely took less time than writing this post.*

*And speaking of comments — the shiny new giscus widget is live right below this paragraph. Sign in with GitHub and say hello. 👇 It would mean a lot to see it in action, and I'd love to hear if you've made (or are considering) the same switch!*
