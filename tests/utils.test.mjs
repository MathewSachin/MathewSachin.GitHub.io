/**
 * Tests for the escapeHtml utility function.
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { escapeHtml } from '../src/scripts/utils.js'

test('escapeHtml: escapes ampersand', () => {
  assert.equal(escapeHtml('fish & chips'), 'fish &amp; chips')
})

test('escapeHtml: escapes less-than sign', () => {
  assert.equal(escapeHtml('a < b'), 'a &lt; b')
})

test('escapeHtml: escapes greater-than sign', () => {
  assert.equal(escapeHtml('a > b'), 'a &gt; b')
})

test('escapeHtml: escapes double quotes', () => {
  assert.equal(escapeHtml('"hello"'), '&quot;hello&quot;')
})

test('escapeHtml: escapes all special characters together', () => {
  assert.equal(
    escapeHtml('<a href="page">link &amp; text</a>'),
    '&lt;a href=&quot;page&quot;&gt;link &amp;amp; text&lt;/a&gt;'
  )
})

test('escapeHtml: returns unchanged string when no special characters', () => {
  assert.equal(escapeHtml('hello world'), 'hello world')
})

test('escapeHtml: returns empty string for empty input', () => {
  assert.equal(escapeHtml(''), '')
})

test('escapeHtml: coerces non-string input to string', () => {
  assert.equal(escapeHtml(42), '42')
  assert.equal(escapeHtml(null), 'null')
})
