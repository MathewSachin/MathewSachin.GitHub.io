/**
 * Unit tests for tools/captura/js/storage.js  (dateStamp)
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { dateStamp } from '../tools/captura/js/storage.js'

// ---------------------------------------------------------------------------
// dateStamp
// ---------------------------------------------------------------------------

test('dateStamp: returns a string', () => {
  assert.equal(typeof dateStamp(), 'string')
})

test('dateStamp: length is 19 characters (YYYY-MM-DDTHH-MM-SS)', () => {
  assert.equal(dateStamp().length, 19)
})

test('dateStamp: contains no colons', () => {
  assert.ok(!dateStamp().includes(':'), 'colons should be replaced with dashes')
})

test('dateStamp: contains no dots', () => {
  assert.ok(!dateStamp().includes('.'), 'dots should be replaced with dashes')
})

test('dateStamp: matches the YYYY-MM-DDTHH-MM-SS pattern', () => {
  assert.match(dateStamp(), /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/)
})

test('dateStamp: year portion reflects the current year', () => {
  const stamp = dateStamp()
  const year = parseInt(stamp.slice(0, 4), 10)
  assert.ok(year >= 2024, `expected year >= 2024, got ${year}`)
})

test('dateStamp: successive calls return the same or later timestamp', () => {
  const first  = dateStamp()
  const second = dateStamp()
  assert.ok(first <= second, 'timestamps should be non-decreasing')
})
