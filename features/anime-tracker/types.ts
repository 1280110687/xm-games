export const ANIME_STATUSES = [
  "watching",
  "completed",
  "planned",
  "paused",
  "dropped",
] as const

export type AnimeStatus = (typeof ANIME_STATUSES)[number]

export const ANIME_MEDIA_TYPES = ["anime", "drama", "movie"] as const

export type AnimeMediaType = (typeof ANIME_MEDIA_TYPES)[number]

/**
 * Persisted anime record.
 *
 * Keep this ten-field shape compatible with the first released tracker. The
 * localStorage value remains a top-level array of these records.
 */
export interface AnimeRecord {
  id: string
  title: string
  totalEpisodes: number | null
  currentEpisode: number
  status: AnimeStatus
  type: AnimeMediaType
  rating: number | null
  notes: string
  imageUrl: string
  addedAt: number
  updatedAt: number
}

export type AnimeSearchSource = "bangumi" | "jikan"

export interface AnimeSearchResult {
  source: AnimeSearchSource
  sourceId: string
  title: string
  originalTitle: string
  aliases: string[]
  imageUrl: string
  totalEpisodes: number | null
  externalScore: number | null
  year: number | null
  mediaType: string
  popularity: number
}

export interface AnimeSearchCacheEntry {
  query: string
  mediaType: AnimeMediaType
  cachedAt: number
  results: AnimeSearchResult[]
}
