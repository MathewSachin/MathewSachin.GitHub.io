export function formatJson(raw: string, indent: number): { output: string; error: string | null } {
  if (!raw.trim()) return { output: '', error: null };
  try {
    const parsed = JSON.parse(raw);
    return { output: JSON.stringify(parsed, null, indent), error: null };
  } catch (e: any) {
    return { output: '', error: e?.message ?? String(e) };
  }
}
