/**
 * Parse and re-serialise JSON text.
 *
 * @param raw    - Raw JSON string to process
 * @param indent - Indentation spaces (0 = minify, 2 = pretty)
 * @returns output and parse error state
 */
export function formatJson(raw: string, indent: number): { output: string; error: string | null } {
  if (!raw.trim()) return { output: '', error: null }
  try {
    const parsed = JSON.parse(raw)
    return { output: JSON.stringify(parsed, null, indent), error: null }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { output: '', error: message }
  }
}
