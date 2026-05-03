<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Fa from 'svelte-fa';
  import { faMicrochip, faFolderOpen, faTimes, faDownload, faTriangleExclamation, faPaperPlane, faStop } from '@fortawesome/free-solid-svg-icons';

  // ── State ────────────────────────────────────────────────────────────
  let phase: 'idle' | 'loading' | 'ready' | 'generating' | 'error' = 'idle';
  let loadProgress = 0;         // 0–100
  let loadStatusText = '';
  let errorMessage = '';
  let prompt = '';
  let output = '';
  let dirHandle: FileSystemDirectoryHandle | null = null;
  let dirName = '';

  let worker: Worker | null = null;

  // ── Worker setup ─────────────────────────────────────────────────────
  onMount(() => {
    worker = new Worker(new URL('./localai/worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;

      if (type === 'progress') {
        // payload may be { status, progress, file, name } from Transformers.js
        const p = payload ?? {};
        if (typeof p.progress === 'number') {
          loadProgress = Math.round(p.progress);
        }
        // Build a readable status string
        const file = p.file ?? p.name ?? '';
        const status = p.status ?? '';
        if (status === 'initiate') {
          loadStatusText = `Preparing: ${file}`;
        } else if (status === 'download' || status === 'progress') {
          loadStatusText = file ? `Downloading ${file} (${loadProgress}%)` : `Downloading… (${loadProgress}%)`;
        } else if (status === 'done') {
          loadStatusText = file ? `Loaded ${file}` : 'Loading…';
        } else {
          loadStatusText = status ? `${status}…` : 'Loading…';
        }
      } else if (type === 'ready') {
        phase = 'ready';
        loadStatusText = '';
      } else if (type === 'token') {
        output += payload ?? '';
      } else if (type === 'done') {
        phase = 'ready';
      } else if (type === 'error') {
        errorMessage = payload ?? 'An unknown error occurred.';
        phase = 'error';
      }
    };

    worker.onerror = (e) => {
      errorMessage = e.message ?? 'Worker error.';
      phase = 'error';
    };
  });

  onDestroy(() => {
    worker?.terminate();
  });

  // ── Actions ──────────────────────────────────────────────────────────

  async function pickDirectory() {
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support the File System Access API. The model will be cached in the browser\'s built-in cache instead.');
      return;
    }
    try {
      dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite', id: 'localai-model-cache' });
      dirName = dirHandle!.name;
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        alert('Could not open directory: ' + (err?.message ?? err));
      }
    }
  }

  function clearDirectory() {
    dirHandle = null;
    dirName = '';
  }

  function loadModel() {
    if (!worker || phase === 'loading' || phase === 'ready' || phase === 'generating') return;
    phase = 'loading';
    loadProgress = 0;
    loadStatusText = 'Initializing…';
    errorMessage = '';
    worker.postMessage({ type: 'load', payload: dirHandle ? { dirHandle } : {} });
  }

  async function generate() {
    if (!worker || phase !== 'ready' || !prompt.trim()) return;
    phase = 'generating';
    output = '';
    worker.postMessage({ type: 'generate', payload: { prompt: prompt.trim() } });
  }

  function abort() {
    worker?.postMessage({ type: 'abort' });
  }

  function reset() {
    phase = 'idle';
    errorMessage = '';
    output = '';
    loadProgress = 0;
    loadStatusText = '';
    // Recreate the worker so the model can be reloaded
    worker?.terminate();
    worker = new Worker(new URL('./localai/worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      const { type: t, payload: p } = e.data;
      if (t === 'progress') {
        if (typeof p?.progress === 'number') loadProgress = Math.round(p.progress);
        const file = p?.file ?? p?.name ?? '';
        const status = p?.status ?? '';
        if (status === 'initiate') loadStatusText = `Preparing: ${file}`;
        else if (status === 'download' || status === 'progress') loadStatusText = file ? `Downloading ${file} (${loadProgress}%)` : `Downloading… (${loadProgress}%)`;
        else if (status === 'done') loadStatusText = file ? `Loaded ${file}` : 'Loading…';
        else loadStatusText = status ? `${status}…` : 'Loading…';
      } else if (t === 'ready') { phase = 'ready'; loadStatusText = ''; }
      else if (t === 'token') { output += p ?? ''; }
      else if (t === 'done') { phase = 'ready'; }
      else if (t === 'error') { errorMessage = p ?? 'An unknown error occurred.'; phase = 'error'; }
    };
    worker.onerror = (e) => { errorMessage = e.message ?? 'Worker error.'; phase = 'error'; };
  }

  $: canGenerate = phase === 'ready' && prompt.trim().length > 0;
  $: isGenerating = phase === 'generating';
  $: isLoading = phase === 'loading';
</script>

<style>
.output-box {
  min-height: 120px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  line-height: 1.6;
}
.progress-bar { transition: width 0.3s ease; }
</style>

<div class="card google-anno-skip">
  <div class="card-body">

    <!-- ── Header note ──────────────────────────────────────────────── -->
    <div class="alert alert-info mb-4" role="alert">
      <Fa icon={faMicrochip} class="me-2" />
      <strong>Runs 100% in your browser.</strong>
      The model weights (~2 GB) are downloaded once and cached locally.
      WebGPU is required for acceleration.
    </div>

    <!-- ── Model cache directory picker ──────────────────────────────── -->
    <div class="mb-4">
      <label class="form-label fw-semibold">Model Cache Directory <span class="text-muted fw-normal">(optional)</span></label>
      <p class="text-muted small mb-2">
        Choose a local folder to save the model weights. This lets you reuse them across browsers and sessions without re-downloading.
        If you skip this, the model is cached in the browser's built-in storage.
      </p>
      <div class="d-flex align-items-center gap-2 flex-wrap">
        {#if dirName}
          <span class="badge bg-success fs-6 py-2 px-3" id="dir-name">
            <Fa icon={faFolderOpen} class="me-1" />{dirName}
          </span>
          <button class="btn btn-outline-secondary btn-sm" on:click={clearDirectory} id="clear-dir-btn"
            disabled={isLoading || isGenerating}>
            <Fa icon={faTimes} class="me-1" />Clear
          </button>
        {:else if phase === 'idle'}
          <button class="btn btn-outline-secondary" on:click={pickDirectory} id="pick-dir-btn">
            <Fa icon={faFolderOpen} class="me-1" />Pick Folder
          </button>
        {/if}
      </div>
    </div>

    <!-- ── Load model ────────────────────────────────────────────────── -->
    {#if phase === 'idle' || phase === 'error'}
      <div class="mb-4">
        <button class="btn btn-info text-white" id="load-btn" on:click={loadModel}>
          <Fa icon={faDownload} class="me-2" />Load Model
        </button>
      </div>
    {/if}

    <!-- ── Loading progress ──────────────────────────────────────────── -->
    {#if isLoading}
      <div class="mb-4">
        <div class="d-flex justify-content-between mb-1">
          <small class="text-muted" id="load-status">{loadStatusText}</small>
          <small class="text-muted">{loadProgress}%</small>
        </div>
        <div class="progress" style="height: 8px">
          <div class="progress-bar bg-info" id="load-progress-bar" role="progressbar"
            style="width: {loadProgress}%" aria-valuenow={loadProgress} aria-valuemin={0} aria-valuemax={100}></div>
        </div>
      </div>
    {/if}

    <!-- ── Error ─────────────────────────────────────────────────────── -->
    {#if phase === 'error'}
      <div class="alert alert-danger mb-4" id="error-msg" role="alert">
        <Fa icon={faTriangleExclamation} class="me-2" />{errorMessage}
        <button class="btn btn-sm btn-outline-danger ms-3" on:click={reset}>Retry</button>
      </div>
    {/if}

    <!-- ── Prompt + generate (shown once model is ready or generating) ── -->
    {#if phase === 'ready' || isGenerating}
      <div class="mb-3">
        <label class="form-label fw-semibold" for="prompt-input">Your prompt</label>
        <textarea
          id="prompt-input"
          class="form-control"
          rows="4"
          placeholder="Ask anything…"
          bind:value={prompt}
          disabled={isGenerating}
        ></textarea>
      </div>

      <div class="d-flex gap-2 mb-4 align-items-center flex-wrap">
        <button class="btn btn-info text-white" id="generate-btn"
          on:click={generate} disabled={!canGenerate || isGenerating}>
          <Fa icon={faPaperPlane} class="me-1" />
          {isGenerating ? 'Generating…' : 'Generate'}
        </button>
        {#if isGenerating}
          <button class="btn btn-outline-secondary" id="abort-btn" on:click={abort}>
            <Fa icon={faStop} class="me-1" />Stop
          </button>
        {/if}
      </div>

      <!-- ── Output ────────────────────────────────────────────────── -->
      {#if output || isGenerating}
        <div class="border rounded p-3 bg-dark text-light output-box" id="output-box" aria-live="polite">
          {output}{#if isGenerating}<span class="text-info">▌</span>{/if}
        </div>
      {/if}
    {/if}

  </div>
</div>
