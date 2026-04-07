/**
 * Tests for the search index build script and the generated search-index.json.
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { create, load, search } from '@orama/orama'

import {
  stripMarkdown,
  postUrlFromFilename,
  parsePostDate,
  toStringArray,
} from '../scripts/build-search-index.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')

// ---------------------------------------------------------------------------
// Unit tests: stripMarkdown
// ---------------------------------------------------------------------------

test('stripMarkdown: removes fenced code blocks', () => {
  const input = 'Before\n```js\nconst x = 1;\n```\nAfter'
  const result = stripMarkdown(input)
  assert.ok(!result.includes('const x'), 'code block content should be removed')
  assert.ok(result.includes('Before'), 'text before block should remain')
  assert.ok(result.includes('After'), 'text after block should remain')
})

test('stripMarkdown: removes inline code', () => {
  const result = stripMarkdown('Use `npm install` to install')
  assert.ok(!result.includes('`'), 'backticks should be removed')
  assert.ok(result.includes('Use'), 'surrounding text should remain')
})

test('stripMarkdown: removes HTML tags', () => {
  const result = stripMarkdown('<div class="alert">Hello</div>')
  assert.ok(!result.includes('<div'), 'HTML open tag should be removed')
  assert.ok(!result.includes('</div>'), 'HTML close tag should be removed')
  assert.ok(result.includes('Hello'), 'inner text should remain')
})

test('stripMarkdown: keeps link text, removes URL', () => {
  const result = stripMarkdown('[click here](https://example.com)')
  assert.ok(result.includes('click here'), 'link text should be kept')
  assert.ok(!result.includes('https://example.com'), 'link URL should be removed')
})

test('stripMarkdown: keeps image alt text, removes URL', () => {
  const result = stripMarkdown('![a diagram](images/diagram.png)')
  assert.ok(result.includes('a diagram'), 'image alt text should be kept')
  assert.ok(!result.includes('images/diagram.png'), 'image URL should be removed')
})

test('stripMarkdown: removes heading markup', () => {
  const result = stripMarkdown('## Section Title\n### Sub-section')
  assert.ok(!result.includes('#'), 'heading hashes should be removed')
  assert.ok(result.includes('Section Title'), 'heading text should remain')
})

test('stripMarkdown: removes bold and italic markers', () => {
  const result = stripMarkdown('This is **bold** and _italic_ text')
  assert.ok(!result.includes('**'), '** markers should be removed')
  assert.ok(!result.includes('_italic_'), '_ markers should be removed')
  assert.ok(result.includes('bold'), 'bold text should remain')
  assert.ok(result.includes('italic'), 'italic text should remain')
})

test('stripMarkdown: collapses whitespace', () => {
  const result = stripMarkdown('word1   \n\n   word2')
  assert.equal(result, 'word1 word2')
})

test('stripMarkdown: returns empty string for empty input', () => {
  assert.equal(stripMarkdown(''), '')
})

test('stripMarkdown: removes horizontal rules', () => {
  const result = stripMarkdown('Before\n---\nAfter')
  assert.ok(!result.includes('---'), 'horizontal rule (---) should be removed')
  assert.ok(result.includes('Before'), 'text before rule should remain')
  assert.ok(result.includes('After'), 'text after rule should remain')
})

test('stripMarkdown: removes single-asterisk emphasis', () => {
  const result = stripMarkdown('This is *italic* text')
  assert.ok(!result.includes('*'), '* markers should be removed')
  assert.ok(result.includes('italic'), 'italic text should remain')
})

test('stripMarkdown: removes bold-italic triple markers', () => {
  const result = stripMarkdown('This is ***important*** text')
  assert.ok(!result.includes('***'), '*** markers should be removed')
  assert.ok(result.includes('important'), 'bold-italic text should remain')
})

test('stripMarkdown: handles multiple consecutive fenced code blocks', () => {
  const input = '```js\ncode1\n```\nMiddle\n```py\ncode2\n```'
  const result = stripMarkdown(input)
  assert.ok(!result.includes('code1'), 'first code block content should be removed')
  assert.ok(!result.includes('code2'), 'second code block content should be removed')
  assert.ok(result.includes('Middle'), 'text between blocks should remain')
})

// ---------------------------------------------------------------------------
// Unit tests: postUrlFromFilename
// ---------------------------------------------------------------------------

test('postUrlFromFilename: generates correct URL from standard filename', () => {
  assert.equal(
    postUrlFromFilename('2016-11-5-chrome-dino-hack.md'),
    '/blog/2016/11/05/chrome-dino-hack.html'
  )
})

test('postUrlFromFilename: zero-pads single-digit month and day', () => {
  assert.equal(
    postUrlFromFilename('2023-04-09-captura-unmaintained.md'),
    '/blog/2023/04/09/captura-unmaintained.html'
  )
})

test('postUrlFromFilename: handles two-digit month and day', () => {
  assert.equal(
    postUrlFromFilename('2017-12-31-year-end-review.md'),
    '/blog/2017/12/31/year-end-review.html'
  )
})

test('postUrlFromFilename: handles full path, uses only basename', () => {
  assert.equal(
    postUrlFromFilename('blog/_posts/2023-04-02-pure-functions.md'),
    '/blog/2023/04/02/pure-functions.html'
  )
})

test('postUrlFromFilename: returns null for non-matching filename', () => {
  assert.equal(postUrlFromFilename('README.md'), null)
  assert.equal(postUrlFromFilename('about.md'), null)
  assert.equal(postUrlFromFilename('not-a-post.md'), null)
})

// ---------------------------------------------------------------------------
// Unit tests: parsePostDate
// ---------------------------------------------------------------------------

test('parsePostDate: uses frontmatter date when present', () => {
  assert.equal(parsePostDate({ date: '2023-06-15T12:00:00Z' }, '2023-06-15-my-post.md'), '2023-06-15')
})

test('parsePostDate: frontmatter date as plain string is sliced to 10 chars', () => {
  assert.equal(parsePostDate({ date: '2022-01-01' }, 'any-file.md'), '2022-01-01')
})

test('parsePostDate: falls back to filename prefix when no frontmatter date', () => {
  assert.equal(parsePostDate({}, '2021-03-07-some-slug.md'), '2021-03-07')
})

test('parsePostDate: pads single-digit month and day from filename', () => {
  assert.equal(parsePostDate({}, '2020-5-3-hello.md'), '2020-05-03')
})

test('parsePostDate: uses first 10 chars of filename when no date pattern matches', () => {
  assert.equal(parsePostDate({}, 'ABCDEFGHIJKLMNO.md'), 'ABCDEFGHIJ')
})

test('parsePostDate: frontmatter date takes priority over filename date', () => {
  assert.equal(parsePostDate({ date: '1999-12-31' }, '2000-01-01-slug.md'), '1999-12-31')
})

// ---------------------------------------------------------------------------
// Unit tests: toStringArray
// ---------------------------------------------------------------------------

test('toStringArray: converts an array of strings unchanged', () => {
  assert.deepEqual(toStringArray(['a', 'b', 'c']), ['a', 'b', 'c'])
})

test('toStringArray: converts an array of mixed types to strings', () => {
  assert.deepEqual(toStringArray([1, true, null]), ['1', 'true', 'null'])
})

test('toStringArray: wraps a single string value in an array', () => {
  assert.deepEqual(toStringArray('javascript'), ['javascript'])
})

test('toStringArray: wraps a non-string scalar in an array', () => {
  assert.deepEqual(toStringArray(42), ['42'])
})

test('toStringArray: returns empty array for undefined', () => {
  assert.deepEqual(toStringArray(undefined), [])
})

test('toStringArray: returns empty array for null', () => {
  assert.deepEqual(toStringArray(null), [])
})

test('toStringArray: returns empty array for empty string', () => {
  assert.deepEqual(toStringArray(''), [])
})

// ---------------------------------------------------------------------------
// Integration test: generated search-index.json
// ---------------------------------------------------------------------------

test('search-index.json: file exists and contains valid JSON', async () => {
  const raw = await readFile(join(REPO_ROOT, 'search-index.json'), 'utf8')
  const parsed = JSON.parse(raw)
  // Orama serialised index always has these top-level keys
  assert.ok('internalDocumentIDStore' in parsed, 'index should have internalDocumentIDStore')
  assert.ok('index' in parsed, 'index should have index field')
  assert.ok('docs' in parsed, 'index should have docs field')
})

test('search-index.json: can be loaded and searched with Orama', async () => {
  const schema = {
    title: 'string',
    url: 'string',
    content: 'string',
    tags: 'string[]',
    date: 'string',
  }
  const raw = JSON.parse(await readFile(join(REPO_ROOT, 'search-index.json'), 'utf8'))
  const db = await create({ schema })
  load(db, raw)

  // Known post: Chrome Dino Hack
  const results = await search(db, { term: 'chrome dino', properties: ['title', 'content'] })
  assert.ok(results.hits.length > 0, 'search should return results for "chrome dino"')
  const urls = results.hits.map(h => h.document.url)
  assert.ok(
    urls.some(u => u.includes('chrome-dino-hack')),
    'expected chrome-dino-hack post in results'
  )
})

test('search-index.json: every entry has required fields', async () => {
  const schema = {
    title: 'string',
    url: 'string',
    content: 'string',
    tags: 'string[]',
    date: 'string',
  }
  const raw = JSON.parse(await readFile(join(REPO_ROOT, 'search-index.json'), 'utf8'))
  const db = await create({ schema })
  load(db, raw)

  // Retrieve all documents via a broad search
  const results = await search(db, { term: '', limit: 100 })
  assert.ok(results.hits.length > 0, 'index should contain at least one entry')

  for (const hit of results.hits) {
    const doc = hit.document
    assert.ok(typeof doc.title === 'string', `title should be a string (got ${typeof doc.title})`)
    assert.ok(typeof doc.url === 'string', `url should be a string (got ${typeof doc.url})`)
    assert.ok(typeof doc.content === 'string', `content should be a string (got ${typeof doc.content})`)
    assert.ok(Array.isArray(doc.tags), `tags should be an array (got ${typeof doc.tags})`)
    assert.ok(typeof doc.date === 'string', `date should be a string (got ${typeof doc.date})`)
    assert.match(doc.url, /^\/blog\/\d{4}\/\d{2}\/\d{2}\//, 'url should match /blog/YYYY/MM/DD/ format')
    assert.match(doc.date, /^\d{4}-\d{2}-\d{2}$/, 'date should be in YYYY-MM-DD format')
  }
})
