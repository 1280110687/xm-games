import { afterEach, describe, expect, it, vi } from "vitest"

import { RedisLanSignalStore } from "./lan-signaling-redis-store"
import {
  InMemoryLanSignalStore,
} from "./lan-signaling-store"
import {
  LAN_REDIS_CONFIGURATION_ERROR,
  createLanSignalStoreForEnvironment,
} from "./lan-signaling-singleton"

describe("LAN signaling store selection", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("uses Redis when a complete Upstash REST configuration is present", () => {
    const store = createLanSignalStoreForEnvironment({
      VERCEL: "1",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    })

    expect(store).toBeInstanceOf(RedisLanSignalStore)
  })

  it("keeps Lua tuple replies in plain JSON instead of base64-decoding array elements", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get("upstash-encoding")).toBeNull()
      expect(String(input)).toBe("https://example.upstash.io/pipeline")

      return new Response(JSON.stringify([{ result: [
        "OK",
        "0",
        "123456",
        "peer-00000000001",
        "host",
        "A".repeat(43),
        "0",
        "1700000900000",
      ] }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const store = createLanSignalStoreForEnvironment({
      VERCEL: "1",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    })

    await expect(store.createRoom({
      requestId: "create-request-0001",
    })).resolves.toMatchObject({
      deduplicated: false,
      value: {
        roomId: "123456",
        peerId: "peer-00000000001",
        role: "host",
        cursor: 0,
      },
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("keeps the in-memory implementation for local development", () => {
    expect(createLanSignalStoreForEnvironment({})).toBeInstanceOf(
      InMemoryLanSignalStore,
    )
  })

  it("returns a JSON-handler-compatible 503 store on Vercel without Redis", async () => {
    const store = createLanSignalStoreForEnvironment({ VERCEL: "1" })

    await expect(store.createRoom({
      requestId: "create-request-0001",
    })).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      status: 503,
      message: LAN_REDIS_CONFIGURATION_ERROR,
    })
  })

  it("fails closed when only one Redis credential is configured", async () => {
    const store = createLanSignalStoreForEnvironment({
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    })

    await expect(store.createRoom({
      requestId: "create-request-0001",
    })).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      status: 503,
    })
  })
})
