/**
 * Utilities for deriving URLs and metadata from blog post collection entries.
 * NOTE: In Astro 6 content layer (glob loader), entries use .id (not .slug).
 */
import type { CollectionEntry } from 'astro:content';

/**
 * Derive the URL path from a content collection entry id.
 * ID pattern (from glob loader):  YYYY-MM-DD-post-title
 * URL:                      /blog/YYYY/MM/DD/post-title.html
 */
export function postUrlFromId(id: string): string {
  const match = id.match(/^(\d{4})-(\d{1,2})-(\d{1,2})-(.+)$/);
  if (!match) return `/blog/${id}.html`;
  const [, year, month, day, title] = match;
  return `/blog/${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}/${title}.html`;
}

/**
 * Derive the post ID (used in series.ts / related arrays).
 * Format: /blog/YYYY/MM/DD/slug  (no trailing slash, no .html)
 */
export function postIdFromEntryId(id: string): string {
  const url = postUrlFromId(id);
  // Strip .html extension for use as post ID
  return url.endsWith('.html') ? url.slice(0, -5) : url;
}

// Keep alias for backward compat within this migration
export const postUrlFromSlug = postUrlFromId;
export const postIdFromSlug = postIdFromEntryId;

/**
 * Extract date from a content collection entry.
 * Priority: frontmatter date → filename prefix.
 */
export function getPostDate(entry: CollectionEntry<'blog'>): Date {
  if (entry.data.date) return entry.data.date;
  // Astro 6 uses .id from the glob loader
  const entryId = (entry as unknown as { id?: string }).id ?? '';
  const match = entryId.match(/^(\d{4})-(\d{1,2})-(\d{1,2})-/);
  if (match) {
    return new Date(`${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}T00:00:00Z`);
  }
  return new Date(0);
}

/**
 * Estimate reading time from word count (mirrors Liquid readingTime.html).
 */
export function estimateReadingTime(content: string): string {
  const words = content.split(/\s+/).length;
  if (words <= 90) return '30 sec';
  if (words < 270) return '1 min';
  if (words < 450) return '2 min';
  if (words < 630) return '3 min';
  if (words < 810) return '4 min';
  if (words < 990) return '5 min';
  return `${Math.floor(words / 180)} min`;
}

/**
 * Format a Date to a human-readable string.
 * Output: "15 Apr 2026"
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format a Date to "Apr 15, 2026" (used in archive/tags pages).
 */
export function formatDateUS(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Sort posts descending by date (newest first).
 */
export function sortPostsByDate(posts: CollectionEntry<'blog'>[]): CollectionEntry<'blog'>[] {
  return posts.slice().sort((a, b) => getPostDate(b).getTime() - getPostDate(a).getTime());
}

/**
 * Build an object mapping tag name → posts array, sorted by descending post count.
 */
export function buildTagsMap(
  posts: CollectionEntry<'blog'>[]
): Map<string, CollectionEntry<'blog'>[]> {
  const map = new Map<string, CollectionEntry<'blog'>[]>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const list = map.get(tag) ?? [];
      list.push(post);
      map.set(tag, list);
    }
  }
  return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length));
}

/**
 * Group posts by year (descending).
 */
export function groupPostsByYear(
  posts: CollectionEntry<'blog'>[]
): Map<number, CollectionEntry<'blog'>[]> {
  const map = new Map<number, CollectionEntry<'blog'>[]>();
  for (const post of posts) {
    const year = getPostDate(post).getUTCFullYear();
    const list = map.get(year) ?? [];
    list.push(post);
    map.set(year, list);
  }
  return new Map([...map.entries()].sort((a, b) => b[0] - a[0]));
}

/**
 * Convert a tag name to a URL-friendly slug.
 */
export function tagSlug(tag: string): string {
  return tag
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Derive the tag page URL for a tag name.
 */
export function tagUrl(tag: string): string {
  return `/blog/tags/${tagSlug(tag)}/`;
}

const TAG_COLORS: string[] = [
  '#FFEBEE',
  '#F3E5F5',
  '#E3F2FD',
  '#B2EBF2',
  '#B2DFDB',
  '#F0F4C3',
  '#FFE0B2',
  '#FFCCBC',
  '#D7CCC8',
  '#FCE4EC'
];

export function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i);
    hash |= 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}