<script>
  import CopyButton from './CopyButton.svelte';
  import { encodeUrl, decodeUrl } from '@scripts/tools/url-encoder.js';

  let text = $state('');
  let encoded = $state('');
  let textError = $state('');
  let encodedError = $state('');

  function doEncode() {
    textError = '';
    try {
      encoded = encodeUrl(text);
    } catch (e) {
      const err = /** @type {Error|undefined} */ (e);
      textError = 'Encoding failed: ' + (err?.message ?? String(e));
    }
  }

  function doDecode() {
    encodedError = '';
    try {
      text = decodeUrl(encoded.trim());
    } catch (e) {
      const err = /** @type {Error|undefined} */ (e);
      encodedError = 'Decoding failed: ' + (err?.message ?? String(e));
    }
  }

  function doClear() {
    text = '';
    encoded = '';
    textError = '';
    encodedError = '';
  }
</script>

<div class="card google-anno-skip">
  <div class="card-body">

    <div class="row g-4">

      <!-- Plain Text -->
      <div class="col-12 col-md-6">
        <h5 class="mb-3">Plain Text</h5>
        <textarea class="form-control font-monospace" id="text-input" rows="8" placeholder="Enter text to encode…" bind:value={text}></textarea>
        <div class="mt-2 d-flex gap-2 flex-wrap">
          <button class="btn btn-info text-white" id="encode-btn" onclick={doEncode}>Encode &rarr;</button>
          <button class="btn btn-outline-secondary" id="clear-btn" onclick={doClear}>Clear</button>
        </div>
        <div class={`text-danger small mt-1 ${textError ? '' : 'd-none'}`}>{textError}</div>
      </div>

      <!-- URL Encoded -->
      <div class="col-12 col-md-6">
        <h5 class="mb-3">URL Encoded</h5>
        <textarea class="form-control font-monospace" id="encoded-input" rows="8" placeholder="Enter URL-encoded text to decode…" bind:value={encoded}></textarea>
        <div class="mt-2 d-flex gap-2 flex-wrap">
          <button class="btn btn-info text-white" id="decode-btn" onclick={doDecode}>&larr; Decode</button>
          <CopyButton value={encoded} className="btn btn-outline-secondary">Copy</CopyButton>
        </div>
        <div id="encoded-error" class={`text-danger small mt-1 ${encodedError ? '' : 'd-none'}`}>{encodedError}</div>
      </div>

    </div>

  </div>
</div>
