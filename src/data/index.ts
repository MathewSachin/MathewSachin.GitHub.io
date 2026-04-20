import { type Series } from './series'

/**
 * Build a flat ordered list of post IDs for a series.
 */
export function getFlatPostIds(series: Series): string[] {
  return series.levels.flatMap(level => level.posts.map(p => p.id));
}

type SeriesPosition = {
  part: number
  total: number
  prevId: string | null
  nextId: string | null
}

/**
 * Given a post's ID (e.g. /blog/2026/03/07/hacking-wordle),
 * return { part, total, prevId, nextId } for its series.
 */
export function getSeriesPosition(
  series: Series,
  postId: string
): SeriesPosition {
  const ids = getFlatPostIds(series);
  const idx = ids.indexOf(postId);
  if (idx === -1) return { part: 0, total: ids.length, prevId: null, nextId: null };
  return {
    part: idx + 1,
    total: ids.length,
    prevId: idx > 0 ? ids[idx - 1] : null,
    nextId: idx < ids.length - 1 ? ids[idx + 1] : null,
  };
}
