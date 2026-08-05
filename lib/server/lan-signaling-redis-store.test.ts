import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  REDIS_LAN_CLEANUP_SCRIPT,
  REDIS_LAN_CREATE_SCRIPT,
  REDIS_LAN_HEARTBEAT_SCRIPT,
  REDIS_LAN_JOIN_SCRIPT,
  REDIS_LAN_LEAVE_SCRIPT,
  REDIS_LAN_POLL_SCRIPT,
  REDIS_LAN_PUBLISH_SCRIPT,
  RedisLanSignalStore,
  type RedisLanSignalClient,
} from "./lan-signaling-redis-store"

const CREATE_REQUEST_ID = "create-request-0001"
const JOIN_REQUEST_ID = "join-request-000001"
const NEGOTIATION_ID = "123e4567-e89b-42d3-a456-426614174001"

interface FakeParticipant {
  peerId: string
  role: "host" | "guest"
  tokenDigest: string
  lastSeenAt: number
}

interface FakeSignal {
  cursor: number
  id: string
  negotiationId: string
  fromPeerId: string
  fromRole: "host" | "guest"
  type: string
  payloadJson: string
  createdAt: string
}

interface FakeRoom {
  roomId: string
  expiresAt: number
  hardExpiresAt: number
  host: FakeParticipant
  guest?: FakeParticipant
  guestLeaseTtl: number
  joinRequests: Map<string, { peerId: string; token: string; cursor: number }>
  signals: FakeSignal[]
  signalRequests: Map<string, { fingerprint: string; messageJson: string }>
  nextCursor: number
  prunedThroughCursor: number
}

/**
 * A command-level fake is deliberately shared by multiple store objects. It
 * models the Redis persistence boundary rather than sharing JS store state.
 */
class SharedFakeRedis implements RedisLanSignalClient {
  readonly rooms = new Map<string, FakeRoom>()
  readonly createRequests = new Map<
    string,
    { roomId: string; peerId: string; tokenDigest: string; token: string }
  >()
  readonly calls: Array<{
    operation: string
    keys: string[]
    args: Array<string | number>
  }> = []

  async eval<TResult = unknown>(
    script: string,
    keys: string[],
    args: Array<string | number>,
  ): Promise<TResult> {
    const operation = script.match(/xm-games:lan:(\w+):v1/u)?.[1] ?? "unknown"
    this.calls.push({ operation, keys: [...keys], args: [...args] })
    const result = this.run(operation, keys, args)
    return result as TResult
  }

  private run(
    operation: string,
    keys: string[],
    args: Array<string | number>,
  ): unknown {
    if (operation === "create") return this.create(keys, args)
    if (operation === "join") return this.join(args)
    if (operation === "publish") return this.publish(args)
    if (operation === "poll") return this.poll(args)
    if (operation === "heartbeat") return this.heartbeat(args)
    if (operation === "leave") return this.leave(args)
    if (operation === "cleanup") return this.cleanup(Number(args[0]))
    throw new Error(`Unsupported fake Redis operation: ${operation}`)
  }

  private create(keys: string[], args: Array<string | number>): unknown {
    const now = Number(args[0])
    const idleTtl = Number(args[1])
    const hardTtl = Number(args[2])
    const guestLeaseTtl = Number(args[3])
    const maxRooms = Number(args[4])
    const peerId = String(args[5])
    const tokenDigest = String(args[6])
    const token = String(args[7])
    const candidateCount = Number(args[9])
    this.cleanup(now)

    const existing = this.createRequests.get(keys[0])
    const existingRoom = existing && this.rooms.get(existing.roomId)
    if (existing && existingRoom) {
      existingRoom.host.lastSeenAt = now
      existingRoom.expiresAt = Math.min(
        now + idleTtl,
        existingRoom.hardExpiresAt,
      )
      return [
        "OK",
        "1",
        existing.roomId,
        existing.peerId,
        "host",
        existing.token,
        "0",
        String(existingRoom.expiresAt),
      ]
    }
    if (this.rooms.size >= maxRooms) return ["ERR", "ROOM_LIMIT_REACHED"]

    let roomId: string | undefined
    for (let index = 0; index < candidateCount; index += 1) {
      const candidate = String(args[10 + index])
      if (!this.rooms.has(candidate)) {
        roomId = candidate
        break
      }
    }
    if (!roomId) return ["ERR", "ROOM_CODE_EXHAUSTED"]

    const hardExpiresAt = now + hardTtl
    const expiresAt = Math.min(now + idleTtl, hardExpiresAt)
    this.rooms.set(roomId, {
      roomId,
      expiresAt,
      hardExpiresAt,
      host: { peerId, role: "host", tokenDigest, lastSeenAt: now },
      guestLeaseTtl,
      joinRequests: new Map(),
      signals: [],
      signalRequests: new Map(),
      nextCursor: 1,
      prunedThroughCursor: 0,
    })
    this.createRequests.set(keys[0], { roomId, peerId, tokenDigest, token })
    return ["OK", "0", roomId, peerId, "host", token, "0", String(expiresAt)]
  }

  private join(args: Array<string | number>): unknown {
    const now = Number(args[0])
    const roomId = String(args[2])
    const requestId = String(args[3])
    const peerId = String(args[4])
    const tokenDigest = String(args[5])
    const token = String(args[6])
    const room = this.activeRoom(roomId, now)
    if (!room) return ["ERR", "ROOM_NOT_FOUND"]
    this.releaseExpiredGuest(room, now)

    const existing = room.joinRequests.get(requestId)
    if (existing && room.guest?.peerId === existing.peerId) {
      room.guest.lastSeenAt = now
      return [
        "OK", "1", roomId, existing.peerId, "guest", existing.token,
        String(existing.cursor), String(room.expiresAt),
      ]
    }
    if (room.guest) return ["ERR", "ROOM_FULL"]

    const cursor = room.prunedThroughCursor
    room.guest = { peerId, role: "guest", tokenDigest, lastSeenAt: now }
    room.joinRequests.set(requestId, { peerId, token, cursor })
    return [
      "OK", "0", roomId, peerId, "guest", token, String(cursor),
      String(room.expiresAt),
    ]
  }

  private publish(args: Array<string | number>): unknown {
    const now = Number(args[0])
    const idleTtl = Number(args[1])
    const roomId = String(args[3])
    const peerId = String(args[4])
    const suppliedDigest = String(args[5])
    const clientMessageId = String(args[6])
    const fingerprint = String(args[7])
    const room = this.activeRoom(roomId, now)
    if (!room) return ["ERR", "ROOM_NOT_FOUND"]
    this.releaseExpiredGuest(room, now)
    const participant = this.authenticate(room, peerId, suppliedDigest)
    if (!participant) return ["ERR", "INVALID_AUTHORIZATION"]
    this.touch(room, participant, now, idleTtl)

    const requestKey = `${peerId}:${clientMessageId}`
    const existing = room.signalRequests.get(requestKey)
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return ["ERR", "IDEMPOTENCY_CONFLICT"]
      }
      return ["OK", "1", existing.messageJson]
    }
    if (room.signals.length >= Number(args[12])) {
      return ["ERR", "SIGNAL_LIMIT_REACHED"]
    }

    const message: FakeSignal = {
      cursor: room.nextCursor,
      id: clientMessageId,
      negotiationId: String(args[8]),
      fromPeerId: peerId,
      fromRole: participant.role,
      type: String(args[9]),
      payloadJson: String(args[10]),
      createdAt: String(args[11]),
    }
    room.nextCursor += 1
    room.signals.push(message)
    const messageJson = JSON.stringify(message)
    room.signalRequests.set(requestKey, { fingerprint, messageJson })
    return ["OK", "0", messageJson]
  }

  private poll(args: Array<string | number>): unknown {
    const now = Number(args[0])
    const idleTtl = Number(args[1])
    const roomId = String(args[3])
    const peerId = String(args[4])
    const cursor = Number(args[6])
    const room = this.activeRoom(roomId, now)
    if (!room) return ["ERR", "ROOM_NOT_FOUND"]
    this.releaseExpiredGuest(room, now)
    const participant = this.authenticate(room, peerId, String(args[5]))
    if (!participant) return ["ERR", "INVALID_AUTHORIZATION"]
    this.touch(room, participant, now, idleTtl)
    const latestCursor = room.nextCursor - 1
    if (cursor > latestCursor) return ["ERR", "CURSOR_AHEAD"]
    return [
      "OK",
      String(room.expiresAt),
      String(latestCursor),
      ...room.signals
        .filter((message) =>
          message.cursor > cursor && message.fromPeerId !== peerId)
        .map((message) => JSON.stringify(message)),
    ]
  }

  private heartbeat(args: Array<string | number>): unknown {
    const now = Number(args[0])
    const idleTtl = Number(args[1])
    const room = this.activeRoom(String(args[3]), now)
    if (!room) return ["ERR", "ROOM_NOT_FOUND"]
    this.releaseExpiredGuest(room, now)
    const participant = this.authenticate(room, String(args[4]), String(args[5]))
    if (!participant) return ["ERR", "INVALID_AUTHORIZATION"]
    this.touch(room, participant, now, idleTtl)
    return ["OK", String(room.expiresAt)]
  }

  private leave(args: Array<string | number>): unknown {
    const now = Number(args[0])
    const roomId = String(args[3])
    const room = this.activeRoom(roomId, now)
    if (!room) return ["ERR", "ROOM_NOT_FOUND"]
    this.releaseExpiredGuest(room, now)
    const participant = this.authenticate(room, String(args[4]), String(args[5]))
    if (!participant) return ["ERR", "INVALID_AUTHORIZATION"]
    if (participant.role === "host") {
      this.rooms.delete(roomId)
      return ["OK", "host", "1"]
    }
    this.releaseGuest(room)
    return ["OK", "guest", "0"]
  }

  private cleanup(now: number): number {
    let removed = 0
    for (const [roomId, room] of this.rooms) {
      if (room.expiresAt <= now || room.hardExpiresAt <= now) {
        this.rooms.delete(roomId)
        removed += 1
      }
    }
    return removed
  }

  private activeRoom(roomId: string, now: number): FakeRoom | undefined {
    this.cleanup(now)
    return this.rooms.get(roomId)
  }

  private authenticate(
    room: FakeRoom,
    peerId: string,
    tokenDigest: string,
  ): FakeParticipant | undefined {
    if (room.host.peerId === peerId && room.host.tokenDigest === tokenDigest) {
      return room.host
    }
    if (room.guest?.peerId === peerId && room.guest.tokenDigest === tokenDigest) {
      return room.guest
    }
    return undefined
  }

  private touch(
    room: FakeRoom,
    participant: FakeParticipant,
    now: number,
    idleTtl: number,
  ): void {
    participant.lastSeenAt = now
    if (participant.role === "host") {
      room.expiresAt = Math.min(now + idleTtl, room.hardExpiresAt)
    }
  }

  private releaseExpiredGuest(room: FakeRoom, now: number): void {
    if (room.guest && room.guest.lastSeenAt + room.guestLeaseTtl <= now) {
      this.releaseGuest(room)
    }
  }

  private releaseGuest(room: FakeRoom): void {
    room.guest = undefined
    room.joinRequests.clear()
    room.signals = []
    room.signalRequests.clear()
    room.prunedThroughCursor = room.nextCursor - 1
  }
}

function token(character: string): string {
  return character.repeat(43)
}

function createStore(
  backend: SharedFakeRedis,
  options: {
    now?: () => number
    roomCode?: string
    token?: string
    peerId?: string
    idleTtlMs?: number
    hardTtlMs?: number
    guestLeaseTtlMs?: number
  } = {},
): RedisLanSignalStore {
  return new RedisLanSignalStore({
    client: backend,
    now: options.now,
    roomCodeGenerator: () => options.roomCode ?? "123456",
    tokenGenerator: () => options.token ?? token("A"),
    peerIdGenerator: () => options.peerId ?? "peer-00000000001",
    idleTtlMs: options.idleTtlMs,
    hardTtlMs: options.hardTtlMs,
    guestLeaseTtlMs: options.guestLeaseTtlMs,
  })
}

describe("RedisLanSignalStore", () => {
  it("shares rooms, heartbeats, and signals across independent store instances", async () => {
    const backend = new SharedFakeRedis()
    const hostStore = createStore(backend)
    const guestStore = createStore(backend, {
      roomCode: "654321",
      token: token("B"),
      peerId: "peer-00000000002",
    })
    const host = (await hostStore.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const guest = (
      await guestStore.joinRoom({
        roomId: host.roomId,
        requestId: JOIN_REQUEST_ID,
      })
    ).value

    await expect(guestStore.heartbeat(guest)).resolves.toMatchObject({
      roomId: host.roomId,
      peerId: guest.peerId,
    })
    const offer = await hostStore.publishSignal({
      ...host,
      clientMessageId: "host-message-00001",
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "offer",
        payload: { sdp: "v=0\r\n" },
      },
    })
    const retriedOffer = await hostStore.publishSignal({
      ...host,
      clientMessageId: "host-message-00001",
      signal: {
        negotiationId: NEGOTIATION_ID,
        type: "offer",
        payload: { sdp: "v=0\r\n" },
      },
    })
    const received = await guestStore.pollSignals({
      ...guest,
      cursor: 0,
      waitMs: 20_000,
    })

    expect(retriedOffer).toEqual({ value: offer.value, deduplicated: true })
    expect(received.messages).toEqual([offer.value])
    expect(received.cursor).toBe(1)
    expect(backend.calls.filter((call) => call.operation === "poll")).toHaveLength(1)
  })

  it("deduplicates requests across instances and keeps participant tokens digested", async () => {
    const backend = new SharedFakeRedis()
    const now = () => 1_700_000_000_000
    const firstStore = createStore(backend, { now })
    const retryStore = createStore(backend, {
      now,
      roomCode: "654321",
      token: token("C"),
      peerId: "peer-00000000003",
    })
    const first = await firstStore.createRoom({ requestId: CREATE_REQUEST_ID })
    const retried = await retryStore.createRoom({ requestId: CREATE_REQUEST_ID })

    expect(retried).toEqual({ value: first.value, deduplicated: true })
    const storedRoom = backend.rooms.get(first.value.roomId)
    expect(storedRoom?.host).not.toHaveProperty("token")
    expect(storedRoom?.host.tokenDigest).toBe(
      createHash("sha256").update(first.value.token).digest("hex"),
    )

    await expect(firstStore.heartbeat({
      ...first.value,
      token: token("Z"),
    })).rejects.toMatchObject({
      code: "INVALID_AUTHORIZATION",
      status: 401,
    })
  })

  it("atomically reserves one guest seat and releases an expired guest lease", async () => {
    let now = 1_700_000_000_000
    const backend = new SharedFakeRedis()
    const hostStore = createStore(backend, {
      now: () => now,
      idleTtlMs: 10_000,
      hardTtlMs: 20_000,
      guestLeaseTtlMs: 1_000,
    })
    const firstGuestStore = createStore(backend, {
      now: () => now,
      token: token("B"),
      peerId: "peer-00000000002",
      idleTtlMs: 10_000,
      hardTtlMs: 20_000,
      guestLeaseTtlMs: 1_000,
    })
    const otherGuestStore = createStore(backend, {
      now: () => now,
      token: token("C"),
      peerId: "peer-00000000003",
      idleTtlMs: 10_000,
      hardTtlMs: 20_000,
      guestLeaseTtlMs: 1_000,
    })
    const host = (await hostStore.createRoom({ requestId: CREATE_REQUEST_ID })).value
    const firstGuest = (
      await firstGuestStore.joinRoom({
        roomId: host.roomId,
        requestId: JOIN_REQUEST_ID,
      })
    ).value

    await expect(otherGuestStore.joinRoom({
      roomId: host.roomId,
      requestId: "other-join-request1",
    })).rejects.toMatchObject({ code: "ROOM_FULL", status: 409 })

    now += 1_001
    const replacement = (
      await otherGuestStore.joinRoom({
        roomId: host.roomId,
        requestId: "replacement-request",
      })
    ).value
    expect(replacement.peerId).not.toBe(firstGuest.peerId)
    await expect(firstGuestStore.heartbeat(firstGuest)).rejects.toMatchObject({
      code: "INVALID_AUTHORIZATION",
      status: 401,
    })
  })

  it("uses one atomic Redis script per operation and Redis absolute TTLs", () => {
    expect(REDIS_LAN_CREATE_SCRIPT).toContain('"PXAT"')
    expect(REDIS_LAN_CREATE_SCRIPT).toContain('"ZCARD"')
    expect(REDIS_LAN_JOIN_SCRIPT).toContain('"PXAT"')
    expect(REDIS_LAN_PUBLISH_SCRIPT).toContain('"PXAT"')
    expect(REDIS_LAN_PUBLISH_SCRIPT).toContain("messageJson = encodedMessage")
    expect(REDIS_LAN_PUBLISH_SCRIPT).not.toContain("message = message")
    expect(REDIS_LAN_POLL_SCRIPT).toContain('"PXAT"')
    expect(REDIS_LAN_HEARTBEAT_SCRIPT).toContain('"PXAT"')
    expect(REDIS_LAN_LEAVE_SCRIPT).toContain('"DEL"')
    expect(REDIS_LAN_CLEANUP_SCRIPT).toContain("ZREMRANGEBYSCORE")
  })
})
