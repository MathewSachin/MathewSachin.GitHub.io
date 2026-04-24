<script>
  import { md5, sha } from '@scripts/tools/hash.js';
  import CopyButton from './CopyButton.svelte';

  let text = '';
  let outMd5 = '';
  let outSha1 = '';
  let outSha256 = '';

  $: outMd5 = md5(text || '');

  $: if (text !== undefined) {
    // compute async hashes; allow rapid updates
    const t = text || '';
    sha('SHA-1', t).then(h => outSha1 = h).catch(() => outSha1 = '');
    sha('SHA-256', t).then(h => outSha256 = h).catch(() => outSha256 = '');
  }
</script>

<div class="card google-anno-skip">
  <div class="card-body">

    <div class="row g-4">

      <!-- Input -->
      <div class="col-12">
        <label class="form-label fw-semibold" for="hash-input">Input Text</label>
        <textarea id="hash-input" class="form-control font-monospace" rows="5" bind:value={text}
          placeholder="Enter text to hash…"></textarea>
        <div class="mt-2"></div>
      </div>

      <!-- Results -->
      <div class="col-12" id="hash-results">
        <h5 class="mb-3">Results</h5>

        <div class="mb-3">
          <p class="form-label text-muted">MD5</p>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <code id="out-md5" class="text-break flex-grow-1">{outMd5}</code>
              <CopyButton value={outMd5} title="Copy MD5" />
          </div>
        </div>

        <div class="mb-3">
          <p class="form-label text-muted">SHA-1</p>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <code id="out-sha1" class="text-break flex-grow-1">{outSha1}</code>
              <CopyButton value={outSha1} title="Copy SHA-1" />
          </div>
        </div>

        <div class="mb-3">
          <p class="form-label text-muted">SHA-256</p>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <code id="out-sha256" class="text-break flex-grow-1">{outSha256}</code>
              <CopyButton value={outSha256} title="Copy SHA-256" />
          </div>
        </div>
      </div>

    </div>

  </div>
</div>
