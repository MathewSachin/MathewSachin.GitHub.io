/**
 * Tests for tools/base64/base64.js
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { encodeBase64, decodeBase64 } from '../src/scripts/tools/base64.js'

// ---------------------------------------------------------------------------
// encodeBase64
// ---------------------------------------------------------------------------

test('encodeBase64: encodes ASCII text to Base64', () => {
  assert.equal(encodeBase64('hello'), 'aGVsbG8=')
})

test('encodeBase64: encodes empty string to empty Base64', () => {
  assert.equal(encodeBase64(''), '')
})

test('encodeBase64: encodes Unicode (emoji) correctly', () => {
  const encoded = encodeBase64('😀')
  assert.ok(encoded.length > 0, 'emoji should produce non-empty output')
  // Round-trip must survive
  assert.equal(decodeBase64(encoded), '😀')
})

test('encodeBase64: encodes multi-byte UTF-8 characters (Japanese)', () => {
  const result = encodeBase64('日本語')
  assert.equal(decodeBase64(result), '日本語')
})

test('encodeBase64: encodes string with special characters', () => {
  const input = 'Hello, World! <>&"'
  assert.equal(decodeBase64(encodeBase64(input)), input)
})

// ---------------------------------------------------------------------------
// decodeBase64
// ---------------------------------------------------------------------------

test('decodeBase64: decodes standard Base64 back to ASCII', () => {
  assert.equal(decodeBase64('aGVsbG8='), 'hello')
})

test('decodeBase64: decodes empty string', () => {
  assert.equal(decodeBase64(''), '')
})

test('decodeBase64: round-trips a long ASCII string', () => {
  const input = 'The quick brown fox jumps over the lazy dog'
  assert.equal(decodeBase64(encodeBase64(input)), input)
})

test('decodeBase64: throws on invalid Base64 input', () => {
  assert.throws(() => decodeBase64('not valid base64!!!'), /Error/)
})
