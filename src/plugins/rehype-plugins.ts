import { visit } from 'unist-util-visit';

const HEADING_TAGS = new Set(['h2']);
const MINIMUM_HEADINGS = 2;

export function rehypeInjectAds(options: { density?: number } = { density: 2 }) {
  const density = options.density ?? 2;

  return function (tree: any) {
    let headingCounter = 0;
    let hasContentSinceLastHeading = true; // Initialize true to allow the first heading
    const insertions: Array<{ index: number; parent: any }> = [];

    visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
      // 1. If it's NOT a heading, check if it's "content"
      if (!HEADING_TAGS.has(node.tagName)) {
        // If we find a non-heading element with children or text, we have content
        if (node.children && node.children.length > 0) {
          hasContentSinceLastHeading = true;
        }
        return;
      }

      // 2. It IS a heading. Ensure it's in a valid container.
      if (parent?.type !== 'root' && !isContentContainer(parent)) return;

      // 3. ADJACENCY CHECK: Skip if no content appeared since the last heading
      if (!hasContentSinceLastHeading) return;

      // Valid heading found, increment counter
      headingCounter++;
      
      // Reset the flag: we now need new content before the NEXT heading counts
      hasContentSinceLastHeading = false;

      // 4. Density Logic
      if (headingCounter % density === 0 && headingCounter >= MINIMUM_HEADINGS && index !== undefined && index > 0) {
        insertions.push({ index: index as number, parent });
      }
    });

    for (const { index, parent } of insertions.reverse()) {
      const adMarker = {
        type: 'element',
        tagName: 'in-content-ad-marker',
      };
      parent.children.splice(index, 0, adMarker);
    }
  };
}

function isContentContainer(node: any) {
  if (!node) return false;
  const cls = (node.properties?.className || []);
  const containerClasses = ['page-content', 'card-body', 'post-content'];
  return Array.isArray(cls) 
    ? cls.some((c: string) => containerClasses.includes(c))
    : containerClasses.includes(cls);
}
