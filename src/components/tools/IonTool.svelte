<script>
  import CopyButton from './CopyButton.svelte';
  import { processIon } from '@scripts/tools/ion-formatter.js';

  let input = '';
  let output = '';
  let error = '';
  let ok = false;

  function clearFeedback() {
    error = '';
    ok = false;
  }

  function applyOperation(op) {
    clearFeedback();
    const result = processIon(input, op);
    if (result.error) {
      output = '';
      error = result.error;
      ok = false;
    } else {
      output = result.output;
      if (result.output) ok = true;
    }
  }

  function format() { applyOperation('format'); }
  function minify() { applyOperation('minify'); }
  function toJson() { applyOperation('toJson'); }
  function clearAll() { input = ''; output = ''; clearFeedback(); }
</script>

<div class="card google-anno-skip">
  <div class="card-body">

    <div class="row g-4">
      <div class="col-12 col-md-6">
        <label class="form-label fw-semibold" for="ion-input">Input</label>
        <textarea id="ion-input" class="form-control font-monospace" rows="14" bind:value={input}
          placeholder={`{ name: "Alice", age: 30 }`}></textarea>
        <div class="mt-2 d-flex gap-2 flex-wrap">
          <button class="btn btn-info text-white" id="ion-format-btn" on:click={format}>Format</button>
          <button class="btn btn-outline-secondary" id="ion-minify-btn" on:click={minify}>Minify</button>
          <button class="btn btn-outline-secondary" id="ion-tojson-btn" on:click={toJson}>Convert to JSON</button>
          <button class="btn btn-outline-secondary" id="ion-clear-btn" on:click={clearAll}>Clear</button>
        </div>
        {#if error}
          <div id="ion-error" class="alert alert-danger mt-2 py-2" role="alert">{error}</div>
        {/if}
        {#if ok}
          <div id="ion-ok" class="alert alert-success mt-2 py-2" role="alert">
            <i class="fas fa-check-circle me-1"></i>Valid ION
          </div>
        {/if}
      </div>

      <div class="col-12 col-md-6">
        <label class="form-label fw-semibold" for="ion-output">Output</label>
        <textarea id="ion-output" class="form-control font-monospace" rows="14" readonly bind:value={output}
          placeholder="Formatted output…"></textarea>
        <div class="mt-2">
          <CopyButton value={output} title="Copy output" iconClass="fas fa-copy me-1" copiedIconClass="fas fa-check me-1">Copy</CopyButton>
        </div>
      </div>
    </div>

  </div>
</div>
