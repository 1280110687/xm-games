import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"
import { handleAnimeTransfer, transferActor } from "./anime-transfer-http"
import { MemoryAnimeTransferStore } from "./anime-transfer-store"
import {
  claimAnimeTransfer,
  completeAnimeTransfer,
  sendAnimeTransfer,
} from "../../features/anime-tracker/transfer/client"
import {
  createTransferPayload,
  TRANSFER_MAX_BYTES,
} from "../../features/anime-tracker/transfer/model"

const origin = "https://app.example"
const uuid = "b0e1a024-cbec-4c80-b0e1-0299966c0528"
const receiver = "ca859c5b-66d1-46fc-ae8b-a84a61296dc7"
const payload = createTransferPayload([
  {
    id: "a",
    title: "测试剧集",
    currentEpisode: 1,
    totalEpisodes: null,
    status: "watching",
    type: "drama",
    rating: null,
    notes: "",
    imageUrl: "",
    addedAt: 1,
    updatedAt: 1,
  },
])
const create = { action: "create", requestId: uuid, payload }
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(`${origin}/api/anime-transfer`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })

describe("transfer API", () => {
  it("runs the client create/claim/ack path over HTTP without leaking codes into URLs or caching data", async () => {
    const store = new MemoryAnimeTransferStore()
    const fetcher: typeof fetch = vi.fn(async (url, init) => {
      expect(url).toBe("/api/anime-transfer")
      expect(init?.cache).toBe("no-store")
      expect(init?.referrerPolicy).toBe("no-referrer")
      const req = new Request(`${origin}${url}`, {
        ...init,
        headers: { ...init?.headers, origin },
      })
      const result = await handleAnimeTransfer(req, store, {})
      expect(result.headers.get("cache-control")).toContain("no-store")
      return result
    })
    const sent = await sendAnimeTransfer(payload, uuid, fetcher)
    const received = await claimAnimeTransfer(sent.code, receiver, fetcher)
    expect(received.payload).toEqual(payload)
    await completeAnimeTransfer(sent.code, receiver, fetcher)
    await completeAnimeTransfer(sent.code, receiver, fetcher)
    await expect(
      claimAnimeTransfer(sent.code, receiver, fetcher),
    ).rejects.toThrow("NOT_FOUND")
  })
  it("rejects cross-origin, missing-origin and non-JSON requests before reaching storage", async () => {
    const store = { execute: vi.fn() }
    for (const headers of [
      { origin: "https://evil.example" },
      { origin: "" },
      { "sec-fetch-site": "cross-site" },
    ] as Record<string, string>[]) {
      expect(
        (await handleAnimeTransfer(request(create, headers), store)).status,
      ).toBe(403)
    }
    expect(
      (
        await handleAnimeTransfer(
          request(create, { "content-type": "text/plain" }),
          store,
        )
      ).status,
    ).toBe(400)
    expect(store.execute).not.toHaveBeenCalled()
  })
  it("rejects malformed and oversized bodies, including bodies without Content-Length", async () => {
    const store = { execute: vi.fn() }
    expect(
      (
        await handleAnimeTransfer(
          request({ ...create, payload: { version: 2, records: [] } }),
          store,
        )
      ).status,
    ).toBe(400)
    expect(
      (
        await handleAnimeTransfer(
          request(create, { "content-length": String(TRANSFER_MAX_BYTES * 2) }),
          store,
        )
      ).status,
    ).toBe(413)
    const oversized = new Request(`${origin}/api/anime-transfer`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: '"' + "x".repeat(TRANSFER_MAX_BYTES * 2) + '"',
    })
    expect((await handleAnimeTransfer(oversized, store)).status).toBe(413)
    const invalid = new Request(`${origin}/api/anime-transfer`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: "{",
    })
    expect((await handleAnimeTransfer(invalid, store)).status).toBe(400)
    expect(store.execute).not.toHaveBeenCalled()
  })
  it("requires a valid receiver and returns generic errors without provider details", async () => {
    const store = {
      execute: vi.fn().mockRejectedValue(new Error("provider-internal-detail")),
    }
    expect(
      (
        await handleAnimeTransfer(
          request({ action: "claim", code: "ABCDEFGHJK", receiverId: "bad" }),
          store,
        )
      ).status,
    ).toBe(400)
    const unavailable = await handleAnimeTransfer(request(create), store)
    expect(unavailable.status).toBe(503)
    expect(await unavailable.text()).not.toContain("provider-internal-detail")
  })
  it("uses the destination Host behind a proxy, but never a supplied forwarded host", async () => {
    const store = new MemoryAnimeTransferStore()
    const proxied = request(create, {
      host: "app.example:444",
      origin: "https://app.example:444",
    })
    expect((await handleAnimeTransfer(proxied, store)).status).toBe(200)
    const spoofed = request(create, {
      "x-forwarded-host": "evil.example",
      origin: "https://evil.example",
    })
    expect((await handleAnimeTransfer(spoofed, store)).status).toBe(403)
  })
  it("only trusts platform-owned address headers and has a conservative fallback", () => {
    const req = request(create, {
      "x-vercel-forwarded-for": "203.0.113.1",
      "x-forwarded-for": "203.0.113.2",
    })
    expect(transferActor(req, {})).toBe("shared")
    expect(transferActor(req, { VERCEL: "1" })).toBe("203.0.113.1")
    expect(
      transferActor(
        request(create, { "x-vercel-forwarded-for": "not-an-ip" }),
        { VERCEL: "1" },
      ),
    ).toBe("shared")
  })
  it("does not accept GET and leaves the existing SW API cache exclusion intact", async () => {
    expect(
      (
        await handleAnimeTransfer(
          new Request(`${origin}/api/anime-transfer`),
          new MemoryAnimeTransferStore(),
        )
      ).status,
    ).toBe(405)
    const sw = readFileSync("public/sw.js", "utf8")
    expect(sw).toMatch(/request.method !== ["']GET["']/)
    const component = readFileSync(
      "features/anime-tracker/components/anime-transfer.tsx",
      "utf8",
    )
    const saveIndex = component.indexOf("saveTransferImport(")
    expect(saveIndex).toBeGreaterThan(-1)
    expect(saveIndex).toBeLessThan(
      component.indexOf("await completeAnimeTransfer("),
    )
    expect(component).toContain("if (!imported)")
    expect(component).toContain("window.history.replaceState")
    expect(component).toContain("url.hash =")
  })
})

describe("transfer client recovery", () => {
  it("surfaces network failures without returning provider text", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("provider detail"))
    await expect(sendAnimeTransfer(payload, uuid, fetcher)).rejects.toThrow(
      "NETWORK",
    )
  })
  it("accepts expiry as successful deletion only on post-save acknowledgement", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "NOT_FOUND" } }), {
          status: 410,
        }),
      )
    await expect(
      completeAnimeTransfer("ABCDEFGHJK", receiver, fetcher),
    ).resolves.toBeUndefined()
  })
  it("rejects malformed successful payloads", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            transferId: "x",
            expiresAt: 1,
            payload: { version: 2 },
          }),
        ),
      )
    await expect(
      claimAnimeTransfer("ABCDEFGHJK", receiver, fetcher),
    ).rejects.toThrow("INVALID_DATA")
  })
  it("rejects invalid success envelopes and codes before presenting them", async () => {
    for (const value of [
      null,
      [],
      { code: "invalid", expiresAt: 1 },
      { code: "ABCDEFGHJK", expiresAt: -1 },
    ]) {
      const fetcher = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(value)))
      await expect(sendAnimeTransfer(payload, uuid, fetcher)).rejects.toThrow(
        "INVALID_DATA",
      )
    }
  })
})
