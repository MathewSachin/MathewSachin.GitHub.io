<script lang="ts">
import CopyButton from './CopyButton.svelte';
import { minify } from 'terser';
import Fa from 'svelte-fa';
import { faCopy, faCheck, faBookmark, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

let raw = '';
let compiled = '';
let dragHref = '#';
let bmDisabled = true;
let statRaw = 0;
let statOut = 0;
let statPct = 0;
let showSavings = false;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

function uriEncode(code: string) {
  return code
    .replace(/%/g, '%25')
    .replace(/\"/g, '%22')
    .replace(/'/g, '%27')
    .replace(/#/g, '%23')
    .replace(/&/g, '%26')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/`/g, '%60');
}

function setResult(bookmarklet: string) {
  compiled = bookmarklet;
  statRaw = raw.length;
  statOut = bookmarklet.length;
  if (statRaw > 0 && statOut > 0 && statOut < statRaw) {
    statPct = Math.round((1 - statOut / statRaw) * 100);
    showSavings = true;
  } else {
    showSavings = false;
  }
  dragHref = bookmarklet;
  bmDisabled = false;
}

function clearResult() {
  compiled = '';
  statOut = 0;
  showSavings = false;
  dragHref = '#';
  bmDisabled = true;
}

function update() {
  statRaw = raw.length;

  if (!raw.trim()) {
    clearResult();
    return;
  }

  if (debounceTimer) { clearTimeout(debounceTimer); }
  debounceTimer = setTimeout(() => {
    const mySeq = ++seq;
    minify(raw, {
      compress: true,
      mangle: false,
      format: { comments: false }
    }).then((result: { code?: string }) => {
      if (mySeq !== seq) return;
      const code = (result as unknown as { code?: string })?.code ?? '';
      const bookmarklet = 'javascript:(function(){' + uriEncode(code) + '})();';
      setResult(bookmarklet);
    }).catch((err) => {
      if (mySeq !== seq) return;
      const e = err as { message?: string; line?: number; col?: number } | undefined;
      let msg = e?.message || String(err);
      if (e && e.line != null && !msg.includes(String(e.line))) {
        msg += ' [line ' + e.line + (e.col != null ? ':' + e.col : '') + ']';
      }
      compiled = '/* ' + msg + ' */';
      dragHref = '#';
      bmDisabled = true;
      showSavings = false;
      statOut = 0;
    });
  }, 250);
}
</script>

<style>
  #raw-input,
  #compiled-output {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.85rem;
    resize: vertical;
    min-height: 300px;
  }
  #drag-btn {
    display: inline-block;
    padding: 0.55rem 1.15rem;
    background: #17a2b8;
    color: #fff;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    cursor: grab;
    border: 2px solid #17a2b8;
    transition: background 0.2s, border-color 0.2s, opacity 0.2s;
    user-select: none;
  }
  #drag-btn:hover {
    background: #138496;
    border-color: #138496;
    color: #fff;
  }
  #drag-btn.bm-disabled {
    opacity: 0.45;
    pointer-events: none;
  }
  .stat-badge {
    display: inline-block;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    font-size: 0.78rem;
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
</style>

<div class="card google-anno-skip">
  <div class="card-body">
    <div class="row g-4">

      <div class="col-12 col-md-6">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="mb-0">Raw JavaScript</h5>
          <button class="btn btn-sm btn-outline-secondary" on:click={() => { raw = ''; update(); }}>Clear</button>
        </div>
        <textarea id="raw-input" class="form-control" rows="14"
          bind:value={raw}
          placeholder="Paste your raw JavaScript here…"
          aria-label="Raw JavaScript source"
          on:input={update}></textarea>
        <div class="mt-2 d-flex gap-2 flex-wrap" id="stats-bar" aria-live="polite" aria-atomic="true">
          <span class="stat-badge"><span>{statRaw.toLocaleString()}</span> chars in</span>
          <span class="stat-badge text-info"><span>{statOut.toLocaleString()}</span> chars out</span>
          {#if showSavings}
            <span class="stat-badge text-success" id="stat-savings-badge"><span>{statPct}</span>% smaller</span>
          {/if}
        </div>
      </div>

      <div class="col-12 col-md-6">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="mb-0">Compiled Bookmarklet</h5>
          <CopyButton
            id="copy-btn"
            value={compiled}
            className="btn btn-sm btn-outline-secondary"
            iconClass="me-1"
            icon={faCopy}
            copiedIcon={faCheck}
          >Copy</CopyButton>
        </div>
        <textarea id="compiled-output" class="form-control" rows="14" readonly
          bind:value={compiled}
          placeholder="Compiled output will appear here…"
          aria-label="Compiled bookmarklet output"></textarea>
        <div class="mt-3">
          <div class="d-none d-md-flex align-items-center gap-3 flex-wrap">
            <a id="drag-btn" href={dragHref} class:bm-disabled={bmDisabled} draggable="true"
              title="Drag this button onto your bookmarks bar">
              <Fa icon={faBookmark} class="me-2" />Drag me to Bookmarks
            </a>
            <small class="text-muted">or right-click → Bookmark this link</small>
          </div>
          <p class="d-md-none mb-0 text-muted" style="font-size:0.85rem;">
            <Fa icon={faInfoCircle} class="me-1" />Dragging to the bookmarks bar is a desktop-only feature.
            On mobile, tap <strong>Copy</strong> above, then manually create a new bookmark in your browser and paste the compiled code as the URL.
          </p>
        </div>
      </div>

    </div>
  </div>
</div>
