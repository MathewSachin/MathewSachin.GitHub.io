/**
 * Parse and re-serialise JSON text.
 *
 * @param {string} raw    - Raw JSON string to process
 * @param {number} indent - Indentation spaces (0 = minify, 2 = pretty)
 * @returns {{ output: string, error: string|null }}
 */
export function formatJson(raw, indent) {
  if (!raw.trim()) return { output: '', error: null };
  try {
    var parsed = JSON.parse(raw);
    return { output: JSON.stringify(parsed, null, indent), error: null };
  } catch (e) {
    return { output: '', error: e.message };
  }
}
