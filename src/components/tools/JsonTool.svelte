<script lang="ts">
  import CopyButton from './CopyButton.svelte';
  import JsonTreeNode from './JsonTreeNode.svelte';
  import { formatJson } from '@scripts/tools/json-formatter.js';

  let input = '';
  let output = '';
  let parsedOutput: unknown = null;
  let showTree = false;
  let error = '';
  let ok = false;

  function clearFeedback() {
    error = '';
    ok = false;
  }

  function applyFormat(indent: number) {
    clearFeedback();
    const result = formatJson(input, indent);
    if (result.error) {
      output = '';
      parsedOutput = null;
      showTree = false;
      error = result.error;
      ok = false;
    } else if (result.output) {
      output = result.output;
      parsedOutput = JSON.parse(result.output);
      showTree = true;
      ok = true;
    } else {
      output = '';
      parsedOutput = null;
      showTree = false;
    }
  }

  function format() { applyFormat(2); }
  function minify() { applyFormat(0); }
  function clearAll() { input = ''; output = ''; parsedOutput = null; showTree = false; clearFeedback(); }
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
            <i class="fas fa-check-circle me-1"></i>Valid JSON
          </div>
        {/if}
      </div>

      <div class="col-12 col-md-6">
        <label class="form-label fw-semibold" for="json-output">Output</label>
        <textarea id="json-output" class="visually-hidden" readonly bind:value={output} aria-hidden="true" tabindex="-1"></textarea>
        {#if showTree}
          <div class="json-tree-container font-monospace border rounded p-3">
            <JsonTreeNode value={parsedOutput} />
          </div>
        {:else}
          <div class="font-monospace border rounded p-3 text-muted json-tree-container">
            Formatted output…
          </div>
        {/if}
        <div class="mt-2">
          <CopyButton value={output} title="Copy output" iconClass="fas fa-copy me-1" copiedIconClass="fas fa-check me-1">Copy</CopyButton>
        </div>
      </div>
    </div>

  </div>
</div>

<style>
  .json-tree-container {
    min-height: 340px;
    max-height: 500px;
    overflow: auto;
    font-size: 0.875rem;
    line-height: 1.6;
  }
</style>
