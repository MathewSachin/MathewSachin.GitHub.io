import { test } from 'node:test'
import assert from 'node:assert/strict'

import { calculateTapBpm, clampBpm, getBeatIntervalMs, normalizeTimeSignature, shouldResetTapSequence } from '../src/scripts/tools/metronome.ts'

test('clampBpm: clamps to supported BPM range', () => {
  assert.equal(clampBpm(5), 20)
  assert.equal(clampBpm(120), 120)
  assert.equal(clampBpm(400), 300)
})

test('clampBpm: falls back for invalid values', () => {
  assert.equal(clampBpm(Number.NaN), 120)
  assert.equal(clampBpm(Number.POSITIVE_INFINITY), 120)
})

test('normalizeTimeSignature: enforces allowed beats and note values', () => {
  assert.deepEqual(normalizeTimeSignature(4, 4), { beats: 4, noteValue: 4 })
  assert.deepEqual(normalizeTimeSignature(0, 3), { beats: 1, noteValue: 4 })
  assert.deepEqual(normalizeTimeSignature(20, 16), { beats: 12, noteValue: 16 })
})

test('getBeatIntervalMs: accounts for beat unit and BPM', () => {
  assert.equal(getBeatIntervalMs(120, 4), 500)
  assert.equal(getBeatIntervalMs(120, 8), 250)
  assert.equal(getBeatIntervalMs(120, 2), 1000)
})

test('shouldResetTapSequence: resets after timeout', () => {
  assert.equal(shouldResetTapSequence(null, 1000), true)
  assert.equal(shouldResetTapSequence(1000, 2500), false)
  assert.equal(shouldResetTapSequence(1000, 3201), true)
})

test('calculateTapBpm: returns null for insufficient taps', () => {
  assert.equal(calculateTapBpm([]), null)
  assert.equal(calculateTapBpm([1000]), null)
})

test('calculateTapBpm: computes BPM from average interval', () => {
  assert.equal(calculateTapBpm([0, 500, 1000, 1500]), 120)
  assert.equal(calculateTapBpm([0, 600, 1200]), 100)
})

test('calculateTapBpm: ignores invalid intervals and clamps output', () => {
  assert.equal(calculateTapBpm([0, 100, 200]), null)
  assert.equal(calculateTapBpm([0, 200, 400, 600]), 300)
  assert.equal(calculateTapBpm([0, 3000, 6000]), 20)
})
