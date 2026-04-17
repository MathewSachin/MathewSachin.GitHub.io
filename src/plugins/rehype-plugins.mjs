/**
 * Custom rehype/remark plugins for Astro markdown processing.
 * These replace the Jekyll Ruby plugins:
 *   - rehypeCodeBlockHeader  ← _plugins/code_block_header.rb
 *   - rehypeBootstrapFormatting ← _plugins/bootstrap_formatting.rb
 *   - rehypeInjectAds        ← _plugins/content_ad_split_markers.rb
 *   - rehypePintora          ← _plugins/pintora.rb
 */

import { visit, SKIP } from 'unist-util-visit';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// 0. remarkDisableIndentedCode
//    Disables CommonMark "indented code block" parsing (4-space indentation).
//    Jekyll/Kramdown doesn't honour this rule, so blog posts that contain raw
//    HTML blocks with nested indented content (e.g. a <div> with 4-space inner
//    divs) would be incorrectly split into code blocks under CommonMark.
//    Since all intentional code examples use fenced blocks (```), this is safe.
// ---------------------------------------------------------------------------
export function remarkDisableIndentedCode() {
  const data = this.data();
  const extensions = data.micromarkExtensions || (data.micromarkExtensions = []);
  // Tell micromark to disable the 'codeIndented' construct
  extensions.push({ disable: { null: ['codeIndented'] } });
}

// ---------------------------------------------------------------------------
// 1. rehypeCodeBlockHeader
//    Adds a .code-block-header div (language label + copy button) before
//    every highlighted code block. Mirrors code_block_header.rb.
// ---------------------------------------------------------------------------
export function rehypeCodeBlockHeader() {
  return function (tree) {
    let counter = 0;
    // Collect the replacements to make: [parentChildren, index, newNode]
    const replacements = [];

    visit(tree, 'element', (node, index, parent) => {
      // Shiki wraps code in <pre> with class "astro-code" or data-language
      if (node.tagName !== 'pre') return;
      // Skip <pre> nodes already inside a .highlight wrapper we just created
      const parentClasses = (parent?.properties?.className || []);
      if (parentClasses.includes('highlight')) return SKIP;

      const code = node.children?.find(c => c.type === 'element' && c.tagName === 'code');
      if (!code) return;

      counter++;
      const id = `code-block-${counter}`;

      // Detect language from class or data-language
      let lang = '';
      const langClass = (code.properties?.className || []).find(
        (c) => typeof c === 'string' && c.startsWith('language-')
      );
      if (langClass) lang = langClass.replace('language-', '');
      // Shiki may expose the language as data-language on the <pre>
      if (!lang && node.properties?.dataLanguage) lang = String(node.properties.dataLanguage);

      // Build the header node
      const langSpan = lang
        ? { type: 'element', tagName: 'span', properties: { className: ['code-lang'] }, children: [{ type: 'text', value: lang }] }
        : { type: 'element', tagName: 'span', properties: {}, children: [] };

      const copyBtn = {
        type: 'element',
        tagName: 'button',
        properties: {
          className: ['btn', 'btn-sm', 'btn-clip'],
          title: 'Copy to clipboard',
          'data-clipboard-target': `#${id}`,
          'aria-label': 'Copy code to clipboard',
        },
        children: [
          {
            type: 'element',
            tagName: 'i',
            properties: { className: ['fa', 'fa-copy'], 'aria-hidden': 'true' },
            children: [],
          },
        ],
      };

      const header = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['code-block-header', 'd-flex', 'align-items-center', 'justify-content-between', 'px-3', 'py-1'],
        },
        children: [langSpan, copyBtn],
      };

      // Clone node so we can put the original <pre> (with added id) inside the wrapper
      const preWithId = { ...node, properties: { ...node.properties, id } };

      const wrapper = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['highlight'] },
        children: [header, preWithId],
      };

      // Defer the replacement to avoid mutating the tree during traversal
      if (parent && index !== null) {
        replacements.push({ parent, index, wrapper });
      }
      // Skip descending into this node — we don't want to visit children
      return SKIP;
    });

    // Apply replacements in reverse order to preserve indices
    for (const { parent, index, wrapper } of replacements.reverse()) {
      parent.children.splice(index, 1, wrapper);
    }
  };
}

// ---------------------------------------------------------------------------
// 2. rehypeBootstrapFormatting
//    Adds Bootstrap classes to <table> and <blockquote> elements.
//    Mirrors bootstrap_formatting.rb.
// ---------------------------------------------------------------------------
export function rehypeBootstrapFormatting() {
  const TABLE_CLASSES = ['table', 'table-bordered', 'table-striped', 'table-sm'];
  const BQ_CLASSES = ['blockquote', 'fw-light'];

  return function (tree) {
    // Tables inside .page-content (when rendered inside the post layout,
    // the markdown content is always inside .page-content)
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'table') {
        const existing = (node.properties?.className || []);
        const toAdd = TABLE_CLASSES.filter(c => !existing.includes(c));
        node.properties = node.properties || {};
        node.properties.className = [...existing, ...toAdd];

        // Wrap in .table-responsive if not already
        const parentClasses = (parent?.properties?.className || []);
        if (!parentClasses.includes('table-responsive')) {
          const wrapper = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['table-responsive'] },
            children: [{ ...node }],
          };
          Object.assign(node, wrapper);
        }
      }

      if (node.tagName === 'blockquote') {
        const existing = (node.properties?.className || []);
        const toAdd = BQ_CLASSES.filter(c => !existing.includes(c));
        node.properties = node.properties || {};
        node.properties.className = [...existing, ...toAdd];
      }
    });
  };
}

// ---------------------------------------------------------------------------
// 3. rehypeInjectAds
//    Injects an in-content AdSense unit after every `density` target nodes.
//    Mirrors content_ad_split_markers.rb.
//    In production builds (NODE_ENV=production) the full <ins> + push script
//    is injected directly into the static HTML; in dev mode nothing is injected
//    so local previews stay clean.
// ---------------------------------------------------------------------------
const AD_TARGET_TAGS = new Set(['p', 'h2', 'h3', 'h4', 'h5', 'h6', 'picture', 'figure', 'table']);
const ADSENSE_ID = process.env.PUBLIC_ADSENSE_ID || 'ca-pub-4251360406988977';
const IS_PROD_BUILD = process.env.NODE_ENV === 'production';

export function rehypeInjectAds(options = { density: 7 }) {
  const density = options.density;
  return function (tree) {
    // In dev mode, skip injection entirely so local previews stay clean.
    if (!IS_PROD_BUILD) return;

    // Collect target nodes at the top level of the document
    let counter = 0;
    const insertions = [];

    visit(tree, 'element', (node, index, parent) => {
      // Only top-level content nodes (direct children of root-level containers)
      if (!AD_TARGET_TAGS.has(node.tagName)) return;
      if (parent?.type !== 'root' && !isContentContainer(parent)) return;

      counter++;
      if (counter % density === 0 && index !== null) {
        insertions.push({ index: index + 1, parent });
      }
    });

    // Insert in reverse order to avoid index shifting
    for (const { index, parent } of insertions.reverse()) {
      // Inject the full AdSense unit as static HTML nodes so it works in the
      // Astro static build without needing runtime component rendering.
      const adNode = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['in-content-ad', 'google-anno-skip'] },
        children: [
          {
            type: 'element',
            tagName: 'ins',
            properties: {
              className: ['adsbygoogle'],
              style: 'display:block',
              'data-ad-client': ADSENSE_ID,
              'data-ad-slot': 'auto',
              'data-ad-format': 'auto',
              'data-full-width-responsive': 'true',
            },
            children: [],
          },
          {
            type: 'element',
            tagName: 'script',
            properties: {},
            children: [
              { type: 'text', value: '(adsbygoogle = window.adsbygoogle || []).push({});' },
            ],
          },
        ],
      };
      parent.children.splice(index, 0, adNode);
    }
  };
}

function isContentContainer(node) {
  if (!node) return false;
  const cls = (node.properties?.className || []);
  return cls.some(c => ['page-content', 'card-body', 'post-content'].includes(c));
}

// ---------------------------------------------------------------------------
// 4. rehypePintora
//    Renders pintora diagrams at build time.
//    Mirrors pintora.rb.
//    Looks for <pre class="pintora"> and replaces with inline SVG.
// ---------------------------------------------------------------------------
const PINTORA_SCRIPT = join(
  fileURLToPath(new URL('../../scripts/render-pintora.mjs', import.meta.url))
);

export function rehypePintora() {
  return function (tree) {
    const pintoraNodes = [];

    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre') return;
      const classes = (node.properties?.className || []);
      if (!classes.includes('pintora') && !classes.includes('language-pintora')) return;
      pintoraNodes.push({ node, index, parent });
    });

    if (pintoraNodes.length === 0) return;

    if (!existsSync(PINTORA_SCRIPT)) {
      console.warn('[rehypePintora] render-pintora.mjs not found – skipping diagram render');
      return;
    }

    for (const { node, index, parent } of pintoraNodes) {
      // Extract diagram code from the pre node
      const code = extractTextContent(node);
      try {
        const result = spawnSync('node', [PINTORA_SCRIPT], {
          input: code,
          encoding: 'utf8',
          timeout: 30000,
        });
        if (result.status !== 0) {
          console.error('[rehypePintora] Render failed:', result.stderr);
          continue;
        }
        const svg = result.stdout.trim();
        const wrapper = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['pintora-wrapper'] },
          // Insert raw SVG as HTML; Astro will pass it through
          children: [{ type: 'raw', value: svg }],
        };
        parent.children.splice(index, 1, wrapper);
      } catch (err) {
        console.error('[rehypePintora] Error:', err);
      }
    }
  };
}

function extractTextContent(node) {
  if (node.type === 'text') return node.value || '';
  if (node.children) return node.children.map(extractTextContent).join('');
  return '';
}
