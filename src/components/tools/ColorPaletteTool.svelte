<script lang="ts">
  import { onDestroy } from 'svelte';
  import CopyButton from '@components/tools/CopyButton.svelte';
  import { extractProminentHexColors } from '@scripts/tools/color-palette.js';

  const MAX_SAMPLE_DIMENSION = 240;

  let fileInputEl: HTMLInputElement | null = null;
  let selectedFile: File | null = null;
  let previewUrl: string | null = null;
  let palette: string[] = [];
  let statusMessage = '';
  let statusType: 'info' | 'danger' = 'info';
  let isProcessing = false;

  $: paletteList = palette.join(', ');

  function showStatus(message: string, type: typeof statusType = 'info') {
    statusMessage = message;
    statusType = type;
  }

  function clearStatus() {
    statusMessage = '';
  }

  function clearPreviewUrl() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  }

  onDestroy(() => {
    clearPreviewUrl();
  });

  function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not decode image file.'));
      img.src = url;
    });
  }

  function getSampleDimensions(width: number, height: number) {
    const maxSide = Math.max(width, height);
    const scale = maxSide > MAX_SAMPLE_DIMENSION ? MAX_SAMPLE_DIMENSION / maxSide : 1;
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  }

  async function extractPaletteFromFile(file: File): Promise<string[]> {
    const decodeUrl = URL.createObjectURL(file);
    try {
      const img = await loadImage(decodeUrl);
      const sourceWidth = img.naturalWidth || img.width;
      const sourceHeight = img.naturalHeight || img.height;
      const sample = getSampleDimensions(sourceWidth, sourceHeight);

      const canvas = document.createElement('canvas');
      canvas.width = sample.width;
      canvas.height = sample.height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not initialize canvas.');

      ctx.drawImage(img, 0, 0, sample.width, sample.height);
      const imageData = ctx.getImageData(0, 0, sample.width, sample.height);

      return extractProminentHexColors(imageData.data, {
        maxColors: 8,
        quantizationStep: 24,
        minAlpha: 125,
      });
    } finally {
      URL.revokeObjectURL(decodeUrl);
    }
  }

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showStatus('Please select an image file.', 'danger');
      return;
    }

    selectedFile = file;
    palette = [];
    clearStatus();
    clearPreviewUrl();
    previewUrl = URL.createObjectURL(file);
    isProcessing = true;

    try {
      const colors = await extractPaletteFromFile(file);
      if (colors.length === 0) {
        showStatus('No visible pixels found in this image.', 'danger');
      } else {
        palette = colors;
      }
    } catch (err) {
      showStatus(err instanceof Error ? err.message : String(err), 'danger');
    } finally {
      isProcessing = false;
    }
  }

  function onFileChange() {
    const file = fileInputEl?.files?.[0];
    if (file) processFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }
</script>

<style>
  .drop-zone {
    cursor: pointer;
    transition: border-color 0.2s ease;
  }

  .drop-zone:hover {
    border-color: var(--bs-info) !important;
  }
</style>

<div class="card google-anno-skip">
  <div class="card-body">
    <label
      for="color-palette-file"
      id="color-palette-drop-zone"
      class="drop-zone border border-2 rounded p-5 text-center mb-4 d-block"
      on:dragover|preventDefault={() => {}}
      on:drop|preventDefault={onDrop}
    >
      <i class="fas fa-image fa-2x text-muted mb-2 d-block"></i>
      <p class="mb-1">Drop an image here, or <span class="text-info">click to browse</span></p>
      <small class="text-muted">PNG · JPEG · WebP · GIF · SVG</small>
    </label>
    <input
      id="color-palette-file"
      bind:this={fileInputEl}
      type="file"
      accept="image/*"
      class="d-none"
      on:change={onFileChange}
    />

    {#if isProcessing}
      <div id="palette-processing" class="alert alert-info mb-0">Extracting colors…</div>
    {/if}

    {#if statusMessage}
      <div class={`alert mt-3 mb-0 ${statusType === 'danger' ? 'alert-danger' : 'alert-info'}`}>{statusMessage}</div>
    {/if}

    {#if selectedFile && previewUrl}
      <div class="mt-4">
        <h6 class="text-muted mb-2">Image Preview</h6>
        <img id="palette-preview" class="img-fluid border rounded" src={previewUrl} alt="Uploaded image preview" />
        <p class="small text-muted mt-2 mb-0">{selectedFile.name}</p>
      </div>
    {/if}

    {#if palette.length > 0}
      <div class="mt-4">
        <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
          <h6 class="text-muted mb-0">Prominent Colors</h6>
          <CopyButton
            value={paletteList}
            className="btn btn-sm btn-outline-secondary"
            title="Copy all colors"
            iconClass="fas fa-copy"
            copiedIconClass="fas fa-check"
          >
            Copy all
          </CopyButton>
        </div>

        <div class="row g-3">
          {#each palette as color}
            <div class="col-12 col-sm-6 col-lg-4">
              <div class="border rounded p-2">
                <div class="rounded mb-2" style={`height: 56px; background-color: ${color};`}></div>
                <div class="d-flex justify-content-between align-items-center gap-2">
                  <code class="mb-0">{color}</code>
                  <CopyButton
                    value={color}
                    className="btn btn-sm btn-outline-secondary"
                    title={`Copy ${color}`}
                    iconClass="fas fa-copy"
                    copiedIconClass="fas fa-check"
                  />
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
