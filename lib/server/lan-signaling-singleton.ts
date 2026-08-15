import { Redis } from "@upstash/redis"

import {
  InMemoryLanSignalStore,
} from "./lan-signaling-store"
import {
  RedisLanSignalStore,
  type RedisLanSignalClient,
} from "./lan-signaling-redis-store"
import {
  LanSignalError,
  type LanHeartbeatResult,
  type LanIdempotentResult,
  type LanLeaveRoomResult,
  type LanPeerSession,
  type LanPollSignalsResult,
  type LanSignalMessage,
  type LanSignalStore,
} from "./lan-signaling-types"

export const LAN_IN_MEMORY_STORE_LIMITATION =
  "The default LAN signal store is process-local and supports one Next.js instance only. Configure a shared LanSignalStore before horizontal or serverless deployment."

export const LAN_REDIS_CONFIGURATION_ERROR =
  "LAN multiplayer is unavailable in this serverless deployment until an Upstash Redis integration provides UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."

interface SignalingEnvironment {
  [key: string]: string | undefined
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string
  KV_REST_API_URL?: string
  KV_REST_API_TOKEN?: string
  VERCEL?: string
  VERCEL_ENV?: string
  XM_SHARED_SIGNAL_STORE_REQUIRED?: string
}

class UnavailableLanSignalStore implements LanSignalStore {
  constructor(private readonly message: string) {}

  private reject<T>(): Promise<T> {
    return Promise.reject(new LanSignalError(
      "SERVICE_UNAVAILABLE",
      503,
      this.message,
    ))
  }

  createRoom(): Promise<LanIdempotentResult<LanPeerSession>> {
    return this.reject()
  }

  joinRoom(): Promise<LanIdempotentResult<LanPeerSession>> {
    return this.reject()
  }

  publishSignal(): Promise<LanIdempotentResult<LanSignalMessage>> {
    return this.reject()
  }

  pollSignals(): Promise<LanPollSignalsResult> {
    return this.reject()
  }

  heartbeat(): Promise<LanHeartbeatResult> {
    return this.reject()
  }

  leaveRoom(): Promise<LanLeaveRoomResult> {
    return this.reject()
  }

  cleanupExpired(): number {
    return 0
  }
}

const globalStore = globalThis as typeof globalThis & {
  __xmGamesLanSignalStore?: LanSignalStore
}

function configuredRedisCredentials(environment: SignalingEnvironment):
  { url: string; token: string } | null {
  const upstashUrl = environment.UPSTASH_REDIS_REST_URL?.trim()
  const upstashToken = environment.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (upstashUrl || upstashToken) {
    if (!upstashUrl || !upstashToken) return null
    return { url: upstashUrl, token: upstashToken }
  }

  const kvUrl = environment.KV_REST_API_URL?.trim()
  const kvToken = environment.KV_REST_API_TOKEN?.trim()
  if (kvUrl || kvToken) {
    if (!kvUrl || !kvToken) return null
    return { url: kvUrl, token: kvToken }
  }

  return null
}

export function createLanSignalStoreForEnvironment(
  environment: SignalingEnvironment = process.env,
): LanSignalStore {
  const credentials = configuredRedisCredentials(environment)
  if (credentials) {
    const client = new Redis({
      ...credentials,
      automaticDeserialization: false,
      // Lua EVAL replies are arrays of UTF-8 strings. The SDK's default
      // base64 decoder treats nested array elements differently from scalar
      // replies, which can turn a raw "OK" tuple status into another value.
      // Requesting plain JSON keeps the atomic script tuple intact.
      responseEncoding: false,
      readYourWrites: true,
    })
    return new RedisLanSignalStore({
      client: client as RedisLanSignalClient,
    })
  }

  const hasPartialCredentials = Boolean(
    environment.UPSTASH_REDIS_REST_URL
    || environment.UPSTASH_REDIS_REST_TOKEN
    || environment.KV_REST_API_URL
    || environment.KV_REST_API_TOKEN,
  )
  const isVercel = environment.VERCEL === "1" || Boolean(environment.VERCEL_ENV)
  const requiresSharedStore = isVercel
    || environment.XM_SHARED_SIGNAL_STORE_REQUIRED === "1"
  if (hasPartialCredentials || requiresSharedStore) {
    return new UnavailableLanSignalStore(LAN_REDIS_CONFIGURATION_ERROR)
  }

  return new InMemoryLanSignalStore()
}

export function getLanSignalStore(): LanSignalStore {
  globalStore.__xmGamesLanSignalStore ??= createLanSignalStoreForEnvironment()
  return globalStore.__xmGamesLanSignalStore
}
