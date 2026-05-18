<script lang="ts">
  import { generateQrDataUrl, qrDownloadFilename, type QrErrorCorrectionLevel } from '@scripts/tools/qr.js';

  let text = $state('');
  let size = $state('256');
  let errorCorrectionLevel = $state<QrErrorCorrectionLevel>('M');
  let qrDataUrl = $state('');
  let error = $state('');
  let isGenerating = $state(false);
  let generationRequestId = 0;

  const downloadFilename = $derived(qrDownloadFilename(text));

  async function generateQrCode() {
    const requestId = ++generationRequestId;
    error = '';
    qrDataUrl = '';

    const trimmed = text.trim();
    if (!trimmed) {
      error = 'Please enter text or a URL.';
      return;
    }

    isGenerating = true;

    try {
      const generated = await generateQrDataUrl(trimmed, {
        size: Number(size),
        errorCorrectionLevel,
      });
      if (requestId === generationRequestId) {
        qrDataUrl = generated;
      }
    } catch (e) {
      const err = /** @type {Error|undefined} */ (e);
      if (requestId === generationRequestId) {
        error = err?.message ?? String(e);
      }
    } finally {
      if (requestId === generationRequestId) {
        isGenerating = false;
      }
    }
  }
</script>

<div class="card google-anno-skip">
  <div class="card-body">
    <div class="row g-4">
      <div class="col-12">
        <label class="form-label fw-semibold" for="qr-input">Text or URL</label>
        <textarea
          id="qr-input"
          class="form-control font-monospace"
          rows="4"
          bind:value={text}
          placeholder="https://example.com"
        ></textarea>
      </div>

      <div class="col-12 col-md-6">
        <label class="form-label" for="qr-size">Image Size</label>
        <select id="qr-size" class="form-select" bind:value={size}>
          <option value="128">128 x 128</option>
          <option value="256">256 x 256</option>
          <option value="512">512 x 512</option>
        </select>
      </div>

      <div class="col-12 col-md-6">
        <label class="form-label" for="qr-ecc">Error Correction</label>
        <select id="qr-ecc" class="form-select" bind:value={errorCorrectionLevel}>
          <option value="L">L (7%)</option>
          <option value="M">M (15%)</option>
          <option value="Q">Q (25%)</option>
          <option value="H">H (30%)</option>
        </select>
      </div>

      <div class="col-12 d-flex gap-2 flex-wrap">
        <button id="qr-generate-btn" class="btn btn-primary" onclick={generateQrCode} disabled={isGenerating}>
          {isGenerating ? 'Generating…' : 'Generate QR Code'}
        </button>
        <a
          id="qr-download-btn"
          class="btn btn-outline-secondary"
          href={qrDataUrl}
          download={downloadFilename}
          class:d-none={!qrDataUrl}
        >
          Download PNG
        </a>
      </div>

      <div class="col-12">
        <div id="qr-error" class={`text-danger small ${error ? '' : 'd-none'}`}>{error}</div>
      </div>

      <div class="col-12 text-center">
        <img
          id="qr-preview"
          src={qrDataUrl}
          alt="Generated QR code preview"
          width={Number(size)}
          height={Number(size)}
          class={`img-fluid border rounded p-2 bg-white ${qrDataUrl ? '' : 'd-none'}`}
        />
      </div>
    </div>
  </div>
</div>
