import { getCollection } from 'astro:content';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent_color?: string;
  quick_tool?: boolean;
  tags: string[];
}

export async function getTools(): Promise<Tool[]> {
  const entries = await getCollection('toolDocs', ({ data }) => data.published && data.listed);

  return entries
    .sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999))
    .map((entry) => {
      const { title, description, icon } = entry.data;

      if (!title || !description || !icon) {
        throw new Error(`Missing required listed tool metadata (title, description, icon) for: ${entry.id}`);
      }

      return {
        id: entry.id,
        name: title,
        description,
        icon,
        accent_color: entry.data.accent_color,
        quick_tool: entry.data.quick_tool,
        tags: entry.data.tags,
      };
    });
}
