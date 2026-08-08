import { describe, expect, it } from "vitest"

import { createBingoLanHostState, toBingoLanPublicState } from "./lan-game"
import {
  BINGO_LAN_MAX_MESSAGE_BYTES,
  BingoLanProtocolError,
  createBingoLanMessage,
  parseBingoLanMessage,
  serializeBingoLanMessage,
} from "./lan-protocol"

describe("Bingo LAN protocol", () => {
  it("round-trips a public room snapshot", () => {
    const message = createBingoLanMessage("host.state", "host-1", {
      state: toBingoLanPublicState(createBingoLanHostState("123456", "round-1")),
    })

    expect(parseBingoLanMessage(serializeBingoLanMessage(message))).toEqual(message)
  })

  it("rejects cards with an invalid column", () => {
    const message = createBingoLanMessage("guest.lobby", "player-1", {
      ready: true,
      cards: [{
        id: "invalid-card",
        name: "Card 1",
        numbers: [
          [75, 16, 31, 46, 61],
          [2, 17, 32, 47, 62],
          [3, 18, null, 48, 63],
          [4, 19, 34, 49, 64],
          [5, 20, 35, 50, 65],
        ],
      }],
    })

    expect(() => parseBingoLanMessage(JSON.stringify(message))).toThrowError(
      expect.objectContaining({ code: "INVALID_MESSAGE" }),
    )
  })

  it("enforces the message size limit", () => {
    const oversized = JSON.stringify({ value: "x".repeat(BINGO_LAN_MAX_MESSAGE_BYTES) })

    expect(() => parseBingoLanMessage(oversized)).toThrowError(BingoLanProtocolError)
  })
})
