/**
 * Tests for tools/timestamp/timestamp.js  (epochToMs)
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { epochToMs } from '../src/scripts/tools/timestamp.ts'

// ---------------------------------------------------------------------------
// epochToMs — seconds vs milliseconds heuristic
// ---------------------------------------------------------------------------

test('epochToMs: converts seconds to milliseconds for small values', () => {
  // Unix epoch in seconds for 2023-01-01T00:00:00Z
  assert.equal(epochToMs(1672531200), 1672531200 * 1000)
})

test('epochToMs: passes through milliseconds unchanged for large values', () => {
  // Value already in ms: 1672531200000
  assert.equal(epochToMs(1672531200000), 1672531200000)
})

test('epochToMs: threshold is 1e10 (values > 1e10 treated as ms)', () => {
  // Exactly at boundary: 1e10 should be treated as seconds
  assert.equal(epochToMs(1e10), 1e10 * 1000)
  // One above boundary: treated as ms
  assert.equal(epochToMs(1e10 + 1), 1e10 + 1)
})

test('epochToMs: zero returns zero', () => {
  assert.equal(epochToMs(0), 0)
})

test('epochToMs: epoch 0 (Unix epoch) stays at 0 ms', () => {
  assert.equal(new Date(epochToMs(0)).toISOString(), '1970-01-01T00:00:00.000Z')
})

test('epochToMs: known seconds value produces correct Date', () => {
  // 2000-01-01T00:00:00Z = 946684800 seconds
  const ms = epochToMs(946684800)
  assert.equal(new Date(ms).toISOString(), '2000-01-01T00:00:00.000Z')
})
