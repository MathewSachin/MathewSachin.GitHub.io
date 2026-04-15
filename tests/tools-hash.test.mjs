/**
 * Tests for tools/hash/hash.js  (md5, hexFromBuffer, sha)
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { md5, hexFromBuffer, sha } from '../public/tools/hash/hash.js'

// ---------------------------------------------------------------------------
// md5
// ---------------------------------------------------------------------------

test('md5: empty string produces the canonical digest', () => {
  assert.equal(md5(''), 'd41d8cd98f00b204e9800998ecf8427e')
})

test('md5: "hello" produces the canonical digest', () => {
  assert.equal(md5('hello'), '5d41402abc4b2a76b9719d911017c592')
})

test('md5: "The quick brown fox jumps over the lazy dog"', () => {
  assert.equal(md5('The quick brown fox jumps over the lazy dog'), '9e107d9d372bb6826bd81d3542a419d6')
})

test('md5: returns lowercase hex string of length 32', () => {
  const result = md5('test')
  assert.equal(result.length, 32)
  assert.match(result, /^[0-9a-f]{32}$/)
})

test('md5: is deterministic (same input → same output)', () => {
  assert.equal(md5('consistent'), md5('consistent'))
})

test('md5: handles non-ASCII (Unicode) input', () => {
  const result = md5('日本語')
  assert.equal(result.length, 32)
  assert.match(result, /^[0-9a-f]{32}$/)
})

// ---------------------------------------------------------------------------
// hexFromBuffer
// ---------------------------------------------------------------------------

test('hexFromBuffer: converts an ArrayBuffer to a hex string', () => {
  const buf = new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer
  assert.equal(hexFromBuffer(buf), 'deadbeef')
})

test('hexFromBuffer: pads single-nibble bytes with a leading zero', () => {
  const buf = new Uint8Array([0x00, 0x0f, 0xff]).buffer
  assert.equal(hexFromBuffer(buf), '000fff')
})

test('hexFromBuffer: empty buffer returns empty string', () => {
  assert.equal(hexFromBuffer(new Uint8Array([]).buffer), '')
})

// ---------------------------------------------------------------------------
// sha (async, uses Web Crypto)
// ---------------------------------------------------------------------------

test('sha: SHA-256 of empty string matches known value', async () => {
  const result = await sha('SHA-256', '')
  assert.equal(result, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
})

test('sha: SHA-1 of empty string matches known value', async () => {
  const result = await sha('SHA-1', '')
  assert.equal(result, 'da39a3ee5e6b4b0d3255bfef95601890afd80709')
})

test('sha: SHA-256 of "hello" matches known value', async () => {
  const result = await sha('SHA-256', 'hello')
  assert.equal(result, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
})

test('sha: returns a string of correct length for SHA-256', async () => {
  const result = await sha('SHA-256', 'test')
  assert.equal(result.length, 64)
})

test('sha: returns a string of correct length for SHA-1', async () => {
  const result = await sha('SHA-1', 'test')
  assert.equal(result.length, 40)
})
