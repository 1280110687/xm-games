import { describe, expect, it } from "vitest"
import {
  MAX_MULTIPLAYER_MESSAGE_BYTES,
  MULTIPLAYER_PROTOCOL_VERSION,
  ProtocolParseError,
  parseMultiplayerMessage,
  serializeMultiplayerMessage,
  type MultiplayerMessage,
} from "./protocol"

const heartbeat: MultiplayerMessage<"peer.heartbeat"> = {
  v: MULTIPLAYER_PROTOCOL_VERSION,
  type: "peer.heartbeat",
  messageId: "message-1",
  roomId: "ROOM01",
  matchId: "match-1",
  senderId: "peer-a",
  sentAt: 123,
  payload: { nonce: "heartbeat-1" },
}

describe("multiplayer protocol", () => {
  it("round-trips a validated protocol message", () => {
    const serialized = serializeMultiplayerMessage(heartbeat)
    expect(parseMultiplayerMessage(serialized)).toEqual(heartbeat)
    expect(parseMultiplayerMessage(new TextEncoder().encode(serialized))).toEqual(heartbeat)
  })

  it("rejects unsupported versions and invalid typed payloads", () => {
    expect(() => parseMultiplayerMessage(JSON.stringify({ ...heartbeat, v: 2 })))
      .toThrowError(expect.objectContaining({ code: "UNSUPPORTED_VERSION" }))

    const invalidAck = {
      ...heartbeat,
      type: "action.ack",
      payload: {
        actionId: "action-1",
        baseRevision: 3,
        nextRevision: 9,
        nextStateHash: "a".repeat(64),
      },
    }
    expect(() => parseMultiplayerMessage(JSON.stringify(invalidAck)))
      .toThrowError(expect.objectContaining({ code: "INVALID_PAYLOAD" }))
  })

  it("enforces the byte limit before parsing JSON", () => {
    const oversized = "x".repeat(MAX_MULTIPLAYER_MESSAGE_BYTES + 1)
    expect(() => parseMultiplayerMessage(oversized)).toThrowError(
      expect.objectContaining<Partial<ProtocolParseError>>({ code: "MESSAGE_TOO_LARGE" }),
    )
  })

  it("validates the jointly-derived dice result", () => {
    const result: MultiplayerMessage<"dice.result"> = {
      ...heartbeat,
      type: "dice.result",
      payload: {
        round: 1,
        rolls: { "peer-a": 6, "peer-b": 2 },
        firstPlayerId: "peer-a",
        tied: false,
        proof: "a".repeat(64),
      },
    }

    expect(parseMultiplayerMessage(serializeMultiplayerMessage(result))).toEqual(result)
    expect(() => parseMultiplayerMessage(JSON.stringify({
      ...result,
      payload: { ...result.payload, firstPlayerId: "peer-b" },
    }))).toThrowError(expect.objectContaining({ code: "INVALID_PAYLOAD" }))
  })

  it("validates dice result acknowledgements", () => {
    const acknowledgement: MultiplayerMessage<"dice.result-ack"> = {
      ...heartbeat,
      type: "dice.result-ack",
      payload: { round: 2, proof: "b".repeat(64) },
    }

    expect(parseMultiplayerMessage(serializeMultiplayerMessage(acknowledgement)))
      .toEqual(acknowledgement)
    expect(() => parseMultiplayerMessage(JSON.stringify({
      ...acknowledgement,
      payload: { round: 0, proof: "not-a-proof" },
    }))).toThrowError(expect.objectContaining({ code: "INVALID_PAYLOAD" }))
  })
})
