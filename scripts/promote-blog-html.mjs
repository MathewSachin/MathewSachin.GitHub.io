/**
 * promote-blog-html.mjs
 *
 * Post-build script: promotes Astro's directory-format blog post outputs
 * to flat .html files, matching the Jekyll-era URL scheme.
 *
 * Astro (build.format: 'directory') generates:
 *   dist/blog/YYYY/MM/DD/slug/index.html
 *
 * This script renames them to:
 *   dist/blog/YYYY/MM/DD/slug.html
 *
 * Only blog post paths (matching /blog/YYYY/MM/DD/slug/) are promoted.
 * Series, tag, archive and pagination pages remain as directory indexes.
 *
 * The internal links in the site already use .html URLs (postUrlFromId returns
 * /blog/YYYY/MM/DD/slug.html), so no redirect stubs are needed.
 */

import { readdirSync, renameSync, rmdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const BLOG_DIST = join(REPO_ROOT, 'dist', 'blog');

/** Returns true if the string looks like a 4-digit year */
function isYear(s) { return /^\d{4}$/.test(s); }
/** Returns true if the string looks like a 1-2 digit month */
function isMonth(s) { return /^\d{1,2}$/.test(s); }
/** Returns true if the string looks like a 1-2 digit day */
function isDay(s) { return /^\d{1,2}$/.test(s); }

/**
 * Walk dist/blog/ and promote only slug directories at the YYYY/MM/DD/slug level.
 */
function promoteBlogPosts(blogDir) {
  let years;
  try { years = readdirSync(blogDir, { withFileTypes: true }); } catch { return; }

  for (const yearEntry of years) {
    if (!yearEntry.isDirectory() || !isYear(yearEntry.name)) continue;
    const yearDir = join(blogDir, yearEntry.name);
    let months;
    try { months = readdirSync(yearDir, { withFileTypes: true }); } catch { continue; }

    for (const monthEntry of months) {
      if (!monthEntry.isDirectory() || !isMonth(monthEntry.name)) continue;
      const monthDir = join(yearDir, monthEntry.name);
      let days;
      try { days = readdirSync(monthDir, { withFileTypes: true }); } catch { continue; }

      for (const dayEntry of days) {
        if (!dayEntry.isDirectory() || !isDay(dayEntry.name)) continue;
        const dayDir = join(monthDir, dayEntry.name);
        let slugs;
        try { slugs = readdirSync(dayDir, { withFileTypes: true }); } catch { continue; }

        for (const slugEntry of slugs) {
          if (!slugEntry.isDirectory()) continue;
          const slugDir = join(dayDir, slugEntry.name);
          const indexHtml = join(slugDir, 'index.html');
          try { statSync(indexHtml); } catch { continue; } // no index.html

          const target = join(dayDir, `${slugEntry.name}.html`);
          renameSync(indexHtml, target);
          try { rmdirSync(slugDir); } catch { /* ignore */ }
          console.log(`  promoted: blog/${yearEntry.name}/${monthEntry.name}/${dayEntry.name}/${slugEntry.name}.html`);
        }
      }
    }
  }
}

console.log('Promoting blog post HTML files to .html format…');
promoteBlogPosts(BLOG_DIST);
console.log('Done.');
