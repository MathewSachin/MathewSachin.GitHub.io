---
title: "How I Set Up Live PR Previews for This Jekyll Site on GitHub Pages"
icon: "fas fa-code-branch"
tags: [github-actions, ci-cd, jekyll, github-pages, devops, tutorial]
series: blogging-with-jekyll
related:
  - /blog/2026/03/25/how-site-search-works
  - /blog/2026/03/12/ai-blog-generation-flow
  - /blog/2026/03/12/ditching-disqus-for-giscus
---

*Every pull request on this blog automatically gets a live, browsable preview — deployed to a real URL, no staging server required. Here's the complete setup and why it matters.*

## The Problem: Testing Changes Blind

Static sites are great. No database, no backend, no runtime surprises. But that simplicity creates a blind spot during development: you can't see your changes running in production until you actually deploy to production.

For a personal blog, that might sound fine — just push to main and see what happens. But it's not ideal:

| Scenario | The risk |
|---|---|
| New blog post with a pintora diagram | Might render incorrectly after minification |
| Layout change touching CSS | Could break other pages you didn't check |
| Jekyll plugin upgrade | Subtle rendering differences you won't catch locally |
| Baseurl-sensitive links | Works on localhost, breaks on GitHub Pages |

The standard fix for this is a **staging environment** — a separate deployment you can inspect before promoting changes to production. But spinning up and maintaining a whole separate server for a static blog feels wildly over-engineered.

The better answer is **PR previews**: a temporary, isolated deployment of exactly what's in your pull request, automatically created every time you open or push to a PR.

## How It Works on This Site

Every PR gets a live preview at:

```
https://mathewsachin.github.io/pr-preview/pr-{NUMBER}/
```

The preview is:
- **Automatically created** when a PR is opened or updated
- **Automatically updated** on every new commit to the PR branch
- **Automatically deleted** when the PR is closed or merged
- **Hosted in the same `gh-pages` branch** as the production site — no extra infrastructure

All of this is wired up in three GitHub Actions workflow files.

## The Three-Workflow Architecture

<pre class="pintora">
activityDiagram
  partition "pr-preview.yml" {
    :PR opened / pushed;
    :baseurl = /pr-preview/pr-N;
    :preview = true;
    group "build-site.yml (reusable workflow)" {
      :npm ci + npm run build;
      :Inject baseurl into _config.yml;
      :Disable Google Analytics;
      :jekyll build;
      :Upload site artifact;
    }
    :Deploy preview;
  }
  partition "deploy.yml" {
    :Push to main;
    :baseurl = empty;
    :preview = false;
    group "build-site.yml (reusable workflow)" {
      :npm ci + npm run build;
      :Inject baseurl into _config.yml;
      :jekyll build;
      :Upload site artifact;
    }
    :Deploy to gh-pages root;
  }
</pre>

The key design decision is that `build-site.yml` is a **reusable workflow** (`workflow_call`). Both the PR preview workflow and the production deploy workflow call it — they just pass different inputs.

## build-site.yml: The Reusable Build

```yaml
on:
  workflow_call:
    inputs:
      baseurl:
        description: 'Optional baseurl to inject into _config.yml'
        type: string
        default: ''
      preview:
        description: 'Whether this is a PR preview build (disables Google Analytics)'
        type: boolean
        default: false
```

It accepts two inputs:

- **`baseurl`** — for previews this is `/pr-preview/pr-42`; for production it's empty. This gets appended to `_config.yml` at build time so every `relative_url` filter in Jekyll produces the right path.
- **`preview`** — when `true`, a second line is appended to `_config.yml`: `google-analytics: false`. You don't want preview traffic polluting your analytics.

The baseurl injection is a one-liner:

```yaml
- name: Set baseurl
  if: inputs.baseurl != ''
  env:
    BASEURL: ${{ inputs.baseurl }}
  run: |
    echo "baseurl: $BASEURL" >> _config.yml
```

Appending to `_config.yml` works because Jekyll takes the last value when a key appears more than once. The original file has no `baseurl` key, so this cleanly adds it for the build.

## pr-preview.yml: The Preview Trigger

```yaml
on:
  pull_request:
    types:
      - opened
      - reopened
      - synchronize
      - closed

concurrency: preview-${{ github.ref }}
```

The `concurrency` key ensures that rapid successive pushes to a PR don't trigger parallel preview deployments that stomp on each other. The second run waits for the first to finish (or cancels it, depending on your config).

The actual deployment is handled by [rossjrw/pr-preview-action](https://github.com/rossjrw/pr-preview-action):

```yaml
- name: Deploy PR preview
  uses: rossjrw/pr-preview-action@v1
  with:
    source-dir: ./_site
    preview-branch: gh-pages
    pages-base-url: MathewSachin.github.io
```

This action does several things automatically:

1. **Creates** a subdirectory `/pr-preview/pr-{NUMBER}` in the `gh-pages` branch and pushes the built site into it
2. **Posts a comment** on the PR with a link to the preview URL
3. **Updates** that comment on every subsequent push
4. **Tears down** the subdirectory and updates the comment to say "preview removed" when the PR is closed

## deploy.yml: Keeping Previews Safe During Production Deploy

The production deploy uses [JamesIves/github-pages-deploy-action](https://github.com/JamesIves/github-pages-deploy-action), which by default wipes the `gh-pages` branch clean before deploying. That would delete every live preview.

The fix is one line:

```yaml
- name: Deploy to gh-pages branch
  uses: JamesIves/github-pages-deploy-action@v4
  with:
    folder: ./_site
    branch: gh-pages
    clean-exclude: pr-preview
```

`clean-exclude: pr-preview` tells the action to leave the `pr-preview/` directory untouched during its cleanup pass. PR previews survive production deployments.

## What Actually Gets Tested

Because the preview is a full production build — same Jekyll version, same plugins, same minification, same `JEKYLL_ENV=production` flag — it catches problems that a local `jekyll serve` won't.

Things that have actually been caught in preview before they hit production:

- **Broken relative URLs** — a link that works locally (`/blog/...`) but resolves incorrectly under the preview baseurl, revealing a hardcoded path that should have used `relative_url`
- **Minification quirks** — `jekyll-minifier` processing JavaScript differently in production mode than in development
- **Image processing** — `jekyll_picture_tag` generating images with the right dimensions but wrong paths when baseurl changes
- **Pintora diagrams** — the JS-rendered diagrams look fine in dev but can have sizing issues when the layout CSS is minified

The preview acts as a complete end-to-end test of the deployment pipeline itself, not just the content.

## The Cost: Zero

The entire setup runs on GitHub Actions free tier. For a public repository, GitHub Actions minutes are unlimited. The `gh-pages` branch storage cost is negligible — each PR preview is just a folder of static HTML/CSS/JS, a few hundred KB at most, and it's deleted when the PR closes.

No Netlify subscription. No Vercel project. No Cloudflare Pages configuration. Just the same GitHub Pages hosting the production site already uses, with a clever subdirectory trick.

## Summary

| Component | Role |
|---|---|
| `build-site.yml` | Reusable build; accepts `baseurl` and `preview` inputs |
| `pr-preview.yml` | Triggers on PR events; builds with PR-specific baseurl; deploys via rossjrw/pr-preview-action |
| `deploy.yml` | Production deploy; uses `clean-exclude: pr-preview` to preserve live previews |
| `rossjrw/pr-preview-action` | Manages the `gh-pages` subdirectory and PR comments |
| `JamesIves/github-pages-deploy-action` | Production deploy action with selective cleanup |

The whole thing is about 100 lines of YAML across three files. For a Jekyll site hosted on GitHub Pages, it's the lowest-friction way to get staging-quality previews on every PR.
