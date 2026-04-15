/**
 * Normalise a raw epoch value to milliseconds.
 * Heuristic: values > 1e10 are already milliseconds; smaller values are seconds.
 *
 * @param n - Raw epoch value (seconds or milliseconds)
 * @returns Epoch in milliseconds
 */
export function epochToMs(n: number): number {
  return n > 1e10 ? n : n * 1000
}

/**
 * Convert a datetime-local input string (YYYY-MM-DDTHH:MM) to epoch milliseconds.
 *
 * @param val - Value from <input type="datetime-local">
 * @returns Epoch in milliseconds
 */
export function datetimeLocalToMs(val: string): number {
  return new Date(val).getTime()
}
