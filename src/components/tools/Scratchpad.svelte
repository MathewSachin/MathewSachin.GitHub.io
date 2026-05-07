<script>
  import { onMount, onDestroy } from 'svelte';
  import { countWords } from '@scripts/tools/scratchpad.js';
  import CopyButton from './CopyButton.svelte';

  const STORAGE_KEY = 'scratchpad-v1';

  let pad = $state('');
  let saveStatus = $state('');
  const words = $derived(countWords(pad || ''));
  const chars = $derived((pad || '').length);
  let isFullscreen = $state(false);
  const fsLabel = $derived(isFullscreen ? 'Exit Full Screen' : 'Full Screen');

  let saveTimer = null;

  function persistContent() {
    try {
      localStorage.setItem(STORAGE_KEY, pad);
      saveStatus = 'Saved';
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => { saveStatus = ''; }, 2000);
    } catch (e) {
      saveStatus = 'Could not save';
    }
  }

  function onInput() {
    persistContent();
  }

  function clearAll() {
    if (pad !== '' && !window.confirm('Clear all text?')) return;
    pad = '';
    persistContent();
    // focus will be handled by consumer after mount
  }

  function toggleFullscreen() {
    const card = document.getElementById('scratchpad-card');
    if (!document.fullscreenElement) {
      if (card && card.requestFullscreen) card.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }

  function onFullscreenChange() {
    isFullscreen = !!document.fullscreenElement;
  }

  onMount(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) pad = saved;
    } catch (e) {}
    window.addEventListener('fullscreenchange', onFullscreenChange);
  });

  onDestroy(() => {
    window.removeEventListener('fullscreenchange', onFullscreenChange);
    if (saveTimer) clearTimeout(saveTimer);
  });
</script>

<style>
:global(#scratchpad-card:fullscreen) {
  border-radius: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background: var(--bs-body-bg, #fff);
  overflow: hidden;
}
:global(#scratchpad-card:fullscreen) .card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}
:global(#scratchpad-card:fullscreen) #scratchpad {
  flex: 1;
  min-height: 0;
  resize: none;
}
</style>

<div class="card google-anno-skip" id="scratchpad-card">
  <div class="card-body">

    <div class="d-flex align-items-center gap-2 flex-wrap mb-3">
      <CopyButton value={pad} title="Copy All" iconClass="fas fa-copy me-1" copiedIconClass="fas fa-check me-1">Copy All</CopyButton>
      <button class="btn btn-outline-secondary btn-sm" id="clear-btn" onclick={clearAll}>
        <i class="fas fa-trash me-1"></i>Clear
      </button>
      <button class="btn btn-outline-secondary btn-sm" id="fullscreen-btn" onclick={toggleFullscreen} title="Toggle full screen">
        <i class={isFullscreen ? 'fas fa-compress me-1' : 'fas fa-expand me-1'}></i><span id="fullscreen-label">{fsLabel}</span>
      </button>
      <span class="ms-auto text-muted small" id="save-status">{saveStatus}</span>
      <span class="text-muted small" id="word-count">{words} word{words !== 1 ? 's' : ''}  {chars} char{chars !== 1 ? 's' : ''}</span>
    </div>

    <textarea id="scratchpad" class="form-control font-monospace"
      style="min-height:420px;resize:vertical;font-size:1rem;line-height:1.6;"
      placeholder="Paste or type here — your text is saved automatically…"
      spellcheck="true"
      autocomplete="off"
      bind:value={pad}
      oninput={onInput}></textarea>

  </div>
</div>
