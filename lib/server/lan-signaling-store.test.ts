import { describe, expect, it } from "vitest"

import { InMemoryLanSignalStore } from "./lan-signaling-store"

const CREATE_REQUEST_ID = "create-request-0001"
const JOIN_REQUEST_ID = "join-request-000001"
const HOST_MESSAGE_ID = "host-message-00001"
const GUEST_MESSAGE_ID = "guest-message-0001"
const NEGOTIATION_ID = "123e4567-e89b-42d3-a456-426614174001"

function createTestStore(
  options: {
    now?: () => number
    idleTtlMs?: number
    hardTtlMs?: number
    guestLeaseTtlMs?: number
    maxSignalsPerRoom?: number
    maxRooms?: number
    maxWaitersTotal?: number
    maxWaitersPerRoom?: number
  } = {},
) {
  let tokenIndex = 0
  let peerIndex = 0

  return new InMemoryLanSignalStore({
    now: options.now,
    roomCodeGenerator: () => "123456",
    tokenGenerator: () => {
      tokenIndex += 1
      return String.fromCharCode(64 + tokenIndex).repeat(43)
    },
    peerIdGenerator: () => {
      peerIndex += 1
      return `peer-${peerIndex.toString().padStart(11, "0")}`
    },
    idleTtlMs: options.idleTtlMs,
    hardTtlMs: options.hardTtlMs,
    guestLeaseTtlMs: options.guestLeaseTtlMs,
    maxSignalsPerRoom: options.maxSignalsPerRoom,
    maxRooms: options.maxRooms,
    maxWaitersTotal: options.maxWaitersTotal,
    maxWaitersPerRoom: options.maxWaitersPerRoom,
  })
}

describe("InMemoryLanSignalStore", () => {
  it("creates secure-shaped credentials and deduplicates create requests", async () => {
    const store = new InMemoryLanSignalStore()
    const first = await store.createRoom({ requestId: CREATE_REQUEST_ID })
    const repeated = await store.createRoom({ requestId: CREATE_REQUEST_ID })

    expect(first.deduplicated).toBe(false)
    expect(first.value).toMatchObject({ role: "host", cursor: 0 })
    expect(first.value.roomId).toMatch(/^\d{6}$/u)
    expect(first.value.peerId).toMatch(/^[A-Za-z0-9_-]{16,64}$/u)
    expect(first.value.token).toMatch(/^[A-Za-z0-9_-]{43}$/u)
    expect(repeated.deduplicated).toBe(true)
    expect(repeated.value).toMatchObject({
      roomId: first.value.roomId,
      peerId: first.value.peerId,
      role: first.value.role,
      token: first.value.token,
      cursor: first.value.cursor,
    })
    expect(repeated.value).not.toHaveProperty("requestId")
  })

  it("allows one guest, deduplicates its retry, and rejects a third peer", async () => {
    const store = createTestStore()
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const firstGuest = await store.joinRoom({
      roomId: host.roomId,
      requestId: JOIN_REQUEST_ID,
    })
    const repeatedGuest = await store.joinRoom({
      roomId: host.roomId,
      requestId: JOIN_REQUEST_ID,
    })

    expect(firstGuest.value).toMatchObject({ role: "guest", cursor: 0 })
    expect(repeatedGuest.deduplicated).toBe(true)
    expect(repeatedGuest.value).toMatchObject({
      roomId: firstGuest.value.roomId,
      peerId: firstGuest.value.peerId,
      role: firstGuest.value.role,
      token: firstGuest.value.token,
      cursor: firstGuest.value.cursor,
    })
    await expect(
      store.joinRoom({
        roomId: host.roomId,
        requestId: "another-join-request",
      }),
    ).rejects.toMatchObject({ code: "ROOM_FULL", status: 409 })
  })

  it("exchanges only WebRTC signals from the opposite peer with monotonic cursors", async () => {
    const store = createTestStore()
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const guest = (
      await store.joinRoom({
        roomId: host.roomId,
        requestId: JOIN_REQUEST_ID,
      })
    ).value

    const offer = await store.publishSignal({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      clientMessageId: HOST_MESSAGE_ID,
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "offer",
        payload: { sdp: "v=0\r\n" },
      },
    })

    const hostPoll = await store.pollSignals({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      cursor: 0,
      waitMs: 0,
    })
    const guestPoll = await store.pollSignals({
      roomId: host.roomId,
      peerId: guest.peerId,
      token: guest.token,
      cursor: 0,
      waitMs: 0,
    })

    expect(offer.value).toMatchObject({
      cursor: 1,
      id: HOST_MESSAGE_ID,
      fromPeerId: host.peerId,
      fromRole: "host",
      negotiationId: NEGOTIATION_ID,
      type: "offer",
    })
    expect(hostPoll).toMatchObject({ messages: [], cursor: 1 })
    expect(guestPoll.messages).toEqual([offer.value])

    const answer = await store.publishSignal({
      roomId: host.roomId,
      peerId: guest.peerId,
      token: guest.token,
      clientMessageId: GUEST_MESSAGE_ID,
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "answer",
        payload: { sdp: "v=0\r\na=answer" },
      },
    })
    const hostAfterOffer = await store.pollSignals({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      cursor: hostPoll.cursor,
      waitMs: 0,
    })

    expect(answer.value.cursor).toBe(2)
    expect(hostAfterOffer.messages).toEqual([answer.value])
    expect(hostAfterOffer.cursor).toBe(2)
  })

  it("deduplicates signal writes and rejects an idempotency-key conflict", async () => {
    const store = createTestStore()
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const input = {
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      clientMessageId: HOST_MESSAGE_ID,
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "offer" as const,
        payload: { sdp: "v=0\r\n" },
      },
    }

    const first = await store.publishSignal(input)
    const repeated = await store.publishSignal(input)

    expect(repeated).toEqual({ value: first.value, deduplicated: true })
    await expect(
      store.publishSignal({
        ...input,
        signal: {
          negotiationId: NEGOTIATION_ID,
          type: "offer",
          payload: { sdp: "different" },
        },
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", status: 409 })
  })

  it("wakes a long poll when the other peer publishes a signal", async () => {
    const store = createTestStore()
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const guest = (
      await store.joinRoom({
        roomId: host.roomId,
        requestId: JOIN_REQUEST_ID,
      })
    ).value
    const pending = store.pollSignals({
      roomId: guest.roomId,
      peerId: guest.peerId,
      token: guest.token,
      cursor: 0,
      waitMs: 1_000,
    })

    await store.publishSignal({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      clientMessageId: HOST_MESSAGE_ID,
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "ice-complete",
        payload: {},
      },
    })

    await expect(pending).resolves.toMatchObject({
      cursor: 1,
      messages: [{ id: HOST_MESSAGE_ID, type: "ice-complete" }],
    })
  })

  it("prunes signals only after both peers acknowledge the global cursor", async () => {
    const store = createTestStore({ maxSignalsPerRoom: 1 })
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const guest = (
      await store.joinRoom({
        roomId: host.roomId,
        requestId: JOIN_REQUEST_ID,
      })
    ).value

    await store.publishSignal({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      clientMessageId: HOST_MESSAGE_ID,
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "offer",
        payload: { sdp: "v=0\r\n" },
      },
    })

    const hostCursor = await store.pollSignals({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      cursor: 0,
      waitMs: 0,
    })
    const guestCursor = await store.pollSignals({
      roomId: guest.roomId,
      peerId: guest.peerId,
      token: guest.token,
      cursor: 0,
      waitMs: 0,
    })

    await store.pollSignals({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      cursor: hostCursor.cursor,
      waitMs: 0,
    })

    const renegotiateInput = {
      roomId: guest.roomId,
      peerId: guest.peerId,
      token: guest.token,
      clientMessageId: "renegotiate-msg-001",
      signal: {
        negotiationId: "123e4567-e89b-42d3-a456-426614174002",
        type: "renegotiate" as const,
        payload: {},
      },
    }
    await expect(store.publishSignal(renegotiateInput)).rejects.toMatchObject({
      code: "SIGNAL_LIMIT_REACHED",
      status: 429,
    })

    await store.pollSignals({
      roomId: guest.roomId,
      peerId: guest.peerId,
      token: guest.token,
      cursor: guestCursor.cursor,
      waitMs: 0,
    })

    await expect(store.publishSignal({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      clientMessageId: HOST_MESSAGE_ID,
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "offer",
        payload: { sdp: "v=0\r\n" },
      },
    })).resolves.toMatchObject({
      deduplicated: true,
      value: { cursor: 1 },
    })

    await expect(store.publishSignal(renegotiateInput)).resolves.toMatchObject({
      value: { cursor: 2, type: "renegotiate", payload: {} },
    })
  })

  it("lets a guest release its seat and lets the host delete the room", async () => {
    const store = createTestStore()
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const guest = (
      await store.joinRoom({
        roomId: host.roomId,
        requestId: JOIN_REQUEST_ID,
      })
    ).value

    await store.publishSignal({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      clientMessageId: HOST_MESSAGE_ID,
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "offer",
        payload: { sdp: "v=0\r\nold-generation" },
      },
    })

    await expect(store.leaveRoom(guest)).resolves.toEqual({
      roomId: host.roomId,
      peerId: guest.peerId,
      role: "guest",
      roomDeleted: false,
    })
    await expect(store.heartbeat(guest)).rejects.toMatchObject({
      code: "INVALID_AUTHORIZATION",
      status: 401,
    })

    const replacement = (
      await store.joinRoom({
        roomId: host.roomId,
        requestId: "replacement-guest-request",
      })
    ).value
    expect(replacement.role).toBe("guest")
    expect(replacement.cursor).toBe(1)
    await expect(store.pollSignals({
      roomId: replacement.roomId,
      peerId: replacement.peerId,
      token: replacement.token,
      cursor: replacement.cursor,
      waitMs: 0,
    })).resolves.toMatchObject({ messages: [], cursor: 1 })

    await expect(store.leaveRoom(host)).resolves.toMatchObject({
      role: "host",
      roomDeleted: true,
    })
    await expect(store.heartbeat(replacement)).rejects.toMatchObject({
      code: "ROOM_NOT_FOUND",
      status: 404,
    })
  })

  it("releases an expired guest and clears its signaling generation", async () => {
    let now = 1_700_000_000_000
    const store = createTestStore({
      now: () => now,
      idleTtlMs: 10_000,
      hardTtlMs: 20_000,
      guestLeaseTtlMs: 1_000,
    })
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const guest = (
      await store.joinRoom({
        roomId: host.roomId,
        requestId: JOIN_REQUEST_ID,
      })
    ).value

    await store.publishSignal({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      clientMessageId: HOST_MESSAGE_ID,
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "offer",
        payload: { sdp: "v=0\r\nstale-generation" },
      },
    })

    now += 1_001
    const replacement = (
      await store.joinRoom({
        roomId: host.roomId,
        requestId: "replacement-guest-request",
      })
    ).value

    expect(replacement.peerId).not.toBe(guest.peerId)
    expect(replacement.cursor).toBe(1)
    await expect(store.pollSignals({
      roomId: replacement.roomId,
      peerId: replacement.peerId,
      token: replacement.token,
      cursor: replacement.cursor,
      waitMs: 0,
    })).resolves.toMatchObject({ messages: [], cursor: 1 })
    await expect(store.heartbeat(guest)).rejects.toMatchObject({
      code: "INVALID_AUTHORIZATION",
      status: 401,
    })

    await expect(store.publishSignal({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      clientMessageId: HOST_MESSAGE_ID,
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "offer",
        payload: { sdp: "v=0\r\nfresh-generation" },
      },
    })).resolves.toMatchObject({
      deduplicated: false,
      value: { cursor: 2 },
    })
  })

  it("extends room expiry only for host activity", async () => {
    let now = 1_700_000_000_000
    const store = createTestStore({
      now: () => now,
      idleTtlMs: 1_000,
      hardTtlMs: 5_000,
      guestLeaseTtlMs: 2_000,
    })
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value

    now += 800
    const guest = (
      await store.joinRoom({
        roomId: host.roomId,
        requestId: JOIN_REQUEST_ID,
      })
    ).value
    const guestHeartbeat = await store.heartbeat(guest)
    expect(guestHeartbeat.expiresAt).toBe(host.expiresAt)

    now += 100
    const hostHeartbeat = await store.heartbeat(host)
    expect(Date.parse(hostHeartbeat.expiresAt)).toBe(now + 1_000)
    expect(Date.parse(hostHeartbeat.expiresAt)).toBeGreaterThan(
      Date.parse(host.expiresAt),
    )
  })

  it("caps rooms while preserving idempotent retries and frees capacity on leave", async () => {
    const store = createTestStore({ maxRooms: 1 })
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value

    await expect(
      store.createRoom({ requestId: CREATE_REQUEST_ID }),
    ).resolves.toMatchObject({ deduplicated: true })
    await expect(
      store.createRoom({ requestId: "another-create-request" }),
    ).rejects.toMatchObject({ code: "ROOM_LIMIT_REACHED", status: 503 })

    await store.leaveRoom(host)
    await expect(
      store.createRoom({ requestId: "another-create-request" }),
    ).resolves.toMatchObject({
      deduplicated: false,
      value: { roomId: host.roomId, role: "host" },
    })
  })

  it("caps long polls and immediately returns their capacity after abort", async () => {
    const store = createTestStore({
      maxWaitersTotal: 1,
      maxWaitersPerRoom: 1,
    })
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const guest = (
      await store.joinRoom({
        roomId: host.roomId,
        requestId: JOIN_REQUEST_ID,
      })
    ).value
    const firstController = new AbortController()
    const firstPoll = store.pollSignals({
      roomId: guest.roomId,
      peerId: guest.peerId,
      token: guest.token,
      cursor: 0,
      waitMs: 10_000,
      signal: firstController.signal,
    })

    await expect(store.pollSignals({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      cursor: 0,
      waitMs: 10_000,
    })).rejects.toMatchObject({ code: "POLL_LIMIT_REACHED", status: 429 })

    firstController.abort()
    await expect(firstPoll).resolves.toMatchObject({ messages: [], cursor: 0 })

    const secondPoll = store.pollSignals({
      roomId: guest.roomId,
      peerId: guest.peerId,
      token: guest.token,
      cursor: 0,
      waitMs: 10_000,
    })
    await store.publishSignal({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      clientMessageId: HOST_MESSAGE_ID,
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "ice-complete",
        payload: {},
      },
    })
    await expect(secondPoll).resolves.toMatchObject({
      cursor: 1,
      messages: [{ id: HOST_MESSAGE_ID }],
    })
  })

  it("handles an abort dispatched while the long-poll listener is registered", async () => {
    const store = createTestStore({
      maxWaitersTotal: 1,
      maxWaitersPerRoom: 1,
    })
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const synchronousAbortSignal = {
      aborted: false,
      addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
      ) {
        if (type !== "abort") return
        if (typeof listener === "function") listener(new Event("abort"))
        else listener.handleEvent(new Event("abort"))
      },
      removeEventListener() {},
    } as unknown as AbortSignal

    await expect(store.pollSignals({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      cursor: 0,
      waitMs: 10_000,
      signal: synchronousAbortSignal,
    })).resolves.toMatchObject({ messages: [], cursor: 0 })

    const nextController = new AbortController()
    const nextPoll = store.pollSignals({
      roomId: host.roomId,
      peerId: host.peerId,
      token: host.token,
      cursor: 0,
      waitMs: 10_000,
      signal: nextController.signal,
    })
    nextController.abort()
    await expect(nextPoll).resolves.toMatchObject({ messages: [], cursor: 0 })
  })

  it("rejects invalid credentials and removes rooms after their TTL", async () => {
    let now = 1_700_000_000_000
    const store = new InMemoryLanSignalStore({
      now: () => now,
      roomCodeGenerator: () => "123456",
      idleTtlMs: 1_000,
      hardTtlMs: 5_000,
    })
    const host = (await store.createRoom({ requestId: CREATE_REQUEST_ID })).value

    await expect(
      store.heartbeat({
        roomId: host.roomId,
        peerId: host.peerId,
        token: "x".repeat(43),
      }),
    ).rejects.toMatchObject({ code: "INVALID_AUTHORIZATION", status: 401 })

    now += 1_001
    expect(store.cleanupExpired()).toBe(1)
    await expect(
      store.joinRoom({ roomId: host.roomId, requestId: JOIN_REQUEST_ID }),
    ).rejects.toMatchObject({ code: "ROOM_NOT_FOUND", status: 404 })
  })
})
