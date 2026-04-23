<script>
  import { onMount } from 'svelte';
  import { encodeBase64, decodeBase64 } from '@scripts/tools/base64.js';
  import { registerCopyToClipboard } from '@scripts/utils.js';

  let text = '';
  let b64 = '';
  let textError = '';
  let b64Error = '';

  let copyBtn;
  let iconEl;

  function doEncode() {
    textError = '';
    try {
      b64 = encodeBase64(text);
    } catch (e) {
      const err = /** @type {Error|undefined} */ (e);
      textError = 'Encoding failed: ' + (err?.message ?? String(e));
    }
  }

  function doDecode() {
    b64Error = '';
    try {
      text = decodeBase64(b64.trim());
    } catch (e) {
      const err = /** @type {Error|undefined} */ (e);
      b64Error = 'Invalid Base64 string: ' + (err?.message ?? String(e));
    }
  }

  function doClear() {
    text = '';
    b64 = '';
    textError = '';
    b64Error = '';
  }

  onMount(() => {
    if (copyBtn && iconEl) {
      registerCopyToClipboard(copyBtn, () => b64, iconEl);
    }
  });
</script>

<div class="card google-anno-skip">
  <div class="card-body">

    <div class="row g-4">

      <!-- Plain Text -->
      <div class="col-12 col-md-6">
        <h5 class="mb-3">Plain Text</h5>
        <textarea class="form-control font-monospace" id="text-input" rows="8" placeholder="Enter text to encode…" bind:value={text}></textarea>
        <div class="mt-2 d-flex gap-2 flex-wrap">
          <button class="btn btn-info text-white" id="encode-btn" on:click={doEncode}>Encode &rarr;</button>
          <button class="btn btn-outline-secondary" id="clear-btn" on:click={doClear}>Clear</button>
        </div>
        <div class={`text-danger small mt-1 ${textError ? '' : 'd-none'}`}>{textError}</div>
      </div>

      <!-- Base64 -->
      <div class="col-12 col-md-6">
        <h5 class="mb-3">Base64</h5>
        <textarea class="form-control font-monospace" id="b64-input" rows="8" placeholder="Enter Base64 to decode…" bind:value={b64}></textarea>
        <div class="mt-2 d-flex gap-2 flex-wrap">
          <button class="btn btn-info text-white" id="decode-btn" on:click={doDecode}>&larr; Decode</button>
          <button class="btn btn-outline-secondary" bind:this={copyBtn}>
            <i class="fas fa-copy me-1" bind:this={iconEl}></i>Copy
          </button>
        </div>
        <div id="b64-error" class={`text-danger small mt-1 ${b64Error ? '' : 'd-none'}`}>{b64Error}</div>
      </div>

    </div>

  </div>
</div>
