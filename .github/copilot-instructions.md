# Copilot Instructions for MathewSachin.GitHub.io

This is a Jekyll-based personal blog and tools site hosted on GitHub Pages.

## Repository Structure

- `blog/_posts/` — Blog posts in Markdown (filename: `YYYY-MM-DD-slug.md`)
- `blog/series/` — Series index pages (one subdirectory per series)
- `_data/series.yml` — Series metadata: names, descriptions, levels, post lists, and **post counts**
- `_data/` — Other data files (`projects.yml`, `popular_pages.yml`, etc.)
- `_layouts/` — Jekyll layouts (`post.html`, `tool.html`, `series.html`, etc.)
- `_includes/` — Reusable Jekyll partials
- `_plugins/` — Custom Ruby plugins
- `tools/` — Browser-based tools (each in its own subdirectory with `index.html` + a separate JS file)
- `tests/` — Tests:
  - `tests/*.test.mjs` — Node.js unit tests (run with `npm test`)
  - `tests/e2e/*.spec.mjs` — Playwright end-to-end tests (run with `npm run test:e2e`)
  - `spec/` — RSpec Ruby plugin tests (run with `npm run test:ruby`)
- `styles/` — CSS files
- `scripts/` — Build scripts and the bundled Orama search JS
- `playwright.config.mjs` — Playwright config; base URL is `http://localhost:4000`; webServer serves `_site/`

## Blog Posts

### Front Matter

Every post requires these front-matter fields:

```yaml
---
title: "Post Title"
icon: "fas fa-icon-name"        # FontAwesome icon class
tags: [tag1, tag2]
# Optional but encouraged:
series: series-key              # key from _data/series.yml
related:                        # list of related post URLs
  - /blog/YYYY/MM/DD/slug
accent_color: "#RRGGBB"         # brand colour (see below)
---
```

### Accent Colours

When a post is about a well-known tool or website, set `accent_color` in the front matter to match that platform's brand colour. Examples already in use:

| Platform | `accent_color` |
|---|---|
| Wordle / NYT Games (green) | `#538D4E` |
| Instagram | `#C13584` |
| Twitter / X | `#1D9BF0` |
| YouTube | `#CC0000` |
| Reddit | `#FF4500` |
| WhatsApp (classic green) | `#25D366` |
| WhatsApp Web (teal) | `#00a884` |
| NYT Connections (purple) | `#6750A4` |
| NYT Spelling Bee (yellow) | `#fce83a` |
| NYT Strands (light blue) | `#bce4f4` |
| Infinite Craft (pink) | `#f38ba8` |
| Docker | `#0db7ed` |
| GitHub / Copilot | `#24292e` |

### Series Posts

When adding a post to a series:

1. Add `series: <series-key>` to the post's front matter.
2. Add the post's `id` (its URL path, e.g. `/blog/2026/04/10/my-post`) to the correct level in `_data/series.yml`.
3. **Update the post count** in the series description in `_data/series.yml` (e.g. "A 9-part series" → "A 10-part series"). The count is the total number of `posts` entries across all levels.
4. The series index page (`blog/series/<key>/index.md`) renders dynamically from `_data/series.yml`, so no changes are needed there.

## Tools

Each tool lives in `tools/<name>/` with:
- `index.html` — Jekyll page with `layout: tool` front matter
- `<name>.js` — **All interactive JavaScript in a separate file** (never inline in the HTML)

Write Playwright tests for every tool in `tests/e2e/<name>.spec.mjs`.

## Interactive JS in Blog Posts

When a blog post includes interactive JavaScript widgets (sliders, buttons, live code generators, etc.):
- Put the JS in a **separate file** alongside the post or in `blog/` (e.g. `blog/chrome-dino-hack.js`).
- Reference it with a `<script src="...">` tag in the post, not inline `<script>` blocks.
- Write Playwright tests in `tests/e2e/<post-slug>.spec.mjs` to verify the interactive behaviour.

## Testing

| Command | What it runs |
|---|---|
| `npm test` | Node.js unit tests (`tests/*.test.mjs`) |
| `npm run test:e2e` | Playwright e2e tests (`tests/e2e/*.spec.mjs`) — requires `_site/` to exist |
| `npm run test:ruby` | RSpec tests for Ruby plugins (`spec/`) |

Playwright tests require the Jekyll site to be built first (`bundle exec jekyll build`). The `playwright.config.mjs` serves `_site/` via `python3 -m http.server 4000`.

## Building the Site

```bash
npm ci
npm run build             # bundles Orama JS + builds search index
bundle install
bundle exec jekyll build  # outputs to _site/
```

The CI Docker image (`ghcr.io/mathewsachin/mathewsachin-github-io-ci:latest`) has all dependencies pre-baked.

## Verifying Functional Changes

For any change beyond plain text content (new layouts, JS widgets, CSS, tools, plugins):

1. Build the site locally **or** open the PR so the `pr-preview` GitHub Actions workflow deploys a live preview URL.
2. Navigate to the relevant pages in the preview to confirm the changes look and behave correctly before merging.

The PR preview workflow triggers automatically on every push to a PR branch and posts a comment with the preview URL.

## Code Changes → Raise a PR

All code changes (anything that is not a self-contained blog post with no interactive JS) must go through a pull request so the build, tests, and PR preview run via GitHub Actions.

## Linting / HTML Proofer

The build pipeline runs `htmlproofer` on the generated `_site/`. Ensure all internal links are valid and no `href` targets are broken.

## Jekyll Configuration Notes

- `_config.yml` controls plugins, pagination (`paginate: 10`), TOC settings, and ad density.
- `ads: true` and `toc: true` are set as defaults for all posts in `_config.yml`; override per-post if needed.
- `jekyll-minifier` minifies HTML/CSS/JS output (excludes `dino/offline.js`, `scripts/orama.js`, `tools/llm/llm.js`).
- `jekyll-picture-tag` generates responsive images from `images/` → `generated/`.
