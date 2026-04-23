<script>
  import { md5, sha } from '@scripts/tools/hash.js';

  let text = '';
  let outMd5 = '';
  let outSha1 = '';
  let outSha256 = '';

  let copied = { md5: false, sha1: false, sha256: false };

  $: outMd5 = md5(text || '');

  $: if (text !== undefined) {
    // compute async hashes; allow rapid updates
    const t = text || '';
    sha('SHA-1', t).then(h => outSha1 = h).catch(() => outSha1 = '');
    sha('SHA-256', t).then(h => outSha256 = h).catch(() => outSha256 = '');
  }

  function copy(valueKey) {
    const val = valueKey === 'md5' ? outMd5 : valueKey === 'sha1' ? outSha1 : outSha256;
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => {
      copied[valueKey] = true;
      setTimeout(() => copied[valueKey] = false, 1200);
    }).catch(() => {});
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
            <button class="btn btn-sm btn-outline-secondary copy-hash-btn" title="Copy MD5" on:click={() => copy('md5')}>
              {#if copied.md5}
                <i class="fas fa-check"></i>
              {:else}
                <i class="fas fa-copy"></i>
              {/if}
            </button>
          </div>
        </div>

        <div class="mb-3">
          <p class="form-label text-muted">SHA-1</p>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <code id="out-sha1" class="text-break flex-grow-1">{outSha1}</code>
            <button class="btn btn-sm btn-outline-secondary copy-hash-btn" title="Copy SHA-1" on:click={() => copy('sha1')}>
              {#if copied.sha1}
                <i class="fas fa-check"></i>
              {:else}
                <i class="fas fa-copy"></i>
              {/if}
            </button>
          </div>
        </div>

        <div class="mb-3">
          <p class="form-label text-muted">SHA-256</p>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <code id="out-sha256" class="text-break flex-grow-1">{outSha256}</code>
            <button class="btn btn-sm btn-outline-secondary copy-hash-btn" title="Copy SHA-256" on:click={() => copy('sha256')}>
              {#if copied.sha256}
                <i class="fas fa-check"></i>
              {:else}
                <i class="fas fa-copy"></i>
              {/if}
            </button>
          </div>
        </div>
      </div>

    </div>

  </div>
</div>
