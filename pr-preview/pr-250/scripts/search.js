import { create, load, search } from '/pr-preview/pr-250/scripts/orama.js';
import { escapeHtml } from '/pr-preview/pr-250/scripts/utils.js';

const SCHEMA = {
  title: 'string',
  url: 'string',
  content: 'string',
  tags: 'string[]',
  date: 'string',
  type: 'string',
};

const DEBOUNCE_DELAY = 150;  // ms of inactivity before triggering a search
const RESULTS_LIMIT  = 20;   // max results returned per query
const TYPO_TOLERANCE = 1;    // allowed edit distance for fuzzy matching

const BASE_PATH = '/pr-preview/pr-250';

const statusEl  = document.getElementById('search-status');
const inputEl   = document.getElementById('search-input');
const resultsEl = document.getElementById('search-results');

// Safe GA event tracker — no-ops gracefully if analytics is blocked
function trackEvent(name, params) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    }
  } catch (_) {}
}

let db = null;

async function initIndex() {
  try {
    const resp = await fetch('/pr-preview/pr-250/search-index.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rawIndex = await resp.json();
    db = await create({ schema: SCHEMA });
    await load(db, rawIndex);
    statusEl.textContent = '';
    inputEl.disabled = false;
    inputEl.focus();
  } catch (err) {
    statusEl.innerHTML = '<i class="fas fa-exclamation-triangle text-warning me-1"></i>Search index unavailable.';
    console.error('Search index load failed:', err);
  }
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function renderResult({ document: doc }) {
  // Only allow safe relative paths (prevent javascript: URL injection)
  const safeUrl = /^\/[^"<>]*$/.test(doc.url) ? BASE_PATH + doc.url : '#';
  const isTool = doc.type === 'tool';
  const metaHtml = isTool
    ? `<span class="badge rounded-pill bg-info text-white">Tool</span>`
    : `<span class="small text-muted text-nowrap">${formatDate(doc.date)}</span>`;
  const tagsHtml = !isTool && doc.tags && doc.tags.length
    ? `<div class="mt-1">${doc.tags.map(t => `<span class="badge rounded-pill bg-secondary me-1">${escapeHtml(t)}</span>`).join('')}</div>`
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

function renderResults(hits) {
  if (!hits.length) {
    resultsEl.innerHTML = '<p class="text-muted">No results matched your search.</p>';
    return;
  }
  resultsEl.innerHTML = hits.map(renderResult).join('');
}

let debounceTimer;
inputEl.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const term = inputEl.value.trim();
    if (!term) { resultsEl.innerHTML = ''; return; }
    if (!db) return;
    const results = await search(db, {
      term,
      properties: ['title', 'content', 'tags'],
      tolerance: TYPO_TOLERANCE,
      limit: RESULTS_LIMIT,
    });
    renderResults(results.hits);
    trackEvent('search', { search_term: term, result_count: results.hits.length });
  }, DEBOUNCE_DELAY);
});

resultsEl.addEventListener('click', (e) => {
  const link = e.target.closest('.search-result-link');
  if (link) trackEvent('search_result_click', { post_title: link.dataset.resultTitle || '' });
});

initIndex();
