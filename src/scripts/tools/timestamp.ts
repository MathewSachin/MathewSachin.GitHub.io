export function epochToMs(n: number): number {
  return n > 1e10 ? n : n * 1000;
}
