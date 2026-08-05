import { describe, expect, it } from "vitest"

import type { LanTurnGameErrorCode } from "../multiplayer/use-lan-turn-game"
import {
  canPlaceLanReversiStone,
  getReversiLanError,
  shouldShowReversiBoard,
} from "./lan-view"

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

describe("Reversi LAN page model", () => {
  it("keeps the local board visible and only reveals a LAN board after synchronization", () => {
    expect(shouldShowReversiBoard("local", "idle")).toBe(true)
    expect(shouldShowReversiBoard("lan", "syncing")).toBe(false)
    expect(shouldShowReversiBoard("lan", "playing")).toBe(true)
    expect(shouldShowReversiBoard("lan", "reconnecting")).toBe(false)
  })

  it("only enables a LAN move for the connected player whose turn it is", () => {
    expect(canPlaceLanReversiStone({
      connected: true,
      localSide: "black",
      currentPlayer: "black",
      gameOver: false,
    })).toBe(true)
    expect(canPlaceLanReversiStone({
      connected: true,
      localSide: "white",
      currentPlayer: "black",
      gameOver: false,
    })).toBe(false)
    expect(canPlaceLanReversiStone({
      connected: false,
      localSide: "black",
      currentPlayer: "black",
      gameOver: false,
    })).toBe(false)
    expect(canPlaceLanReversiStone({
      connected: true,
      localSide: "black",
      currentPlayer: "black",
      gameOver: true,
    })).toBe(false)
  })

  it("uses a game-specific mismatch message without replacing generic errors", () => {
    expect(getReversiLanError("zh", "GAME_MISMATCH", genericErrors)).toContain("其他棋类")
    expect(getReversiLanError("en", "GAME_MISMATCH", genericErrors)).toContain("another board game")
    expect(getReversiLanError("th", "GAME_MISMATCH", genericErrors)).toContain("เกมกระดานชนิดอื่น")
    expect(getReversiLanError("zh", "NETWORK_ERROR", genericErrors)).toBe("generic:NETWORK_ERROR")
    expect(getReversiLanError("zh", null, genericErrors)).toBe("")
  })
})
