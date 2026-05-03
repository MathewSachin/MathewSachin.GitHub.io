<script>
  import CopyButton from './CopyButton.svelte';
  import { formatJson } from '@scripts/tools/json-formatter.js';
  import Fa from 'svelte-fa';
  import { faCopy, faCheck, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

  let input = '';
  let output = '';
  let error = '';
  let ok = false;

  function clearFeedback() {
    error = '';
    ok = false;
  }

  function applyFormat(indent) {
    clearFeedback();
    const result = formatJson(input, indent);
    if (result.error) {
      output = '';
      error = result.error;
      ok = false;
    } else {
      output = result.output;
      if (result.output) ok = true;
    }
  }

  function format() { applyFormat(2); }
  function minify() { applyFormat(0); }
  function clearAll() { input = ''; output = ''; clearFeedback(); }
</script>

<div class="card google-anno-skip">
  <div class="card-body">

    <div class="row g-4">
      <div class="col-12 col-md-6">
        <label class="form-label fw-semibold" for="json-input">Input</label>
        <textarea id="json-input" class="form-control font-monospace" rows="14" bind:value={input}
          placeholder={`{"key":"value"}`}></textarea>
        <div class="mt-2 d-flex gap-2 flex-wrap">
          <button class="btn btn-info text-white" id="json-format-btn" on:click={format}>Format</button>
          <button class="btn btn-outline-secondary" id="json-minify-btn" on:click={minify}>Minify</button>
          <button class="btn btn-outline-secondary" id="json-clear-btn" on:click={clearAll}>Clear</button>
        </div>
        {#if error}
          <div id="json-error" class="alert alert-danger mt-2 py-2" role="alert">{error}</div>
        {/if}
        {#if ok}
          <div id="json-ok" class="alert alert-success mt-2 py-2" role="alert">
            <Fa icon={faCheckCircle} class="me-1" />Valid JSON
          </div>
        {/if}
      </div>

      <div class="col-12 col-md-6">
        <label class="form-label fw-semibold" for="json-output">Output</label>
        <textarea id="json-output" class="form-control font-monospace" rows="14" readonly bind:value={output}
          placeholder="Formatted output…"></textarea>
        <div class="mt-2">
          <CopyButton value={output} title="Copy output" icon={faCopy} copiedIcon={faCheck} iconClass="me-1">Copy</CopyButton>
        </div>
      </div>
    </div>

  </div>
</div>
