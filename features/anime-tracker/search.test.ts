import { describe, expect, it, vi } from "vitest"

import {
  AnimeSearchUnavailableError,
  applyAnimeSearchTitle,
  getBestMatchedTitle,
  mapBangumiSearchResponse,
  normalizeSearchQuery,
  preferJikanCoverImages,
  rankAnimeSearchResults,
  searchAnimeOnline,
} from "./search"
import {
  ANIME_SEARCH_CACHE_KEY,
  readCachedAnimeSearch,
  writeCachedAnimeSearch,
} from "./search-cache"
import type { StorageLike } from "./storage"
import type { AnimeSearchResult } from "./types"

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()
  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

function result(overrides: Partial<AnimeSearchResult>): AnimeSearchResult {
  return {
    source: "bangumi",
    sourceId: "1",
    title: "进击的巨人",
    originalTitle: "進撃の巨人",
    aliases: ["Attack on Titan", "Shingeki no Kyojin"],
    imageUrl: "https://example.com/cover.jpg",
    totalEpisodes: 25,
    externalScore: 8.2,
    year: 2013,
    mediaType: "TV",
    popularity: 10_000,
    ...overrides,
  }
}

describe("anime search", () => {
  it("normalizes Unicode, punctuation, case, and repeated spaces", () => {
    expect(normalizeSearchQuery("  Ａttack：  On TITAN  ")).toBe(
      "attack on titan",
    )
  })

  it("ranks an exact alias above a popular sequel and returns the matching-language title", () => {
    const sequel = result({
      sourceId: "2",
      title: "进击的巨人 最终季 Part.2",
      aliases: ["Attack on Titan Final Season Part 2"],
      popularity: 20_000,
    })
    const original = result({ sourceId: "1", popularity: 10_000 })

    const ranked = rankAnimeSearchResults("Attack on Titan", [sequel, original])

    expect(ranked[0].sourceId).toBe("1")
    expect(getBestMatchedTitle("Attack on Titan", ranked[0])).toBe(
      "Attack on Titan",
    )
  })

  it("imports a matched title and empty episode total without changing personal rating", () => {
    const current = {
      title: "Attack",
      totalEpisodes: "",
      rating: "9.5",
      imageUrl: "manual-cover",
    }

    expect(
      applyAnimeSearchTitle(current, "Attack on Titan", result({})),
    ).toEqual({
      title: "Attack on Titan",
      totalEpisodes: "25",
      rating: "9.5",
      imageUrl: "manual-cover",
    })
  })

  it("maps Bangumi Chinese titles and uses eps rather than current episode rows", () => {
    const [mapped] = mapBangumiSearchResponse({
      data: [
        {
          id: 55770,
          name: "進撃の巨人",
          name_cn: "进击的巨人",
          date: "2013-04-06",
          platform: "TV",
          eps: 25,
          total_episodes: 99,
          rating: { score: 8.2, total: 30_000 },
          images: { large: "https://example.com/cover.jpg" },
          infobox: [
            { key: "别名", value: [{ v: "Attack on Titan" }] },
          ],
        },
      ],
    })

    expect(mapped).toMatchObject({
      source: "bangumi",
      sourceId: "55770",
      title: "进击的巨人",
      totalEpisodes: 25,
      year: 2013,
    })
    expect(mapped.aliases).toContain("Attack on Titan")
  })

  it("falls back to Jikan when Bangumi is unavailable", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              mal_id: 16498,
              title: "Shingeki no Kyojin",
              title_english: "Attack on Titan",
              title_japanese: "進撃の巨人",
              titles: [],
              images: {
                jpg: { large_image_url: "https://example.com/a.jpg" },
              },
              episodes: 25,
              score: 8.5,
              year: 2013,
              type: "TV",
              members: 1_000,
            },
          ],
        }),
      )

    const results = await searchAnimeOnline("Attack on Titan", "anime", {
      fetcher,
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(results[0]).toMatchObject({
      source: "jikan",
      sourceId: "16498",
      title: "Attack on Titan",
    })
  })

  it("keeps Bangumi metadata but prefers a safely matched Jikan cover", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: 55770,
              name: "進撃の巨人",
              name_cn: "进击的巨人",
              date: "2013-04-06",
              platform: "TV",
              eps: 25,
              rating: { score: 8.2, total: 30_000 },
              images: { large: "https://lain.bgm.tv/bangumi.jpg" },
              infobox: [
                { key: "别名", value: [{ v: "Attack on Titan" }] },
              ],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              mal_id: 16498,
              title: "Shingeki no Kyojin",
              title_english: "Attack on Titan",
              title_japanese: "進撃の巨人",
              titles: [],
              images: {
                jpg: { large_image_url: "https://cdn.myanimelist.net/a.jpg" },
              },
              episodes: 25,
              score: 8.5,
              year: 2013,
              type: "TV",
              members: 1_000,
            },
          ],
        }),
      )

    const [matched] = await searchAnimeOnline("进击的巨人", "anime", {
      fetcher,
    })

    expect(matched).toMatchObject({
      source: "bangumi",
      title: "进击的巨人",
      totalEpisodes: 25,
      imageUrl: "https://cdn.myanimelist.net/a.jpg",
    })
  })

  it("does not attach a Jikan cover when an exact title has an incompatible year", () => {
    const [matched] = preferJikanCoverImages(
      [result({ imageUrl: "https://lain.bgm.tv/original.jpg", year: 2013 })],
      [
        result({
          source: "jikan",
          sourceId: "2",
          imageUrl: "https://cdn.myanimelist.net/wrong.jpg",
          year: 2023,
        }),
      ],
    )

    expect(matched.imageUrl).toBe("https://lain.bgm.tv/original.jpg")
  })

  it("filters Bangumi TV entries out of movie searches", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: 1,
              name: "NARUTO -ナルト-",
              name_cn: "火影忍者",
              date: "2002-10-03",
              platform: "TV",
              eps: 220,
              rating: { score: 7.6, total: 9_000 },
              images: { large: "https://lain.bgm.tv/tv.jpg" },
            },
            {
              id: 2,
              name: "BORUTO -NARUTO THE MOVIE-",
              name_cn: "火影忍者 剧场版 博人传",
              date: "2015-08-07",
              platform: "剧场版",
              eps: 1,
              rating: { score: 7.1, total: 2_000 },
              images: { large: "https://lain.bgm.tv/movie.jpg" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ data: [] }))

    const results = await searchAnimeOnline("Naruto", "movie", { fetcher })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ sourceId: "2", mediaType: "剧场版" })
  })

  it("reports a drama provider failure instead of converting it to an empty result", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }))

    await expect(
      searchAnimeOnline("半泽直树", "drama", { fetcher }),
    ).rejects.toBeInstanceOf(AnimeSearchUnavailableError)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("keeps cached results available for an offline retry", () => {
    const storage = new MemoryStorage()
    const cachedResult = result({})

    expect(
      writeCachedAnimeSearch(storage, {
        query: "进击的巨人",
        mediaType: "anime",
        cachedAt: 123,
        results: [cachedResult],
      }),
    ).toBe(true)
    expect(readCachedAnimeSearch(storage, " 进击的巨人 ", "anime")).toEqual({
      query: "进击的巨人",
      mediaType: "anime",
      cachedAt: 123,
      results: [cachedResult],
    })
    expect(storage.getItem(ANIME_SEARCH_CACHE_KEY)).not.toBeNull()
  })
})
