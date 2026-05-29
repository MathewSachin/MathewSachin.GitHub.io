import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  frequencyToNoteInfo,
  nearestGuitarString,
  autocorrelate,
  GUITAR_STRINGS,
  RMS_THRESHOLD,
} from '../src/scripts/tools/tuner.ts'

// ── frequencyToNoteInfo ─────────────────────────────────────────────────────

test('frequencyToNoteInfo: returns null for non-positive frequency', () => {
  assert.equal(frequencyToNoteInfo(0), null)
  assert.equal(frequencyToNoteInfo(-100), null)
  assert.equal(frequencyToNoteInfo(Number.NaN), null)
  assert.equal(frequencyToNoteInfo(Number.POSITIVE_INFINITY), null)
})

test('frequencyToNoteInfo: A4 = 440 Hz → A, octave 4, 0 cents', () => {
  const info = frequencyToNoteInfo(440)
  assert.ok(info)
  assert.equal(info.note, 'A')
  assert.equal(info.octave, 4)
  assert.equal(info.cents, 0)
  assert.equal(info.frequency, 440)
})

test('frequencyToNoteInfo: A5 = 880 Hz → A, octave 5, 0 cents', () => {
  const info = frequencyToNoteInfo(880)
  assert.ok(info)
  assert.equal(info.note, 'A')
  assert.equal(info.octave, 5)
  assert.equal(info.cents, 0)
})

test('frequencyToNoteInfo: C4 ≈ 261.63 Hz → C, octave 4', () => {
  const info = frequencyToNoteInfo(261.63)
  assert.ok(info)
  assert.equal(info.note, 'C')
  assert.equal(info.octave, 4)
})

test('frequencyToNoteInfo: cents reflects deviation from nearest note', () => {
  // One semitone above A4 is A#4 ≈ 466.16 Hz; halfway is ~452.9 Hz → ~+50¢ from A4
  const slightlySharp = 440 * Math.pow(2, 1 / 24) // exactly +50 cents
  const info = frequencyToNoteInfo(slightlySharp)
  assert.ok(info)
  // Should be between A4 and A#4; cents near ±50
  assert.ok(Math.abs(info.cents) <= 50)
})

test('frequencyToNoteInfo: E2 (lowest guitar string) → E, octave 2', () => {
  const info = frequencyToNoteInfo(82.41)
  assert.ok(info)
  assert.equal(info.note, 'E')
  assert.equal(info.octave, 2)
})

// ── nearestGuitarString ─────────────────────────────────────────────────────

test('nearestGuitarString: exact frequencies match correct string', () => {
  for (const string of GUITAR_STRINGS) {
    const nearest = nearestGuitarString(string.frequency)
    assert.equal(nearest.label, string.label)
  }
})

test('nearestGuitarString: frequency near E4 maps to E4 string', () => {
  const nearest = nearestGuitarString(330)  // very close to E4 (329.63)
  assert.equal(nearest.label, '1 (E4)')
})

test('nearestGuitarString: frequency near A2 maps to A2 string', () => {
  const nearest = nearestGuitarString(112)  // close to A2 (110)
  assert.equal(nearest.label, '5 (A2)')
})

// ── autocorrelate ───────────────────────────────────────────────────────────

test('autocorrelate: returns -1 for silence (all zeros)', () => {
  const buffer = new Float32Array(2048)
  assert.equal(autocorrelate(buffer, 44100), -1)
})

test('autocorrelate: returns -1 for signal below RMS threshold', () => {
  const buffer = new Float32Array(2048).fill(RMS_THRESHOLD / 2)
  assert.equal(autocorrelate(buffer, 44100), -1)
})

test('autocorrelate: detects frequency of a synthetic sine wave', () => {
  const sampleRate = 44100
  const targetFreq = 440  // A4
  const buffer = new Float32Array(2048)

  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.sin(2 * Math.PI * targetFreq * (i / sampleRate))
  }

  const detected = autocorrelate(buffer, sampleRate)
  assert.ok(detected > 0, 'should detect a positive frequency')
  // Allow ±5% tolerance
  assert.ok(Math.abs(detected - targetFreq) / targetFreq < 0.05, `expected ~${targetFreq} Hz, got ${detected.toFixed(2)} Hz`)
})

test('autocorrelate: detects low E2 frequency (~82 Hz)', () => {
  const sampleRate = 44100
  const targetFreq = 82.41
  const buffer = new Float32Array(2048)

  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.sin(2 * Math.PI * targetFreq * (i / sampleRate))
  }

  const detected = autocorrelate(buffer, sampleRate)
  assert.ok(detected > 0)
  assert.ok(Math.abs(detected - targetFreq) / targetFreq < 0.05, `expected ~${targetFreq} Hz, got ${detected.toFixed(2)} Hz`)
})
