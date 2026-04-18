/**
 * Custom rehype plugin for Astro markdown processing.
 * Injects ads specifically before heading elements.
 */

import { visit } from 'unist-util-visit';

// Define only heading tags as targets
const HEADING_TAGS = new Set(['h2', 'h3', 'h4', 'h5', 'h6']);
const MINIMUM_HEADINGS = 2; // Only inject if the heading is at least this deep in the content

export function rehypeInjectAds(options = { density: 2 }) {
  const density = options.density; // Inject before every Nth heading
  
  return function (tree) {
    let headingCounter = 0;
    const insertions = [];

    visit(tree, 'element', (node, index, parent) => {
      // 1. Check if the node is a heading we care about
      if (!HEADING_TAGS.has(node.tagName)) return;
      
      // 2. Ensure it's a top-level node in the content area
      if (parent?.type !== 'root' && !isContentContainer(parent)) return;
      headingCounter++;

      // 3. Logic: Insert before the heading if it meets density requirements
      // We also check to avoid putting an ad at the absolute top of the post
      if (headingCounter % density === 0 && headingCounter >= MINIMUM_HEADINGS && index !== null && index > 0) {
        insertions.push({ index: index, parent });
      }
    });

    // Insert in reverse order to keep indices stable
    for (const { index, parent } of insertions.reverse()) {
      const adMarker = {
        type: 'element',
        tagName: 'in-content-ad-marker',
      };
      
      // We use 'index' instead of 'index + 1' to place it BEFORE the heading node
      parent.children.splice(index, 0, adMarker);
    }
  };
}

function isContentContainer(node) {
  if (!node) return false;
  const cls = (node.properties?.className || []);
  const containerClasses = ['page-content', 'card-body', 'post-content'];
  return Array.isArray(cls) 
    ? cls.some(c => containerClasses.includes(c))
    : containerClasses.includes(cls);
}