<script lang="ts">
  import { onMount } from 'svelte';
  import { create, load, search } from '@orama/orama';

  const SCHEMA = {
    title: 'string',
    url: 'string',
    content: 'string',
    tags: 'string[]',
    date: 'string',
    type: 'string',
  };

  let { base } = $props();
  const basePath = $derived(base.replace(/\/$/, ''));

  let status = $state('Loading search index…');
  let term = $state('');
  let hits = $state([] as any[]);
  let inputDisabled = $state(true);
  let db: any = null;
  let inputEl: HTMLInputElement | null = null;

  function formatDate(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function isSafeUrl(url: string) {
    return /^\/[^"<>]*$/.test(url);
  }

  onMount(async () => {
    try {
      const resp = await fetch(`${basePath}/search-index.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const rawIndex = await resp.json();
      db = create({ schema: SCHEMA as any });
      load(db, rawIndex);
      status = '';
      inputDisabled = false;
      if (inputEl) inputEl.focus();
    } catch (err) {
      status = '<i class="fas fa-exclamation-triangle text-warning me-1"></i>Search index unavailable.';
      console.error('Search index load failed:', err);
    }
  });

  const DEBOUNCE_DELAY = 150;
  const RESULTS_LIMIT = 20;
  const TYPO_TOLERANCE = 1;
  let debounceTimer: number | undefined;

  async function handleInput(e: Event) {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    const target = e.target as HTMLInputElement;
    debounceTimer = window.setTimeout(async () => {
      term = target.value.trim();
      if (!term) { hits = []; return; }
      if (!db) return;
      const results = await search(db as any, {
        term,
        properties: ['title', 'content', 'tags'],
        tolerance: TYPO_TOLERANCE,
        limit: RESULTS_LIMIT,
      });
      hits = (results as any).hits ?? [];
    }, DEBOUNCE_DELAY);
  }
</script>

{#if status}
  <div id="search-status" class="text-muted small mb-3">
    {#if status === 'Loading search index…'}
      <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
    {/if}
    {@html status}
  </div>
{/if}

<div class="input-group mb-4">
  <span class="input-group-text bg-info text-white border-info"><i class="fas fa-search"></i></span>
  <input
    id="search-input"
    bind:this={inputEl}
    type="search"
    class="form-control form-control-lg"
    placeholder="Search posts and tools…"
    aria-label="Search posts and tools"
    oninput={handleInput}
    disabled={inputDisabled}
    autocomplete="off"
  />
</div>

<div id="search-results">
  {#if !term}
    <!-- empty before search -->
  {:else if hits.length === 0}
    <p class="text-muted">No results matched your search.</p>
  {:else}
    {#each hits as {document: doc}}
        <a href={isSafeUrl(doc.url) ? basePath + doc.url : '#'} class="tag-post-link text-decoration-none text-reset search-result-link">
            <div class="blog-post-item py-3 mb-1">
            <div class="d-flex justify-content-between align-items-start gap-2">
                <span class="blog-post-title fw-semibold">{doc.title}</span>
                {#if doc.type === 'tool'}
                <span class="badge rounded-pill bg-info text-white">Tool</span>
                {:else}
                <span class="small text-muted text-nowrap">{formatDate(doc.date)}</span>
                {/if}
            </div>
            {#if doc.tags && doc.tags.length && doc.type !== 'tool'}
                <div class="mt-1">
                {#each doc.tags as t}
                    <span class="badge rounded-pill bg-secondary me-1">{t}</span>
                {/each}
                </div>
            {/if}
            </div>
        </a>
    {/each}
  {/if}
</div>
