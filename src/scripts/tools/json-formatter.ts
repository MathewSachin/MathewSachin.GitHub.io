export function formatJson(raw: string, indent: number): { output: string; error: string | null } {
  if (!raw.trim()) return { output: '', error: null };
  try {
    const parsed = JSON.parse(raw);
    return { output: JSON.stringify(parsed, null, indent), error: null };
  } catch (e: unknown) {
    const err = e as Error | undefined;
    return { output: '', error: err?.message ?? String(e) };
  }
}

export function minifyJson(raw: string): { output: string; error: string | null } {
  if (!raw.trim()) return { output: '', error: null };
  try {
    return { output: JSON.stringify(JSON.parse(raw)), error: null };
  } catch (e: unknown) {
    const err = e as Error | undefined;
    return { output: '', error: err?.message ?? String(e) };
  }
}
