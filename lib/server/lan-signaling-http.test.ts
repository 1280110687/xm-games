import { describe, expect, it, vi } from "vitest"

import {
  handleCreateRoom,
  handleHeartbeat,
  handleJoinRoom,
  handleLeaveRoom,
  handlePollSignals,
  handlePublishSignal,
} from "./lan-signaling-http"
import { InMemoryLanSignalStore } from "./lan-signaling-store"
import type {
  LanPeerSession,
  LanPollSignalsResult,
  LanSignalMessage,
} from "./lan-signaling-types"

const CREATE_REQUEST_ID = "create-request-0001"
const JOIN_REQUEST_ID = "join-request-000001"
const MESSAGE_ID = "signal-message-0001"
const NEGOTIATION_ID = "123e4567-e89b-42d3-a456-426614174001"

function createStore(): InMemoryLanSignalStore {
  let tokenIndex = 0
  let peerIndex = 0

  return new InMemoryLanSignalStore({
    roomCodeGenerator: () => "654321",
    tokenGenerator: () => {
      tokenIndex += 1
      return String.fromCharCode(64 + tokenIndex).repeat(43)
    },
    peerIdGenerator: () => {
      peerIndex += 1
      return `peer-${peerIndex.toString().padStart(11, "0")}`
    },
  })
}

function jsonRequest(url: string, body: unknown, token?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

async function responseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

describe("LAN signaling HTTP contract", () => {
  it("accepts explicit game identity and rejects a different game", async () => {
    const store = createStore()
    const createResponse = await handleCreateRoom(
      jsonRequest("https://example.test/api/lan/rooms", {
        requestId: CREATE_REQUEST_ID,
        gameId: "reversi",
        engineVersion: "reversi-free-v1",
      }),
      store,
    )
    const host = await responseJson<LanPeerSession>(createResponse)
    expect(host).toMatchObject({
      gameId: "reversi",
      engineVersion: "reversi-free-v1",
    })

    const joinResponse = await handleJoinRoom(
      jsonRequest(`https://example.test/api/lan/rooms/${host.roomId}/join`, {
        requestId: JOIN_REQUEST_ID,
        gameId: "chess",
        engineVersion: "chess-free-v1",
      }),
      host.roomId,
      store,
    )
    expect(joinResponse.status).toBe(409)
    expect(await responseJson<{ error: { code: string } }>(joinResponse)).toMatchObject({
      error: { code: "GAME_MISMATCH" },
    })
  })

  it("creates, joins, publishes, polls, and heartbeats with no-store responses", async () => {
    const store = createStore()
    const createResponse = await handleCreateRoom(
      jsonRequest("https://example.test/api/lan/rooms", {
        requestId: CREATE_REQUEST_ID,
      }),
      store,
    )
    const host = await responseJson<LanPeerSession>(createResponse)

    expect(createResponse.status).toBe(201)
    expect(createResponse.headers.get("cache-control")).toContain("no-store")
    expect(host).toMatchObject({ roomId: "654321", role: "host", cursor: 0 })

    const repeatedCreate = await handleCreateRoom(
      jsonRequest("https://example.test/api/lan/rooms", {
        requestId: CREATE_REQUEST_ID,
      }),
      store,
    )
    expect(repeatedCreate.status).toBe(200)
    expect(await responseJson<LanPeerSession>(repeatedCreate)).toMatchObject({
      roomId: host.roomId,
      peerId: host.peerId,
      role: host.role,
      token: host.token,
      cursor: host.cursor,
    })

    const joinResponse = await handleJoinRoom(
      jsonRequest(`https://example.test/api/lan/rooms/${host.roomId}/join`, {
        requestId: JOIN_REQUEST_ID,
      }),
      host.roomId,
      store,
    )
    const guest = await responseJson<LanPeerSession>(joinResponse)
    expect(joinResponse.status).toBe(201)
    expect(guest).toMatchObject({ roomId: host.roomId, role: "guest", cursor: 0 })

    const publishResponse = await handlePublishSignal(
      jsonRequest(
        `https://example.test/api/lan/rooms/${host.roomId}/signals`,
        {
          peerId: host.peerId,
          clientMessageId: MESSAGE_ID,
          negotiationId: NEGOTIATION_ID,
          type: "offer",
          payload: { sdp: "v=0\r\n" },
        },
        host.token,
      ),
      host.roomId,
      store,
    )
    const published = await responseJson<{ message: LanSignalMessage }>(
      publishResponse,
    )
    expect(publishResponse.status).toBe(201)
    expect(published.message).toMatchObject({
      cursor: 1,
      id: MESSAGE_ID,
      negotiationId: NEGOTIATION_ID,
      fromPeerId: host.peerId,
      type: "offer",
    })

    const pollUrl = new URL(
      `https://example.test/api/lan/rooms/${host.roomId}/signals`,
    )
    pollUrl.searchParams.set("peerId", guest.peerId)
    pollUrl.searchParams.set("cursor", "0")
    const pollResponse = await handlePollSignals(
      new Request(pollUrl, {
        headers: { Authorization: `Bearer ${guest.token}` },
      }),
      host.roomId,
      store,
    )
    const poll = await responseJson<LanPollSignalsResult>(pollResponse)
    expect(pollResponse.status).toBe(200)
    expect(poll).toMatchObject({ cursor: 1, messages: [published.message] })

    const heartbeatResponse = await handleHeartbeat(
      jsonRequest(
        `https://example.test/api/lan/rooms/${host.roomId}/heartbeat`,
        { peerId: guest.peerId },
        guest.token,
      ),
      host.roomId,
      store,
    )
    expect(heartbeatResponse.status).toBe(200)
    expect(await responseJson(heartbeatResponse)).toMatchObject({
      roomId: host.roomId,
      peerId: guest.peerId,
    })

    const leaveResponse = await handleLeaveRoom(
      jsonRequest(
        `https://example.test/api/lan/rooms/${host.roomId}`,
        { peerId: guest.peerId },
        guest.token,
      ),
      host.roomId,
      store,
    )
    expect(leaveResponse.status).toBe(200)
    expect(await responseJson(leaveResponse)).toEqual({
      roomId: host.roomId,
      peerId: guest.peerId,
      role: "guest",
      roomDeleted: false,
    })
  })

  it("rejects unknown fields, unsupported media types, and invalid bearer tokens", async () => {
    const store = createStore()
    const unknownFieldResponse = await handleCreateRoom(
      jsonRequest("https://example.test/api/lan/rooms", {
        requestId: CREATE_REQUEST_ID,
        gameState: { score: 99 },
      }),
      store,
    )
    expect(unknownFieldResponse.status).toBe(400)
    expect(await responseJson(unknownFieldResponse)).toMatchObject({
      error: { code: "INVALID_REQUEST" },
    })

    const mediaTypeResponse = await handleCreateRoom(
      new Request("https://example.test/api/lan/rooms", {
        method: "POST",
        body: JSON.stringify({ requestId: CREATE_REQUEST_ID }),
      }),
      store,
    )
    expect(mediaTypeResponse.status).toBe(415)

    const host = (
      await store.createRoom({ requestId: "second-create-request" })
    ).value
    const invalidAuthResponse = await handleHeartbeat(
      jsonRequest(
        `https://example.test/api/lan/rooms/${host.roomId}/heartbeat`,
        { peerId: host.peerId },
        "x".repeat(43),
      ),
      host.roomId,
      store,
    )
    expect(invalidAuthResponse.status).toBe(401)
    expect(invalidAuthResponse.headers.get("www-authenticate")).toBe("Bearer")
  })

  it("strictly validates each signal payload shape", async () => {
    const store = createStore()
    const host = (
      await store.createRoom({ requestId: CREATE_REQUEST_ID })
    ).value
    const response = await handlePublishSignal(
      jsonRequest(
        `https://example.test/api/lan/rooms/${host.roomId}/signals`,
        {
          peerId: host.peerId,
          clientMessageId: MESSAGE_ID,
          negotiationId: NEGOTIATION_ID,
          type: "offer",
          payload: { sdp: "v=0\r\n", gameState: "not allowed" },
        },
        host.token,
      ),
      host.roomId,
      store,
    )

    expect(response.status).toBe(400)
    expect(await responseJson(response)).toMatchObject({
      error: { code: "INVALID_REQUEST" },
    })

    const invalidIceResponse = await handlePublishSignal(
      jsonRequest(
        `https://example.test/api/lan/rooms/${host.roomId}/signals`,
        {
          peerId: host.peerId,
          clientMessageId: "second-signal-message",
          negotiationId: NEGOTIATION_ID,
          type: "ice",
          payload: {
            candidate: "candidate:1 1 UDP 1 192.0.2.1 1234 typ host",
            sdpMid: "0",
          },
        },
        host.token,
      ),
      host.roomId,
      store,
    )
    expect(invalidIceResponse.status).toBe(400)

    const invalidNegotiationResponse = await handlePublishSignal(
      jsonRequest(
        `https://example.test/api/lan/rooms/${host.roomId}/signals`,
        {
          peerId: host.peerId,
          clientMessageId: "invalid-generation-msg",
          negotiationId: "not-a-uuid",
          type: "renegotiate",
          payload: {},
        },
        host.token,
      ),
      host.roomId,
      store,
    )
    expect(invalidNegotiationResponse.status).toBe(400)

    const oversizedResponse = await handlePublishSignal(
      jsonRequest(
        `https://example.test/api/lan/rooms/${host.roomId}/signals`,
        {
          peerId: host.peerId,
          clientMessageId: "oversized-signal-message",
          negotiationId: NEGOTIATION_ID,
          type: "offer",
          payload: { sdp: "x".repeat(73 * 1_024) },
        },
        host.token,
      ),
      host.roomId,
      store,
    )
    expect(oversizedResponse.status).toBe(413)
    expect(await responseJson(oversizedResponse)).toMatchObject({
      error: { code: "PAYLOAD_TOO_LARGE" },
    })
  })

  it("passes the HTTP abort signal into the long-poll store call", async () => {
    const store = createStore()
    const host = (
      await store.createRoom({ requestId: CREATE_REQUEST_ID })
    ).value
    const pollSignals = vi.spyOn(store, "pollSignals")
    const controller = new AbortController()
    const pollUrl = new URL(
      `https://example.test/api/lan/rooms/${host.roomId}/signals`,
    )
    pollUrl.searchParams.set("peerId", host.peerId)
    pollUrl.searchParams.set("cursor", "0")
    pollUrl.searchParams.set("waitMs", "0")
    const request = new Request(pollUrl, {
      headers: { Authorization: `Bearer ${host.token}` },
      signal: controller.signal,
    })

    const response = await handlePollSignals(request, host.roomId, store)

    expect(response.status).toBe(200)
    expect(pollSignals).toHaveBeenCalledWith(expect.objectContaining({
      signal: request.signal,
    }))
  })
})
