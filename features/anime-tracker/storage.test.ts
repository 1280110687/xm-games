import { describe, expect, it } from "vitest"

import {
  ANIME_IMAGE_CACHE_BACKUP_KEY,
  ANIME_IMAGE_CACHE_KEY,
  ANIME_STORAGE_BACKUP_KEY,
  ANIME_STORAGE_KEY,
  readAnimeImageCache,
  readAnimeStorage,
  writeAnimeStorage,
  type StorageLike,
} from "./storage"
import type { AnimeRecord } from "./types"

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const legacyRecord: AnimeRecord = {
  id: "legacy-id",
  title: "进击的巨人",
  totalEpisodes: 25,
  currentEpisode: 7,
  status: "watching",
  type: "anime",
  rating: 9,
  notes: "继续看",
  imageUrl: "https://example.com/cover.jpg",
  addedAt: 100,
  updatedAt: 200,
}

describe("anime tracker storage", () => {
  it("round-trips the released top-level array and all legacy fields", () => {
    const storage = new MemoryStorage()
    storage.setItem(ANIME_STORAGE_KEY, JSON.stringify([legacyRecord]))

    const loaded = readAnimeStorage(storage)

    expect(loaded.warning).toBeNull()
    expect(loaded.canPersist).toBe(true)
    expect(loaded.records).toEqual([legacyRecord])
    expect(writeAnimeStorage(storage, loaded.records)).toBe(true)
    expect(JSON.parse(storage.getItem(ANIME_STORAGE_KEY) ?? "null")).toEqual([
      legacyRecord,
    ])
  })

  it("backs up invalid JSON and prevents the empty fallback from overwriting it", () => {
    const storage = new MemoryStorage()
    const invalidValue = "[{broken-json]"
    storage.setItem(ANIME_STORAGE_KEY, invalidValue)

    const loaded = readAnimeStorage(storage)

    expect(loaded.records).toEqual([])
    expect(loaded.canPersist).toBe(false)
    expect(loaded.warning).toBe("invalid-json")
    expect(storage.getItem(ANIME_STORAGE_BACKUP_KEY)).toBe(invalidValue)
    expect(storage.getItem(ANIME_STORAGE_KEY)).toBe(invalidValue)
  })

  it("recovers records independently and backs up before normalized data can persist", () => {
    const storage = new MemoryStorage()
    const raw = JSON.stringify([
      {
        title: "旧记录",
        totalEpisodes: "12",
        currentEpisode: "3",
        status: "on-hold",
        type: "tv",
        rating: "8.5",
        updatedAt: "2020-01-02T00:00:00.000Z",
      },
      { id: "missing-title" },
      legacyRecord,
    ])
    storage.setItem(ANIME_STORAGE_KEY, raw)

    const loaded = readAnimeStorage(storage, 1_000)

    expect(loaded.warning).toBe("records-recovered")
    expect(loaded.canPersist).toBe(true)
    expect(loaded.recoveredCount).toBe(1)
    expect(loaded.skippedCount).toBe(1)
    expect(loaded.records).toHaveLength(2)
    expect(loaded.records[0]).toMatchObject({
      title: "旧记录",
      totalEpisodes: 12,
      currentEpisode: 3,
      status: "paused",
      type: "anime",
      rating: 8.5,
      notes: "",
      imageUrl: "",
    })
    expect(storage.getItem(ANIME_STORAGE_BACKUP_KEY)).toBe(raw)
  })

  it("refreshes a stale backup before a later recovery can overwrite current data", () => {
    const storage = new MemoryStorage()
    const currentRaw = JSON.stringify([
      { ...legacyRecord, currentEpisode: "8", status: "on-hold" },
    ])
    storage.setItem(ANIME_STORAGE_BACKUP_KEY, "older-backup")
    storage.setItem(ANIME_STORAGE_KEY, currentRaw)

    const loaded = readAnimeStorage(storage)

    expect(loaded.canPersist).toBe(true)
    expect(loaded.warning).toBe("records-recovered")
    expect(storage.getItem(ANIME_STORAGE_BACKUP_KEY)).toBe(currentRaw)
  })

  it("preserves unknown compatible fields when records hydrate and persist", () => {
    const storage = new MemoryStorage()
    const recordWithFutureField = {
      ...legacyRecord,
      sourceId: "bangumi:55770",
      customMetadata: { season: 1 },
    }
    storage.setItem(
      ANIME_STORAGE_KEY,
      JSON.stringify([recordWithFutureField]),
    )

    const loaded = readAnimeStorage(storage)

    expect(loaded.warning).toBeNull()
    expect(loaded.records[0]).toMatchObject({
      sourceId: "bangumi:55770",
      customMetadata: { season: 1 },
    })
    expect(writeAnimeStorage(storage, loaded.records)).toBe(true)
    expect(JSON.parse(storage.getItem(ANIME_STORAGE_KEY) ?? "[]")[0]).toMatchObject({
      sourceId: "bangumi:55770",
      customMetadata: { season: 1 },
    })
  })

  it("keeps usable legacy image URLs when one cache item is malformed", () => {
    const storage = new MemoryStorage()
    const raw = JSON.stringify({ valid: "https://example.com/a.jpg", bad: 3 })
    storage.setItem(ANIME_IMAGE_CACHE_KEY, raw)

    const loaded = readAnimeImageCache(storage)

    expect(loaded.cache).toEqual({ valid: "https://example.com/a.jpg" })
    expect(loaded.recoveredCount).toBe(1)
    expect(loaded.canPersist).toBe(true)
    expect(storage.getItem(ANIME_IMAGE_CACHE_BACKUP_KEY)).toBe(raw)
  })
})
