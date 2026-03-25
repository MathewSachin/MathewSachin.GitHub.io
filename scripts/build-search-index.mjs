/**
 * Build script: reads all Jekyll blog posts and generates a pre-built
 * Orama search index (`search-index.json`) for client-side search.
 *
 * Run via: npm run build-search-index
 */

import { create, insert, save } from '@orama/orama'
import matter from 'gray-matter'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const POSTS_DIR = join(REPO_ROOT, 'blog', '_posts')
const OUTPUT_FILE = join(REPO_ROOT, 'search-index.json')
const MAX_CONTENT_LENGTH = 2000

/** Strip common Markdown/HTML syntax to produce plain text for indexing. */
function stripMarkdown(text) {
  return text
    // Remove fenced code blocks entirely (not useful for full-text search)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Remove images and links, keep their text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove headings markup
    .replace(/^#{1,6}\s+/gm, '')
    // Remove emphasis/bold markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Derive the Jekyll URL path from a post filename.
 * Filename pattern: YYYY-MM-DD-slug.md  (M and D may be 1 or 2 digits)
 * Jekyll URL:       /blog/YYYY/MM/DD/slug/
 */
function postUrlFromFilename(filename) {
  const name = basename(filename, '.md')
  const match = name.match(/^(\d{4})-(\d{1,2})-(\d{1,2})-(.+)$/)
  if (!match) return null
  const [, year, month, day, slug] = match
  return `/blog/${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}/${slug}/`
}

async function main() {
  const files = (await readdir(POSTS_DIR)).filter(f => f.endsWith('.md'))

  const db = await create({
    schema: {
      title: 'string',
      url: 'string',
      content: 'string',
      tags: 'string[]',
      date: 'string',
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

    const title = String(frontmatter.title ?? '')
    const tags = Array.isArray(frontmatter.tags)
      ? frontmatter.tags.map(String)
      : frontmatter.tags
        ? [String(frontmatter.tags)]
        : []
    const date = frontmatter.date
      ? String(frontmatter.date).slice(0, 10)
      : file.slice(0, 10)
    const plainContent = stripMarkdown(content).slice(0, MAX_CONTENT_LENGTH)

    await insert(db, { title, url, content: plainContent, tags, date })
    inserted++
  }

  const rawIndex = save(db)
  await writeFile(OUTPUT_FILE, JSON.stringify(rawIndex))
  console.log(`Search index written to search-index.json (${inserted} posts)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
