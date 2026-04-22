<script lang="ts">
import wasmUrl from '@imagemagick/magick-wasm/magick.wasm?url';
import * as IM from '@imagemagick/magick-wasm';

let initialized = false;
let initializing = false;
let originalFile: File | null = null;
let compressedBlob: Blob | null = null;
let compressedFilename = '';
let sizeDiff: number = 0;
let savingsPercentage: number = 0;

let outputFormat = 'JPEG';
let quality = 80;
let doResize = false;
let maxWidth = 1920;

let statusMessage = '';
let statusType: 'info' | 'danger' | 'warning' = 'info';

let previewOrigUrl: string | null = null;
let previewCompUrl: string | null = null;
let originalWidth: number = 0;
let originalHeight: number = 0;
let compressedWidth: number = 0;
let compressedHeight: number = 0;

function formatBytes(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

function showStatus(msg: string, type: typeof statusType = 'info') {
  statusMessage = msg; statusType = type;
}

function hideStatus() { statusMessage = ''; }

function handleFile(file: File) {
  if (!file.type || !file.type.startsWith('image/')) {
    showStatus('Please select an image file.', 'danger');
    return;
  }
  originalFile = file;
  compressedBlob = null;
  hideStatus();

  const url = URL.createObjectURL(file);
  previewOrigUrl = url;

  if (file.type === 'image/png') outputFormat = 'PNG';
  else if (file.type === 'image/webp') outputFormat = 'WEBP';
  else outputFormat = 'JPEG';
}

async function ensureInitialized() {
  if (initialized) return;
  if (initializing) return;
  initializing = true;
  showStatus('Loading ImageMagick — this may take a moment on first use…');
  try {
    await IM.initializeImageMagick(new URL(wasmUrl, window.location.href));
    initialized = true;
    initializing = false;
    hideStatus();
  } catch (err) {
    initializing = false;
    showStatus('Failed to load ImageMagick: ' + (err instanceof Error ? err.message : String(err)), 'danger');
    throw err;
  }
}

async function compress() {
  if (!originalFile) return;
  try {
    await ensureInitialized();
    showStatus('Compressing…');
    const arr = await originalFile.arrayBuffer();
    const inputData = new Uint8Array(arr);

    IM.ImageMagick!.read(inputData, (image: any) => {
      originalWidth = image.width;
      originalHeight = image.height;

      if (outputFormat !== 'PNG') image.quality = quality;
      if (doResize && image.width > Math.max(1, maxWidth)) {
        const mxw = Math.max(1, maxWidth);
        const ratio = mxw / image.width;
        const newHeight = Math.round(image.height * ratio);
        image.resize(mxw, newHeight);
      }

      compressedWidth = image.width;
      compressedHeight = image.height;

      const magickFmt = outputFormat === 'JPEG' ? IM.MagickFormat.Jpeg
        : outputFormat === 'WEBP' ? IM.MagickFormat.WebP
        : IM.MagickFormat.Png;

      image.write(magickFmt, (data: Uint8Array) => {
        const ext = outputFormat === 'JPEG' ? 'jpg' : outputFormat.toLowerCase();
        const mime = outputFormat === 'JPEG' ? 'image/jpeg'
          : outputFormat === 'WEBP' ? 'image/webp' : 'image/png';
        const blob = new Blob([new Uint8Array(data)], { type: mime });
        const baseName = originalFile!.name.replace(/\.[^.]+$/, '');
        compressedFilename = baseName + '-compressed.' + ext;
        compressedBlob = blob;

        previewCompUrl = URL.createObjectURL(blob);
        hideStatus();

        sizeDiff = originalFile!.size - blob.size;
        savingsPercentage = (sizeDiff / originalFile!.size) * 100;
      });
    });
  } catch (err) {
    showStatus('Compression failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
  }
}

function download() {
  if (!compressedBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(compressedBlob);
  a.download = compressedFilename;
  a.click();
}

let fileInputEl: HTMLInputElement | null = null;

function onDrop(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
}

function onFileChange() {
  if (fileInputEl?.files?.[0]) handleFile(fileInputEl.files[0]);
}
</script>

<style>
.drop-zone { cursor: pointer; }
.disabled { opacity: 0.5; }
</style>

<div class="card google-anno-skip">
  <div class="card-body">

    <div id="drop-zone" class="border border-2 rounded p-5 text-center mb-4 drop-zone"
      on:click={() => fileInputEl?.click()}
      on:dragover|preventDefault={() => { }}
      on:drop|preventDefault={onDrop}>
      <i class="fas fa-image fa-2x text-muted mb-2 d-block"></i>
      <p class="mb-1">Drop an image here, or <span class="text-info">click to browse</span></p>
      <small class="text-muted">JPEG · PNG · WebP · GIF · BMP</small>
      <input bind:this={fileInputEl} type="file" accept="image/*" class="d-none" on:change={onFileChange}>
    </div>

    {#if originalFile}
    <div id="options-section">
      <div class="row g-3 align-items-end mb-3">
        <div class="col-12 col-sm-4 col-md-3">
          <label class="form-label" for="output-format">Output Format</label>
          <select bind:value={outputFormat} class="form-select" id="output-format">
            <option value="JPEG">JPEG</option>
            <option value="PNG">PNG</option>
            <option value="WEBP">WebP</option>
          </select>
        </div>

        <div class="col-12 col-sm-8 col-md-5" class:disabled={outputFormat === 'PNG'}>
          <label class="form-label">Quality: <span>{quality}</span>%</label>
          <input type="range" class="form-range" min="1" max="100" bind:value={quality}>
        </div>

        <div class="col-12 col-md-4">
          <div class="form-check mb-1">
            <input class="form-check-input" type="checkbox" bind:checked={doResize} id="resize-check">
            <label class="form-check-label" for="resize-check">Limit max width</label>
          </div>
          <input class="form-control" type="number" bind:value={maxWidth} min="1" max="99999" disabled={!doResize} aria-label="Max width in pixels">
          <small class="text-muted">pixels</small>
        </div>
      </div>

      <button class="btn btn-info text-white" on:click={compress}>
        <i class="fas fa-compress-alt me-1"></i>Compress Image
      </button>
    </div>
    {/if}

    {#if statusMessage}
      <div id="status-msg" class="mt-3">
        <div class="alert" class:alert-danger={statusType==='danger'} class:alert-info={statusType==='info'}>{@html statusMessage}</div>
      </div>
    {/if}

    {#if compressedBlob}
      <div id="results-section" class="mt-4">
        <div class="row g-4">
          <div class="col-12 col-md-6">
            <h6 class="text-muted mb-2">Original</h6>
            <img src={previewOrigUrl} class="img-fluid rounded border" alt="Original image preview">
            <p class="mt-2 text-muted small">{originalFile?.name} — {formatBytes(originalFile?.size ?? 0)} - {originalWidth} x {originalHeight}px</p>
          </div>
          <div class="col-12 col-md-6">
            <h6 class="text-muted mb-2">Compressed</h6>
            <img src={previewCompUrl} class="img-fluid rounded border" alt="Compressed image preview">
            <p class="mt-2 text-muted small">{compressedFilename} — {formatBytes(compressedBlob.size)} - {compressedWidth} x {compressedHeight}px</p>
          </div>
        </div>

        <div class="mt-3 d-flex align-items-center gap-3 flex-wrap">
          <button class="btn btn-success" on:click={download}><i class="fas fa-download me-1"></i>Download</button>
          {#if savingsPercentage > 0}
            <span id="savings-label" class="fw-semibold text-success">{savingsPercentage.toFixed(1)}% smaller ({formatBytes(sizeDiff)} saved)</span>
          {:else}
            <span id="savings-label" class="fw-semibold text-warning">{(-savingsPercentage).toFixed(1)}% larger than original</span>
          {/if}
        </div>
      </div>
    {/if}

  </div>
</div>
