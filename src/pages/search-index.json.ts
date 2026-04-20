import { getCollection } from 'astro:content';
import { create, insert, save } from '@orama/orama';
// Notice the updated relative path since we are now inside src/pages/
import { TOOLS } from '../data/tools';

// IMPORTANT: Tells Astro to build this as a static .json file during `astro build`
export const prerender = true;

const MAX_CONTENT_LENGTH = 2000;

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

/**
 * Extract the post date as a YYYY-MM-DD string.
 * Preference order: frontmatter `date` field → filename prefix → first 10 chars of filename.
 */
function parsePostDate(dateInFrontmatter: Date | undefined, filename: string): string {
  if (dateInFrontmatter) {
    const dateStr = dateInFrontmatter.toISOString();
    return dateStr.slice(0, 10);
  }
  const dateMatch = filename.match(/^(\d{4})-(\d{1,2})-(\d{1,2})-/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
  }
  return filename.slice(0, 10);
}

// Astro API Endpoint
export async function GET() {
  // 1. Fetch all posts via Astro's content collections
  const posts = await getCollection('blog');

  const db = create({
    schema: {
      title: 'string',
      url: 'string',
      content: 'string',
      tags: 'string[]',
      date: 'string',
      type: 'string',
    },
  });

  let inserted = 0;

  // 2. Loop over the Astro posts array
  for (const post of posts) {
    // post.id is the actual filename (e.g. '2023-01-01-post.md')
    const url = postUrlFromFilename(post.id);
    if (!url) {
      console.warn(`Skipping unrecognised filename: ${post.id}`);
      continue;
    }

    // post.data contains your frontmatter
    const title = String(post.data.title ?? '');
    const tags = post.data.tags;
    const date = parsePostDate(post.data.date, post.id);
    
    // post.body contains the raw markdown string (without frontmatter)
    const plainContent = stripMarkdown(post.body ?? '').slice(0, MAX_CONTENT_LENGTH);

    await insert(db, { title, url, content: plainContent, tags, date, type: 'post' });
    inserted++;
  }

  // 3. Index tools from src/data/tools.ts
  for (const tool of TOOLS) {
    const url = `/tools/${tool.id}/`;
    await insert(db, {
      title: tool.name,
      url,
      content: tool.description,
      tags: [],
      date: '',
      type: 'tool',
    });
    inserted++;
  }

  const rawIndex = save(db);
  console.log(`Search index generated (${inserted} entries)`);

  // 4. Return the JSON response to Astro
  return new Response(JSON.stringify(rawIndex), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}