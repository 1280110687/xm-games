import { describe, expect, it, vi } from "vitest"
import { createAnimeTransferStore } from "./anime-transfer-singleton"
import {
  MemoryAnimeTransferStore,
  RedisAnimeTransferStore,
  TRANSFER_KEY_PREFIX,
  ANIME_TRANSFER_SCRIPT,
  generateTransferCode,
  type TransferRedisClient,
} from "./anime-transfer-store"
import {
  TRANSFER_TTL_MS,
  validTransferCode,
  type CreatedTransfer,
  type ClaimedTransfer,
} from "../../features/anime-tracker/transfer/model"

const payload = {
  version: 1 as const,
  records: [
    {
      id: "a",
      title: "Synthetic",
      currentEpisode: 1,
      totalEpisodes: 10,
      status: "watching" as const,
      type: "drama" as const,
      rating: null,
      notes: "",
      imageUrl: "",
      addedAt: 1,
      updatedAt: 1,
    },
  ],
}
const create = { action: "create" as const, requestId: "request-1", payload }

describe("transfer lifecycle", () => {
  it("creates an immutable 10-minute snapshot, retries idempotently, claims once, and erases only after acknowledgement", async () => {
    let now = 1000
    const store = new MemoryAnimeTransferStore(() => now)
    const sent = (await store.execute(create, "sender")) as CreatedTransfer
    expect(validTransferCode(sent.code)).toBe(true)
    expect(sent.expiresAt).toBe(now + TRANSFER_TTL_MS)
    expect(await store.execute(create, "sender")).toEqual(sent)
    const claim = {
      action: "claim" as const,
      code: sent.code,
      receiverId: "receiver-a",
    }
    const received = (await store.execute(claim, "receiver")) as ClaimedTransfer
    received.payload.records[0].title = "changed client copy"
    now += 100
    expect(
      ((await store.execute(claim, "receiver")) as ClaimedTransfer).payload,
    ).toEqual(payload)
    await expect(
      store.execute({ ...claim, receiverId: "receiver-b" }, "other"),
    ).rejects.toThrow("CLAIMED")
    expect(
      await store.execute({ ...claim, action: "complete" }, "receiver"),
    ).toEqual({ completed: true })
    expect(
      await store.execute({ ...claim, action: "complete" }, "receiver"),
    ).toEqual({ completed: true })
    await expect(store.execute(claim, "receiver")).rejects.toThrow("NOT_FOUND")
  })
  it("does not extend expiry on repeated reads and cannot complete before claim", async () => {
    let now = 0
    const store = new MemoryAnimeTransferStore(() => now)
    const sent = (await store.execute(create, "sender")) as CreatedTransfer
    const claim = {
      action: "claim" as const,
      code: sent.code,
      receiverId: "receiver",
    }
    await expect(
      store.execute({ ...claim, action: "complete" }, "receiver"),
    ).rejects.toThrow("NOT_FOUND")
    now = TRANSFER_TTL_MS - 1
    expect(
      ((await store.execute(claim, "receiver")) as ClaimedTransfer).expiresAt,
    ).toBe(TRANSFER_TTL_MS)
    now++
    await expect(store.execute(claim, "receiver")).rejects.toThrow("NOT_FOUND")
  })
  it("only one racing receiver wins", async () => {
    const store = new MemoryAnimeTransferStore()
    const sent = (await store.execute(create, "sender")) as CreatedTransfer
    const results = await Promise.allSettled(
      ["a", "b"].map((receiverId) =>
        store.execute(
          { action: "claim", code: sent.code, receiverId },
          receiverId,
        ),
      ),
    )
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1)
  })
  it("rejects reuse of a creation ID with a different snapshot", async () => {
    const store = new MemoryAnimeTransferStore()
    await store.execute(create, "sender")
    await expect(
      store.execute(
        { ...create, payload: { ...payload, records: [] } },
        "sender",
      ),
    ).rejects.toThrow("INVALID_DATA")
  })
  it("bounds per-actor requests and active storage; expired capacity is reclaimed", async () => {
    let now = 0
    const store = new MemoryAnimeTransferStore(() => now)
    for (let i = 0; i < 5; i++)
      await store.execute({ ...create, requestId: `sender-${i}` }, "same")
    await expect(
      store.execute({ ...create, requestId: "sixth" }, "same"),
    ).rejects.toThrow("RATE_LIMITED")
    for (let i = 5; i < 32; i++)
      await store.execute({ ...create, requestId: `sender-${i}` }, `actor-${i}`)
    await expect(
      store.execute({ ...create, requestId: "full" }, "new"),
    ).rejects.toThrow("RATE_LIMITED")
    now = TRANSFER_TTL_MS
    await expect(
      store.execute({ ...create, requestId: "after-expiry" }, "same"),
    ).resolves.toHaveProperty("code")
  })
  it("uses cryptographic, unambiguous letter codes", () => {
    const codes = Array.from({ length: 100 }, generateTransferCode)
    expect(codes.every(validTransferCode)).toBe(true)
    expect(new Set(codes).size).toBe(100)
  })
})

describe("Redis boundary", () => {
  it("uses one atomic script per operation and hashes codes/actors in isolated keys", async () => {
    const evaluate = vi
      .fn()
      .mockResolvedValue(
        JSON.stringify({ code: "ABCDEFGHJK", expiresAt: 600_000 }),
      )
    const client = { eval: evaluate } as TransferRedisClient
    const store = new RedisAnimeTransferStore(
      client,
      () => 0,
      () => "ABCDEFGHJK",
    )
    await store.execute(create, "synthetic-actor")
    expect(evaluate).toHaveBeenCalledTimes(1)
    const [script, keys, args] = evaluate.mock.calls[0]
    expect(script).toBe(ANIME_TRANSFER_SCRIPT)
    expect(
      keys.every((key: string) => key.startsWith(TRANSFER_KEY_PREFIX)),
    ).toBe(true)
    expect(keys.join(" ")).not.toContain("ABCDEFGHJK")
    expect(keys.join(" ")).not.toContain("synthetic-actor")
    expect(args[2]).toBe(TRANSFER_TTL_MS)
  })
  it("keeps empty arrays and unknown JSON fields intact across Lua response decoding", async () => {
    const transferred = {
      ...payload,
      future: [],
      records: [{ ...payload.records[0], tags: [] }],
    }
    const store = new RedisAnimeTransferStore({
      eval: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({
            transferId: "test",
            expiresAt: 600_000,
            payloadJson: JSON.stringify(transferred),
          }),
        ),
    })
    expect(
      (
        (await store.execute(
          { action: "claim", code: "ABCDEFGHJK", receiverId: "r" },
          "test",
        )) as ClaimedTransfer
      ).payload,
    ).toEqual(transferred)
  })
  it("fails closed without credentials in every production/serverless environment", async () => {
    for (const env of [
      { NODE_ENV: "production" },
      { NODE_ENV: "development", VERCEL: "1" },
      { NODE_ENV: "development", XM_SHARED_SIGNAL_STORE_REQUIRED: "1" },
      {
        NODE_ENV: "development",
        UPSTASH_REDIS_REST_URL: "https://example.invalid",
      },
    ]) {
      await expect(
        createAnimeTransferStore(env).execute(create, "test"),
      ).rejects.toThrow("UNAVAILABLE")
    }
    expect(
      createAnimeTransferStore({ NODE_ENV: "development" }),
    ).toBeInstanceOf(MemoryAnimeTransferStore)
  })
})
