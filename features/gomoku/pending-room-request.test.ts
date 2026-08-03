import { describe, expect, it } from "vitest"

import {
  PENDING_ROOM_REQUEST_TTL_MS,
  PENDING_ROOM_REQUEST_STORAGE_KEY,
  PendingRoomRequestStore,
  parsePendingRoomRequest,
} from "./pending-room-request"

const FIRST_REQUEST_ID = "123e4567-e89b-42d3-a456-426614174001"
const SECOND_REQUEST_ID = "123e4567-e89b-42d3-a456-426614174002"
const THIRD_REQUEST_ID = "123e4567-e89b-42d3-a456-426614174003"
const STARTED_AT = 1_800_000_000_000

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(key) ?? null
    },
    key(index) {
      return [...values.keys()][index] ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

describe("PendingRoomRequestStore", () => {
  it("reuses a join id after a store is recreated from session storage", () => {
    const storage = createMemoryStorage()
    const firstStore = new PendingRoomRequestStore(
      storage,
      () => FIRST_REQUEST_ID,
      () => STARTED_AT,
    )
    const first = firstStore.getOrCreate("join", "123456")

    const restoredStore = new PendingRoomRequestStore(
      storage,
      () => SECOND_REQUEST_ID,
      () => STARTED_AT + PENDING_ROOM_REQUEST_TTL_MS - 1,
    )
    const restored = restoredStore.getOrCreate("join", "123456")

    expect(first.requestId).toBe(FIRST_REQUEST_ID)
    expect(restored).toEqual(first)
  })

  it("replaces a pending id after its retry window expires", () => {
    const storage = createMemoryStorage()
    let now = STARTED_AT
    const ids = [FIRST_REQUEST_ID, SECOND_REQUEST_ID]
    const store = new PendingRoomRequestStore(
      storage,
      () => {
        const nextId = ids.shift()
        if (!nextId) throw new Error("No test request id remains")
        return nextId
      },
      () => now,
    )

    expect(store.getOrCreate("create").requestId).toBe(FIRST_REQUEST_ID)
    now += PENDING_ROOM_REQUEST_TTL_MS

    expect(store.getOrCreate("create").requestId).toBe(SECOND_REQUEST_ID)
    expect(JSON.parse(storage.getItem(PENDING_ROOM_REQUEST_STORAGE_KEY) ?? "{}")).toMatchObject({
      version: 2,
      requestId: SECOND_REQUEST_ID,
      expiresAt: now + PENDING_ROOM_REQUEST_TTL_MS,
    })
  })

  it("replaces a pending id for a different operation and clears it after success", () => {
    const storage = createMemoryStorage()
    const ids = [FIRST_REQUEST_ID, SECOND_REQUEST_ID, THIRD_REQUEST_ID]
    const store = new PendingRoomRequestStore(
      storage,
      () => {
        const nextId = ids.shift()
        if (!nextId) throw new Error("No test request id remains")
        return nextId
      },
      () => STARTED_AT,
    )

    expect(store.getOrCreate("join", "123456").requestId).toBe(FIRST_REQUEST_ID)
    expect(store.getOrCreate("join", "654321").requestId).toBe(SECOND_REQUEST_ID)

    expect(store.replace("join", "654321").requestId).toBe(THIRD_REQUEST_ID)

    store.clear()
    expect(storage.getItem(PENDING_ROOM_REQUEST_STORAGE_KEY)).toBeNull()
  })

  it("rejects malformed persisted operations", () => {
    expect(parsePendingRoomRequest("not-json")).toBeNull()
    expect(parsePendingRoomRequest(JSON.stringify({
      version: 1,
      kind: "join",
      roomId: "12345",
      requestId: FIRST_REQUEST_ID,
    }))).toBeNull()
    expect(parsePendingRoomRequest(JSON.stringify({
      version: 2,
      kind: "create",
      requestId: FIRST_REQUEST_ID,
      expiresAt: STARTED_AT,
    }), STARTED_AT)).toBeNull()
    expect(parsePendingRoomRequest(JSON.stringify({
      version: 2,
      kind: "create",
      requestId: FIRST_REQUEST_ID,
      expiresAt: STARTED_AT + PENDING_ROOM_REQUEST_TTL_MS + 1,
    }), STARTED_AT)).toBeNull()
  })
})
