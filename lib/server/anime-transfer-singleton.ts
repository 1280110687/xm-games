import { Redis } from "@upstash/redis"
import { TransferError } from "../../features/anime-tracker/transfer/model"
import {
  MemoryAnimeTransferStore,
  RedisAnimeTransferStore,
  type AnimeTransferStore,
} from "./anime-transfer-store"

export function createAnimeTransferStore(
  environment: Record<string, string | undefined> = process.env,
): AnimeTransferStore {
  const hasUpstash = Boolean(
    environment.UPSTASH_REDIS_REST_URL || environment.UPSTASH_REDIS_REST_TOKEN,
  )
  const url = (
    hasUpstash
      ? environment.UPSTASH_REDIS_REST_URL
      : environment.KV_REST_API_URL
  )?.trim()
  const token = (
    hasUpstash
      ? environment.UPSTASH_REDIS_REST_TOKEN
      : environment.KV_REST_API_TOKEN
  )?.trim()
  if (url && token) {
    return new RedisAnimeTransferStore(
      new Redis({
        url,
        token,
        automaticDeserialization: false,
        responseEncoding: false,
        readYourWrites: true,
      }),
    )
  }
  if (
    !url &&
    !token &&
    !hasUpstash &&
    !environment.VERCEL &&
    !environment.VERCEL_ENV &&
    environment.XM_SHARED_SIGNAL_STORE_REQUIRED !== "1" &&
    environment.NODE_ENV === "development"
  ) {
    return new MemoryAnimeTransferStore()
  }
  return {
    async execute() {
      throw new TransferError("UNAVAILABLE")
    },
  }
}

const globalStore = globalThis as typeof globalThis & {
  __xmAnimeTransfer?: AnimeTransferStore
}
export function getAnimeTransferStore(): AnimeTransferStore {
  return (globalStore.__xmAnimeTransfer ??= createAnimeTransferStore())
}
