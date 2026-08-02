import { describe, expect, it, vi } from "vitest"
import {
  LanSignalingClient,
  LanSignalingError,
  type LanRoomSession,
} from "./signaling-client"

const requestId = "123e4567-e89b-42d3-a456-426614174000"
const negotiationId = "123e4567-e89b-42d3-a456-426614174001"
const session: LanRoomSession = {
  roomId: "ROOM01",
  peerId: "peer-a",
  role: "host",
  token: "secret-token",
  cursor: 0,
  expiresAt: "2026-08-02T10:00:00.000Z",
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("LAN signaling client", () => {
  it("creates a room with an idempotency request UUID", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(session))
    const client = new LanSignalingClient({
      baseUrl: "/api/lan",
      fetch: fetcher,
      createId: () => requestId,
    })

    await expect(client.createRoom()).resolves.toEqual(session)
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe("/api/lan/rooms")
    expect(init?.method).toBe("POST")
    expect(init?.cache).toBe("no-store")
    expect(JSON.parse(String(init?.body))).toEqual({ requestId })
  })

  it("uses bearer auth for long polling and advances the global cursor", async () => {
    const response = {
      messages: [{
        cursor: 4,
        id: "signal-4",
        negotiationId,
        fromPeerId: "peer-b",
        fromRole: "guest",
        type: "offer",
        payload: { sdp: "v=0" },
        createdAt: "2026-08-02T10:00:00.000Z",
      }],
      cursor: 7,
      expiresAt: session.expiresAt,
    }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(response))
    const client = new LanSignalingClient({ fetch: fetcher, createId: () => requestId })

    await expect(client.pollSignals(session, 3, 2_000)).resolves.toEqual(response)
    const [url, init] = fetcher.mock.calls[0]
    expect(String(url)).toContain("peerId=peer-a&cursor=3&waitMs=2000")
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer secret-token")
  })

  it("sends the strict signal envelope and heartbeat contract", async () => {
    const published = {
      cursor: 1,
      id: requestId,
      negotiationId,
      fromPeerId: "peer-a",
      fromRole: "host",
      type: "offer",
      payload: { sdp: "v=0" },
      createdAt: "2026-08-02T10:00:00.000Z",
    }
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: published }))
      .mockResolvedValueOnce(jsonResponse({
        roomId: "ROOM01",
        peerId: "peer-a",
        expiresAt: session.expiresAt,
      }))
      .mockResolvedValueOnce(jsonResponse({
        roomId: "ROOM01",
        peerId: "peer-a",
        role: "host",
        roomDeleted: true,
      }))
    const client = new LanSignalingClient({ fetch: fetcher, createId: () => requestId })

    await expect(
      client.sendSignal(session, "offer", { sdp: "v=0" }, negotiationId),
    ).resolves.toEqual(published)
    await expect(client.heartbeat(session)).resolves.toEqual({
      roomId: "ROOM01",
      peerId: "peer-a",
      expiresAt: session.expiresAt,
    })
    await expect(client.leaveRoom(session)).resolves.toEqual({
      roomId: "ROOM01",
      peerId: "peer-a",
      role: "host",
      roomDeleted: true,
    })

    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      peerId: "peer-a",
      clientMessageId: requestId,
      negotiationId,
      type: "offer",
      payload: { sdp: "v=0" },
    })
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({ peerId: "peer-a" })
    expect(fetcher.mock.calls[2][1]?.method).toBe("DELETE")
    expect(JSON.parse(String(fetcher.mock.calls[2][1]?.body))).toEqual({ peerId: "peer-a" })
  })

  it("classifies network and server failures for reconnect logic", async () => {
    const networkClient = new LanSignalingClient({
      fetch: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
      createId: () => requestId,
    })
    await expect(networkClient.createRoom()).rejects.toEqual(
      expect.objectContaining<Partial<LanSignalingError>>({ status: 0, retryable: true }),
    )

    const conflictClient = new LanSignalingClient({
      fetch: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
        error: { code: "ROOM_FULL", message: "Room is full" },
      }, 409)),
      createId: () => requestId,
    })
    await expect(conflictClient.joinRoom("ROOM01")).rejects.toEqual(
      expect.objectContaining<Partial<LanSignalingError>>({
        status: 409,
        code: "ROOM_FULL",
        message: "Room is full",
        retryable: false,
      }),
    )

    for (const [status, code] of [
      [429, "POLL_LIMIT_REACHED"],
      [503, "ROOM_LIMIT_REACHED"],
    ] as const) {
      const retryableClient = new LanSignalingClient({
        fetch: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({
          error: { code, message: "Signaling capacity is temporarily busy" },
        }, status)),
        createId: () => requestId,
      })
      await expect(retryableClient.createRoom()).rejects.toEqual(
        expect.objectContaining<Partial<LanSignalingError>>({
          status,
          code,
          retryable: true,
        }),
      )
    }
  })

  it("requires a UUID negotiation generation for every signal", async () => {
    const published = {
      cursor: 2,
      id: requestId,
      negotiationId,
      fromPeerId: "peer-a",
      fromRole: "guest",
      type: "renegotiate",
      payload: {},
      createdAt: "2026-08-02T10:00:00.000Z",
    }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ message: published }),
    )
    const client = new LanSignalingClient({ fetch: fetcher, createId: () => requestId })

    await expect(
      client.sendSignal(session, "renegotiate", {}, negotiationId),
    ).resolves.toEqual(published)
    await expect(
      client.sendSignal(session, "renegotiate", {}, "not-a-uuid"),
    ).rejects.toBeInstanceOf(TypeError)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
