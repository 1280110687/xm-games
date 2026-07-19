import { normalizeSearchQuery } from "./search"
import type {
  AnimeMediaType,
  AnimeSearchCacheEntry,
  AnimeSearchResult,
} from "./types"
import type { StorageLike } from "./storage"

export const ANIME_SEARCH_CACHE_KEY = "xm-games-anime-search-cache-v1"
const MAX_CACHE_ENTRIES = 30

interface SearchCachePayload {
  entries: AnimeSearchCacheEntry[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSearchResult(value: unknown): value is AnimeSearchResult {
  return (
    isRecord(value) &&
    ["bangumi", "jikan"].includes(String(value.source)) &&
    typeof value.sourceId === "string" &&
    typeof value.title === "string" &&
    typeof value.originalTitle === "string" &&
    Array.isArray(value.aliases) &&
    value.aliases.every((alias) => typeof alias === "string") &&
    typeof value.imageUrl === "string" &&
    (value.totalEpisodes === null || typeof value.totalEpisodes === "number") &&
    (value.externalScore === null || typeof value.externalScore === "number") &&
    (value.year === null || typeof value.year === "number") &&
    typeof value.mediaType === "string" &&
    typeof value.popularity === "number"
  )
}

function readPayload(storage: StorageLike): SearchCachePayload {
  try {
    const raw = storage.getItem(ANIME_SEARCH_CACHE_KEY)
    if (!raw) return { entries: [] }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || !Array.isArray(parsed.entries)) return { entries: [] }

    const entries = parsed.entries.filter(
      (entry): entry is AnimeSearchCacheEntry =>
        isRecord(entry) &&
        typeof entry.query === "string" &&
        ["anime", "drama", "movie"].includes(String(entry.mediaType)) &&
        typeof entry.cachedAt === "number" &&
        Array.isArray(entry.results) &&
        entry.results.every(isSearchResult),
    )
    return { entries }
  } catch {
    return { entries: [] }
  }
}

function cacheId(query: string, mediaType: AnimeMediaType): string {
  return `${mediaType}:${normalizeSearchQuery(query)}`
}

export function readCachedAnimeSearch(
  storage: StorageLike,
  query: string,
  mediaType: AnimeMediaType,
): AnimeSearchCacheEntry | null {
  const id = cacheId(query, mediaType)
  return (
    readPayload(storage).entries.find(
      (entry) => cacheId(entry.query, entry.mediaType) === id,
    ) ?? null
  )
}

export function writeCachedAnimeSearch(
  storage: StorageLike,
  entry: AnimeSearchCacheEntry,
): boolean {
  try {
    const id = cacheId(entry.query, entry.mediaType)
    const entries = readPayload(storage).entries.filter(
      (item) => cacheId(item.query, item.mediaType) !== id,
    )
    entries.unshift(entry)
    storage.setItem(
      ANIME_SEARCH_CACHE_KEY,
      JSON.stringify({ entries: entries.slice(0, MAX_CACHE_ENTRIES) }),
    )
    return true
  } catch {
    return false
  }
}
