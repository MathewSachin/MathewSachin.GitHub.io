/**
 * Post-build script: generates HTML redirect pages at the old Jekyll URL format.
 *
 * Jekyll (without a `permalink:` setting) generates posts at:
 *   /blog/YYYY/MM/DD/slug.html
 *
 * Astro (with build.format: 'directory') generates posts at:
 *   /blog/YYYY/MM/DD/slug/index.html  (served at /blog/YYYY/MM/DD/slug/)
 *
 * This script creates /blog/YYYY/MM/DD/slug.html redirect pages that perform
 * an instant meta-refresh + JS redirect to the canonical /blog/YYYY/MM/DD/slug/ URL.
 * This preserves link equity and avoids breaking indexed .html URLs.
 *
 * Run via: npm run generate-html-redirects (called automatically as part of npm run build)
 */

import { readdir, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST_DIR = join(__dirname, '..', 'dist')
const BLOG_DIST = join(DIST_DIR, 'blog')

function makeRedirectHtml(target) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0; url=${target}">
    <link rel="canonical" href="${target}">
    <title>Redirecting…</title>
    <script>window.location.replace(${JSON.stringify(target)});</script>
  </head>
  <body>
    <p>Redirecting to <a href="${target}">${target}</a>…</p>
  </body>
</html>
`
}

/**
 * Recursively walk dist/blog/YYYY/MM/DD/ looking for directories that contain
 * an index.html — these correspond to blog posts at /blog/YYYY/MM/DD/slug/.
 * For each, emit a /blog/YYYY/MM/DD/slug.html redirect file.
 */
async function generateRedirects(baseUrl) {
  let count = 0

  // Walk: dist/blog/<year>/<month>/<day>/<slug>/index.html
  const years = await readdir(BLOG_DIST, { withFileTypes: true })
  for (const year of years.filter(e => e.isDirectory() && /^\d{4}$/.test(e.name))) {
    const yearDir = join(BLOG_DIST, year.name)
    const months = await readdir(yearDir, { withFileTypes: true })
    for (const month of months.filter(e => e.isDirectory())) {
      const monthDir = join(yearDir, month.name)
      const days = await readdir(monthDir, { withFileTypes: true })
      for (const day of days.filter(e => e.isDirectory())) {
        const dayDir = join(monthDir, day.name)
        const slugs = await readdir(dayDir, { withFileTypes: true })
        for (const slug of slugs.filter(e => e.isDirectory())) {
          // canonical URL with trailing slash
          const canonical = `${baseUrl}blog/${year.name}/${month.name}/${day.name}/${slug.name}/`
          // emit <slug>.html file in the day directory (alongside the slug/ dir)
          const htmlFile = join(dayDir, `${slug.name}.html`)
          await writeFile(htmlFile, makeRedirectHtml(canonical), 'utf8')
          count++
        }
      }
    }
  }

  return count
}

// Determine base URL from environment (mirrors astro.config.mjs logic)
const base = process.env.ASTRO_BASE ? `${process.env.ASTRO_BASE}/` : '/'
// Normalise to always have leading and trailing slash
const baseUrl = base.startsWith('/') ? base : `/${base}`

const count = await generateRedirects(baseUrl)
console.log(`HTML redirects generated: ${count} .html redirect files written to dist/blog/`)
