import type { Series } from './types'

export const bloggingWithJekyllSeries: Series = {
    name: 'Blogging with Jekyll',
    url: '/blog/series/blogging-with-jekyll/',
    description:
      'A {count}-part series on building and running a Jekyll blog hosted on GitHub Pages — from automating posts with AI to adding offline search, comments, live PR previews, ads, faster CI builds, Good Core Web Vitals, and deep reader engagement analytics. Each part is a standalone deep-dive you can apply to your own site.',
    levels: [
      {
        title: 'Level 1 — Writing & Automation',
        icon: 'fas fa-pencil-alt',
        intro:
          "Before you optimise anything, you need a fast, frictionless way to write and publish. This post shows how to go from a prompt on your phone to a live blog post in minutes — no laptop, no manual deployments.",
        posts: [
          { id: '/blog/2026/03/12/ai-blog-generation-flow' },
          { id: '/blog/2026/04/04/trigger-copilot-from-github-actions' },
        ],
      },
      {
        title: 'Level 2 — Reader Features',
        icon: 'fas fa-users',
        intro: "A static site doesn't have to feel static to readers. These two posts add a fully-featured comment section and instant full-text search — both running entirely in the browser with zero backend or cloud subscription required.",
        posts: [
          { id: '/blog/2026/03/12/ditching-disqus-for-giscus' },
          { id: '/blog/2026/03/25/how-site-search-works' },
        ],
      },
      {
        title: 'Level 3 — Dev Workflow & Operations',
        icon: 'fas fa-cogs',
        intro: 'The finishing touches that turn a hobby blog into a well-oiled publishing platform. Live PR previews so you can review every post before it goes live, controlled ad placement instead of Google putting ads wherever it likes, and a custom Docker image that cuts CI build times dramatically.',
        posts: [
          { id: '/blog/2026/04/01/pr-preview-setup' },
          { id: '/blog/2026/04/02/adsense-auto-vs-custom-placement' },
          { id: '/blog/2026/04/02/docker-faster-github-actions' },
        ],
      },
      {
        title: 'Level 4 — Performance',
        icon: 'fas fa-tachometer-alt',
        intro: "A fast site is a better site — for readers, for search ranking, and for Core Web Vitals. This post covers every change that moved this blog from 'Needs improvement' to Good on LCP, CLS, and INP: responsive images, build-time diagrams, minification, and removing runtime JavaScript.",
        posts: [
          { id: '/blog/2026/04/03/core-web-vitals-jekyll' },
        ],
      },
      {
        title: 'Level 5 — Analytics & Engagement',
        icon: 'fas fa-chart-line',
        intro: "Pageviews tell you someone opened a tab — they don't tell you whether anyone read a word. This post instruments every 'invisible' reader behaviour: scroll depth, code interaction, viewport entry, social shares, and search, using only GA4 custom events and vanilla JavaScript.",
        posts: [
          { id: '/blog/2026/04/04/beyond-pageviews-tracking-engagement' },
        ],
      },
    ],
  }
