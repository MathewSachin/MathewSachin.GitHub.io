/**
 * search.js — Astro version (no Liquid template variables)
 *
 * Resolves base path from the current page URL so it works on
 * both the main site and PR preview deployments.
 */
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
const RESULTS_LIMIT  = 20;
const TYPO_TOLERANCE = 1;

// Derive base path: prefer window.SEARCH_BASE injected by the Astro search page,
// then fall back to <base> tag, then infer from the current pathname.
// (works for both / and /pr-preview/pr-N/ deployments)
const BASE_PATH = (() => {
  if (typeof window !== 'undefined' && window.SEARCH_BASE) return window.SEARCH_BASE.replace(/\/$/, '');
  const base = document.querySelector('base[href]');
  if (base) return base.getAttribute('href').replace(/\/$/, '');
  // Infer base from the search page's pathname: /[base]/search/ → /[base]
  const parts = location.pathname.split('/').filter(Boolean);
  const searchIdx = parts.findIndex(p => p === 'search' || p === 'search.html');
  if (searchIdx > 0) return '/' + parts.slice(0, searchIdx).join('/');
  return '';
})();

const statusEl  = document.getElementById('search-status');
const inputEl   = document.getElementById('search-input');
const resultsEl = document.getElementById('search-results');

let db = null;

async function initIndex() {
  try {
    const resp = await fetch(`${BASE_PATH}/search-index.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rawIndex = await resp.json();
    db = create({ schema: SCHEMA });
    load(db, rawIndex);
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
