/**
 * Tests for tools/json/json-formatter.js
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { formatJson } from '../public/tools/json/json-formatter.js'

// ---------------------------------------------------------------------------
// formatJson — formatting (indent = 2)
// ---------------------------------------------------------------------------

test('formatJson: pretty-prints a JSON object', () => {
  const { output, error } = formatJson('{"a":1,"b":2}', 2)
  assert.equal(error, null)
  assert.equal(output, JSON.stringify({ a: 1, b: 2 }, null, 2))
})

test('formatJson: pretty-prints a JSON array', () => {
  const { output, error } = formatJson('[1,2,3]', 2)
  assert.equal(error, null)
  assert.equal(output, JSON.stringify([1, 2, 3], null, 2))
})

// ---------------------------------------------------------------------------
// formatJson — minifying (indent = 0)
// ---------------------------------------------------------------------------

test('formatJson: minifies already-formatted JSON', () => {
  const input = JSON.stringify({ key: 'value', arr: [1, 2] }, null, 2)
  const { output, error } = formatJson(input, 0)
  assert.equal(error, null)
  assert.equal(output, '{"key":"value","arr":[1,2]}')
})

// ---------------------------------------------------------------------------
// formatJson — edge cases
// ---------------------------------------------------------------------------

test('formatJson: returns empty output for blank input', () => {
  const { output, error } = formatJson('   ', 2)
  assert.equal(error, null)
  assert.equal(output, '')
})

test('formatJson: returns error for invalid JSON', () => {
  const { output, error } = formatJson('{bad json}', 2)
  assert.equal(output, '')
  assert.ok(typeof error === 'string' && error.length > 0, 'error should be a non-empty string')
})

test('formatJson: handles nested objects', () => {
  const input = '{"a":{"b":{"c":42}}}'
  const { output, error } = formatJson(input, 2)
  assert.equal(error, null)
  const parsed = JSON.parse(output)
  assert.equal(parsed.a.b.c, 42)
})

test('formatJson: handles JSON with Unicode characters', () => {
  const input = '{"greeting":"こんにちは"}'
  const { output, error } = formatJson(input, 2)
  assert.equal(error, null)
  assert.ok(output.includes('こんにちは'))
})

test('formatJson: preserves boolean and null values', () => {
  const input = '{"flag":true,"nothing":null,"num":0}'
  const { output, error } = formatJson(input, 0)
  assert.equal(error, null)
  const parsed = JSON.parse(output)
  assert.equal(parsed.flag, true)
  assert.equal(parsed.nothing, null)
  assert.equal(parsed.num, 0)
})
