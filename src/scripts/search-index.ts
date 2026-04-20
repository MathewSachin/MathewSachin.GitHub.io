/**
 * Strip common Markdown/HTML syntax to produce plain text for indexing.
 * Order matters: fenced code blocks must be removed before inline code,
 * and HTML tags before link/image syntax so angle brackets don't interfere.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^[-*_]{3,}\s*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Derive the URL path from a post filename.
 * Filename pattern: YYYY-MM-DD-slug.md  (M and D may be 1 or 2 digits)
 * URL:       /blog/YYYY/MM/DD/slug.html
 */
export function postUrlFromFilename(filename: string): string | null {
  // getCollection provides post.id which includes the extension
  const name = filename.replace(/\.mdx?$/, '');
  const match = name.match(/^(\d{4})-(\d{1,2})-(\d{1,2})-(.+)$/);
  if (!match) return null;
  const [, year, month, day, slug] = match;
  return `/blog/${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}/${slug}.html`;
}