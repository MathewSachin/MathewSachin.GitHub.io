---
---
import { create, load, search } from '{{ "/scripts/orama.js" | relative_url }}';

const SCHEMA = {
  title: 'string',
  url: 'string',
  content: 'string',
  tags: 'string[]',
  date: 'string',
};

const BASE_PATH = '{{ site.baseurl }}';

const statusEl = document.getElementById('search-status');
const inputEl  = document.getElementById('search-input');
const resultsEl = document.getElementById('search-results');

let db = null;

async function initIndex() {
  try {
    const resp = await fetch('{{ "/search-index.json" | relative_url }}');
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

function renderResults(hits) {
  if (!hits.length) {
    resultsEl.innerHTML = '<p class="text-muted">No posts matched your search.</p>';
    return;
  }
  resultsEl.innerHTML = hits.map(({ document: doc }) => {
    // Only allow safe relative paths (prevent javascript: URL injection)
    const safeUrl = /^\/[^"<>]*$/.test(doc.url) ? BASE_PATH + doc.url : '#';
    return `
    <a href="${safeUrl}" class="tag-post-link text-decoration-none text-reset">
      <div class="blog-post-item py-3 mb-1">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <span class="blog-post-title fw-semibold">${escapeHtml(doc.title)}</span>
          <span class="small text-muted text-nowrap">${formatDate(doc.date)}</span>
        </div>
        ${doc.tags && doc.tags.length ? `
          <div class="mt-1">
            ${doc.tags.map(t => `<span class="badge rounded-pill bg-secondary me-1">${escapeHtml(t)}</span>`).join('')}
          </div>` : ''}
      </div>
    </a>
  `}).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
      tolerance: 1,
      limit: 20,
    });
    renderResults(results.hits);
  }, 150);
});

initIndex();
