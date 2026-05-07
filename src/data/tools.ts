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
    .map((entry) => ({
      id: entry.id,
      name: entry.data.title!,
      description: entry.data.description!,
      icon: entry.data.icon!,
      accent_color: entry.data.accent_color,
      quick_tool: entry.data.quick_tool,
    }));
}
