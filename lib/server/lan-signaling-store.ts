import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto"

import {
  LAN_PEER_ID_PATTERN,
  LAN_ROOM_CODE_PATTERN,
  LAN_TOKEN_PATTERN,
  LanSignalError,
  type LanAuthenticatedInput,
  type LanCreateRoomInput,
  type LanHeartbeatResult,
  type LanIdempotentResult,
  type LanJoinRoomInput,
  type LanLeaveRoomResult,
  type LanPeerSession,
  type LanPollSignalsInput,
  type LanPollSignalsResult,
  type LanPublishSignalInput,
  type LanRole,
  type LanSignalMessage,
  type LanSignalStore,
} from "./lan-signaling-types"

export const LAN_ROOM_IDLE_TTL_MS = 15 * 60 * 1_000
export const LAN_ROOM_HARD_TTL_MS = 2 * 60 * 60 * 1_000
export const LAN_GUEST_LEASE_TTL_MS = 45 * 1_000
export const LAN_MAX_SIGNALS_PER_ROOM = 256
export const LAN_MAX_SIGNAL_IDEMPOTENCY_RECORDS = 1_024
export const LAN_MAX_ROOMS = 512
export const LAN_MAX_WAITERS_TOTAL = 1_024
export const LAN_MAX_WAITERS_PER_ROOM = 4

interface Participant {
  peerId: string
  role: LanRole
  tokenDigest: Buffer
  lastSeenAt: number
  acknowledgedCursor: number
}

interface StoredSession extends LanPeerSession {
  requestId: string
}

interface StoredSignalRequest {
  fingerprint: string
  cursor: number
  id: string
  negotiationId: string
  fromPeerId: string
  fromRole: LanRole
  type: LanSignalMessage["type"]
  createdAt: string
}

interface Room {
  roomId: string
  createdAt: number
  hardExpiresAt: number
  expiresAt: number
  host: Participant
  guest?: Participant
  joinRequests: Map<string, StoredSession>
  signalRequests: Map<string, StoredSignalRequest>
  messages: LanSignalMessage[]
  nextCursor: number
  prunedThroughCursor: number
  waiters: Set<() => void>
}

interface CreateRequestRecord {
  roomId: string
  session: StoredSession
}

export interface InMemoryLanSignalStoreOptions {
  now?: () => number
  roomCodeGenerator?: () => string
  tokenGenerator?: () => string
  peerIdGenerator?: () => string
  idleTtlMs?: number
  hardTtlMs?: number
  guestLeaseTtlMs?: number
  maxSignalsPerRoom?: number
  maxRooms?: number
  maxWaitersTotal?: number
  maxWaitersPerRoom?: number
}

function defaultRoomCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0")
}

function defaultToken(): string {
  return randomBytes(32).toString("base64url")
}

function defaultPeerId(): string {
  return randomBytes(16).toString("base64url")
}

function tokenDigest(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest()
}

function tokensMatch(token: string, expectedDigest: Buffer): boolean {
  const actualDigest = tokenDigest(token)
  return timingSafeEqual(actualDigest, expectedDigest)
}

function copyMessage(message: LanSignalMessage): LanSignalMessage {
  return structuredClone(message)
}

function copySession(session: LanPeerSession): LanPeerSession {
  return {
    roomId: session.roomId,
    peerId: session.peerId,
    role: session.role,
    token: session.token,
    cursor: session.cursor,
    expiresAt: session.expiresAt,
  }
}

function signalFingerprint(input: LanPublishSignalInput): string {
  return createHash("sha256")
    .update(JSON.stringify({
      negotiationId: input.signal.negotiationId,
      type: input.signal.type,
      payload: input.signal.payload,
    }))
    .digest("hex")
}

function restoreIdempotentMessage(
  record: StoredSignalRequest,
  input: LanPublishSignalInput,
): LanSignalMessage {
  return {
    cursor: record.cursor,
    id: record.id,
    negotiationId: record.negotiationId,
    fromPeerId: record.fromPeerId,
    fromRole: record.fromRole,
    type: input.signal.type,
    payload: structuredClone(input.signal.payload),
    createdAt: record.createdAt,
  } as LanSignalMessage
}

/**
 * Process-local, single-instance storage. It is suitable for local development
 * and a single long-lived Next.js server only. Multi-instance/serverless
 * deployments must provide a shared LanSignalStore implementation.
 */
export class InMemoryLanSignalStore implements LanSignalStore {
  private readonly rooms = new Map<string, Room>()
  private readonly createRequests = new Map<string, CreateRequestRecord>()
  private readonly now: () => number
  private readonly roomCodeGenerator: () => string
  private readonly tokenGenerator: () => string
  private readonly peerIdGenerator: () => string
  private readonly idleTtlMs: number
  private readonly hardTtlMs: number
  private readonly guestLeaseTtlMs: number
  private readonly maxSignalsPerRoom: number
  private readonly maxRooms: number
  private readonly maxWaitersTotal: number
  private readonly maxWaitersPerRoom: number
  private waiterCount = 0

  constructor(options: InMemoryLanSignalStoreOptions = {}) {
    this.now = options.now ?? Date.now
    this.roomCodeGenerator = options.roomCodeGenerator ?? defaultRoomCode
    this.tokenGenerator = options.tokenGenerator ?? defaultToken
    this.peerIdGenerator = options.peerIdGenerator ?? defaultPeerId
    this.idleTtlMs = options.idleTtlMs ?? LAN_ROOM_IDLE_TTL_MS
    this.hardTtlMs = options.hardTtlMs ?? LAN_ROOM_HARD_TTL_MS
    this.guestLeaseTtlMs =
      options.guestLeaseTtlMs ?? LAN_GUEST_LEASE_TTL_MS
    this.maxSignalsPerRoom =
      options.maxSignalsPerRoom ?? LAN_MAX_SIGNALS_PER_ROOM
    this.maxRooms = options.maxRooms ?? LAN_MAX_ROOMS
    this.maxWaitersTotal =
      options.maxWaitersTotal ?? LAN_MAX_WAITERS_TOTAL
    this.maxWaitersPerRoom =
      options.maxWaitersPerRoom ?? LAN_MAX_WAITERS_PER_ROOM

    if (
      this.idleTtlMs <= 0 ||
      this.hardTtlMs < this.idleTtlMs ||
      this.guestLeaseTtlMs <= 0 ||
      this.maxSignalsPerRoom <= 0 ||
      this.maxRooms <= 0 ||
      this.maxWaitersTotal <= 0 ||
      this.maxWaitersPerRoom <= 0
    ) {
      throw new Error("Invalid in-memory LAN signal store configuration.")
    }
  }

  async createRoom(
    input: LanCreateRoomInput,
  ): Promise<LanIdempotentResult<LanPeerSession>> {
    const now = this.now()
    this.cleanupExpiredAt(now)

    const existing = this.createRequests.get(input.requestId)
    if (existing) {
      const room = this.rooms.get(existing.roomId)
      if (room) {
        this.touch(room, room.host, now)
        return {
          value: copySession({
            ...existing.session,
            expiresAt: new Date(room.expiresAt).toISOString(),
          }),
          deduplicated: true,
        }
      }

      this.createRequests.delete(input.requestId)
    }

    if (this.rooms.size >= this.maxRooms) {
      throw new LanSignalError(
        "ROOM_LIMIT_REACHED",
        503,
        "The signaling service room limit has been reached.",
      )
    }

    const roomId = this.allocateRoomCode()
    const token = this.allocateToken()
    const peerId = this.allocatePeerId()
    const hardExpiresAt = now + this.hardTtlMs
    const expiresAt = Math.min(now + this.idleTtlMs, hardExpiresAt)
    const host: Participant = {
      peerId,
      role: "host",
      tokenDigest: tokenDigest(token),
      lastSeenAt: now,
      acknowledgedCursor: 0,
    }
    const room: Room = {
      roomId,
      createdAt: now,
      hardExpiresAt,
      expiresAt,
      host,
      joinRequests: new Map(),
      signalRequests: new Map(),
      messages: [],
      nextCursor: 1,
      prunedThroughCursor: 0,
      waiters: new Set(),
    }
    const session: StoredSession = {
      requestId: input.requestId,
      roomId,
      peerId,
      role: "host",
      token,
      cursor: 0,
      expiresAt: new Date(expiresAt).toISOString(),
    }

    this.rooms.set(roomId, room)
    this.createRequests.set(input.requestId, { roomId, session })

    return { value: copySession(session), deduplicated: false }
  }

  async joinRoom(
    input: LanJoinRoomInput,
  ): Promise<LanIdempotentResult<LanPeerSession>> {
    const now = this.now()
    const room = this.requireRoom(input.roomId, now)

    const existing = room.joinRequests.get(input.requestId)
    if (existing && room.guest?.peerId === existing.peerId) {
      this.touch(room, room.guest, now)
      return {
        value: copySession({
          ...existing,
          expiresAt: new Date(room.expiresAt).toISOString(),
        }),
        deduplicated: true,
      }
    }

    if (room.guest) {
      throw new LanSignalError("ROOM_FULL", 409, "The room already has two peers.")
    }

    const token = this.allocateToken()
    const peerId = this.allocatePeerId()
    const guest: Participant = {
      peerId,
      role: "guest",
      tokenDigest: tokenDigest(token),
      lastSeenAt: now,
      acknowledgedCursor: room.prunedThroughCursor,
    }
    room.guest = guest
    this.touch(room, guest, now)

    const session: StoredSession = {
      requestId: input.requestId,
      roomId: room.roomId,
      peerId,
      role: "guest",
      token,
      cursor: room.prunedThroughCursor,
      expiresAt: new Date(room.expiresAt).toISOString(),
    }
    room.joinRequests.set(input.requestId, session)

    return { value: copySession(session), deduplicated: false }
  }

  async publishSignal(
    input: LanPublishSignalInput,
  ): Promise<LanIdempotentResult<LanSignalMessage>> {
    const now = this.now()
    const { room, participant } = this.authenticate(input, now)
    const requestKey = `${participant.peerId}:${input.clientMessageId}`
    const fingerprint = signalFingerprint(input)
    const existing = room.signalRequests.get(requestKey)

    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new LanSignalError(
          "IDEMPOTENCY_CONFLICT",
          409,
          "The clientMessageId was already used for another signal.",
        )
      }

      return {
        value: restoreIdempotentMessage(existing, input),
        deduplicated: true,
      }
    }

    if (room.messages.length >= this.maxSignalsPerRoom) {
      throw new LanSignalError(
        "SIGNAL_LIMIT_REACHED",
        429,
        "The room signal limit has been reached.",
      )
    }

    const message: LanSignalMessage = {
      ...structuredClone(input.signal),
      cursor: room.nextCursor,
      id: input.clientMessageId,
      fromPeerId: participant.peerId,
      fromRole: participant.role,
      createdAt: new Date(now).toISOString(),
    }
    room.nextCursor += 1
    room.messages.push(message)
    room.signalRequests.set(requestKey, {
      fingerprint,
      cursor: message.cursor,
      id: message.id,
      negotiationId: message.negotiationId,
      fromPeerId: message.fromPeerId,
      fromRole: message.fromRole,
      type: message.type,
      createdAt: message.createdAt,
    })
    this.notifyRoom(room)

    return { value: copyMessage(message), deduplicated: false }
  }

  async pollSignals(input: LanPollSignalsInput): Promise<LanPollSignalsResult> {
    let now = this.now()
    let { room, participant } = this.authenticate(input, now)
    this.acknowledgeCursor(room, participant, input.cursor)
    let result = this.readSignals(room, participant, input.cursor)

    if (result.messages.length > 0 || input.waitMs === 0) {
      return result
    }

    const waitResult = await this.waitForRoomChange(
      room,
      input.waitMs,
      input.signal,
    )
    if (waitResult === "aborted") {
      return result
    }

    now = this.now()
    ;({ room, participant } = this.authenticate(input, now))
    this.acknowledgeCursor(room, participant, input.cursor)
    result = this.readSignals(room, participant, input.cursor)
    return result
  }

  async heartbeat(input: LanAuthenticatedInput): Promise<LanHeartbeatResult> {
    const { room, participant } = this.authenticate(input, this.now())
    return {
      roomId: room.roomId,
      peerId: participant.peerId,
      expiresAt: new Date(room.expiresAt).toISOString(),
    }
  }

  async leaveRoom(input: LanAuthenticatedInput): Promise<LanLeaveRoomResult> {
    const { room, participant } = this.authenticate(input, this.now())
    const result: LanLeaveRoomResult = {
      roomId: room.roomId,
      peerId: participant.peerId,
      role: participant.role,
      roomDeleted: participant.role === "host",
    }

    if (participant.role === "host") {
      this.removeRoom(room)
      return result
    }

    this.releaseGuest(room)
    return result
  }

  cleanupExpired(): number {
    return this.cleanupExpiredAt(this.now())
  }

  private requireRoom(roomId: string, now: number): Room {
    this.cleanupExpiredAt(now)
    const room = this.rooms.get(roomId)

    if (!room) {
      throw new LanSignalError("ROOM_NOT_FOUND", 404, "Room not found.")
    }

    return room
  }

  private authenticate(
    input: LanAuthenticatedInput,
    now: number,
  ): { room: Room; participant: Participant } {
    const room = this.requireRoom(input.roomId, now)
    const participant =
      room.host.peerId === input.peerId
        ? room.host
        : room.guest?.peerId === input.peerId
          ? room.guest
          : undefined

    if (!participant || !tokensMatch(input.token, participant.tokenDigest)) {
      throw new LanSignalError(
        "INVALID_AUTHORIZATION",
        401,
        "The peer credentials are invalid.",
      )
    }

    this.touch(room, participant, now)
    return { room, participant }
  }

  private readSignals(
    room: Room,
    participant: Participant,
    cursor: number,
  ): LanPollSignalsResult {
    const latestCursor = room.nextCursor - 1
    if (cursor > latestCursor) {
      throw new LanSignalError(
        "CURSOR_AHEAD",
        400,
        "The cursor is ahead of the room signal stream.",
      )
    }

    return {
      messages: room.messages
        .filter(
          (message) =>
            message.cursor > cursor && message.fromPeerId !== participant.peerId,
        )
        .map(copyMessage),
      cursor: latestCursor,
      expiresAt: new Date(room.expiresAt).toISOString(),
    }
  }

  private acknowledgeCursor(
    room: Room,
    participant: Participant,
    cursor: number,
  ): void {
    const latestCursor = room.nextCursor - 1
    if (cursor > latestCursor) {
      throw new LanSignalError(
        "CURSOR_AHEAD",
        400,
        "The cursor is ahead of the room signal stream.",
      )
    }

    participant.acknowledgedCursor = Math.max(
      participant.acknowledgedCursor,
      cursor,
      room.prunedThroughCursor,
    )
    this.pruneAcknowledgedMessages(room)
  }

  private pruneAcknowledgedMessages(room: Room): void {
    if (!room.guest) return

    const acknowledgedThrough = Math.min(
      room.host.acknowledgedCursor,
      room.guest.acknowledgedCursor,
    )
    if (acknowledgedThrough <= room.prunedThroughCursor) return

    room.messages = room.messages.filter(
      (message) => message.cursor > acknowledgedThrough,
    )
    room.prunedThroughCursor = acknowledgedThrough
    this.trimIdempotencyRecords(room)
  }

  private trimIdempotencyRecords(room: Room): void {
    if (room.signalRequests.size <= LAN_MAX_SIGNAL_IDEMPOTENCY_RECORDS) return

    const targetSize = Math.floor(LAN_MAX_SIGNAL_IDEMPOTENCY_RECORDS * 0.75)
    for (const [key, record] of room.signalRequests) {
      if (record.cursor <= room.prunedThroughCursor) {
        room.signalRequests.delete(key)
      }
      if (room.signalRequests.size <= targetSize) break
    }
  }

  private touch(room: Room, participant: Participant, now: number): void {
    participant.lastSeenAt = now
    if (participant.role === "host") {
      room.expiresAt = Math.min(now + this.idleTtlMs, room.hardExpiresAt)
    }
  }

  private waitForRoomChange(
    room: Room,
    waitMs: number,
    signal?: AbortSignal,
  ): Promise<"change" | "timeout" | "aborted"> {
    if (signal?.aborted) {
      return Promise.resolve("aborted")
    }

    if (
      room.waiters.size >= this.maxWaitersPerRoom ||
      this.waiterCount >= this.maxWaitersTotal
    ) {
      throw new LanSignalError(
        "POLL_LIMIT_REACHED",
        429,
        "Too many long polls are active for the signaling service.",
      )
    }

    return new Promise((resolve) => {
      let settled = false
      let timeout: ReturnType<typeof setTimeout> | null = null
      const finish = (reason: "change" | "timeout" | "aborted") => {
        if (settled) return
        settled = true
        if (room.waiters.delete(onRoomChange)) {
          this.waiterCount -= 1
        }
        if (timeout !== null) clearTimeout(timeout)
        signal?.removeEventListener("abort", onAbort)
        resolve(reason)
      }
      const onRoomChange = () => finish("change")
      const onAbort = () => finish("aborted")

      room.waiters.add(onRoomChange)
      this.waiterCount += 1
      timeout = setTimeout(() => finish("timeout"), waitMs)
      signal?.addEventListener("abort", onAbort, { once: true })
      if (signal?.aborted) onAbort()
    })
  }

  private notifyRoom(room: Room): void {
    for (const waiter of [...room.waiters]) {
      waiter()
    }
  }

  private removeRoom(room: Room): void {
    this.rooms.delete(room.roomId)
    this.notifyRoom(room)

    for (const [requestId, record] of this.createRequests) {
      if (record.roomId === room.roomId) {
        this.createRequests.delete(requestId)
      }
    }
  }

  private releaseGuest(room: Room): void {
    room.guest = undefined
    room.joinRequests.clear()
    room.messages = []
    room.signalRequests.clear()
    room.prunedThroughCursor = room.nextCursor - 1
    room.host.acknowledgedCursor = Math.max(
      room.host.acknowledgedCursor,
      room.prunedThroughCursor,
    )
    this.notifyRoom(room)
  }

  private releaseExpiredGuest(room: Room, now: number): void {
    if (
      room.guest &&
      room.guest.lastSeenAt + this.guestLeaseTtlMs <= now
    ) {
      this.releaseGuest(room)
    }
  }

  private cleanupExpiredAt(now: number): number {
    let removed = 0

    for (const room of this.rooms.values()) {
      if (room.expiresAt <= now || room.hardExpiresAt <= now) {
        this.removeRoom(room)
        removed += 1
      } else {
        this.releaseExpiredGuest(room, now)
      }
    }

    for (const [requestId, record] of this.createRequests) {
      if (!this.rooms.has(record.roomId)) {
        this.createRequests.delete(requestId)
      }
    }

    return removed
  }

  private allocateRoomCode(): string {
    for (let attempt = 0; attempt < 64; attempt += 1) {
      const roomId = this.roomCodeGenerator()
      if (!LAN_ROOM_CODE_PATTERN.test(roomId)) {
        throw new Error("roomCodeGenerator returned an invalid room code.")
      }

      if (!this.rooms.has(roomId)) {
        return roomId
      }
    }

    throw new LanSignalError(
      "ROOM_CODE_EXHAUSTED",
      503,
      "Could not allocate a room code.",
    )
  }

  private allocateToken(): string {
    const token = this.tokenGenerator()
    if (!LAN_TOKEN_PATTERN.test(token)) {
      throw new Error("tokenGenerator returned an invalid token.")
    }
    return token
  }

  private allocatePeerId(): string {
    const peerId = this.peerIdGenerator()
    if (!LAN_PEER_ID_PATTERN.test(peerId)) {
      throw new Error("peerIdGenerator returned an invalid peer ID.")
    }
    return peerId
  }
}
