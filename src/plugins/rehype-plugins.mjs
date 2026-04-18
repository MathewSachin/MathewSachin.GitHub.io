/**
 * Custom rehype/remark plugins for Astro markdown processing.
 * These replace the Jekyll Ruby plugins:
 *   - rehypeInjectAds        ← _plugins/content_ad_split_markers.rb
 */

import { visit } from 'unist-util-visit';

// ---------------------------------------------------------------------------
// rehypeInjectAds
//    Injects an in-content ad placeholder after every `density` target nodes.
//    Mirrors content_ad_split_markers.rb.
//    The ad HTML is rendered at runtime by the PostLayout component; here we
//    only insert a <div data-ad-slot> marker that the layout turns into a real
//    ad unit.
// ---------------------------------------------------------------------------
const AD_TARGET_TAGS = new Set(['p', 'h2', 'h3', 'h4', 'h5', 'h6', 'picture', 'figure', 'table']);

export function rehypeInjectAds(options = { density: 7 }) {
  const density = options.density;
  return function (tree) {
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
      const adMarker = {
        type: 'element',
        tagName: 'in-content-ad-marker',
      };
      parent.children.splice(index, 0, adMarker);
    }
  };
}

function isContentContainer(node) {
  if (!node) return false;
  const cls = (node.properties?.className || []);
  return cls.some(c => ['page-content', 'card-body', 'post-content'].includes(c));
}
