import {
  ANIME_MEDIA_TYPES,
  ANIME_STATUSES,
  type AnimeMediaType,
  type AnimeRecord,
  type AnimeStatus,
} from "./types"

export const ANIME_STORAGE_KEY = "xm-games-anime-tracker"
export const ANIME_IMAGE_CACHE_KEY = "xm-games-anime-images"
export const ANIME_STORAGE_BACKUP_KEY = "xm-games-anime-tracker-backup-v1"
export const ANIME_IMAGE_CACHE_BACKUP_KEY = "xm-games-anime-images-backup-v1"

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type AnimeStorageWarning =
  | "storage-unavailable"
  | "invalid-json"
  | "invalid-shape"
  | "records-recovered"
  | null

export interface AnimeStorageReadResult {
  records: AnimeRecord[]
  canPersist: boolean
  warning: AnimeStorageWarning
  backupCreated: boolean
  recoveredCount: number
  skippedCount: number
}

export interface ImageCacheReadResult {
  cache: Record<string, string>
  canPersist: boolean
  recoveredCount: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string" || value.trim() === "") return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function asNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed = asNumber(value)
  return parsed === null || parsed < 0 ? fallback : Math.floor(parsed)
}

function asNullableEpisodeCount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = asNumber(value)
  return parsed === null || parsed < 1 ? null : Math.floor(parsed)
}

function asTimestamp(value: unknown, fallback: number): number {
  const numeric = asNumber(value)
  if (numeric !== null && numeric >= 0) return numeric

  if (typeof value === "string") {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }

  return fallback
}

function normalizeStatus(value: unknown): AnimeStatus {
  if (ANIME_STATUSES.includes(value as AnimeStatus)) return value as AnimeStatus

  const legacy = String(value ?? "").toLowerCase().replaceAll("-", "_")
  if (["on_hold", "hold"].includes(legacy)) return "paused"
  if (["plan_to_watch", "planning"].includes(legacy)) return "planned"
  if (["complete", "finished"].includes(legacy)) return "completed"

  return "watching"
}

function normalizeMediaType(value: unknown): AnimeMediaType {
  if (ANIME_MEDIA_TYPES.includes(value as AnimeMediaType)) {
    return value as AnimeMediaType
  }

  const legacy = String(value ?? "").toLowerCase()
  if (["film", "theatrical"].includes(legacy)) return "movie"
  if (["tv", "ova", "ona", "special"].includes(legacy)) return "anime"

  return "anime"
}

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = asNumber(value)
  return parsed !== null && parsed >= 0 && parsed <= 10 ? parsed : null
}

function createRecoveredId(
  record: Record<string, unknown>,
  index: number,
  fallbackTimestamp: number,
): string {
  const timestamp = asTimestamp(
    record.addedAt ?? record.updatedAt,
    fallbackTimestamp,
  )
  return `legacy-${timestamp}-${index}`
}

interface NormalizedRecord {
  record: AnimeRecord
  migrated: boolean
}

export function normalizeAnimeRecord(
  value: unknown,
  index: number,
  now = Date.now(),
): NormalizedRecord | null {
  if (!isRecord(value)) return null

  const title = asTrimmedString(value.title)
  if (!title) return null

  const addedAt = asTimestamp(value.addedAt, now)
  const updatedAt = asTimestamp(value.updatedAt, addedAt)
  // Retain unknown JSON fields so data written by another compatible app
  // version is not silently erased when this version hydrates and persists.
  const normalized: AnimeRecord = {
    ...value,
    id: asTrimmedString(value.id) ?? createRecoveredId(value, index, now),
    title,
    totalEpisodes: asNullableEpisodeCount(value.totalEpisodes),
    currentEpisode: asNonNegativeInteger(value.currentEpisode, 0),
    status: normalizeStatus(value.status),
    type: normalizeMediaType(value.type),
    rating: normalizeRating(value.rating),
    notes: typeof value.notes === "string" ? value.notes : "",
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : "",
    addedAt,
    updatedAt,
  }

  const migrated =
    normalized.id !== value.id ||
    normalized.title !== value.title ||
    normalized.totalEpisodes !== value.totalEpisodes ||
    normalized.currentEpisode !== value.currentEpisode ||
    normalized.status !== value.status ||
    normalized.type !== value.type ||
    normalized.rating !== value.rating ||
    normalized.notes !== value.notes ||
    normalized.imageUrl !== value.imageUrl ||
    normalized.addedAt !== value.addedAt ||
    normalized.updatedAt !== value.updatedAt

  return { record: normalized, migrated }
}

function backupRawValue(
  storage: StorageLike,
  backupKey: string,
  rawValue: string,
): boolean {
  try {
    // This backup protects the value that is about to be normalized and
    // overwritten. Refresh it on every recovery; an older backup must not be
    // mistaken for proof that the current raw value is recoverable.
    storage.setItem(backupKey, rawValue)
    return true
  } catch {
    return false
  }
}

export function readAnimeStorage(
  storage: StorageLike,
  now = Date.now(),
): AnimeStorageReadResult {
  let rawValue: string | null
  try {
    rawValue = storage.getItem(ANIME_STORAGE_KEY)
  } catch {
    return {
      records: [],
      canPersist: false,
      warning: "storage-unavailable",
      backupCreated: false,
      recoveredCount: 0,
      skippedCount: 0,
    }
  }

  if (rawValue === null) {
    return {
      records: [],
      canPersist: true,
      warning: null,
      backupCreated: false,
      recoveredCount: 0,
      skippedCount: 0,
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    const backupCreated = backupRawValue(
      storage,
      ANIME_STORAGE_BACKUP_KEY,
      rawValue,
    )
    return {
      records: [],
      canPersist: false,
      warning: "invalid-json",
      backupCreated,
      recoveredCount: 0,
      skippedCount: 0,
    }
  }

  if (!Array.isArray(parsed)) {
    const backupCreated = backupRawValue(
      storage,
      ANIME_STORAGE_BACKUP_KEY,
      rawValue,
    )
    return {
      records: [],
      canPersist: false,
      warning: "invalid-shape",
      backupCreated,
      recoveredCount: 0,
      skippedCount: 0,
    }
  }

  const records: AnimeRecord[] = []
  let recoveredCount = 0
  let skippedCount = 0

  parsed.forEach((item, index) => {
    const normalized = normalizeAnimeRecord(item, index, now)
    if (!normalized) {
      skippedCount += 1
      return
    }
    if (normalized.migrated) recoveredCount += 1
    records.push(normalized.record)
  })

  if (recoveredCount === 0 && skippedCount === 0) {
    return {
      records,
      canPersist: true,
      warning: null,
      backupCreated: false,
      recoveredCount,
      skippedCount,
    }
  }

  const backupCreated = backupRawValue(
    storage,
    ANIME_STORAGE_BACKUP_KEY,
    rawValue,
  )
  return {
    records,
    canPersist: backupCreated,
    warning: "records-recovered",
    backupCreated,
    recoveredCount,
    skippedCount,
  }
}

export function readAnimeImageCache(storage: StorageLike): ImageCacheReadResult {
  let rawValue: string | null
  try {
    rawValue = storage.getItem(ANIME_IMAGE_CACHE_KEY)
  } catch {
    return { cache: {}, canPersist: false, recoveredCount: 0 }
  }

  if (rawValue === null) {
    return { cache: {}, canPersist: true, recoveredCount: 0 }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    backupRawValue(storage, ANIME_IMAGE_CACHE_BACKUP_KEY, rawValue)
    return { cache: {}, canPersist: false, recoveredCount: 0 }
  }

  if (!isRecord(parsed)) {
    backupRawValue(storage, ANIME_IMAGE_CACHE_BACKUP_KEY, rawValue)
    return { cache: {}, canPersist: false, recoveredCount: 0 }
  }

  const cache: Record<string, string> = {}
  let recoveredCount = 0
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string") cache[key] = value
    else recoveredCount += 1
  }

  if (recoveredCount > 0) {
    const backupCreated = backupRawValue(
      storage,
      ANIME_IMAGE_CACHE_BACKUP_KEY,
      rawValue,
    )
    return { cache, canPersist: backupCreated, recoveredCount }
  }

  return { cache, canPersist: true, recoveredCount: 0 }
}

export function writeAnimeStorage(
  storage: StorageLike,
  records: AnimeRecord[],
): boolean {
  try {
    storage.setItem(ANIME_STORAGE_KEY, JSON.stringify(records))
    return true
  } catch {
    return false
  }
}

export function writeAnimeImageCache(
  storage: StorageLike,
  cache: Record<string, string>,
): boolean {
  try {
    storage.setItem(ANIME_IMAGE_CACHE_KEY, JSON.stringify(cache))
    return true
  } catch {
    return false
  }
}
