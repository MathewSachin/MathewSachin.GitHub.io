
<script lang="ts">
import { epochToMs } from "../../scripts/tools/timestamp";
import { onMount } from "svelte";
import CopyButton from "./CopyButton.svelte";

const startTime = new Date();
let dtInput: string = $state(new Date(startTime.getTime() - startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
const dtMillis = $derived(new Date(dtInput).getTime());
const dtSeconds = $derived(Math.floor(dtMillis / 1000));

let epochInput = $state(0);
const epochAsDate = $derived(new Date(epochToMs(epochInput)));
let epochUtc = $derived(epochAsDate.toUTCString());
let epochLocal = $derived(epochAsDate.toLocaleString());
let epochIso = $derived(epochAsDate.toISOString());

let currentTime = $state(startTime);
let nowMillis = $derived(currentTime.getTime());
let nowSeconds = $derived(Math.floor(nowMillis / 1000));
let nowUtc = $derived(currentTime.toUTCString());

onMount(() => {
  const interval = setInterval(() => currentTime = new Date(), 1000);
  return () => clearInterval(interval);
});
</script>

<div class="card google-anno-skip">
  <div class="card-body">
    <div class="row g-4">
      <!-- DateTime to Epoch -->
      <div class="col-12 col-md-6">
        <h5 class="mb-3">Date / Time &rarr; Epoch</h5>
        <div class="mb-3">
          <label for="dt-input" class="form-label">Date &amp; Time (local)</label>
          <input type="datetime-local" id="dt-input" class="form-control" bind:value={dtInput}>
        </div>
        <div id="dt-result" class="mt-3">
          <div class="d-flex align-items-center mb-2 flex-wrap gap-2">
            <span class="text-muted">Seconds:</span>
            <code id="dt-seconds">{dtSeconds}</code>
            <CopyButton value={dtSeconds.toString()} title="Copy seconds" />
          </div>
          <div class="d-flex align-items-center flex-wrap gap-2">
            <span class="text-muted">Milliseconds:</span>
            <code id="dt-millis">{dtMillis}</code>
            <CopyButton value={dtMillis.toString()} title="Copy milliseconds" />
          </div>
        </div>
      </div>
      <!-- Epoch to DateTime -->
      <div class="col-12 col-md-6">
        <h5 class="mb-3">Epoch &rarr; Date / Time</h5>
        <div class="mb-3">
          <label for="epoch-input" class="form-label">Unix Timestamp</label>
          <input type="number" id="epoch-input" class="form-control" placeholder="e.g. 1700000000" bind:value={epochInput}>
          <div class="form-text">Enter seconds or milliseconds &mdash; auto-detected.</div>
        </div>
        <div id="epoch-result" class="mt-3">
          <div class="d-flex align-items-center mb-2 flex-wrap gap-2">
            <span class="text-muted">UTC:</span>
            <code id="epoch-utc">{epochUtc}</code>
            <CopyButton value={epochUtc} title="Copy UTC" />
          </div>
          <div class="d-flex align-items-center mb-2 flex-wrap gap-2">
            <span class="text-muted">Local:</span>
            <code id="epoch-local">{epochLocal}</code>
            <CopyButton value={epochLocal} title="Copy local" />
          </div>
          <div class="d-flex align-items-center flex-wrap gap-2">
            <span class="text-muted">ISO&nbsp;8601:</span>
            <code id="epoch-iso">{epochIso}</code>
            <CopyButton value={epochIso} title="Copy ISO 8601" />
          </div>
        </div>
      </div>
    </div>
    <!-- Current timestamp ticker -->
    <hr class="mt-4 mb-3">
    <h5 class="mb-3">Current Time</h5>
    <div class="row row-cols-auto g-3">
      <div class="col">
        <span class="text-muted me-1">Seconds:</span><code id="now-seconds">{nowSeconds}</code>
      </div>
      <div class="col">
        <span class="text-muted me-1">Milliseconds:</span><code id="now-millis">{nowMillis}</code>
      </div>
      <div class="col">
        <span class="text-muted me-1">UTC:</span><code id="now-utc">{nowUtc}</code>
      </div>
    </div>
  </div>
</div>
