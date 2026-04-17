/**
 * Tests for tools/cron/cron.js  (pad, ordinal, buildCronExpression)
 *
 * Run via: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { pad, ordinal, buildCronExpression, DOW_NAMES } from '../src/pages/tools/cron/cron.js'

// ---------------------------------------------------------------------------
// pad
// ---------------------------------------------------------------------------

test('pad: pads single-digit numbers with a leading zero', () => {
  assert.equal(pad(0), '00')
  assert.equal(pad(5), '05')
  assert.equal(pad(9), '09')
})

test('pad: does not pad two-digit numbers', () => {
  assert.equal(pad(10), '10')
  assert.equal(pad(23), '23')
  assert.equal(pad(59), '59')
})

// ---------------------------------------------------------------------------
// ordinal
// ---------------------------------------------------------------------------

test('ordinal: 1st', () => { assert.equal(ordinal(1), '1st') })
test('ordinal: 2nd', () => { assert.equal(ordinal(2), '2nd') })
test('ordinal: 3rd', () => { assert.equal(ordinal(3), '3rd') })
test('ordinal: 4th', () => { assert.equal(ordinal(4), '4th') })
test('ordinal: 11th (special case)', () => { assert.equal(ordinal(11), '11th') })
test('ordinal: 12th (special case)', () => { assert.equal(ordinal(12), '12th') })
test('ordinal: 13th (special case)', () => { assert.equal(ordinal(13), '13th') })
test('ordinal: 21st', () => { assert.equal(ordinal(21), '21st') })
test('ordinal: 31st', () => { assert.equal(ordinal(31), '31st') })

// ---------------------------------------------------------------------------
// buildCronExpression
// ---------------------------------------------------------------------------

test('buildCronExpression: every minute', () => {
  const { expr, desc } = buildCronExpression('minute', 0, 0, 0, 1)
  assert.equal(expr, '* * * * *')
  assert.equal(desc, 'Every minute')
})

test('buildCronExpression: every hour at minute 30', () => {
  const { expr, desc } = buildCronExpression('hour', 30, 0, 0, 1)
  assert.equal(expr, '30 * * * *')
  assert.equal(desc, 'Every hour at minute 30')
})

test('buildCronExpression: every day at 08:00', () => {
  const { expr, desc } = buildCronExpression('day', 0, 8, 0, 1)
  assert.equal(expr, '0 8 * * *')
  assert.equal(desc, 'Every day at 08:00 UTC')
})

test('buildCronExpression: every day at 00:05', () => {
  const { expr, desc } = buildCronExpression('day', 5, 0, 0, 1)
  assert.equal(expr, '5 0 * * *')
  assert.equal(desc, 'Every day at 00:05 UTC')
})

test('buildCronExpression: every Monday at 09:00', () => {
  const { expr, desc } = buildCronExpression('week', 0, 9, 1, 1)
  assert.equal(expr, '0 9 * * 1')
  assert.equal(desc, 'Every ' + DOW_NAMES[1] + ' at 09:00 UTC')
})

test('buildCronExpression: every Sunday at 00:00', () => {
  const { expr, desc } = buildCronExpression('week', 0, 0, 0, 1)
  assert.equal(expr, '0 0 * * 0')
  assert.equal(desc, 'Every Sunday at 00:00 UTC')
})

test('buildCronExpression: monthly on the 1st at midnight', () => {
  const { expr, desc } = buildCronExpression('month', 0, 0, 0, 1)
  assert.equal(expr, '0 0 1 * *')
  assert.equal(desc, 'On the 1st of every month at 00:00 UTC')
})

test('buildCronExpression: monthly on the 15th at 12:30', () => {
  const { expr, desc } = buildCronExpression('month', 30, 12, 0, 15)
  assert.equal(expr, '30 12 15 * *')
  assert.equal(desc, 'On the 15th of every month at 12:30 UTC')
})
