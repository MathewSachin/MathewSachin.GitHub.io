/**
 * Build script: reads all Jekyll blog posts and tools and generates a pre-built
 * Orama search index (`search-index.json`) for client-side search.
 *
 * Run via: npm run build-search-index
 */

import { create, insert, save } from '@orama/orama'
import matter from 'gray-matter'
import yaml from 'js-yaml'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(__dirname, '..')
// Support both Astro content collections (src/content/blog) and legacy Jekyll path
const ASTRO_POSTS_DIR = join(REPO_ROOT, 'src', 'content', 'blog')
const JEKYLL_POSTS_DIR = join(REPO_ROOT, 'blog', '_posts')
const { existsSync } = await import('node:fs')
const POSTS_DIR = existsSync(ASTRO_POSTS_DIR) && (await import('node:fs').then(m => m.readdirSync(ASTRO_POSTS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx')).length > 0))
  ? ASTRO_POSTS_DIR
  : JEKYLL_POSTS_DIR
const TOOLS_FILE = join(REPO_ROOT, '_data', 'tools.yml')
// Output to public/search-index.json for Astro static output (falls back to repo root for Jekyll)
const PUBLIC_DIR = join(REPO_ROOT, 'public')
const OUTPUT_FILE = existsSync(PUBLIC_DIR)
  ? join(PUBLIC_DIR, 'search-index.json')
  : join(REPO_ROOT, 'search-index.json')
const MAX_CONTENT_LENGTH = 2000

/**
 * Strip common Markdown/HTML syntax to produce plain text for indexing.
 * Order matters: fenced code blocks must be removed before inline code,
 * and HTML tags before link/image syntax so angle brackets don't interfere.
 */
export function stripMarkdown(text) {
  return text
    // Remove fenced and inline code blocks first (their content isn't useful for search)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    // Remove HTML tags (must precede link/image patterns to avoid matching < in attributes)
    .replace(/<[^>]+>/g, ' ')
    // Remove images (![alt](url)) — keep the alt text only
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove links ([text](url)) — keep the link text only
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove ATX heading markers (e.g. ## Section)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove emphasis/bold markers while preserving their content
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove horizontal rules (---, ***, ___)
    .replace(/^[-*_]{3,}\s*$/gm, ' ')
    // Collapse all whitespace to single spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Derive the Jekyll URL path from a post filename.
 * Filename pattern: YYYY-MM-DD-slug.md  (M and D may be 1 or 2 digits)
 * Jekyll URL:       /blog/YYYY/MM/DD/slug/
 */
export function postUrlFromFilename(filename) {
  const name = basename(filename, '.md').replace(/\.mdx$/, '')
  const match = name.match(/^(\d{4})-(\d{1,2})-(\d{1,2})-(.+)$/)
  if (!match) return null
  const [, year, month, day, slug] = match
  return `/blog/${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}/${slug}.html`
}

/**
 * Extract the post date as a YYYY-MM-DD string.
 * Preference order: frontmatter `date` field → filename prefix → first 10 chars of filename.
 */
function parsePostDate(frontmatter, filename) {
  if (frontmatter.date) {
    return String(frontmatter.date).slice(0, 10)
  }
  const dateMatch = filename.match(/^(\d{4})-(\d{1,2})-(\d{1,2})-/)
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
  }
  return filename.slice(0, 10)
}

/** Normalise a frontmatter tags value to a plain string array. */
function toStringArray(value) {
  if (Array.isArray(value)) return value.map(String)
  return value ? [String(value)] : []
}

async function main() {
  const files = (await readdir(POSTS_DIR)).filter(f => f.endsWith('.md') || f.endsWith('.mdx'))

  const db = await create({
    schema: {
      title: 'string',
      url: 'string',
      content: 'string',
      tags: 'string[]',
      date: 'string',
      type: 'string',
    },
  })

  let inserted = 0
  for (const file of files) {
    const url = postUrlFromFilename(file)
    if (!url) {
      console.warn(`Skipping unrecognised filename: ${file}`)
      continue
    }

    const raw = await readFile(join(POSTS_DIR, file), 'utf8')
    const { data: frontmatter, content } = matter(raw)

    const title        = String(frontmatter.title ?? '')
    const tags         = toStringArray(frontmatter.tags)
    const date         = parsePostDate(frontmatter, file)
    const plainContent = stripMarkdown(content).slice(0, MAX_CONTENT_LENGTH)

    await insert(db, { title, url, content: plainContent, tags, date, type: 'post' })
    inserted++
  }

  // Index tools from _data/tools.yml
  const toolsRaw = await readFile(TOOLS_FILE, 'utf8')
  const tools = yaml.load(toolsRaw)
  for (const tool of tools) {
    const url = `/tools/${tool.id}/`
    await insert(db, {
      title: tool.name,
      url,
      content: tool.description,
      tags: [],
      date: '',
      type: 'tool',
    })
    inserted++
  }

  const rawIndex = save(db)
  const serialised = JSON.stringify(rawIndex)
  await writeFile(OUTPUT_FILE, serialised)
  // Also write to repo root so unit tests (which look for search-index.json there) can find it
  if (OUTPUT_FILE !== join(REPO_ROOT, 'search-index.json')) {
    await writeFile(join(REPO_ROOT, 'search-index.json'), serialised)
  }
  console.log(`Search index written to search-index.json (${inserted} entries)`)
}

// Only run when executed directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
