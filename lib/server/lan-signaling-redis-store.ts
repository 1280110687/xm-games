import { createHash, randomBytes, randomInt } from "node:crypto"

import {
  LAN_GUEST_LEASE_TTL_MS,
  LAN_MAX_ROOMS,
  LAN_MAX_SIGNAL_IDEMPOTENCY_RECORDS,
  LAN_MAX_SIGNALS_PER_ROOM,
  LAN_ROOM_HARD_TTL_MS,
  LAN_ROOM_IDLE_TTL_MS,
} from "./lan-signaling-store"
import {
  LAN_PEER_ID_PATTERN,
  LAN_ROOM_CODE_PATTERN,
  LAN_TOKEN_PATTERN,
  LanSignalError,
  type LanAuthenticatedInput,
  type LanCreateRoomInput,
  type LanErrorCode,
  type LanHeartbeatResult,
  type LanIdempotentResult,
  type LanJoinRoomInput,
  type LanLeaveRoomResult,
  type LanPeerSession,
  type LanPollSignalsInput,
  type LanPollSignalsResult,
  type LanPublishSignalInput,
  type LanSignalMessage,
  type LanSignalStore,
} from "./lan-signaling-types"

const DEFAULT_KEY_PREFIX = "xm-games:{lan-signaling}:v1"
const ROOM_CODE_ATTEMPTS = 64

/**
 * The small surface used by the store keeps it compatible with the Upstash
 * REST client and makes cross-instance behaviour testable without a network.
 */
export interface RedisLanSignalClient {
  eval<TResult = unknown>(
    script: string,
    keys: string[],
    args: Array<string | number>,
  ): Promise<TResult>
}

export interface RedisLanSignalStoreOptions {
  client: RedisLanSignalClient
  now?: () => number
  roomCodeGenerator?: () => string
  tokenGenerator?: () => string
  peerIdGenerator?: () => string
  idleTtlMs?: number
  hardTtlMs?: number
  guestLeaseTtlMs?: number
  maxSignalsPerRoom?: number
  maxSignalIdempotencyRecords?: number
  maxRooms?: number
  keyPrefix?: string
}

interface StoredRedisSignal {
  cursor: number
  id: string
  negotiationId: string
  fromPeerId: string
  fromRole: "host" | "guest"
  type: LanSignalMessage["type"]
  payloadJson: string
  createdAt: string
}

const LUA_ROOM_HELPERS = String.raw`
local function isRoomExpired(room, now)
  return tonumber(room.expiresAt) <= now or tonumber(room.hardExpiresAt) <= now
end

local function deleteRoom(roomKey, indexKey, room)
  redis.call("DEL", roomKey)
  redis.call("ZREM", indexKey, room.roomId)
  if room.createRequestKey ~= nil and room.createRequestKey ~= cjson.null then
    redis.call("DEL", room.createRequestKey)
  end
end

local function releaseGuest(room)
  room.guest = nil
  room.joinRequests = {}
  room.messages = {}
  room.signalRequests = {}
  room.messageCount = 0
  room.signalRequestCount = 0
  room.prunedThroughCursor = tonumber(room.nextCursor) - 1
  room.host.acknowledgedCursor = math.max(
    tonumber(room.host.acknowledgedCursor) or 0,
    tonumber(room.prunedThroughCursor)
  )
end

local function releaseExpiredGuest(room, now, guestLeaseTtl)
  if room.guest ~= nil and room.guest ~= cjson.null then
    if tonumber(room.guest.lastSeenAt) + guestLeaseTtl <= now then
      releaseGuest(room)
    end
  end
end

local function authenticate(room, peerId, suppliedDigest)
  if room.host.peerId == peerId and room.host.tokenDigest == suppliedDigest then
    return room.host
  end
  if room.guest ~= nil and room.guest ~= cjson.null then
    if room.guest.peerId == peerId and room.guest.tokenDigest == suppliedDigest then
      return room.guest
    end
  end
  return nil
end

local function touch(room, participant, now, idleTtl)
  participant.lastSeenAt = now
  if participant.role == "host" then
    room.expiresAt = math.min(now + idleTtl, tonumber(room.hardExpiresAt))
  end
end

local function saveRoom(roomKey, indexKey, room)
  local expiresAt = math.floor(tonumber(room.expiresAt))
  redis.call("SET", roomKey, cjson.encode(room), "PXAT", tostring(expiresAt))
  redis.call("ZADD", indexKey, tostring(expiresAt), room.roomId)
  if room.createRequestKey ~= nil and room.createRequestKey ~= cjson.null then
    redis.call("PEXPIREAT", room.createRequestKey, tostring(expiresAt))
  end
end
`

export const REDIS_LAN_CREATE_SCRIPT = String.raw`
-- xm-games:lan:create:v1
${LUA_ROOM_HELPERS}
local now = tonumber(ARGV[1])
local idleTtl = tonumber(ARGV[2])
local hardTtl = tonumber(ARGV[3])
local guestLeaseTtl = tonumber(ARGV[4])
local maxRooms = tonumber(ARGV[5])
local peerId = ARGV[6]
local tokenDigest = ARGV[7]
local token = ARGV[8]
local roomKeyPrefix = ARGV[9]
local candidateCount = tonumber(ARGV[10])

redis.call("ZREMRANGEBYSCORE", KEYS[2], "-inf", tostring(now))

local existingEncoded = redis.call("GET", KEYS[1])
if existingEncoded then
  local existing = cjson.decode(existingEncoded)
  local existingRoomKey = roomKeyPrefix .. existing.roomId
  local existingRoomEncoded = redis.call("GET", existingRoomKey)
  if existingRoomEncoded then
    local existingRoom = cjson.decode(existingRoomEncoded)
    if isRoomExpired(existingRoom, now) then
      deleteRoom(existingRoomKey, KEYS[2], existingRoom)
      redis.call("DEL", KEYS[1])
    else
      releaseExpiredGuest(existingRoom, now, guestLeaseTtl)
      if existingRoom.host.peerId ~= existing.peerId
        or existingRoom.host.tokenDigest ~= existing.tokenDigest then
        return { "ERR", "INTERNAL_ERROR" }
      end
      touch(existingRoom, existingRoom.host, now, idleTtl)
      saveRoom(existingRoomKey, KEYS[2], existingRoom)
      return {
        "OK", "1", existing.roomId, existing.peerId, "host",
        existing.token, tostring(existing.cursor), tostring(existingRoom.expiresAt)
      }
    end
  else
    redis.call("DEL", KEYS[1])
  end
end

if tonumber(redis.call("ZCARD", KEYS[2])) >= maxRooms then
  return { "ERR", "ROOM_LIMIT_REACHED" }
end

local selectedRoomId = nil
local selectedRoomKey = nil
for candidateIndex = 1, candidateCount do
  local keyIndex = candidateIndex + 2
  if redis.call("EXISTS", KEYS[keyIndex]) == 0 then
    selectedRoomId = ARGV[candidateIndex + 10]
    selectedRoomKey = KEYS[keyIndex]
    break
  end
end

if selectedRoomId == nil then
  return { "ERR", "ROOM_CODE_EXHAUSTED" }
end

local hardExpiresAt = now + hardTtl
local expiresAt = math.min(now + idleTtl, hardExpiresAt)
local room = {
  roomId = selectedRoomId,
  createdAt = now,
  hardExpiresAt = hardExpiresAt,
  expiresAt = expiresAt,
  host = {
    peerId = peerId,
    role = "host",
    tokenDigest = tokenDigest,
    lastSeenAt = now,
    acknowledgedCursor = 0
  },
  joinRequests = {},
  signalRequests = {},
  messages = {},
  messageCount = 0,
  signalRequestCount = 0,
  nextCursor = 1,
  prunedThroughCursor = 0,
  createRequestKey = KEYS[1]
}
local createRecord = {
  roomId = selectedRoomId,
  peerId = peerId,
  tokenDigest = tokenDigest,
  token = token,
  cursor = 0
}

saveRoom(selectedRoomKey, KEYS[2], room)
redis.call(
  "SET", KEYS[1], cjson.encode(createRecord),
  "PXAT", tostring(math.floor(expiresAt))
)
return {
  "OK", "0", selectedRoomId, peerId, "host", token, "0",
  tostring(expiresAt)
}
`

export const REDIS_LAN_JOIN_SCRIPT = String.raw`
-- xm-games:lan:join:v1
${LUA_ROOM_HELPERS}
local now = tonumber(ARGV[1])
local guestLeaseTtl = tonumber(ARGV[2])
local roomId = ARGV[3]
local requestId = ARGV[4]
local peerId = ARGV[5]
local tokenDigest = ARGV[6]
local token = ARGV[7]
local encoded = redis.call("GET", KEYS[1])
if not encoded then
  return { "ERR", "ROOM_NOT_FOUND" }
end
local room = cjson.decode(encoded)
if isRoomExpired(room, now) then
  deleteRoom(KEYS[1], KEYS[2], room)
  return { "ERR", "ROOM_NOT_FOUND" }
end
releaseExpiredGuest(room, now, guestLeaseTtl)

local existing = room.joinRequests[requestId]
if existing ~= nil and room.guest ~= nil and room.guest ~= cjson.null
  and room.guest.peerId == existing.peerId then
  room.guest.lastSeenAt = now
  saveRoom(KEYS[1], KEYS[2], room)
  return {
    "OK", "1", roomId, existing.peerId, "guest", existing.token,
    tostring(existing.cursor), tostring(room.expiresAt)
  }
end

if room.guest ~= nil and room.guest ~= cjson.null then
  return { "ERR", "ROOM_FULL" }
end

local cursor = tonumber(room.prunedThroughCursor)
room.guest = {
  peerId = peerId,
  role = "guest",
  tokenDigest = tokenDigest,
  lastSeenAt = now,
  acknowledgedCursor = cursor
}
room.joinRequests[requestId] = {
  peerId = peerId,
  token = token,
  cursor = cursor
}
saveRoom(KEYS[1], KEYS[2], room)
return {
  "OK", "0", roomId, peerId, "guest", token, tostring(cursor),
  tostring(room.expiresAt)
}
`

export const REDIS_LAN_PUBLISH_SCRIPT = String.raw`
-- xm-games:lan:publish:v1
${LUA_ROOM_HELPERS}
local now = tonumber(ARGV[1])
local idleTtl = tonumber(ARGV[2])
local guestLeaseTtl = tonumber(ARGV[3])
local roomId = ARGV[4]
local peerId = ARGV[5]
local suppliedDigest = ARGV[6]
local clientMessageId = ARGV[7]
local fingerprint = ARGV[8]
local negotiationId = ARGV[9]
local signalType = ARGV[10]
local payloadJson = ARGV[11]
local createdAt = ARGV[12]
local maxSignals = tonumber(ARGV[13])
local encoded = redis.call("GET", KEYS[1])
if not encoded then
  return { "ERR", "ROOM_NOT_FOUND" }
end
local room = cjson.decode(encoded)
if isRoomExpired(room, now) then
  deleteRoom(KEYS[1], KEYS[2], room)
  return { "ERR", "ROOM_NOT_FOUND" }
end
releaseExpiredGuest(room, now, guestLeaseTtl)
local participant = authenticate(room, peerId, suppliedDigest)
if participant == nil then
  return { "ERR", "INVALID_AUTHORIZATION" }
end
touch(room, participant, now, idleTtl)

local requestKey = peerId .. ":" .. clientMessageId
local existing = room.signalRequests[requestKey]
if existing ~= nil then
  if existing.fingerprint ~= fingerprint then
    return { "ERR", "IDEMPOTENCY_CONFLICT" }
  end
  saveRoom(KEYS[1], KEYS[2], room)
  return { "OK", "1", cjson.encode(existing.message) }
end

local messageCount = tonumber(room.messageCount) or 0
if messageCount >= maxSignals then
  return { "ERR", "SIGNAL_LIMIT_REACHED" }
end
local cursor = tonumber(room.nextCursor)
local message = {
  cursor = cursor,
  id = clientMessageId,
  negotiationId = negotiationId,
  fromPeerId = peerId,
  fromRole = participant.role,
  type = signalType,
  payloadJson = payloadJson,
  createdAt = createdAt
}
room.nextCursor = cursor + 1
room.messages[tostring(cursor)] = message
room.messageCount = messageCount + 1
room.signalRequests[requestKey] = {
  fingerprint = fingerprint,
  cursor = cursor,
  message = message
}
room.signalRequestCount = (tonumber(room.signalRequestCount) or 0) + 1
saveRoom(KEYS[1], KEYS[2], room)
return { "OK", "0", cjson.encode(message) }
`

export const REDIS_LAN_POLL_SCRIPT = String.raw`
-- xm-games:lan:poll:v1
${LUA_ROOM_HELPERS}
local now = tonumber(ARGV[1])
local idleTtl = tonumber(ARGV[2])
local guestLeaseTtl = tonumber(ARGV[3])
local roomId = ARGV[4]
local peerId = ARGV[5]
local suppliedDigest = ARGV[6]
local cursor = tonumber(ARGV[7])
local maxIdempotencyRecords = tonumber(ARGV[8])
local encoded = redis.call("GET", KEYS[1])
if not encoded then
  return { "ERR", "ROOM_NOT_FOUND" }
end
local room = cjson.decode(encoded)
if isRoomExpired(room, now) then
  deleteRoom(KEYS[1], KEYS[2], room)
  return { "ERR", "ROOM_NOT_FOUND" }
end
releaseExpiredGuest(room, now, guestLeaseTtl)
local participant = authenticate(room, peerId, suppliedDigest)
if participant == nil then
  return { "ERR", "INVALID_AUTHORIZATION" }
end
touch(room, participant, now, idleTtl)

local latestCursor = tonumber(room.nextCursor) - 1
if cursor > latestCursor then
  return { "ERR", "CURSOR_AHEAD" }
end
participant.acknowledgedCursor = math.max(
  tonumber(participant.acknowledgedCursor) or 0,
  cursor,
  tonumber(room.prunedThroughCursor)
)

if room.guest ~= nil and room.guest ~= cjson.null then
  local acknowledgedThrough = math.min(
    tonumber(room.host.acknowledgedCursor) or 0,
    tonumber(room.guest.acknowledgedCursor) or 0
  )
  local prunedThrough = tonumber(room.prunedThroughCursor)
  if acknowledgedThrough > prunedThrough then
    local messageCount = tonumber(room.messageCount) or 0
    for messageCursor = prunedThrough + 1, acknowledgedThrough do
      local messageKey = tostring(messageCursor)
      if room.messages[messageKey] ~= nil then
        room.messages[messageKey] = nil
        messageCount = messageCount - 1
      end
    end
    room.messageCount = math.max(0, messageCount)
    room.prunedThroughCursor = acknowledgedThrough

    local requestCount = tonumber(room.signalRequestCount) or 0
    if requestCount > maxIdempotencyRecords then
      local targetCount = math.floor(maxIdempotencyRecords * 0.75)
      for requestKey, requestRecord in pairs(room.signalRequests) do
        if tonumber(requestRecord.cursor) <= acknowledgedThrough then
          room.signalRequests[requestKey] = nil
          requestCount = requestCount - 1
        end
        if requestCount <= targetCount then
          break
        end
      end
      room.signalRequestCount = math.max(0, requestCount)
    end
  end
end

local result = { "OK", tostring(room.expiresAt), tostring(latestCursor) }
for messageCursor = cursor + 1, latestCursor do
  local message = room.messages[tostring(messageCursor)]
  if message ~= nil and message.fromPeerId ~= participant.peerId then
    table.insert(result, cjson.encode(message))
  end
end
saveRoom(KEYS[1], KEYS[2], room)
return result
`

export const REDIS_LAN_HEARTBEAT_SCRIPT = String.raw`
-- xm-games:lan:heartbeat:v1
${LUA_ROOM_HELPERS}
local now = tonumber(ARGV[1])
local idleTtl = tonumber(ARGV[2])
local guestLeaseTtl = tonumber(ARGV[3])
local roomId = ARGV[4]
local peerId = ARGV[5]
local suppliedDigest = ARGV[6]
local encoded = redis.call("GET", KEYS[1])
if not encoded then
  return { "ERR", "ROOM_NOT_FOUND" }
end
local room = cjson.decode(encoded)
if isRoomExpired(room, now) then
  deleteRoom(KEYS[1], KEYS[2], room)
  return { "ERR", "ROOM_NOT_FOUND" }
end
releaseExpiredGuest(room, now, guestLeaseTtl)
local participant = authenticate(room, peerId, suppliedDigest)
if participant == nil then
  return { "ERR", "INVALID_AUTHORIZATION" }
end
touch(room, participant, now, idleTtl)
saveRoom(KEYS[1], KEYS[2], room)
return { "OK", tostring(room.expiresAt) }
`

export const REDIS_LAN_LEAVE_SCRIPT = String.raw`
-- xm-games:lan:leave:v1
${LUA_ROOM_HELPERS}
local now = tonumber(ARGV[1])
local idleTtl = tonumber(ARGV[2])
local guestLeaseTtl = tonumber(ARGV[3])
local roomId = ARGV[4]
local peerId = ARGV[5]
local suppliedDigest = ARGV[6]
local encoded = redis.call("GET", KEYS[1])
if not encoded then
  return { "ERR", "ROOM_NOT_FOUND" }
end
local room = cjson.decode(encoded)
if isRoomExpired(room, now) then
  deleteRoom(KEYS[1], KEYS[2], room)
  return { "ERR", "ROOM_NOT_FOUND" }
end
releaseExpiredGuest(room, now, guestLeaseTtl)
local participant = authenticate(room, peerId, suppliedDigest)
if participant == nil then
  return { "ERR", "INVALID_AUTHORIZATION" }
end
touch(room, participant, now, idleTtl)
local role = participant.role
if role == "host" then
  deleteRoom(KEYS[1], KEYS[2], room)
  return { "OK", "host", "1" }
end
releaseGuest(room)
saveRoom(KEYS[1], KEYS[2], room)
return { "OK", "guest", "0" }
`

export const REDIS_LAN_CLEANUP_SCRIPT = String.raw`
-- xm-games:lan:cleanup:v1
return redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", ARGV[1])
`

const ERROR_DETAILS: Partial<
  Record<LanErrorCode, { status: number; message: string }>
> = {
  INVALID_AUTHORIZATION: {
    status: 401,
    message: "The peer credentials are invalid.",
  },
  ROOM_NOT_FOUND: { status: 404, message: "Room not found." },
  ROOM_FULL: { status: 409, message: "The room already has two peers." },
  ROOM_LIMIT_REACHED: {
    status: 503,
    message: "The signaling service room limit has been reached.",
  },
  ROOM_CODE_EXHAUSTED: {
    status: 503,
    message: "Could not allocate a room code.",
  },
  IDEMPOTENCY_CONFLICT: {
    status: 409,
    message: "The clientMessageId was already used for another signal.",
  },
  SIGNAL_LIMIT_REACHED: {
    status: 429,
    message: "The room signal limit has been reached.",
  },
  CURSOR_AHEAD: {
    status: 400,
    message: "The cursor is ahead of the room signal stream.",
  },
  INTERNAL_ERROR: {
    status: 500,
    message: "The signaling store contains invalid state.",
  },
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

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function signalFingerprint(input: LanPublishSignalInput): string {
  return digest(JSON.stringify({
    negotiationId: input.signal.negotiationId,
    type: input.signal.type,
    payload: input.signal.payload,
  }))
}

function parseEvalTuple(value: unknown): Array<string | number> {
  if (!Array.isArray(value) || value.length === 0) {
    throw new LanSignalError(
      "INTERNAL_ERROR",
      500,
      "The shared signaling store returned an invalid response.",
    )
  }

  const tuple = value as Array<unknown>
  const status = String(tuple[0])
  if (status === "ERR") {
    const code = String(tuple[1]) as LanErrorCode
    const details = ERROR_DETAILS[code] ?? ERROR_DETAILS.INTERNAL_ERROR!
    throw new LanSignalError(
      ERROR_DETAILS[code] ? code : "INTERNAL_ERROR",
      details.status,
      details.message,
    )
  }
  if (status !== "OK") {
    throw new LanSignalError(
      "INTERNAL_ERROR",
      500,
      "The shared signaling store returned an invalid response.",
    )
  }

  return tuple.map((item) =>
    typeof item === "number" ? item : String(item),
  )
}

function parseFiniteNumber(value: string | number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new LanSignalError(
      "INTERNAL_ERROR",
      500,
      "The shared signaling store returned invalid numeric state.",
    )
  }
  return parsed
}

function decodeStoredMessage(value: string | number): LanSignalMessage {
  try {
    const stored = JSON.parse(String(value)) as StoredRedisSignal
    const payload = JSON.parse(stored.payloadJson) as unknown
    return {
      cursor: stored.cursor,
      id: stored.id,
      negotiationId: stored.negotiationId,
      fromPeerId: stored.fromPeerId,
      fromRole: stored.fromRole,
      type: stored.type,
      payload,
      createdAt: stored.createdAt,
    } as LanSignalMessage
  } catch {
    throw new LanSignalError(
      "INTERNAL_ERROR",
      500,
      "The shared signaling store returned an invalid signal.",
    )
  }
}

/**
 * Vercel-safe signaling state backed by Upstash Redis REST. Every state change
 * is one Redis script, so room allocation, authentication, TTL renewal and
 * signal cursors remain atomic across independent Function instances.
 */
export class RedisLanSignalStore implements LanSignalStore {
  private readonly client: RedisLanSignalClient
  private readonly now: () => number
  private readonly roomCodeGenerator: () => string
  private readonly tokenGenerator: () => string
  private readonly peerIdGenerator: () => string
  private readonly idleTtlMs: number
  private readonly hardTtlMs: number
  private readonly guestLeaseTtlMs: number
  private readonly maxSignalsPerRoom: number
  private readonly maxSignalIdempotencyRecords: number
  private readonly maxRooms: number
  private readonly keyPrefix: string
  private readonly roomKeyPrefix: string
  private readonly roomIndexKey: string

  constructor(options: RedisLanSignalStoreOptions) {
    this.client = options.client
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
    this.maxSignalIdempotencyRecords =
      options.maxSignalIdempotencyRecords
      ?? LAN_MAX_SIGNAL_IDEMPOTENCY_RECORDS
    this.maxRooms = options.maxRooms ?? LAN_MAX_ROOMS
    this.keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX
    this.roomKeyPrefix = `${this.keyPrefix}:room:`
    this.roomIndexKey = `${this.keyPrefix}:rooms`

    if (
      !this.keyPrefix
      || this.keyPrefix.length > 128
      || this.idleTtlMs <= 0
      || this.hardTtlMs < this.idleTtlMs
      || this.guestLeaseTtlMs <= 0
      || this.maxSignalsPerRoom <= 0
      || this.maxSignalIdempotencyRecords <= 0
      || this.maxRooms <= 0
    ) {
      throw new Error("Invalid Redis LAN signal store configuration.")
    }
  }

  async createRoom(
    input: LanCreateRoomInput,
  ): Promise<LanIdempotentResult<LanPeerSession>> {
    const token = this.allocateToken()
    const peerId = this.allocatePeerId()
    const candidates = this.allocateRoomCandidates()
    const createRequestKey =
      `${this.keyPrefix}:create:${digest(input.requestId)}`
    const keys = [
      createRequestKey,
      this.roomIndexKey,
      ...candidates.map((roomId) => this.roomKey(roomId)),
    ]
    const tuple = parseEvalTuple(await this.client.eval(
      REDIS_LAN_CREATE_SCRIPT,
      keys,
      [
        this.now(),
        this.idleTtlMs,
        this.hardTtlMs,
        this.guestLeaseTtlMs,
        this.maxRooms,
        peerId,
        digest(token),
        token,
        this.roomKeyPrefix,
        candidates.length,
        ...candidates,
      ],
    ))

    return {
      deduplicated: String(tuple[1]) === "1",
      value: this.sessionFromTuple(tuple),
    }
  }

  async joinRoom(
    input: LanJoinRoomInput,
  ): Promise<LanIdempotentResult<LanPeerSession>> {
    const token = this.allocateToken()
    const peerId = this.allocatePeerId()
    const tuple = parseEvalTuple(await this.client.eval(
      REDIS_LAN_JOIN_SCRIPT,
      [this.roomKey(input.roomId), this.roomIndexKey],
      [
        this.now(),
        this.guestLeaseTtlMs,
        input.roomId,
        input.requestId,
        peerId,
        digest(token),
        token,
      ],
    ))

    return {
      deduplicated: String(tuple[1]) === "1",
      value: this.sessionFromTuple(tuple),
    }
  }

  async publishSignal(
    input: LanPublishSignalInput,
  ): Promise<LanIdempotentResult<LanSignalMessage>> {
    const now = this.now()
    const tuple = parseEvalTuple(await this.client.eval(
      REDIS_LAN_PUBLISH_SCRIPT,
      [this.roomKey(input.roomId), this.roomIndexKey],
      [
        now,
        this.idleTtlMs,
        this.guestLeaseTtlMs,
        input.roomId,
        input.peerId,
        digest(input.token),
        input.clientMessageId,
        signalFingerprint(input),
        input.signal.negotiationId,
        input.signal.type,
        JSON.stringify(input.signal.payload),
        new Date(now).toISOString(),
        this.maxSignalsPerRoom,
      ],
    ))

    return {
      deduplicated: String(tuple[1]) === "1",
      value: decodeStoredMessage(tuple[2]),
    }
  }

  async pollSignals(input: LanPollSignalsInput): Promise<LanPollSignalsResult> {
    // Upstash REST intentionally does not support blocking XREAD. A single
    // atomic read lets the H5 client perform inexpensive adaptive polling and
    // avoids keeping a Vercel Function invocation alive for 20 seconds.
    const tuple = parseEvalTuple(await this.client.eval(
      REDIS_LAN_POLL_SCRIPT,
      [this.roomKey(input.roomId), this.roomIndexKey],
      [
        this.now(),
        this.idleTtlMs,
        this.guestLeaseTtlMs,
        input.roomId,
        input.peerId,
        digest(input.token),
        input.cursor,
        this.maxSignalIdempotencyRecords,
      ],
    ))

    return {
      expiresAt: new Date(parseFiniteNumber(tuple[1])).toISOString(),
      cursor: parseFiniteNumber(tuple[2]),
      messages: tuple.slice(3).map(decodeStoredMessage),
    }
  }

  async heartbeat(input: LanAuthenticatedInput): Promise<LanHeartbeatResult> {
    const tuple = parseEvalTuple(await this.client.eval(
      REDIS_LAN_HEARTBEAT_SCRIPT,
      [this.roomKey(input.roomId), this.roomIndexKey],
      [
        this.now(),
        this.idleTtlMs,
        this.guestLeaseTtlMs,
        input.roomId,
        input.peerId,
        digest(input.token),
      ],
    ))

    return {
      roomId: input.roomId,
      peerId: input.peerId,
      expiresAt: new Date(parseFiniteNumber(tuple[1])).toISOString(),
    }
  }

  async leaveRoom(input: LanAuthenticatedInput): Promise<LanLeaveRoomResult> {
    const tuple = parseEvalTuple(await this.client.eval(
      REDIS_LAN_LEAVE_SCRIPT,
      [this.roomKey(input.roomId), this.roomIndexKey],
      [
        this.now(),
        this.idleTtlMs,
        this.guestLeaseTtlMs,
        input.roomId,
        input.peerId,
        digest(input.token),
      ],
    ))
    const role = String(tuple[1]) === "host" ? "host" : "guest"

    return {
      roomId: input.roomId,
      peerId: input.peerId,
      role,
      roomDeleted: String(tuple[2]) === "1",
    }
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.client.eval<number>(
      REDIS_LAN_CLEANUP_SCRIPT,
      [this.roomIndexKey],
      [this.now()],
    )
    return Number(result) || 0
  }

  private sessionFromTuple(tuple: Array<string | number>): LanPeerSession {
    const role = String(tuple[4]) === "host" ? "host" : "guest"
    return {
      roomId: String(tuple[2]),
      peerId: String(tuple[3]),
      role,
      token: String(tuple[5]),
      cursor: parseFiniteNumber(tuple[6]),
      expiresAt: new Date(parseFiniteNumber(tuple[7])).toISOString(),
    }
  }

  private roomKey(roomId: string): string {
    return `${this.roomKeyPrefix}${roomId}`
  }

  private allocateRoomCandidates(): string[] {
    const candidates: string[] = []
    for (let attempt = 0; attempt < ROOM_CODE_ATTEMPTS; attempt += 1) {
      const roomId = this.roomCodeGenerator()
      if (!LAN_ROOM_CODE_PATTERN.test(roomId)) {
        throw new Error("roomCodeGenerator returned an invalid room code.")
      }
      candidates.push(roomId)
    }
    return candidates
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
