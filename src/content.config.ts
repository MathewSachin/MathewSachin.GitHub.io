import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

/**
 * Blog post collection.
 * Files live in blog/_posts/ (symlinked to src/content/blog/).
 * Filename format: YYYY-MM-DD-slug.md  (M and D may be single digit)
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: 'src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    icon: z.string().optional(),
    tags: z.array(z.string()).default([]),
    related: z.array(reference('blog')).default([]),
    accent_color: z.string().optional(),
    date: z.coerce.date().optional(),
    ads: z.boolean().default(true),
    toc: z.boolean().default(true),
    manifest: z.string().optional(),
    redirect_from: z.array(z.string()).optional(),
    description: z.string().optional(),
    image: image().optional(),
  }),
});

const toolDocs = defineCollection({
  loader: glob({ pattern: '*.mdx', base: 'src/content/tool-docs' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    accent_color: z.string().optional(),
    quick_tool: z.boolean().default(false),
    listed: z.boolean().default(true),
    published: z.boolean().default(false),
    order: z.number().default(999),
    component: z.string().optional(),
    ads: z.boolean().default(true),
    manifest: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, toolDocs };
