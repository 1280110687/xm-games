import {
  InMemoryLanSignalStore,
} from "./lan-signaling-store"
import type { LanSignalStore } from "./lan-signaling-types"

export const LAN_IN_MEMORY_STORE_LIMITATION =
  "The default LAN signal store is process-local and supports one Next.js instance only. Configure a shared LanSignalStore before horizontal or serverless deployment."

const globalStore = globalThis as typeof globalThis & {
  __xmGamesLanSignalStore?: LanSignalStore
}

export function getLanSignalStore(): LanSignalStore {
  globalStore.__xmGamesLanSignalStore ??= new InMemoryLanSignalStore()
  return globalStore.__xmGamesLanSignalStore
}
