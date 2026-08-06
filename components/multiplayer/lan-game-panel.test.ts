import { describe, expect, it } from "vitest"

import {
  findLanGameSide,
  formatLanGameCopy,
  getLanGameConnectionText,
  getLanGameStatusText,
  type LanGamePanelCopy,
} from "./lan-game-panel-model"

const connectionCopy: Pick<
  LanGamePanelCopy,
  "reconnecting" | "syncing" | "connected" | "connecting" | "waiting"
> = {
  reconnecting: "restoring",
  syncing: "checking",
  connected: "online",
  connecting: "dialing",
  waiting: "waiting",
}

describe("LAN game panel helpers", () => {
  it("formats game-specific side and dice copy", () => {
    expect(formatLanGameCopy("You are {side}", { side: "red" }))
      .toBe("You are red")
    expect(formatLanGameCopy("Round {round}: {missing}", { round: 2 }))
      .toBe("Round 2: ")
  })

  it("prioritizes reconnecting and syncing states over a stale connected flag", () => {
    expect(getLanGameConnectionText("reconnecting", true, connectionCopy))
      .toBe("restoring")
    expect(getLanGameConnectionText("syncing", true, connectionCopy))
      .toBe("checking")
    expect(getLanGameConnectionText("playing", true, connectionCopy))
      .toBe("online")
    expect(getLanGameConnectionText("connecting", false, connectionCopy))
      .toBe("dialing")
    expect(getLanGameConnectionText("waiting", false, connectionCopy))
      .toBe("waiting")
  })

  it("resolves each game's side label and color without assuming black and white", () => {
    const sides = [
      { value: "red", label: "红方", color: "#dc2626" },
      { value: "black", label: "黑方", color: "#111827" },
    ] as const

    expect(findLanGameSide(sides, "red")).toEqual(sides[0])
    expect(findLanGameSide(sides, "black")).toEqual(sides[1])
    expect(findLanGameSide(sides, null)).toBeNull()
  })

  it("shows the terminal result instead of a stale turn label", () => {
    const copy = {
      yourTurn: "your turn",
      opponentTurn: "opponent turn",
      youWon: "you won",
      opponentWon: "opponent won",
      drawGame: "draw",
    }
    const baseSeries = {
      gameNumber: 1,
      localWins: 1,
      remoteWins: 0,
      draws: 0,
      localRematchReady: false,
      remoteRematchReady: false,
      canRequestRematch: true,
    }

    expect(getLanGameStatusText(
      { ...baseSeries, outcome: "local-win" },
      false,
      copy,
    )).toBe("you won")
    expect(getLanGameStatusText(
      { ...baseSeries, outcome: "draw" },
      true,
      copy,
    )).toBe("draw")
    expect(getLanGameStatusText(
      { ...baseSeries, outcome: "playing" },
      true,
      copy,
    )).toBe("your turn")
  })
})
