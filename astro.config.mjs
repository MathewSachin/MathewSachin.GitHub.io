// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

import {
  rehypeCodeBlockHeader,
  rehypeBootstrapFormatting,
  rehypeInjectAds,
  rehypePintora,
} from './src/plugins/rehype-plugins.mjs';

const SITE = 'https://mathewsachin.github.io';

export default defineConfig({
  site: SITE,
  // base is injected at build time via ASTRO_BASE env variable (used for PR previews)
  base: process.env.ASTRO_BASE || '/',
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    mdx(),
    sitemap(),
  ],
  vite: {
    resolve: {
      alias: {
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      },
    },
  },
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: { theme: 'monokai' },
    remarkPlugins: [],
    rehypePlugins: [
      rehypeCodeBlockHeader,
      rehypeBootstrapFormatting,
      // Ad injection density (every 7 content elements, mirrors _config.yml ad_density: 7)
      [rehypeInjectAds, { density: 7 }],
      rehypePintora,
    ],
  },
  build: {
    // Output each page as /path/index.html (directory URLs) for clean GitHub Pages routing
    format: 'directory',
  },
  image: {
    // Use sharp for image processing (replaces jekyll-picture-tag)
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
