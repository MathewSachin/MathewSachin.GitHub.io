import { getCollection, type CollectionEntry } from 'astro:content';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent_color?: string;
  quick_tool?: boolean;
}

type ToolDocWithListMetadata = CollectionEntry<'toolDocs'> & {
  data: CollectionEntry<'toolDocs'>['data'] & {
    title: string;
    description: string;
    icon: string;
  };
};

function hasListMetadata(entry: CollectionEntry<'toolDocs'>): entry is ToolDocWithListMetadata {
  return Boolean(entry.data.title && entry.data.description && entry.data.icon);
}

export async function getTools(): Promise<Tool[]> {
  const entries = (await getCollection('toolDocs', ({ data }) => data.published && data.listed)).filter(hasListMetadata);

  return entries
    .sort((a, b) => (a.data.order ?? 999) - (b.data.order ?? 999))
    .map((entry) => ({
      id: entry.id,
      name: entry.data.title,
      description: entry.data.description,
      icon: entry.data.icon,
      accent_color: entry.data.accent_color,
      quick_tool: entry.data.quick_tool,
    }));
}
