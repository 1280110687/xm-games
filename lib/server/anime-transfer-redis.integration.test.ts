import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { randomUUID } from "node:crypto"
import { describe, expect, it } from "vitest"
import {
  RedisAnimeTransferStore,
  transferDigest,
  type TransferRedisClient,
} from "./anime-transfer-store"
import {
  TRANSFER_TTL_MS,
  type CreatedTransfer,
  type ClaimedTransfer,
} from "../../features/anime-tracker/transfer/model"

// Opt-in, isolated LOCAL Redis only. Never flush a database or read app secrets.
const cli = process.env.XM_TRANSFER_TEST_REDIS_CLI
const socket = process.env.XM_TRANSFER_TEST_REDIS_SOCKET
const execute = promisify(execFile)
const command = async (...args: string[]) => {
  const result = await execute(cli!, ["-s", socket!, "--raw", ...args], {
    maxBuffer: 2 * 1024 * 1024,
  })
  return result.stdout.trim()
}
const client: TransferRedisClient = {
  async eval<T>(script: string, keys: string[], args: (string | number)[]) {
    return (await command(
      "EVAL",
      script,
      String(keys.length),
      ...keys,
      ...args.map(String),
    )) as T
  },
}

describe.skipIf(!cli || !socket)("real Redis transfer scripts", () => {
  it("atomically claims across instances, preserves JSON arrays, confirms idempotently, erases payload and retains original TTL", async () => {
    let now = Date.now()
    const prefix = `xm-games:{anime-transfer-test}:${randomUUID()}`
    const sender = new RedisAnimeTransferStore(
      client,
      () => now,
      undefined,
      prefix,
    )
    const receiver = new RedisAnimeTransferStore(
      client,
      () => now,
      undefined,
      prefix,
    )
    const payload = {
      version: 1 as const,
      records: [
        {
          id: "test",
          title: "Synthetic",
          currentEpisode: 1,
          totalEpisodes: null,
          type: "drama" as const,
          status: "watching" as const,
          rating: null,
          notes: "synthetic-notes",
          imageUrl: "",
          addedAt: 1,
          updatedAt: 1,
          future: { list: [] },
        },
      ],
    }
    const input = {
      action: "create" as const,
      requestId: randomUUID(),
      payload,
    }
    const sent = (await sender.execute(input, "sender")) as CreatedTransfer
    expect(await sender.execute(input, "sender")).toEqual(sent)
    const claim = {
      action: "claim" as const,
      code: sent.code,
      receiverId: randomUUID(),
    }
    const received = (await receiver.execute(
      claim,
      "receiver",
    )) as ClaimedTransfer
    expect(received.payload).toEqual(payload)
    await expect(
      sender.execute({ ...claim, receiverId: randomUUID() }, "other"),
    ).rejects.toThrow("CLAIMED")
    const key = `${prefix}:data:${transferDigest(sent.code)}`
    // Redis owns the expiry. Clock skew / transport delays in an app instance
    // must not restore a key's remaining lifetime when it rewrites the state.
    await command("PEXPIRE", key, "10000")
    const beforeTtl = Number(await command("PTTL", key))
    now += 1000
    expect(
      ((await receiver.execute(claim, "receiver")) as ClaimedTransfer)
        .expiresAt,
    ).toBe(sent.expiresAt)
    await receiver.execute({ ...claim, action: "complete" }, "receiver")
    expect(
      await receiver.execute({ ...claim, action: "complete" }, "receiver"),
    ).toEqual({ completed: true })
    expect(await command("GET", key)).not.toContain("synthetic-notes")
    expect(await command("GET", key)).not.toContain("payloadJson")
    expect(Number(await command("PTTL", key))).toBeLessThan(beforeTtl)
    expect(await command("ZCARD", `${prefix}:active`)).toBe("0")
    await expect(receiver.execute(claim, "receiver")).rejects.toThrow(
      "NOT_FOUND",
    )
    now += TRANSFER_TTL_MS
    await expect(
      receiver.execute({ ...claim, action: "complete" }, "receiver"),
    ).rejects.toThrow("NOT_FOUND")
  })

  it("enforces Redis rate limits across different store instances", async () => {
    const prefix = `xm-games:{anime-transfer-test}:${randomUUID()}`
    const a = new RedisAnimeTransferStore(client, Date.now, undefined, prefix)
    const b = new RedisAnimeTransferStore(client, Date.now, undefined, prefix)
    const input = {
      action: "claim" as const,
      code: "ABCDEFGHJK",
      receiverId: randomUUID(),
    }
    for (let i = 0; i < 30; i++)
      await expect((i % 2 ? a : b).execute(input, "same")).rejects.toThrow(
        "NOT_FOUND",
      )
    await expect(b.execute(input, "same")).rejects.toThrow("RATE_LIMITED")
  })
})
