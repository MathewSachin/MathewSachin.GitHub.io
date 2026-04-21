import { visit } from 'unist-util-visit';

const HEADING_TAGS = new Set(['h2']);
const MINIMUM_HEADINGS = 2;

export function rehypeInjectAds(options: { density?: number } = { density: 2 }) {
  const density = options.density ?? 2;

  return function (tree: unknown) {
    let headingCounter = 0;
    let hasContentSinceLastHeading = true; // Initialize true to allow the first heading
    const insertions: Array<{ index: number; parent: unknown }> = [];

    visit(tree as any, 'element', (node: unknown, index: number | undefined, parent: unknown) => {
      // 1. If it's NOT a heading, check if it's "content"
      const n = node as any;
      if (!HEADING_TAGS.has(n.tagName)) {
        // If we find a non-heading element with children or text, we have content
        if (n.children && n.children.length > 0) {
          hasContentSinceLastHeading = true;
        }
        return;
      }

      // 2. It IS a heading. Ensure it's in a valid container.
      const p = parent as any;
      if (p?.type !== 'root' && !isContentContainer(p)) return;

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
      (parent as any).children.splice(index, 0, adMarker);
    }
  };
}

function isContentContainer(node: unknown) {
  if (!node) return false;
  const n = node as any;
  const cls = (n.properties?.className || []);
  const containerClasses = ['page-content', 'card-body', 'post-content'];
  return Array.isArray(cls)
    ? cls.some((c: string) => containerClasses.includes(c))
    : containerClasses.includes(cls);
}
