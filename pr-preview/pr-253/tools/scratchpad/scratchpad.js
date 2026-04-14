/**
 * Count the number of words in a string (splits on any whitespace run).
 *
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}
