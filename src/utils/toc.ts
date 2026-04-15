/**
 * TOC generator: extracts headings from rendered HTML and builds a nav tree.
 * Replaces the jekyll-toc gem (min_level: 2, max_level: 3).
 */

export interface TocEntry {
  id: string;
  text: string;
  level: number;
  children: TocEntry[];
}

/**
 * Parse heading elements from rendered HTML and return structured TOC entries.
 * Only levels h2 and h3 are included (mirrors _config.yml toc min: 2, max: 3).
 */
export function buildToc(html: string): TocEntry[] {
  const headingRegex = /<h([23])[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  const entries: TocEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const id = match[2];
    // Strip HTML tags from heading text for plain-text display
    const text = match[3].replace(/<[^>]+>/g, '').trim();
    entries.push({ id, text, level, children: [] });
  }

  return entries;
}

/**
 * Render TOC entries as an HTML <ul> / <li> tree.
 * Returns empty string when there are fewer than 3 headings.
 */
export function renderTocHtml(entries: TocEntry[]): string {
  if (entries.length < 3) return '';

  const h2s = entries.filter(e => e.level === 2);
  const h3sFor = (h2: TocEntry, all: TocEntry[]) => {
    const h2Idx = all.indexOf(h2);
    const nextH2Idx = all.findIndex((e, i) => i > h2Idx && e.level === 2);
    const slice = all.slice(h2Idx + 1, nextH2Idx === -1 ? undefined : nextH2Idx);
    return slice.filter(e => e.level === 3);
  };

  const items = entries.filter(e => e.level === 2 || e.level === 3);

  let html = '<ul class="toc-list">';
  let inH2 = false;
  let prevLevel = 0;

  for (const entry of entries.filter(e => e.level <= 3)) {
    if (entry.level === 2) {
      if (inH2) html += '</ul></li>';
      html += `<li><a href="#${entry.id}" class="toc-link">${escapeHtml(entry.text)}</a>`;
      inH2 = true;
      prevLevel = 2;
    } else if (entry.level === 3) {
      if (prevLevel === 2) html += '<ul class="toc-sublist">';
      html += `<li><a href="#${entry.id}" class="toc-link toc-link-h3">${escapeHtml(entry.text)}</a></li>`;
      prevLevel = 3;
    }
  }
  if (inH2) {
    if (prevLevel === 3) html += '</ul>';
    html += '</li>';
  }
  html += '</ul>';
  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
