import { getCollection } from 'astro:content';
import { create, insert, save } from '@orama/orama';
// Notice the updated relative path since we are now inside src/pages/
import { TOOLS } from '@data/tools';
import { stripMarkdown, postUrlFromFilename } from '@scripts/search-index'

// IMPORTANT: Tells Astro to build this as a static .json file during `astro build`
export const prerender = true;

const MAX_CONTENT_LENGTH = 2000;

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