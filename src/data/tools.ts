import { getCollection } from 'astro:content';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent_color?: string;
  quick_tool?: boolean;
}

export async function getTools(): Promise<Tool[]> {
  const entries = await getCollection(
    'toolDocs',
    ({ data }) => data.published && data.listed && !!data.title && !!data.description && !!data.icon,
  );

  return entries
    .sort((a, b) => a.data.order - b.data.order)
    .map((entry) => {
      const { title, description, icon } = entry.data;

      if (!title || !description || !icon) {
        throw new Error(`Missing required tool metadata for: ${entry.id}`);
      }

      return {
        id: entry.id,
        name: title,
        description,
        icon,
        accent_color: entry.data.accent_color,
        quick_tool: entry.data.quick_tool,
      };
    });
}
