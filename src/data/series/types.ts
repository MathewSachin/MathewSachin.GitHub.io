export interface SeriesPost {
  id: string
}

export interface SeriesLevel {
  title: string
  icon: string
  intro: string
  posts: SeriesPost[]
}

export interface Series {
  name: string
  url: string
  description: string
  levels: SeriesLevel[]
}
