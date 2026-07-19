import type {
  AnimeMediaType,
  AnimeSearchResult,
} from "./types"

const DERIVATIVE_MARKERS = [
  "season",
  "part",
  "final",
  "movie",
  "ova",
  "oad",
  "ona",
  "special",
  "剧场版",
  "劇場版",
  "总集篇",
  "總集篇",
  "第二季",
  "第三季",
  "第四季",
]

const MOVIE_MEDIA_MARKERS = ["movie", "film", "剧场版", "劇場版"]

interface FetchLike {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

export interface AnimeSearchOptions {
  signal?: AbortSignal
  fetcher?: FetchLike
  timeoutMs?: number
}

export class AnimeSearchUnavailableError extends Error {
  constructor() {
    super("Anime search providers are unavailable")
    this.name = "AnimeSearchUnavailableError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function asPositiveInteger(value: unknown): number | null {
  const number = asFiniteNumber(value)
  return number !== null && number > 0 ? Math.floor(number) : null
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const normalized = normalizeSearchQuery(value)
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

export function normalizeSearchQuery(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function extractBangumiAliases(infobox: unknown): string[] {
  if (!Array.isArray(infobox)) return []
  const aliases: string[] = []

  for (const item of infobox) {
    if (!isRecord(item)) continue
    const key = asString(item.key).toLocaleLowerCase()
    if (!key.includes("别名") && !key.includes("別名") && !key.includes("name")) {
      continue
    }

    if (typeof item.value === "string") {
      aliases.push(item.value)
      continue
    }

    if (!Array.isArray(item.value)) continue
    for (const alias of item.value) {
      if (!isRecord(alias)) continue
      const value = asString(alias.v)
      if (value) aliases.push(value)
    }
  }

  return aliases
}

export function mapBangumiSearchResponse(payload: unknown): AnimeSearchResult[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return []

  return payload.data.flatMap((item): AnimeSearchResult[] => {
    if (!isRecord(item)) return []
    const id = asFiniteNumber(item.id)
    const originalTitle = asString(item.name)
    const localizedTitle = asString(item.name_cn)
    if (id === null || (!originalTitle && !localizedTitle)) return []

    const images = isRecord(item.images) ? item.images : {}
    const rating = isRecord(item.rating) ? item.rating : {}
    const date = asString(item.date)
    const yearMatch = /^(\d{4})/.exec(date)
    const aliases = uniqueStrings([
      localizedTitle,
      originalTitle,
      ...extractBangumiAliases(item.infobox),
    ])

    return [
      {
        source: "bangumi",
        sourceId: String(id),
        title: localizedTitle || originalTitle,
        originalTitle: originalTitle || localizedTitle,
        aliases,
        imageUrl:
          asString(images.large) ||
          asString(images.common) ||
          asString(images.medium) ||
          asString(images.grid),
        // `eps` is the maintained planned episode count. `total_episodes`
        // can mean only the episodes currently present for an airing title.
        totalEpisodes: asPositiveInteger(item.eps),
        externalScore: asFiniteNumber(rating.score),
        year: yearMatch ? Number(yearMatch[1]) : null,
        mediaType: asString(item.platform),
        popularity: asFiniteNumber(rating.total) ?? 0,
      },
    ]
  })
}

export function mapJikanSearchResponse(payload: unknown): AnimeSearchResult[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return []

  return payload.data.flatMap((item): AnimeSearchResult[] => {
    if (!isRecord(item)) return []
    const id = asFiniteNumber(item.mal_id)
    const defaultTitle = asString(item.title)
    if (id === null || !defaultTitle) return []

    const aliases: string[] = [
      defaultTitle,
      asString(item.title_english),
      asString(item.title_japanese),
    ]
    if (Array.isArray(item.titles)) {
      for (const title of item.titles) {
        if (isRecord(title)) aliases.push(asString(title.title))
      }
    }

    const images = isRecord(item.images) ? item.images : {}
    const webp = isRecord(images.webp) ? images.webp : {}
    const jpg = isRecord(images.jpg) ? images.jpg : {}

    return [
      {
        source: "jikan",
        sourceId: String(id),
        title: asString(item.title_english) || defaultTitle,
        originalTitle: asString(item.title_japanese) || defaultTitle,
        aliases: uniqueStrings(aliases),
        imageUrl:
          asString(webp.large_image_url) ||
          asString(jpg.large_image_url) ||
          asString(webp.image_url) ||
          asString(jpg.image_url),
        totalEpisodes: asPositiveInteger(item.episodes),
        externalScore: asFiniteNumber(item.score),
        year: asPositiveInteger(item.year),
        mediaType: asString(item.type),
        popularity: asFiniteNumber(item.members) ?? 0,
      },
    ]
  })
}

function matchScore(query: string, title: string): number {
  const normalizedTitle = normalizeSearchQuery(title)
  if (!normalizedTitle) return 0
  if (normalizedTitle === query) return 1_000
  if (normalizedTitle.startsWith(query)) return 760
  if (normalizedTitle.includes(query)) return 620

  const tokens = query.split(" ").filter(Boolean)
  if (tokens.length > 1 && tokens.every((token) => normalizedTitle.includes(token))) {
    return 520
  }

  return 0
}

function derivativePenalty(query: string, result: AnimeSearchResult): number {
  const candidate = normalizeSearchQuery(
    [result.title, result.originalTitle, ...result.aliases].join(" "),
  )
  let penalty = 0
  for (const marker of DERIVATIVE_MARKERS) {
    const normalizedMarker = normalizeSearchQuery(marker)
    if (!query.includes(normalizedMarker) && candidate.includes(normalizedMarker)) {
      penalty += 18
    }
  }
  return Math.min(penalty, 90)
}

export function getBestMatchedTitle(
  queryValue: string,
  result: AnimeSearchResult,
): string {
  const query = normalizeSearchQuery(queryValue)
  const candidates = uniqueStrings([
    result.title,
    result.originalTitle,
    ...result.aliases,
  ])

  return candidates
    .map((title, index) => ({ title, index, score: matchScore(query, title) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.title ?? result.title
}

export function applyAnimeSearchTitle<
  T extends { title: string; totalEpisodes: string },
>(current: T, query: string, result: AnimeSearchResult): T {
  return {
    ...current,
    title: getBestMatchedTitle(query, result),
    totalEpisodes:
      current.totalEpisodes || result.totalEpisodes?.toString() || "",
  }
}

export function rankAnimeSearchResults(
  queryValue: string,
  results: AnimeSearchResult[],
): AnimeSearchResult[] {
  const query = normalizeSearchQuery(queryValue)
  const uniqueResults = new Map<string, AnimeSearchResult>()
  for (const result of results) {
    uniqueResults.set(`${result.source}:${result.sourceId}`, result)
  }

  return [...uniqueResults.values()]
    .map((result, index) => {
      const titles = [result.title, result.originalTitle, ...result.aliases]
      const score = Math.max(...titles.map((title) => matchScore(query, title)))
      return {
        result,
        index,
        score: score - derivativePenalty(query, result),
      }
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.result.popularity - a.result.popularity ||
        a.index - b.index,
    )
    .map(({ result }) => result)
}

function isMovieResult(result: AnimeSearchResult): boolean {
  const mediaType = normalizeSearchQuery(result.mediaType)
  return MOVIE_MEDIA_MARKERS.some((marker) =>
    mediaType.includes(normalizeSearchQuery(marker)),
  )
}

function filterResultsForMediaType(
  results: AnimeSearchResult[],
  mediaType: AnimeMediaType,
): AnimeSearchResult[] {
  if (mediaType !== "movie") return results
  return results.filter(isMovieResult)
}

function normalizedTitleIdentities(result: AnimeSearchResult): Set<string> {
  return new Set(
    [result.title, result.originalTitle, ...result.aliases]
      .map(normalizeSearchQuery)
      .filter(Boolean),
  )
}

function isSafeCoverMatch(
  metadataResult: AnimeSearchResult,
  coverResult: AnimeSearchResult,
): boolean {
  if (!coverResult.imageUrl) return false
  if (
    metadataResult.year !== null &&
    coverResult.year !== null &&
    Math.abs(metadataResult.year - coverResult.year) > 1
  ) {
    return false
  }

  const metadataTitles = normalizedTitleIdentities(metadataResult)
  return [...normalizedTitleIdentities(coverResult)].some((title) =>
    metadataTitles.has(title),
  )
}

/**
 * Bangumi remains the source of Chinese titles and episode metadata. When a
 * Jikan item has an exact normalized title/alias identity (and a compatible
 * year), prefer its CORS-enabled CDN cover. Ambiguous matches deliberately
 * keep the Bangumi URL as an online-only best-effort fallback.
 */
export function preferJikanCoverImages(
  bangumiResults: AnimeSearchResult[],
  jikanResults: AnimeSearchResult[],
): AnimeSearchResult[] {
  return bangumiResults.map((result) => {
    const coverMatch = jikanResults.find((candidate) =>
      isSafeCoverMatch(result, candidate),
    )
    return coverMatch
      ? { ...result, imageUrl: coverMatch.imageUrl }
      : result
  })
}

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError") ||
    (isRecord(error) && error.name === "AbortError")
  )
}

async function fetchWithTimeout(
  fetcher: FetchLike,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const parentSignal = init.signal
  let timedOut = false
  const abortFromParent = () => controller.abort()

  if (parentSignal?.aborted) controller.abort()
  else parentSignal?.addEventListener("abort", abortFromParent, { once: true })

  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    return await fetcher(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (timedOut) throw new Error("Anime search provider timed out")
    throw error
  } finally {
    clearTimeout(timeout)
    parentSignal?.removeEventListener("abort", abortFromParent)
  }
}

async function searchBangumi(
  query: string,
  mediaType: AnimeMediaType,
  options: AnimeSearchOptions,
): Promise<AnimeSearchResult[]> {
  const fetcher = options.fetcher ?? fetch
  const subjectType = mediaType === "drama" ? 6 : 2
  const response = await fetchWithTimeout(
    fetcher,
    "https://api.bgm.tv/v0/search/subjects?limit=12&offset=0",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: query,
        sort: "match",
        filter: { type: [subjectType], nsfw: false },
      }),
      signal: options.signal,
      cache: "no-store",
    },
    options.timeoutMs ?? 8_000,
  )

  if (!response.ok) throw new Error(`Bangumi search failed: ${response.status}`)
  return mapBangumiSearchResponse(await response.json())
}

async function searchJikan(
  query: string,
  mediaType: AnimeMediaType,
  options: AnimeSearchOptions,
): Promise<AnimeSearchResult[]> {
  if (mediaType === "drama") return []
  const fetcher = options.fetcher ?? fetch
  const params = new URLSearchParams({ q: query, limit: "12", sfw: "true" })
  if (mediaType === "movie") params.set("type", "movie")

  const response = await fetchWithTimeout(
    fetcher,
    `https://api.jikan.moe/v4/anime?${params}`,
    {
      signal: options.signal,
      cache: "no-store",
    },
    options.timeoutMs ?? 8_000,
  )
  if (!response.ok) throw new Error(`Jikan search failed: ${response.status}`)
  return mapJikanSearchResponse(await response.json())
}

export async function searchAnimeOnline(
  queryValue: string,
  mediaType: AnimeMediaType,
  options: AnimeSearchOptions = {},
): Promise<AnimeSearchResult[]> {
  const query = queryValue.trim()
  if (normalizeSearchQuery(query).length < 2) return []

  if (mediaType === "drama") {
    try {
      const results = await searchBangumi(query, mediaType, options)
      return rankAnimeSearchResults(query, results)
    } catch (error) {
      if (isAbortError(error)) throw error
      throw new AnimeSearchUnavailableError()
    }
  }

  // Both providers are queried together: Bangumi supplies localized metadata,
  // while a safely matched Jikan result supplies a cover that browsers and
  // packaged WebViews can normally persist without a CORS failure.
  const jikanCoverOptions = {
    ...options,
    timeoutMs: Math.min(options.timeoutMs ?? 8_000, 3_000),
  }
  const [bangumiOutcome, jikanOutcome] = await Promise.allSettled([
    searchBangumi(query, mediaType, options),
    searchJikan(query, mediaType, jikanCoverOptions),
  ])

  for (const outcome of [bangumiOutcome, jikanOutcome]) {
    if (outcome.status === "rejected" && isAbortError(outcome.reason)) {
      throw outcome.reason
    }
  }

  const bangumiResults =
    bangumiOutcome.status === "fulfilled"
      ? rankAnimeSearchResults(
          query,
          filterResultsForMediaType(bangumiOutcome.value, mediaType),
        )
      : []
  const jikanResults =
    jikanOutcome.status === "fulfilled"
      ? rankAnimeSearchResults(
          query,
          filterResultsForMediaType(jikanOutcome.value, mediaType),
        )
      : []

  if (bangumiResults.length > 0) {
    return preferJikanCoverImages(bangumiResults, jikanResults)
  }
  if (jikanOutcome.status === "fulfilled") return jikanResults
  if (bangumiOutcome.status === "fulfilled") return []

  throw new AnimeSearchUnavailableError()
}
