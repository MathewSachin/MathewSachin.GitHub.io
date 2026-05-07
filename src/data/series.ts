import { bloggingWithJekyllSeries } from './series/blogging-with-jekyll'
import { browserHacksSeries } from './series/browser-hacks'
import type { Series } from './series/types'

export type { Series, SeriesLevel, SeriesPost } from './series/types'

function countSeriesPosts(series: Series): number {
  return series.levels.reduce((acc, level) => acc + level.posts.length, 0)
}

const SERIES_CONFIG: Record<string, Series> = {
  'blogging-with-jekyll': bloggingWithJekyllSeries,
  'browser-hacks': browserHacksSeries,
}

export const SERIES: Record<string, Series> = Object.fromEntries(
  Object.entries(SERIES_CONFIG).map(([seriesKey, series]) => {
    const postCount = countSeriesPosts(series)
    return [seriesKey, { ...series, description: series.description.replace(/\{count\}/g, String(postCount)) }]
  }),
) as Record<string, Series>

function buildPostSeriesMap(seriesMap: Record<string, Series>): Record<string, string> {
  const postToSeries: Record<string, string> = {}

  for (const [seriesKey, series] of Object.entries(seriesMap)) {
    for (const postId of series.levels.flatMap(level => level.posts.map(post => post.id))) {
      const existingSeries = postToSeries[postId]
      if (existingSeries && existingSeries !== seriesKey) {
        throw new Error('Post ' + postId + ' is assigned to multiple series: ' + existingSeries + ', ' + seriesKey)
      }
      postToSeries[postId] = seriesKey
    }
  }

  return postToSeries
}

export const POST_TO_SERIES = buildPostSeriesMap(SERIES)

export function getSeriesKeyForPostId(postId: string): string | null {
  return POST_TO_SERIES[postId] ?? null
}
