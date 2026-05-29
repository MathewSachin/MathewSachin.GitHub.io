import { test } from 'node:test'
import assert from 'node:assert/strict'

import { calculateSip } from '../src/scripts/tools/sip.ts'

const approx = (actual: number, expected: number, tolerance = 1e-6): void => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`)
}

test('calculateSip: no returns means estimated value equals invested amount', () => {
  const result = calculateSip({
    monthlyInvestment: 10000,
    annualReturnRate: 0,
    years: 2,
    annualStepUpRate: 0,
    inflationRate: 0,
    initialInvestment: 50000,
  })

  assert.equal(result.totalInvested, 290000)
  assert.equal(result.estimatedValue, 290000)
  assert.equal(result.estimatedReturns, 0)
})

test('calculateSip: matches closed-form future value for constant SIP', () => {
  const monthlyInvestment = 5000
  const annualReturnRate = 12
  const years = 10

  const result = calculateSip({
    monthlyInvestment,
    annualReturnRate,
    years,
    annualStepUpRate: 0,
    inflationRate: 0,
    initialInvestment: 0,
  })

  const r = annualReturnRate / 12 / 100
  const n = years * 12
  const expected = monthlyInvestment * (((Math.pow(1 + r, n) - 1) / r))
  approx(result.estimatedValue, expected, 1e-4)
})

test('calculateSip: annual step-up increases yearly SIP and final invested amount', () => {
  const result = calculateSip({
    monthlyInvestment: 1000,
    annualReturnRate: 0,
    years: 3,
    annualStepUpRate: 10,
    inflationRate: 0,
    initialInvestment: 0,
  })

  assert.equal(result.projection.length, 3)
  assert.equal(result.projection[0]?.annualInvestment, 12000)
  assert.equal(result.projection[1]?.annualInvestment, 13200)
  assert.equal(result.projection[2]?.annualInvestment, 14520)
  assert.equal(result.totalInvested, 39720)
})

test('calculateSip: inflation-adjusted value is lower than nominal value when inflation is positive', () => {
  const result = calculateSip({
    monthlyInvestment: 10000,
    annualReturnRate: 12,
    years: 15,
    annualStepUpRate: 0,
    inflationRate: 6,
    initialInvestment: 0,
  })

  assert.ok(result.inflationAdjustedValue < result.estimatedValue)
})
