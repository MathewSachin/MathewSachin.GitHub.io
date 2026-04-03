---
title: "From 'Needs Improvement' to Good Core Web Vitals on a Jekyll Blog"
icon: "fas fa-tachometer-alt"
tags: [jekyll, performance, core-web-vitals, lcp, cls, inp, github-pages, tutorial]
series: blogging-with-jekyll
related:
  - /blog/2026/04/02/adsense-auto-vs-custom-placement
  - /blog/2026/04/02/docker-faster-github-actions
  - /blog/2026/03/12/ai-blog-generation-flow
---

*Google Search Console was reporting "Needs improvement" for INP, LCP, and CLS across this blog. Here's every change that moved all three metrics into the green — without a frontend framework, a build system overhaul, or a CDN subscription.*

<img alt="Google Search Console Core Web Vitals report showing all metrics in the Good range after improvements" src="{{ '/images/core-web-vitals-good.svg' | relative_url }}" width="720" style="display:block;margin:1rem auto;">

## What Core Web Vitals Actually Measure

Before diving into fixes, it's worth being precise about what you're targeting:

| Metric | Measures | Good threshold |
|---|---|---|
| **LCP** — Largest Contentful Paint | How fast the biggest visible element loads | ≤ 2.5 s |
| **CLS** — Cumulative Layout Shift | How much the layout jumps around as the page loads | ≤ 0.1 |
| **INP** — Interaction to Next Paint | How quickly the page responds after a click or keypress | ≤ 200 ms |

A static Jekyll site should, in theory, be fast. No server-side rendering, no databases, pre-built HTML. But "static" doesn't mean "nothing runs in the browser". Every JavaScript library you load, every font that swaps in, every ad that injects content after paint — all of it shows up in these numbers.

The fixes below are grouped by metric. Some of them affect more than one.

---

## LCP: Make the Biggest Element Arrive Faster

### jekyll-picture-tag — Responsive Images at Build Time

The single biggest LCP improvement on this site came from switching to the [`jekyll-picture-tag`](https://rbuchberger.github.io/jekyll_picture_tag/) gem. Before it, every post image was a plain `<img src="large-image.png">` — a full-size PNG regardless of device.

`jekyll-picture-tag` processes images at build time and outputs a `<picture>` element with multiple sources:

```html
<picture>
  <source type="image/webp" srcset="img-400.webp 400w, img-800.webp 800w, img-1200.webp 1200w">
  <source type="image/png" srcset="img-400.png 400w, img-800.png 800w, img-1200.png 1200w">
  <img src="img-800.png" width="800" height="450" alt="...">
</picture>
```

A mobile reader on a 400 px viewport now downloads a 400 px WebP instead of a 1 200 px PNG. On a content-heavy post with several screenshots, this alone cut LCP by roughly a second on 4G-equivalent throttling.

The setup in `_config.yml`:

```yaml
picture:
  source: "images"
  output: "images/generated"
  suppress_warnings: true
```

And in posts, instead of raw Markdown image syntax, a Liquid tag:

{% raw %}
```liquid
{% picture post-image.png --alt "Description" --img class="img-fluid" %}
```
{% endraw %}

The `width` and `height` attributes that `jekyll-picture-tag` outputs are also important for CLS — the browser reserves space for the image before it loads, preventing a layout shift when it arrives.

### HTML/CSS/JS Minification

Minifying the final build reduces the bytes the browser has to parse before it can start rendering. This site uses a custom Jekyll plugin that runs the output through a minifier:

```ruby
# _plugins/minify.rb
Jekyll::Hooks.register :pages, :post_write do |page|
  next unless page.output_ext == ".html"
  page.output = HtmlPress.press(page.output)
end
```

Minifying HTML shaves kilobytes off every page. Minifying inlined CSS and JS (via the same pass) means the render-blocking stylesheet parse completes sooner. The effect on LCP is modest — tens of milliseconds — but it compounds across all pages and all visitors.

---

## CLS: Reserve Space Before Content Loads

### Custom AdSense Placement

Ad injection is one of the most common causes of CLS. When Google's Auto Ads script runs and decides to insert a 250 px banner between two paragraphs, the entire page jumps. That registers as a layout shift.

The fix is to reserve the space statically. The custom ad placement system on this site (covered in detail in {% include post_link.html url="/blog/2026/04/02/adsense-auto-vs-custom-placement" text="the AdSense post" %}) injects ad slots at build time, not runtime. The browser knows the slot exists and how tall it will be before the AdSense script runs. No jump, no CLS contribution.

```css
.in-content-ad ins.adsbygoogle {
  display: block;
  min-height: 100px; /* Reserve space before AdSense fills it */
}
```

Auto Ads, by contrast, create DOM nodes after the initial render. There is no way to reserve space for something whose position you don't know in advance. Switching from Auto Ads to custom placement was the single biggest CLS fix.

### Pintora Diagrams at Build Time

This site uses [Pintora](https://pintorajs.vercel.app/) for sequence diagrams and activity charts in technical posts. The naive approach is to ship the Pintora JavaScript bundle to the browser and render diagrams client-side:

```html
<!-- Before: loads 200 KB of JS, renders after page load → CLS -->
<script src="pintora.umd.js"></script>
<div class="pintora">sequenceDiagram ...</div>
```

This causes CLS in two ways: the diagram area jumps from zero height to full diagram height after JS runs, and the Pintora bundle is large enough to delay LCP.

The alternative is to run Pintora at build time and emit the SVG directly into the HTML. A custom Jekyll plugin handles this:

```ruby
# _plugins/pintora_block.rb
class PintoraBlock < Liquid::Block
  def render(context)
    code = super.strip
    svg = `node _scripts/pintora-render.js #{Shellwords.escape(code)}`
    "<div class=\"pintora-diagram\">#{svg}</div>"
  end
end
Liquid::Template.register_tag('pintora', PintoraBlock)
```

The Node script renders the diagram using Pintora's server-side API and returns the SVG string. The result is embedded in the HTML at build time — no JavaScript required at runtime, no layout shift, and a smaller page weight.

In posts, diagrams are authored in a fenced block:

{% raw %}
```liquid
{% pintora %}
sequenceDiagram
  Browser->>Jekyll: GET /blog/post/
  Jekyll-->>Browser: Static HTML with embedded SVG
{% endpintora %}
```
{% endraw %}

---

## INP: Cut JavaScript Off the Critical Path

INP measures the delay between a user interaction and the browser's next paint. Every byte of JavaScript you load increases the risk that the main thread is busy when an interaction arrives.

### Rouge Instead of highlight.js

Jekyll ships with [Rouge](https://rouge-jneen.net/) — a pure-Ruby syntax highlighter that produces highlighted HTML at build time. highlight.js is a JavaScript library that does the same thing at runtime.

If your `_config.yml` has `highlighter: rouge`, you get syntax-highlighted code blocks with zero JavaScript. If you've added highlight.js to improve themes or add language support, you can remove it entirely — Rouge supports over 200 languages out of the box.

The HTML output is identical in structure (spans with CSS classes), so any highlight.js-compatible CSS theme works with Rouge with minimal adjustments.

Removing highlight.js saves 30–60 KB of JavaScript depending on which language bundle you included. More importantly, it removes a script that parsed and mutated the DOM after initial render — directly improving INP on pages with code blocks.

### clipboard.js for Copy Buttons

Copy buttons on code blocks are a common UX feature, but common implementations are heavy. A full Clipboard API polyfill or a custom event delegation setup can add unnecessary weight to the main-thread JavaScript budget.

[clipboard.js](https://clipboardjs.com/) is 3 KB minified and gzipped. It handles the Clipboard API with a fallback, attaches to any element with a `data-clipboard-target` attribute, and requires one initialisation call:

```js
import ClipboardJS from 'clipboard';
new ClipboardJS('.copy-btn');
```

This replaces a heavier custom implementation that was previously deferring over the page lifecycle. Small numbers, but INP is sensitive to accumulated main-thread work across all scripts.

### Custom TOC Plugin

A table of contents generated by JavaScript — reading the DOM for heading elements and building a list after paint — contributes to both INP and CLS. It runs on the main thread, it modifies the DOM after initial render, and if the sidebar scrolls with the page, it may cause layout recalculations on scroll.

This site uses a custom Jekyll plugin that generates the TOC at build time:

```ruby
# _plugins/toc_generator.rb
class TOCGenerator < Jekyll::Generator
  def generate(site)
    site.posts.docs.each do |post|
      post.data['toc'] = extract_headings(post.content)
    end
  end

  def extract_headings(content)
    content.scan(/^(#{2,4})\s+(.+)$/).map do |level, text|
      { level: level.length, text: text, id: text.downcase.gsub(/\W+/, '-') }
    end
  end
end
```

The TOC data is available in the layout as `page.toc` and rendered as static HTML. No JavaScript DOM traversal, no post-render mutation — just HTML that is in the document from the first byte.

---

## The Combined Effect

Each of these changes is independently measurable. Together they compound:

| Change | Primary metric improved | Mechanism |
|---|---|---|
| `jekyll-picture-tag` | LCP | Smaller images, correct dimensions, WebP |
| HTML/CSS/JS minification | LCP | Less to parse and execute |
| Custom AdSense placement | CLS | Space reserved statically |
| Pintora at build time | CLS, INP | No runtime diagram rendering |
| Rouge instead of highlight.js | INP | Removes DOM-mutating JS |
| clipboard.js | INP | Lightweight clipboard implementation |
| Build-time TOC | CLS, INP | Removes DOM-traversal JS |

The before state on Search Console was "Needs improvement" across all three metrics. After rolling out these changes over a few weeks of deploys, all three metrics moved into the **Good** range in the field data — not just in lab tools like Lighthouse, but in the real-user data that Google actually uses for ranking.

<div class="alert alert-info">
  💡 <b>Lab vs. field data:</b> Lighthouse scores and PageSpeed Insights can look good even when your Search Console field data is poor. The reverse is also true. Field data (Core Web Vitals) reflects real users on real devices and network conditions. Changes that move field data take 28 days to propagate into Search Console reports — be patient and measure across a full cycle.
</div>

## What Didn't Change

It's worth noting what this site deliberately did *not* do in the name of performance:

- **No CDN** — GitHub Pages has adequate global distribution for a personal blog. A CDN subscription is overkill until you have evidence it's the bottleneck.
- **No service worker / offline caching** — Adds complexity and edge cases (stale content) that outweigh the marginal LCP gain on a mostly-text site.
- **No font subsetting** — The system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", ...`) loads instantly because the fonts are already on the device. No web fonts, no font swap CLS.
- **No lazy loading** — Post hero images are above the fold and should load eagerly. Lazy loading the wrong images actively hurts LCP.

Every performance technique has a context where it helps and a context where it adds complexity without meaningful gain. The changes above were the ones that showed up in field data.

---

*If you found this useful and want to dig into any of these implementations, the full build pipeline is covered in the {% include post_link.html url="/blog/2026/04/02/docker-faster-github-actions" text="Docker and CI post" %}. Questions welcome in the comments.*

---

*This post was generated with the assistance of AI as part of an {% include post_link.html url="/blog/2026/03/12/ai-blog-generation-flow" text="automated blogging experiment" %}. The research, curation, and editorial choices were made by an AI agent; any errors are its own.*
