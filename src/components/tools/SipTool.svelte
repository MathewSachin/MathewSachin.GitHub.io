<script lang="ts">
import { calculateSip } from '../../scripts/tools/sip'

let monthlyInvestment = $state(5000)
let annualReturnRate = $state(12)
let years = $state(15)
let annualStepUpRate = $state(10)
let inflationRate = $state(6)
let initialInvestment = $state(0)

const sip = $derived(calculateSip({
  monthlyInvestment,
  annualReturnRate,
  years,
  annualStepUpRate,
  inflationRate,
  initialInvestment,
}))

const formatAmount = (value: number): string =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
</script>

<div class="card google-anno-skip">
  <div class="card-body">
    <div class="row g-3">
      <div class="col-12 col-md-4">
        <label class="form-label" for="sip-monthly">Monthly SIP (₹)</label>
        <input id="sip-monthly" type="number" min="0" class="form-control" bind:value={monthlyInvestment}>
      </div>
      <div class="col-12 col-md-4">
        <label class="form-label" for="sip-years">Investment Duration (Years)</label>
        <input id="sip-years" type="number" min="0.1" step="0.1" class="form-control" bind:value={years}>
      </div>
      <div class="col-12 col-md-4">
        <label class="form-label" for="sip-return">Expected Return (% p.a.)</label>
        <input id="sip-return" type="number" min="0" step="0.1" class="form-control" bind:value={annualReturnRate}>
      </div>
      <div class="col-12 col-md-4">
        <label class="form-label" for="sip-stepup">Yearly Step-Up (% p.a.)</label>
        <input id="sip-stepup" type="number" min="0" step="0.1" class="form-control" bind:value={annualStepUpRate}>
      </div>
      <div class="col-12 col-md-4">
        <label class="form-label" for="sip-inflation">Inflation (% p.a.)</label>
        <input id="sip-inflation" type="number" min="0" step="0.1" class="form-control" bind:value={inflationRate}>
      </div>
      <div class="col-12 col-md-4">
        <label class="form-label" for="sip-initial">Initial Lump Sum (₹)</label>
        <input id="sip-initial" type="number" min="0" class="form-control" bind:value={initialInvestment}>
      </div>
    </div>

    <hr class="my-4">

    <div class="row g-3">
      <div class="col-12 col-md-6 col-lg-3">
        <div class="border rounded p-3 h-100">
          <div class="text-muted small">Total Invested</div>
          <div class="fw-semibold">{formatAmount(sip.totalInvested)}</div>
        </div>
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <div class="border rounded p-3 h-100">
          <div class="text-muted small">Estimated Value</div>
          <div class="fw-semibold">{formatAmount(sip.estimatedValue)}</div>
        </div>
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <div class="border rounded p-3 h-100">
          <div class="text-muted small">Estimated Returns</div>
          <div class="fw-semibold">{formatAmount(sip.estimatedReturns)}</div>
        </div>
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <div class="border rounded p-3 h-100">
          <div class="text-muted small">Inflation Adjusted Value</div>
          <div class="fw-semibold">{formatAmount(sip.inflationAdjustedValue)}</div>
        </div>
      </div>
    </div>

    <p class="text-muted mt-3 mb-2">
      Assumes monthly SIP at month-end, monthly compounding, and yearly step-up from the start of each new year.
    </p>

    <div class="table-responsive mt-3">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Monthly SIP</th>
            <th scope="col">Yearly Investment</th>
            <th scope="col">Total Invested</th>
            <th scope="col">Estimated Value</th>
          </tr>
        </thead>
        <tbody>
          {#each sip.projection as row}
            <tr>
              <td>{row.year}</td>
              <td>{formatAmount(row.monthlyInvestment)}</td>
              <td>{formatAmount(row.annualInvestment)}</td>
              <td>{formatAmount(row.totalInvested)}</td>
              <td>{formatAmount(row.estimatedValue)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
