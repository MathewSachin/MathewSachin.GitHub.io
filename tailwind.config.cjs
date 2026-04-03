/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './_layouts/**/*.html',
    './_includes/**/*.html',
    './index.html',
    './blog/**/*.html',
    './tools/index.html',
  ],
  // Classes injected at runtime by formatting.js and copy-code.js must be
  // safelisted so Tailwind doesn't purge them during the static content scan.
  safelist: [
    'fw-light',
    'fw-bold',
    'blockquote',
    'table',
    'table-bordered',
    'table-striped',
    'table-sm',
    'table-responsive',
  ],
  corePlugins: {
    // Keep browser defaults intact — post content (lists, headings, etc.)
    // relies on them; blog.css and styles.css layer on top.
    preflight: false,
    // Disable Tailwind's built-in .container so our @layer components version
    // takes precedence without fighting Bootstrap on tool pages.
    container: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
