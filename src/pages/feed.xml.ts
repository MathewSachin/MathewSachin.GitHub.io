/**
 * RSS feed: /feed.xml
 */
import rss from '@astrojs/rss';
import { getAllPosts, getPostDate, postUrlFromSlug } from '@utils/posts';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getAllPosts();
  const SITE = context.site?.toString().replace(/\/$/, '') ?? 'https://mathewsachin.github.io';

  return rss({
    title: 'Mathew Sachin Blog',
    description: 'My Website where I blog',
    site: SITE,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: getPostDate(post),
      link: `${SITE}${postUrlFromSlug(post.id)}`,
    })),
    customData: '<language>en-us</language>',
  });
}
