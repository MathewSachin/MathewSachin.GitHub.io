/**
 * Tests for tools/ion/ion-formatter.ts
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { processIon } from '../src/scripts/tools/ion-formatter.ts'

// ---------------------------------------------------------------------------
// format
// ---------------------------------------------------------------------------

test('processIon: pretty-prints a simple ION struct', () => {
  const { output, error } = processIon('{name:"Alice",age:30}', 'format')
  assert.equal(error, null)
  assert.ok(output.includes('name'), 'output should contain "name"')
  assert.ok(output.includes('"Alice"'), 'output should contain "Alice"')
  assert.ok(output.includes('\n'), 'pretty output should have newlines')
})

test('processIon: pretty-prints a JSON input (ION is a superset of JSON)', () => {
  const { output, error } = processIon('{"a":1,"b":2}', 'format')
  assert.equal(error, null)
  assert.ok(output.includes('a'), 'output should contain key "a"')
})

test('processIon: returns empty output for blank input', () => {
  const { output, error } = processIon('   ', 'format')
  assert.equal(error, null)
  assert.equal(output, '')
})

test('processIon: returns error for invalid ION on format', () => {
  const { output, error } = processIon('{bad ion !!!}', 'format')
  assert.equal(output, '')
  assert.ok(typeof error === 'string' && error.length > 0, 'error should be a non-empty string')
})

// ---------------------------------------------------------------------------
// minify
// ---------------------------------------------------------------------------

test('processIon: minifies an ION struct', () => {
  const input = '{\n  name: "Alice",\n  age: 30\n}'
  const { output, error } = processIon(input, 'minify')
  assert.equal(error, null)
  assert.ok(!output.includes('\n'), 'minified output should not have newlines')
  assert.ok(output.includes('name'), 'minified output should contain "name"')
})

test('processIon: minifies JSON input', () => {
  const { output, error } = processIon('{ "a" : 1 , "b" : 2 }', 'minify')
  assert.equal(error, null)
  // Should be compact - no extra spaces
  assert.ok(output.length < '{ "a" : 1 , "b" : 2 }'.length, 'minified should be shorter')
})

// ---------------------------------------------------------------------------
// toJson
// ---------------------------------------------------------------------------

test('processIon: converts ION struct to JSON', () => {
  const { output, error } = processIon('{name:"Alice",age:30}', 'toJson')
  assert.equal(error, null)
  const parsed = JSON.parse(output)
  assert.equal(parsed.name, 'Alice')
  assert.equal(parsed.age, 30)
})

test('processIon: converts ION array to JSON', () => {
  const { output, error } = processIon('[1, 2, 3]', 'toJson')
  assert.equal(error, null)
  const parsed = JSON.parse(output)
  assert.deepEqual(parsed, [1, 2, 3])
})

test('processIon: toJson output is valid, pretty-printed JSON', () => {
  const { output, error } = processIon('{"a":1}', 'toJson')
  assert.equal(error, null)
  assert.ok(output.includes('\n'), 'JSON output should be pretty-printed')
  const parsed = JSON.parse(output)
  assert.equal(parsed.a, 1)
})

test('processIon: toJson handles boolean and null', () => {
  const { output, error } = processIon('{flag:true,nothing:null}', 'toJson')
  assert.equal(error, null)
  const parsed = JSON.parse(output)
  assert.equal(parsed.flag, true)
  assert.equal(parsed.nothing, null)
})
