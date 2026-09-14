import { createHash, randomInt } from "node:crypto"
import {
  TRANSFER_ALPHABET,
  TRANSFER_TTL_MS,
  TransferError,
  type TransferPayload,
  type CreatedTransfer,
  type ClaimedTransfer,
} from "../../features/anime-tracker/transfer/model"

export const TRANSFER_MAX_ACTIVE = 32
export const TRANSFER_KEY_PREFIX = "xm-games:{anime-transfer}:v1"
export type TransferOperation =
  | { action: "create"; requestId: string; payload: TransferPayload }
  | { action: "claim" | "complete"; code: string; receiverId: string }
export type TransferResult =
  | CreatedTransfer
  | ClaimedTransfer
  | { completed: true }
export interface AnimeTransferStore {
  execute(input: TransferOperation, actor: string): Promise<TransferResult>
}
export interface TransferRedisClient {
  eval<T>(script: string, keys: string[], args: (string | number)[]): Promise<T>
}

export const transferDigest = (value: string) =>
  createHash("sha256").update(value).digest("hex")
export const generateTransferCode = () =>
  Array.from(
    { length: 10 },
    () => TRANSFER_ALPHABET[randomInt(TRANSFER_ALPHABET.length)],
  ).join("")
export const transferLimits = (action: TransferOperation["action"]) =>
  action === "create"
    ? { actor: 5, global: 60 }
    : action === "claim"
      ? { actor: 30, global: 300 }
      : { actor: 60, global: 180 }

// Every read/claim/ack transition runs atomically. Payload remains an opaque JSON
// string so Lua cjson cannot turn empty arrays in future fields into objects.
export const ANIME_TRANSFER_SCRIPT = String.raw`
local action, now, ttl = ARGV[1], tonumber(ARGV[2]), tonumber(ARGV[3])
local function reply(value) return cjson.encode(value) end
local function fail(code) return reply({error=code}) end
local function allow(key, limit)
  local count = redis.call('INCR', key)
  if count == 1 then redis.call('PEXPIRE', key, ttl) end
  return count <= limit
end
if not allow(KEYS[4], tonumber(ARGV[4])) then return fail('RATE_LIMITED') end
if not allow(KEYS[5], tonumber(ARGV[5])) then return fail('RATE_LIMITED') end
if action == 'create' then
  local previous = redis.call('GET', KEYS[3])
  if previous then
    local receipt = cjson.decode(previous)
    if receipt.fingerprint ~= ARGV[9] then return fail('INVALID_DATA') end
    return reply({code=receipt.code, expiresAt=receipt.expiresAt})
  end
  redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', tostring(now))
  if redis.call('ZCARD', KEYS[2]) >= tonumber(ARGV[10]) then return fail('RATE_LIMITED') end
  if redis.call('EXISTS', KEYS[1]) == 1 then return fail('COLLISION') end
  local expiresAt = now + ttl
  local entry = {state='ready', expiresAt=expiresAt, transferId=ARGV[7], payloadJson=ARGV[8]}
  redis.call('SET', KEYS[1], cjson.encode(entry), 'PX', ttl)
  redis.call('ZADD', KEYS[2], tostring(expiresAt), KEYS[1])
  redis.call('PEXPIRE', KEYS[2], ttl * 2)
  redis.call('SET', KEYS[3], cjson.encode({code=ARGV[6], expiresAt=expiresAt, fingerprint=ARGV[9]}), 'PX', ttl)
  return reply({code=ARGV[6], expiresAt=expiresAt})
end
local encoded = redis.call('GET', KEYS[1])
if not encoded then return fail('NOT_FOUND') end
local entry = cjson.decode(encoded)
if entry.expiresAt <= now then return fail('NOT_FOUND') end
if entry.receiver and entry.receiver ~= ARGV[7] then return fail('CLAIMED') end
if action == 'claim' then
  if entry.state == 'completed' then return fail('NOT_FOUND') end
  entry.receiver = ARGV[7]
  redis.call('SET', KEYS[1], cjson.encode(entry), 'KEEPTTL')
  return reply({transferId=entry.transferId, expiresAt=entry.expiresAt, payloadJson=entry.payloadJson})
end
if not entry.receiver then return fail('NOT_FOUND') end
-- Keep only a small receipt until the ORIGINAL expiry; never prolong a code.
redis.call('SET', KEYS[1], cjson.encode({state='completed', receiver=entry.receiver, expiresAt=entry.expiresAt}), 'KEEPTTL')
redis.call('ZREM', KEYS[2], KEYS[1])
return reply({completed=true})
`

export class RedisAnimeTransferStore implements AnimeTransferStore {
  constructor(
    private readonly client: TransferRedisClient,
    private readonly now = Date.now,
    private readonly code = generateTransferCode,
    private readonly prefix = TRANSFER_KEY_PREFIX,
  ) {}
  async execute(
    input: TransferOperation,
    actor: string,
  ): Promise<TransferResult> {
    const limits = transferLimits(input.action)
    const payloadJson =
      input.action === "create" ? JSON.stringify(input.payload) : ""
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = input.action === "create" ? this.code() : input.code
      const id = transferDigest(
        input.action === "create" ? input.requestId : input.receiverId,
      )
      const raw = await this.client.eval<string>(
        ANIME_TRANSFER_SCRIPT,
        [
          `${this.prefix}:data:${transferDigest(code)}`,
          `${this.prefix}:active`,
          `${this.prefix}:request:${id}`,
          `${this.prefix}:rate:${input.action}:${transferDigest(actor)}`,
          `${this.prefix}:rate:${input.action}:global`,
        ],
        [
          input.action,
          this.now(),
          TRANSFER_TTL_MS,
          limits.actor,
          limits.global,
          code,
          id,
          payloadJson,
          transferDigest(payloadJson),
          TRANSFER_MAX_ACTIVE,
        ],
      )
      const value = JSON.parse(raw)
      if (value.error === "COLLISION") continue
      if (value.error) throw new TransferError(value.error)
      if (value.payloadJson)
        return {
          transferId: value.transferId,
          expiresAt: value.expiresAt,
          payload: JSON.parse(value.payloadJson),
        }
      return value
    }
    throw new TransferError("UNAVAILABLE")
  }
}

interface MemoryEntry {
  expiresAt: number
  transferId: string
  payload?: TransferPayload
  receiver?: string
}

/** Local development only; production never silently falls back to this store. */
export class MemoryAnimeTransferStore implements AnimeTransferStore {
  private entries = new Map<string, MemoryEntry>()
  private requests = new Map<
    string,
    CreatedTransfer & { fingerprint: string }
  >()
  private counters = new Map<string, { count: number; expiresAt: number }>()
  constructor(
    private readonly now = Date.now,
    private readonly code = generateTransferCode,
  ) {}
  async execute(
    input: TransferOperation,
    actor: string,
  ): Promise<TransferResult> {
    const now = this.now()
    for (const map of [this.entries, this.requests, this.counters]) {
      for (const [key, value] of map)
        if (value.expiresAt <= now) map.delete(key)
    }
    const limits = transferLimits(input.action)
    for (const [key, limit] of [
      [`${input.action}:${actor}`, limits.actor],
      [`${input.action}:global`, limits.global],
    ] as const) {
      const counter = this.counters.get(key) ?? {
        count: 0,
        expiresAt: now + TRANSFER_TTL_MS,
      }
      counter.count++
      this.counters.set(key, counter)
      if (counter.count > limit) throw new TransferError("RATE_LIMITED")
    }
    if (input.action === "create") {
      const fingerprint = transferDigest(JSON.stringify(input.payload))
      const previous = this.requests.get(input.requestId)
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new TransferError("INVALID_DATA")
        return { code: previous.code, expiresAt: previous.expiresAt }
      }
      if (
        [...this.entries.values()].filter((entry) => entry.payload).length >=
        TRANSFER_MAX_ACTIVE
      )
        throw new TransferError("RATE_LIMITED")
      for (let attempt = 0; attempt < 4; attempt++) {
        const code = this.code()
        if (this.entries.has(code)) continue
        const expiresAt = now + TRANSFER_TTL_MS
        this.entries.set(code, {
          expiresAt,
          transferId: transferDigest(input.requestId),
          payload: structuredClone(input.payload),
        })
        this.requests.set(input.requestId, { code, expiresAt, fingerprint })
        return { code, expiresAt }
      }
      throw new TransferError("UNAVAILABLE")
    }
    const entry = this.entries.get(input.code)
    if (!entry) throw new TransferError("NOT_FOUND")
    const receiver = transferDigest(input.receiverId)
    if (entry.receiver && entry.receiver !== receiver)
      throw new TransferError("CLAIMED")
    if (input.action === "claim") {
      if (!entry.payload) throw new TransferError("NOT_FOUND")
      entry.receiver = receiver
      return {
        transferId: entry.transferId,
        expiresAt: entry.expiresAt,
        payload: structuredClone(entry.payload),
      }
    }
    if (!entry.receiver) throw new TransferError("NOT_FOUND")
    delete entry.payload
    return { completed: true }
  }
}
