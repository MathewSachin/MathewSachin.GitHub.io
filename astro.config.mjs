// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import rehypeRaw from 'rehype-raw';
import linkValidator from 'astro-link-validator';

import {
  remarkDisableIndentedCode,
  rehypeCodeBlockHeader,
  rehypeBootstrapFormatting,
  rehypeInjectAds,
} from './src/plugins/rehype-plugins.mjs';

const SITE = 'https://mathewsachin.github.io';

// Only run link validation on production builds (not PR preview builds that use a
// custom base URL, since the validator can't resolve base-prefixed links against dist/).
const isPreviewBuild = Boolean(process.env.ASTRO_BASE);
const integrations = [
  mdx(),
  sitemap(),
  ...(isPreviewBuild ? [] : [linkValidator({ failOnBrokenLinks: true })]),
];

export default defineConfig({
  site: SITE,
  // base is injected at build time via ASTRO_BASE env variable (used for PR previews)
  base: process.env.ASTRO_BASE || '/',
  trailingSlash: 'always',
  output: 'static',
  integrations,
  vite: {
    resolve: {
      alias: {
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        '@images': fileURLToPath(new URL('./src/content/images', import.meta.url)),
        '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
        '@scripts': fileURLToPath(new URL('./src/scripts', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
      },
    },
  },
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: { theme: 'monokai' },
    remarkPlugins: [
      // Disable 4-space indented code blocks — Jekyll/Kramdown posts use nested
      // HTML that would otherwise be misinterpreted as indented code under CommonMark.
      remarkDisableIndentedCode,
    ],
    rehypePlugins: [
      // rehype-raw must run first so that raw HTML blocks in .md files (e.g.
      // <pre class="pintora">, inline forms) are parsed into element nodes
      // before our custom plugins traverse the tree.
      rehypeRaw,
      rehypeCodeBlockHeader,
      rehypeBootstrapFormatting,
      // Ad injection density (every 7 content elements, mirrors _config.yml ad_density: 7)
      [rehypeInjectAds, { density: 7 }],
    ],
  },
  build: {
    format: 'preserve',
  },
  image: {
    // Use sharp for image processing (replaces jekyll-picture-tag)
    service: { entrypoint: 'astro/assets/services/sharp' },
    responsiveStyles: true
  },
});
