<script lang="ts">
import {
  Input,
  Output,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  WebMOutputFormat,
  MkvOutputFormat,
  MovOutputFormat,
  Mp3OutputFormat,
  WavOutputFormat,
  OggOutputFormat,
  FlacOutputFormat,
} from 'mediabunny';

// ── Format catalogue ────────────────────────────────────────────────

type FormatEntry = {
  label: string;
  ext: string;
  mime: string;
  isAudioOnly: boolean;
  makeFormat: () => InstanceType<
    typeof Mp4OutputFormat | typeof WebMOutputFormat | typeof MkvOutputFormat |
    typeof MovOutputFormat | typeof Mp3OutputFormat | typeof WavOutputFormat |
    typeof OggOutputFormat | typeof FlacOutputFormat
  >;
};

const FORMATS: FormatEntry[] = [
  { label: 'MP4 (.mp4)',  ext: 'mp4',  mime: 'video/mp4',         isAudioOnly: false, makeFormat: () => new Mp4OutputFormat() },
  { label: 'WebM (.webm)', ext: 'webm', mime: 'video/webm',        isAudioOnly: false, makeFormat: () => new WebMOutputFormat() },
  { label: 'MKV (.mkv)',  ext: 'mkv',  mime: 'video/x-matroska',  isAudioOnly: false, makeFormat: () => new MkvOutputFormat() },
  { label: 'MOV (.mov)',  ext: 'mov',  mime: 'video/quicktime',   isAudioOnly: false, makeFormat: () => new MovOutputFormat() },
  { label: 'MP3 (.mp3)',  ext: 'mp3',  mime: 'audio/mpeg',        isAudioOnly: true,  makeFormat: () => new Mp3OutputFormat() },
  { label: 'WAV (.wav)',  ext: 'wav',  mime: 'audio/wav',         isAudioOnly: true,  makeFormat: () => new WavOutputFormat() },
  { label: 'OGG (.ogg)',  ext: 'ogg',  mime: 'audio/ogg',         isAudioOnly: true,  makeFormat: () => new OggOutputFormat() },
  { label: 'FLAC (.flac)', ext: 'flac', mime: 'audio/flac',       isAudioOnly: true,  makeFormat: () => new FlacOutputFormat() },
];

// ── State ────────────────────────────────────────────────────────────

let inputFile: File | null = null;
let inputDuration: number | null = null;
let hasVideo = false;
let hasAudio = false;
let inputVideoRes = '';
let inputAudioInfo = '';

let outputFormatIdx = 0;
let discardVideo = false;
let doResize = false;
let maxWidth = 1280;

let converting = false;
let progress = 0;
let outputBlob: Blob | null = null;
let outputFilename = '';

let statusMessage = '';
let statusType: 'info' | 'danger' | 'warning' = 'info';

let fileInputEl: HTMLInputElement | null = null;
let activeConversion: Conversion | null = null;

// ── Helpers ──────────────────────────────────────────────────────────

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatBytes(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

function showStatus(msg: string, type: typeof statusType = 'info') {
  statusMessage = msg; statusType = type;
}

function hideStatus() { statusMessage = ''; }

// ── File selection ───────────────────────────────────────────────────

async function handleFile(file: File) {
  if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
    showStatus('Please select a video or audio file.', 'danger');
    return;
  }

  inputFile = file;
  outputBlob = null;
  hasVideo = false;
  hasAudio = false;
  inputDuration = null;
  inputVideoRes = '';
  inputAudioInfo = '';
  hideStatus();

  showStatus('Reading file metadata…');
  try {
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    inputDuration = await input.computeDuration();

    const vt = await input.getPrimaryVideoTrack().catch(() => null);
    const at = await input.getPrimaryAudioTrack().catch(() => null);

    hasVideo = vt !== null;
    hasAudio = at !== null;

    if (vt) inputVideoRes = `${vt.displayWidth} × ${vt.displayHeight}`;
    if (at) inputAudioInfo = `${at.sampleRate} Hz · ${at.numberOfChannels === 1 ? 'Mono' : at.numberOfChannels === 2 ? 'Stereo' : at.numberOfChannels + 'ch'}`;

    await input.dispose();
    hideStatus();

    // Default: pick first suitable output format
    if (!hasVideo) {
      // Audio-only input → default to MP3
      outputFormatIdx = FORMATS.findIndex(f => f.ext === 'mp3');
    } else {
      outputFormatIdx = 0; // MP4
    }
    discardVideo = false;
  } catch (err) {
    showStatus('Could not read file: ' + (err instanceof Error ? err.message : String(err)), 'danger');
  }
}

function onFileChange() {
  if (fileInputEl?.files?.[0]) handleFile(fileInputEl.files[0]);
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
}

// ── Conversion ───────────────────────────────────────────────────────

async function startConversion() {
  if (!inputFile) return;

  converting = true;
  progress = 0;
  outputBlob = null;
  activeConversion = null;
  showStatus('Starting conversion…');

  try {
    const fmt = FORMATS[outputFormatIdx];
    const target = new BufferTarget();
    const input = new Input({ source: new BlobSource(inputFile), formats: ALL_FORMATS });
    const output = new Output({ format: fmt.makeFormat(), target });

    const conversion = await Conversion.init({
      input,
      output,
      showWarnings: false,
      video: (fmt.isAudioOnly || discardVideo) ? { discard: true } : (
        doResize ? { width: Math.max(1, maxWidth) } : undefined
      ),
    });
    activeConversion = conversion;

    conversion.onProgress = (p: number) => { progress = p; };

    await conversion.execute();

    const baseName = inputFile.name.replace(/\.[^.]+$/, '');
    outputFilename = baseName + '.' + fmt.ext;
    outputBlob = new Blob([target.buffer!], { type: fmt.mime });
    hideStatus();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'ConversionCanceledError') {
      showStatus('Conversion canceled.', 'warning');
    } else {
      showStatus('Conversion failed: ' + (err instanceof Error ? err.message : String(err)), 'danger');
    }
  } finally {
    converting = false;
    activeConversion = null;
  }
}

async function cancelConversion() {
  if (activeConversion) await activeConversion.cancel();
}

function download() {
  if (!outputBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(outputBlob);
  a.download = outputFilename;
  a.click();
}

// ── Derived ──────────────────────────────────────────────────────────

$: selectedFormat = FORMATS[outputFormatIdx];
$: videoDiscarded = !hasVideo || selectedFormat.isAudioOnly || discardVideo;
</script>

<style>
.drop-zone { cursor: pointer; }
.progress-bar { transition: width 0.2s ease; }
</style>

<div class="card google-anno-skip">
  <div class="card-body">

    <!-- Drop zone -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="border border-2 rounded p-5 text-center mb-4 drop-zone"
      role="button"
      tabindex="0"
      on:click={() => fileInputEl?.click()}
      on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputEl?.click(); }}
      on:dragover|preventDefault={() => {}}
      on:drop|preventDefault={onDrop}
    >
      <i class="fas fa-file-video fa-2x text-muted mb-2 d-block"></i>
      <p class="mb-1">Drop a video or audio file here, or <span class="text-info">click to browse</span></p>
      <small class="text-muted">MP4 · WebM · MKV · MOV · MP3 · WAV · OGG · FLAC · and more</small>
      <input bind:this={fileInputEl} type="file" accept="video/*,audio/*" class="d-none" on:change={onFileChange}>
    </div>

    <!-- File info -->
    {#if inputFile}
    <div class="mb-4">
      <h6 class="text-muted mb-2">Input File</h6>
      <table class="table table-sm table-borderless mb-0" style="max-width: 500px">
        <tbody>
          <tr><td class="text-muted pe-3" style="width:120px">Name</td><td class="text-break">{inputFile.name}</td></tr>
          <tr><td class="text-muted">Size</td><td>{formatBytes(inputFile.size)}</td></tr>
          {#if inputDuration !== null}
          <tr><td class="text-muted">Duration</td><td>{formatDuration(inputDuration)}</td></tr>
          {/if}
          {#if inputVideoRes}
          <tr><td class="text-muted">Video</td><td>{inputVideoRes}</td></tr>
          {/if}
          {#if inputAudioInfo}
          <tr><td class="text-muted">Audio</td><td>{inputAudioInfo}</td></tr>
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Options -->
    <div class="mb-4">
      <h6 class="text-muted mb-2">Output Options</h6>
      <div class="row g-3 align-items-start">
        <div class="col-12 col-sm-5 col-md-4">
          <label class="form-label" for="output-format">Output Format</label>
          <select bind:value={outputFormatIdx} class="form-select" id="output-format">
            {#each FORMATS as fmt, i}
              <option value={i}>{fmt.label}</option>
            {/each}
          </select>
        </div>

        {#if hasVideo && !selectedFormat.isAudioOnly}
        <div class="col-12 col-sm-7 col-md-5">
          <div style="height: 2rem"></div>
          <div class="form-check mb-2">
            <input class="form-check-input" type="checkbox" bind:checked={discardVideo} id="discard-video-check">
            <label class="form-check-label" for="discard-video-check">Extract audio only (discard video)</label>
          </div>
          {#if !discardVideo}
          <div class="form-check mb-1">
            <input class="form-check-input" type="checkbox" bind:checked={doResize} id="resize-check">
            <label class="form-check-label" for="resize-check">Limit max width</label>
          </div>
          <div class="input-group" style="max-width: 200px">
            <input class="form-control" type="number" bind:value={maxWidth} min="1" max="99999" disabled={!doResize} aria-label="Max width in pixels">
            <span class="input-group-text">px</span>
          </div>
          {/if}
        </div>
        {/if}
      </div>
    </div>

    <!-- Convert button -->
    <div class="d-flex gap-2 align-items-center flex-wrap">
      <button class="btn btn-info text-white" on:click={startConversion} disabled={converting}>
        <i class="fas fa-rotate me-1"></i>Convert
      </button>
      {#if converting}
      <button class="btn btn-outline-secondary" on:click={cancelConversion}>
        <i class="fas fa-stop me-1"></i>Cancel
      </button>
      {/if}
    </div>
    {/if}

    <!-- Status -->
    {#if statusMessage}
    <div class="mt-3">
      <div class="alert mb-0"
        class:alert-info={statusType === 'info'}
        class:alert-danger={statusType === 'danger'}
        class:alert-warning={statusType === 'warning'}
      >{statusMessage}</div>
    </div>
    {/if}

    <!-- Progress -->
    {#if converting}
    <div class="mt-3">
      <div class="d-flex justify-content-between mb-1">
        <small class="text-muted">Converting…</small>
        <small class="text-muted">{(progress * 100).toFixed(0)}%</small>
      </div>
      <div class="progress" style="height: 8px">
        <div class="progress-bar bg-info" role="progressbar" style="width: {progress * 100}%"></div>
      </div>
    </div>
    {/if}

    <!-- Result -->
    {#if outputBlob}
    <div class="mt-4 p-3 border rounded">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <p class="mb-1 fw-semibold text-success"><i class="fas fa-circle-check me-1"></i>Conversion complete</p>
          <small class="text-muted">{outputFilename} — {formatBytes(outputBlob.size)}</small>
        </div>
        <button class="btn btn-success" on:click={download}>
          <i class="fas fa-download me-1"></i>Download
        </button>
      </div>
    </div>
    {/if}

  </div>
</div>
