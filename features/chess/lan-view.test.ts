import { describe, expect, it } from "vitest"

import type { LanTurnGameErrorCode } from "../multiplayer/use-lan-turn-game"
import { getChessLanError } from "./lan-view"

const genericErrors = Object.fromEntries([
  "UNSUPPORTED_BROWSER",
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "ROOM_EXPIRED",
  "NETWORK_ERROR",
  "CONNECTION_FAILED",
  "ENGINE_MISMATCH",
  "INVALID_DICE",
  "DESYNC",
  "UNKNOWN",
].map((code) => [code, `generic:${code}`])) as Record<
  Exclude<LanTurnGameErrorCode, "GAME_MISMATCH">,
  string
>

describe("Chess LAN page copy", () => {
  it("explains a cross-game room mismatch in every supported locale", () => {
    expect(getChessLanError("zh", "GAME_MISMATCH", genericErrors)).toContain("其他游戏")
    expect(getChessLanError("en", "GAME_MISMATCH", genericErrors)).toContain("another game")
    expect(getChessLanError("th", "GAME_MISMATCH", genericErrors)).toContain("เกมอื่น")
  })

  it("keeps generic connection errors and the empty state", () => {
    expect(getChessLanError("zh", "NETWORK_ERROR", genericErrors)).toBe("generic:NETWORK_ERROR")
    expect(getChessLanError("en", null, genericErrors)).toBe("")
  })
})
