import { ANIME_MEDIA_TYPES, ANIME_STATUSES, type AnimeRecord } from "../types"
import { ANIME_STORAGE_KEY, type StorageLike } from "../storage"

export const TRANSFER_TTL_MS = 10 * 60 * 1000
export const TRANSFER_MAX_BYTES = 512 * 1024
export const TRANSFER_MAX_RECORDS = 500
export const TRANSFER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ"
export const TRANSFER_BACKUP_KEY = "xm-games-anime-transfer-backup-v1"

export type TransferErrorCode =
  | "INVALID_DATA"
  | "TOO_LARGE"
  | "INVALID_CODE"
  | "NOT_FOUND"
  | "CLAIMED"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "NETWORK"
  | "LOCAL_CHANGED"
  | "STORAGE_FAILED"
  | "BACKUP_FAILED"
  | "FORBIDDEN"

export class TransferError extends Error {
  constructor(public readonly code: TransferErrorCode) {
    super(code)
    this.name = "TransferError"
  }
}

export interface TransferPayload {
  version: 1
  records: AnimeRecord[]
}
export interface CreatedTransfer {
  code: string
  expiresAt: number
}
export interface ClaimedTransfer {
  transferId: string
  expiresAt: number
  payload: TransferPayload
}

export function normalizeTransferCode(value: string): string {
  return value.replace(/[\s-]/gu, "").toUpperCase()
}

export function validTransferCode(value: string): boolean {
  return (
    value.length === 10 &&
    [...value].every((letter) => TRANSFER_ALPHABET.includes(letter))
  )
}

export function formatTransferCode(value: string): string {
  return `${value.slice(0, 5)}-${value.slice(5)}`
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function safeJson(value: unknown, depth = 0): boolean {
  if (depth > 12) return false
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true
  if (typeof value === "number") return Number.isFinite(value)
  if (Array.isArray(value))
    return value.every((item) => safeJson(item, depth + 1))
  return (
    isObject(value) &&
    Object.entries(value).every(
      ([key, item]) =>
        !["__proto__", "constructor", "prototype"].includes(key) &&
        safeJson(item, depth + 1),
    )
  )
}

function text(value: unknown, max: number, required = false): value is string {
  return (
    typeof value === "string" &&
    value.length <= max &&
    (!required || value.trim().length > 0)
  )
}

function count(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

export function isTransferImageUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}

export function parseTransferPayload(value: unknown): TransferPayload {
  if (
    !isObject(value) ||
    value.version !== 1 ||
    !Array.isArray(value.records) ||
    !value.records.length
  ) {
    throw new TransferError("INVALID_DATA")
  }
  if (value.records.length > TRANSFER_MAX_RECORDS)
    throw new TransferError("TOO_LARGE")
  if (!safeJson(value)) throw new TransferError("INVALID_DATA")
  if (
    new TextEncoder().encode(JSON.stringify(value)).byteLength >
    TRANSFER_MAX_BYTES
  ) {
    throw new TransferError("TOO_LARGE")
  }
  const ids = new Set<string>()
  for (const record of value.records) {
    if (
      !isObject(record) ||
      !text(record.id, 160, true) ||
      ids.has(record.id) ||
      !text(record.title, 500, true) ||
      !count(record.currentEpisode) ||
      !(
        record.totalEpisodes === null ||
        (count(record.totalEpisodes) && record.totalEpisodes > 0)
      ) ||
      !ANIME_STATUSES.includes(record.status as never) ||
      !ANIME_MEDIA_TYPES.includes(record.type as never) ||
      !(
        record.rating === null ||
        (typeof record.rating === "number" &&
          record.rating >= 0 &&
          record.rating <= 10)
      ) ||
      !text(record.notes, 20_000) ||
      !text(record.imageUrl, 4096) ||
      !isTransferImageUrl(record.imageUrl) ||
      !count(record.addedAt) ||
      !count(record.updatedAt)
    ) {
      throw new TransferError("INVALID_DATA")
    }
    ids.add(record.id)
  }
  // Unknown JSON fields survive compatible-version transfers, within the same limits.
  return { version: 1, records: value.records as AnimeRecord[] }
}

export function createTransferPayload(
  records: readonly AnimeRecord[],
): TransferPayload {
  return parseTransferPayload({
    version: 1,
    records: records.map((record) => ({
      ...record,
      // Blob/data URLs are device-local image data, not portable cover links.
      imageUrl: isTransferImageUrl(record.imageUrl) ? record.imageUrl : "",
    })),
  })
}

export type TransferChoice = "local" | "incoming" | "both"
export interface TransferPreviewRow {
  incoming: AnimeRecord
  local?: AnimeRecord
  kind: "new" | "duplicate" | "conflict"
  sameId: boolean
  ambiguous: boolean
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (isObject(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`
  return JSON.stringify(value)
}

const titleKey = (record: AnimeRecord) =>
  `${record.type}:${record.title.trim().normalize("NFKC").toLowerCase()}`

export function previewTransfer(
  local: readonly AnimeRecord[],
  incoming: readonly AnimeRecord[],
): TransferPreviewRow[] {
  const rows: TransferPreviewRow[] = incoming.map((record) => {
    const byId = local.filter((item) => item.id === record.id)
    const matches = byId.length
      ? byId
      : local.filter((item) => titleKey(item) === titleKey(record))
    const match = matches.length === 1 ? matches[0] : undefined
    return {
      incoming: record,
      local: match,
      sameId: Boolean(byId.length),
      ambiguous: matches.length > 1,
      kind: !matches.length
        ? "new"
        : match && stableJson(match) === stableJson(record)
          ? "duplicate"
          : "conflict",
    }
  })
  const targets = new Map<string, number>()
  for (const row of rows)
    if (row.local)
      targets.set(row.local.id, (targets.get(row.local.id) ?? 0) + 1)
  return rows.map((row) =>
    row.local && (targets.get(row.local.id) ?? 0) > 1
      ? { ...row, local: undefined, ambiguous: true, kind: "conflict" }
      : row,
  )
}

export function mergeTransfer(
  local: readonly AnimeRecord[],
  incoming: readonly AnimeRecord[],
  choices: Record<string, TransferChoice>,
  newId: () => string,
): AnimeRecord[] {
  const result = [...local]
  for (const row of previewTransfer(local, incoming)) {
    const choice = choices[row.incoming.id] ?? "local"
    if (
      row.kind === "duplicate" ||
      (row.kind === "conflict" && choice === "local")
    )
      continue
    if (row.kind === "new") result.push(row.incoming)
    else if (choice === "incoming" && row.local && !row.ambiguous) {
      const index = result.findIndex((item) => item.id === row.local!.id)
      result[index] = { ...row.local, ...row.incoming, id: row.local.id }
    } else if (choice === "both") {
      const id = result.some((item) => item.id === row.incoming.id)
        ? newId()
        : row.incoming.id
      if (result.some((item) => item.id === id))
        throw new TransferError("INVALID_DATA")
      result.push({ ...row.incoming, id })
    } else throw new TransferError("INVALID_DATA")
  }
  return result
}

export interface TransferBackup {
  version: 1
  transferId: string
  savedAt: number
  before: string | null
  after: string
}

export function readTransferBackup(
  storage: StorageLike,
): TransferBackup | null {
  try {
    const value = JSON.parse(storage.getItem(TRANSFER_BACKUP_KEY) ?? "null")
    if (
      value?.version === 1 &&
      typeof value.transferId === "string" &&
      (value.before === null || typeof value.before === "string") &&
      typeof value.after === "string" &&
      count(value.savedAt)
    )
      return value
  } catch {
    /* A broken backup is not evidence of a completed import. */
  }
  return null
}

export function saveTransferImport(
  storage: StorageLike,
  expectedRaw: string | null,
  merged: AnimeRecord[],
  transferId: string,
): void {
  let current: string | null
  try {
    current = storage.getItem(ANIME_STORAGE_KEY)
  } catch {
    throw new TransferError("STORAGE_FAILED")
  }
  if (current !== expectedRaw) throw new TransferError("LOCAL_CHANGED")
  const after = JSON.stringify(merged)
  const previous = readTransferBackup(storage)
  if (previous?.transferId === transferId && current === previous.after) return
  // Do not replace a useful backup on an unchanged/retried import.
  if (current === after) return
  try {
    storage.setItem(
      TRANSFER_BACKUP_KEY,
      JSON.stringify({
        version: 1,
        transferId,
        savedAt: Date.now(),
        before: current,
        after,
      }),
    )
  } catch {
    throw new TransferError("BACKUP_FAILED")
  }
  try {
    storage.setItem(ANIME_STORAGE_KEY, after)
    if (storage.getItem(ANIME_STORAGE_KEY) !== after)
      throw new Error("write not retained")
  } catch {
    throw new TransferError("STORAGE_FAILED")
  }
}
