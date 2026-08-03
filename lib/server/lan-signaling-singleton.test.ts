import { describe, expect, it } from "vitest"

import { RedisLanSignalStore } from "./lan-signaling-redis-store"
import {
  InMemoryLanSignalStore,
} from "./lan-signaling-store"
import {
  LAN_REDIS_CONFIGURATION_ERROR,
  createLanSignalStoreForEnvironment,
} from "./lan-signaling-singleton"

describe("LAN signaling store selection", () => {
  it("uses Redis when a complete Upstash REST configuration is present", () => {
    const store = createLanSignalStoreForEnvironment({
      VERCEL: "1",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    })

    expect(store).toBeInstanceOf(RedisLanSignalStore)
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
