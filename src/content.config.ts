import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Blog post collection.
 * Files live in blog/_posts/ (symlinked to src/content/blog/).
 * Filename format: YYYY-MM-DD-slug.md  (M and D may be single digit)
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './blog/_posts' }),
  schema: z.object({
    title: z.string(),
    icon: z.string().optional(),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(),
    related: z.array(z.string()).default([]),
    accent_color: z.string().optional(),
    date: z.coerce.date().optional(),
    ads: z.boolean().default(true),
    toc: z.boolean().default(true),
    manifest: z.string().optional(),
    redirect_from: z.array(z.string()).optional(),
    description: z.string().optional(),
    image: z.string().optional(),
  }),
});

export const collections = { blog };

