import { describe, expect, it } from "vitest"
import { ANIME_STORAGE_KEY, type StorageLike } from "../storage"
import type { AnimeRecord } from "../types"
import {
  createTransferPayload,
  parseTransferPayload,
  previewTransfer,
  mergeTransfer,
  saveTransferImport,
  readTransferBackup,
  TRANSFER_BACKUP_KEY,
  normalizeTransferCode,
  validTransferCode,
  TRANSFER_MAX_RECORDS,
} from "./model"

export const sampleRecord = (
  overrides: Partial<AnimeRecord> = {},
): AnimeRecord => ({
  id: "record-a",
  title: "测试剧集",
  type: "drama",
  status: "watching",
  currentEpisode: 3,
  totalEpisodes: 12,
  rating: 8,
  notes: "测试备注",
  imageUrl: "https://example.com/cover.png",
  addedAt: 100,
  updatedAt: 200,
  ...overrides,
})

function storage(initial: string | null = null, failKey?: string): StorageLike {
  const values = new Map<string, string>()
  if (initial !== null) values.set(ANIME_STORAGE_KEY, initial)
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (key === failKey) throw new Error("quota")
      values.set(key, value)
    },
  }
}

describe("watchlist transfer data", () => {
  it("normalizes grouped lowercase codes without accepting invalid letters or numbers", () => {
    expect(normalizeTransferCode(" abcde-fghjk ")).toBe("ABCDEFGHJK")
    expect(validTransferCode("ABCDEFGHJK")).toBe(true)
    expect(validTransferCode("ABCDEFGHIJ")).toBe(false)
    expect(validTransferCode("12345ABCDE")).toBe(false)
  })
  it("preserves portable records and unknown version fields without copying binary covers", () => {
    const record = {
      ...sampleRecord({ imageUrl: "data:image/png;base64,AAAA" }),
      future: { tags: [] },
    }
    expect(createTransferPayload([record]).records[0]).toEqual({
      ...record,
      imageUrl: "",
    })
    expect(record.imageUrl).toContain("data:")
    expect(
      parseTransferPayload(createTransferPayload([sampleRecord()])).records,
    ).toEqual([sampleRecord()])
  })
  it.each([
    { version: 2, records: [sampleRecord()] },
    { version: 1, records: [] },
    { version: 1, records: [sampleRecord(), sampleRecord()] },
    { version: 1, records: [sampleRecord({ currentEpisode: -1 })] },
    { version: 1, records: [sampleRecord({ title: "" })] },
    {
      version: 1,
      records: [sampleRecord({ imageUrl: "javascript:alert(1)" })],
    },
    {
      version: 1,
      records: [sampleRecord({ imageUrl: "https://user:pass@example.com/a" })],
    },
    JSON.parse('{"version":1,"records":[{"__proto__":{"polluted":true}}]}'),
  ])(
    "rejects unsupported/unsafe payload %# without partial import",
    (value) => {
      expect(() => parseTransferPayload(value)).toThrow()
    },
  )
  it("limits record counts, note sizes and UTF-8 payload bytes", () => {
    expect(() =>
      createTransferPayload(
        Array.from({ length: TRANSFER_MAX_RECORDS + 1 }, (_, i) =>
          sampleRecord({ id: `${i}` }),
        ),
      ),
    ).toThrow("TOO_LARGE")
    expect(() =>
      createTransferPayload([sampleRecord({ notes: "x".repeat(20_001) })]),
    ).toThrow("INVALID_DATA")
    expect(() =>
      createTransferPayload(
        Array.from({ length: 30 }, (_, i) =>
          sampleRecord({ id: `${i}`, notes: "字".repeat(10_000) }),
        ),
      ),
    ).toThrow("TOO_LARGE")
  })
  it("defaults conflicts to local and preserves new records without mutating either source", () => {
    const local = [sampleRecord()]
    const incoming = [
      sampleRecord({ currentEpisode: 1 }),
      sampleRecord({ id: "new", title: "新剧" }),
    ]
    expect(previewTransfer(local, incoming).map((row) => row.kind)).toEqual([
      "conflict",
      "new",
    ])
    expect(mergeTransfer(local, incoming, {}, () => "copy")).toEqual([
      local[0],
      incoming[1],
    ])
    expect(local[0].currentEpisode).toBe(3)
  })
  it("only replaces a conflict explicitly, keeps local identity/unknown fields, and never assumes clocks or progress are monotonic", () => {
    const local = [{ ...sampleRecord(), future: true }]
    const incoming = [
      sampleRecord({ id: "remote", currentEpisode: 0, updatedAt: 150 }),
    ]
    const result = mergeTransfer(
      local,
      incoming,
      { remote: "incoming" },
      () => "copy",
    )
    expect(result[0]).toMatchObject({
      id: "record-a",
      currentEpisode: 0,
      updatedAt: 150,
      future: true,
    })
  })
  it("skips identical data and supports keep-both with a distinct ID", () => {
    expect(previewTransfer([sampleRecord()], [sampleRecord()])[0].kind).toBe(
      "duplicate",
    )
    expect(
      mergeTransfer([sampleRecord()], [sampleRecord()], {}, () => "copy"),
    ).toHaveLength(1)
    const result = mergeTransfer(
      [sampleRecord()],
      [sampleRecord({ notes: "新备注" })],
      { "record-a": "both" },
      () => "copy",
    )
    expect(result.map((item) => item.id)).toEqual(["record-a", "copy"])
  })
  it("does not arbitrarily replace ambiguous title matches or overwrite one target twice", () => {
    const local = [sampleRecord(), sampleRecord({ id: "second" })]
    const incoming = [sampleRecord({ id: "remote" })]
    expect(previewTransfer(local, incoming)[0].ambiguous).toBe(true)
    expect(() =>
      mergeTransfer(local, incoming, { remote: "incoming" }, () => "copy"),
    ).toThrow()
    const competing = [
      sampleRecord({ currentEpisode: 4 }),
      sampleRecord({ id: "remote", currentEpisode: 6 }),
    ]
    expect(
      previewTransfer([sampleRecord()], competing).every(
        (row) => row.ambiguous,
      ),
    ).toBe(true)
  })
})

describe("durable local import", () => {
  const before = JSON.stringify([sampleRecord()])
  const after = [sampleRecord({ currentEpisode: 7 })]
  it("backs up exact original bytes before writing, and does not overwrite backup on retry", () => {
    const local = storage(before)
    saveTransferImport(local, before, after, "transfer-a")
    const backup = readTransferBackup(local)
    expect(backup?.before).toBe(before)
    expect(local.getItem(ANIME_STORAGE_KEY)).toBe(JSON.stringify(after))
    saveTransferImport(local, JSON.stringify(after), after, "transfer-a")
    expect(readTransferBackup(local)).toEqual(backup)
  })
  it("preserves a genuinely empty library in its backup", () => {
    const local = storage()
    saveTransferImport(local, null, after, "transfer-a")
    expect(readTransferBackup(local)?.before).toBeNull()
  })
  it("refuses stale previews when another tab has changed the library", () => {
    const local = storage("[]")
    expect(() =>
      saveTransferImport(local, before, after, "transfer-a"),
    ).toThrow("LOCAL_CHANGED")
    expect(local.getItem(ANIME_STORAGE_KEY)).toBe("[]")
  })
  it("never changes the library if backup creation fails", () => {
    const local = storage(before, TRANSFER_BACKUP_KEY)
    expect(() =>
      saveTransferImport(local, before, after, "transfer-a"),
    ).toThrow("BACKUP_FAILED")
    expect(local.getItem(ANIME_STORAGE_KEY)).toBe(before)
  })
  it("retains the original and backup when primary storage fails", () => {
    const local = storage(before, ANIME_STORAGE_KEY)
    expect(() =>
      saveTransferImport(local, before, after, "transfer-a"),
    ).toThrow("STORAGE_FAILED")
    expect(local.getItem(ANIME_STORAGE_KEY)).toBe(before)
    expect(readTransferBackup(local)?.before).toBe(before)
  })
})
