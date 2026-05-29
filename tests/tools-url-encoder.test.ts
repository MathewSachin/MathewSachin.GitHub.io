/**
 * Tests for tools/url-encoder/url-encoder.ts
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { encodeUrl, decodeUrl } from '../src/scripts/tools/url-encoder.ts'

// ---------------------------------------------------------------------------
// encodeUrl
// ---------------------------------------------------------------------------

test('encodeUrl: encodes a space as %20', () => {
  assert.equal(encodeUrl('hello world'), 'hello%20world')
})

test('encodeUrl: encodes empty string to empty string', () => {
  assert.equal(encodeUrl(''), '')
})

test('encodeUrl: encodes special URL characters', () => {
  assert.equal(encodeUrl('a=1&b=2'), 'a%3D1%26b%3D2')
})

test('encodeUrl: encodes a slash', () => {
  assert.equal(encodeUrl('foo/bar'), 'foo%2Fbar')
})

test('encodeUrl: leaves unreserved characters unchanged', () => {
  const safe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*\'()'
  assert.equal(encodeUrl(safe), safe)
})

test('encodeUrl: encodes Unicode (emoji) correctly', () => {
  const result = encodeUrl('😀')
  assert.ok(result.startsWith('%'), 'emoji should be percent-encoded')
  assert.equal(decodeUrl(result), '😀')
})

test('encodeUrl: encodes multi-byte UTF-8 characters (Japanese)', () => {
  const result = encodeUrl('日本語')
  assert.equal(decodeUrl(result), '日本語')
})

// ---------------------------------------------------------------------------
// decodeUrl
// ---------------------------------------------------------------------------

test('decodeUrl: decodes %20 back to a space', () => {
  assert.equal(decodeUrl('hello%20world'), 'hello world')
})

test('decodeUrl: decodes empty string', () => {
  assert.equal(decodeUrl(''), '')
})

test('decodeUrl: round-trips a URL with query parameters', () => {
  const input = 'search query: foo & bar=baz'
  assert.equal(decodeUrl(encodeUrl(input)), input)
})

test('decodeUrl: decodes + as a literal plus sign (not a space)', () => {
  assert.equal(decodeUrl('+'), '+')
})

test('decodeUrl: throws on malformed percent-escape sequence', () => {
  assert.throws(() => decodeUrl('%GG'), /URI/)
})

test('decodeUrl: throws on a lone trailing percent sign', () => {
  assert.throws(() => decodeUrl('bad%'), /URI/)
})
