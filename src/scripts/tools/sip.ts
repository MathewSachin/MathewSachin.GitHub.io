export interface SipInput {
  monthlyInvestment: number
  annualReturnRate: number
  years: number
  annualStepUpRate?: number
  inflationRate?: number
  initialInvestment?: number
}

export interface SipProjectionRow {
  year: number
  monthlyInvestment: number
  annualInvestment: number
  totalInvested: number
  estimatedValue: number
}

export interface SipResult {
  totalInvested: number
  estimatedValue: number
  estimatedReturns: number
  inflationAdjustedValue: number
  monthlyRate: number
  totalMonths: number
  projection: SipProjectionRow[]
}

const toNonNegativeNumber = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, value)
}

export function calculateSip(input: SipInput): SipResult {
  const monthlyInvestment = toNonNegativeNumber(input.monthlyInvestment)
  const annualReturnRate = toNonNegativeNumber(input.annualReturnRate)
  const annualStepUpRate = toNonNegativeNumber(input.annualStepUpRate ?? 0)
  const inflationRate = toNonNegativeNumber(input.inflationRate ?? 0)
  const initialInvestment = toNonNegativeNumber(input.initialInvestment ?? 0)
  const totalMonths = Math.max(1, Math.round(toNonNegativeNumber(input.years) * 12))

  const monthlyRate = annualReturnRate / 12 / 100
  const stepUpFactor = 1 + annualStepUpRate / 100
  const inflationFactor = Math.pow(1 + inflationRate / 100, totalMonths / 12)

  let balance = initialInvestment
  let totalInvested = initialInvestment
  let currentMonthlyInvestment = monthlyInvestment
  let yearlyInvestment = 0

  const projection: SipProjectionRow[] = []

  for (let month = 1; month <= totalMonths; month += 1) {
    if (month !== 1 && (month - 1) % 12 === 0) {
      currentMonthlyInvestment *= stepUpFactor
      yearlyInvestment = 0
    }

    balance *= 1 + monthlyRate
    balance += currentMonthlyInvestment
    totalInvested += currentMonthlyInvestment
    yearlyInvestment += currentMonthlyInvestment

    if (month % 12 === 0 || month === totalMonths) {
      projection.push({
        year: Math.ceil(month / 12),
        monthlyInvestment: currentMonthlyInvestment,
        annualInvestment: yearlyInvestment,
        totalInvested,
        estimatedValue: balance,
      })
    }
  }

  const estimatedReturns = balance - totalInvested
  const inflationAdjustedValue = balance / inflationFactor

  return {
    totalInvested,
    estimatedValue: balance,
    estimatedReturns,
    inflationAdjustedValue,
    monthlyRate,
    totalMonths,
    projection,
  }
}
