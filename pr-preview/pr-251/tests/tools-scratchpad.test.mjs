/**
 * Tests for tools/scratchpad/scratchpad.js  (countWords)
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { countWords } from '../tools/scratchpad/scratchpad.js'

// ---------------------------------------------------------------------------
// countWords
// ---------------------------------------------------------------------------

test('countWords: empty string returns 0', () => {
  assert.equal(countWords(''), 0)
})

test('countWords: whitespace-only string returns 0', () => {
  assert.equal(countWords('   '), 0)
  assert.equal(countWords('\t\n'), 0)
})

test('countWords: single word returns 1', () => {
  assert.equal(countWords('hello'), 1)
})

test('countWords: two words separated by a space', () => {
  assert.equal(countWords('hello world'), 2)
})

test('countWords: multiple spaces between words still counts correctly', () => {
  assert.equal(countWords('hello   world'), 2)
})

test('countWords: leading and trailing whitespace is ignored', () => {
  assert.equal(countWords('  hello world  '), 2)
})

test('countWords: newlines count as word separators', () => {
  assert.equal(countWords('line one\nline two\nline three'), 6)
})

test('countWords: tabs count as word separators', () => {
  assert.equal(countWords('word1\tword2\tword3'), 3)
})

test('countWords: a long sentence returns the correct count', () => {
  const sentence = 'The quick brown fox jumps over the lazy dog'
  assert.equal(countWords(sentence), 9)
})
