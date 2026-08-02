import { describe, expect, it } from "vitest"

import {
  PENDING_ROOM_REQUEST_STORAGE_KEY,
  PendingRoomRequestStore,
  parsePendingRoomRequest,
} from "./pending-room-request"

const FIRST_REQUEST_ID = "123e4567-e89b-42d3-a456-426614174001"
const SECOND_REQUEST_ID = "123e4567-e89b-42d3-a456-426614174002"

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
    const firstStore = new PendingRoomRequestStore(storage, () => FIRST_REQUEST_ID)
    const first = firstStore.getOrCreate("join", "123456")

    const restoredStore = new PendingRoomRequestStore(storage, () => SECOND_REQUEST_ID)
    const restored = restoredStore.getOrCreate("join", "123456")

    expect(first.requestId).toBe(FIRST_REQUEST_ID)
    expect(restored).toEqual(first)
  })

  it("replaces a pending id for a different operation and clears it after success", () => {
    const storage = createMemoryStorage()
    const ids = [FIRST_REQUEST_ID, SECOND_REQUEST_ID]
    const store = new PendingRoomRequestStore(storage, () => {
      const nextId = ids.shift()
      if (!nextId) throw new Error("No test request id remains")
      return nextId
    })

    expect(store.getOrCreate("join", "123456").requestId).toBe(FIRST_REQUEST_ID)
    expect(store.getOrCreate("join", "654321").requestId).toBe(SECOND_REQUEST_ID)

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
  })
})
