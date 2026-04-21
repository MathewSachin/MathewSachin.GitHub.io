import { create, load, search } from '@orama/orama';
import { escapeHtml, trackEvent } from './utils';

const SCHEMA = {
  title: 'string',
  url: 'string',
  content: 'string',
  tags: 'string[]',
  date: 'string',
  type: 'string',
};

const DEBOUNCE_DELAY = 150;
const RESULTS_LIMIT = 20;
const TYPO_TOLERANCE = 1;

const BASE_PATH = (() => {
  if (typeof window !== 'undefined' && (window as any).SEARCH_BASE) return (window as any).SEARCH_BASE.replace(/\/$/, '');
  const base = document.querySelector('base[href]');
  if (base) return (base.getAttribute('href') || '').replace(/\/$/, '');
  const parts = location.pathname.split('/').filter(Boolean);
  const searchIdx = parts.findIndex(p => p === 'search' || p === 'search.html');
  if (searchIdx > 0) return '/' + parts.slice(0, searchIdx).join('/');
  return '';
})();

const statusEl = document.getElementById('search-status') as HTMLElement | null;
const inputEl = document.getElementById('search-input') as HTMLInputElement | null;
const resultsEl = document.getElementById('search-results') as HTMLElement | null;

let db: any = null;

async function initIndex() {
  if (!statusEl || !inputEl || !resultsEl) return;
  try {
    const resp = await fetch(`${BASE_PATH}/search-index.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rawIndex = await resp.json();
    db = create({ schema: SCHEMA as any });
    load(db, rawIndex);
    statusEl.textContent = '';
    inputEl.disabled = false;
    inputEl.focus();
  } catch (err) {
    statusEl.innerHTML = '<i class="fas fa-exclamation-triangle text-warning me-1"></i>Search index unavailable.';
    console.error('Search index load failed:', err);
  }
}

function formatDate(iso: string | undefined) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function renderResult(result: any) {
  const doc = result.document;
  const safeUrl = /^\/[^"<>]*$/.test(doc.url) ? BASE_PATH + doc.url : '#';
  const isTool = doc.type === 'tool';
  const metaHtml = isTool
    ? `<span class="badge rounded-pill bg-info text-white">Tool</span>`
    : `<span class="small text-muted text-nowrap">${formatDate(doc.date)}</span>`;
  const tagsHtml = !isTool && doc.tags && doc.tags.length
    ? `<div class="mt-1">${doc.tags.map((t: string) => `<span class="badge rounded-pill bg-secondary me-1">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';
  return `
    <a href="${safeUrl}" class="tag-post-link text-decoration-none text-reset search-result-link" data-result-title="${escapeHtml(doc.title)}">
      <div class="blog-post-item py-3 mb-1">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <span class="blog-post-title fw-semibold">${escapeHtml(doc.title)}</span>
          ${metaHtml}
        </div>
        ${tagsHtml}
      </div>
    </a>`;
}

function renderResults(hits: any[]) {
  if (!hits.length) {
    if (resultsEl) resultsEl.innerHTML = '<p class="text-muted">No results matched your search.</p>';
    return;
  }
  if (resultsEl) resultsEl.innerHTML = hits.map(renderResult).join('');
}

let debounceTimer: number | undefined;
if (inputEl) {
  inputEl.addEventListener('input', () => {
    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(async () => {
      const term = (inputEl as HTMLInputElement).value.trim();
      if (!term) { if (resultsEl) resultsEl.innerHTML = ''; return; }
      if (!db) return;
      const results = await search(db, {
        term,
        properties: ['title', 'content', 'tags'],
        tolerance: TYPO_TOLERANCE,
        limit: RESULTS_LIMIT,
      });
      renderResults(results.hits);
      trackEvent('search', { search_term: term, result_count: results.hits.length });
    }, DEBOUNCE_DELAY) as unknown as number;
  });
}

if (resultsEl) {
  resultsEl.addEventListener('click', (e) => {
    const link = (e.target as Element).closest('.search-result-link') as HTMLElement | null;
    if (link) trackEvent('search_result_click', { post_title: link.dataset.resultTitle || '' });
  });
}

initIndex();
