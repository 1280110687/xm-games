import { describe, expect, it } from "vitest"
import {
  createMultiplayerRoomState,
  reduceMultiplayerRoom,
  type MultiplayerRoomEvent,
  type MultiplayerRoomState,
} from "./room-reducer"

function createRoom(): MultiplayerRoomState {
  return createMultiplayerRoomState({
    roomId: "ROOM01",
    matchId: "match-1",
    gameId: "gomoku",
    engineVersion: "gomoku-v1",
    coordinatorId: "peer-a",
    players: [
      { id: "peer-a", role: "host", ready: false, connected: true },
      { id: "peer-b", role: "guest", ready: false, connected: true },
    ],
  })
}

function apply(state: MultiplayerRoomState, event: MultiplayerRoomEvent): MultiplayerRoomState {
  const result = reduceMultiplayerRoom(state, event)
  expect(result.accepted, result.error).toBe(true)
  return result.state
}

describe("multiplayer room reducer", () => {
  it("moves both ready players through commit and reveal", () => {
    let state = createRoom()
    state = apply(state, {
      type: "PLAYER_READY_CHANGED",
      messageId: "ready-a",
      playerId: "peer-a",
      ready: true,
    })
    state = apply(state, {
      type: "PLAYER_READY_CHANGED",
      messageId: "ready-b",
      playerId: "peer-b",
      ready: true,
    })
    expect(state.phase).toBe("dice-commit")

    for (const playerId of ["peer-a", "peer-b"]) {
      state = apply(state, {
        type: "DICE_COMMITTED",
        messageId: `commit-${playerId}`,
        playerId,
        round: 1,
        commitment: playerId.repeat(32).slice(0, 64),
      })
    }
    expect(state.phase).toBe("dice-reveal")
  })

  it("starts a clean new dice round after a tie", () => {
    let state: MultiplayerRoomState = { ...createRoom(), phase: "dice-reveal" }
    state = {
      ...state,
      dice: {
        ...state.dice,
        commitments: { "peer-a": "a", "peer-b": "b" },
        reveals: { "peer-a": "nonce-a", "peer-b": "nonce-b" },
      },
    }

    state = apply(state, {
      type: "DICE_RESOLVED",
      messageId: "dice-result",
      result: {
        round: 1,
        rolls: { "peer-a": 4, "peer-b": 4 },
        firstPlayerId: null,
        tied: true,
        proof: "proof",
      },
    })

    expect(state.phase).toBe("dice-commit")
    expect(state.dice.round).toBe(2)
    expect(state.dice.commitments).toEqual({})
    expect(state.dice.reveals).toEqual({})
  })

  it("does not allow a player to replace a commitment", () => {
    const state: MultiplayerRoomState = {
      ...createRoom(),
      phase: "dice-commit",
      dice: {
        ...createRoom().dice,
        commitments: { "peer-a": "a".repeat(64) },
      },
    }

    const result = reduceMultiplayerRoom(state, {
      type: "DICE_COMMITTED",
      messageId: "changed-commit",
      playerId: "peer-a",
      round: 1,
      commitment: "b".repeat(64),
    })
    expect(result.accepted).toBe(false)
    expect(result.error).toBe("DICE_VALUE_CONFLICT")
    expect(result.state.dice.commitments["peer-a"]).toBe("a".repeat(64))
  })

  it("pauses on disconnect, resumes explicitly, and rejects duplicate events", () => {
    let state: MultiplayerRoomState = { ...createRoom(), phase: "playing" }
    const disconnected: MultiplayerRoomEvent = {
      type: "PLAYER_CONNECTION_CHANGED",
      messageId: "disconnect-a",
      playerId: "peer-a",
      connected: false,
    }
    state = apply(state, disconnected)
    expect(state.phase).toBe("paused")
    expect(state.resumePhase).toBe("playing")

    const duplicate = reduceMultiplayerRoom(state, disconnected)
    expect(duplicate.accepted).toBe(false)
    expect(duplicate.error).toBe("DUPLICATE_MESSAGE")

    state = apply(state, {
      type: "PLAYER_CONNECTION_CHANGED",
      messageId: "connect-a",
      playerId: "peer-a",
      connected: true,
    })
    state = apply(state, { type: "ROOM_RESUMED", messageId: "resume" })
    expect(state.phase).toBe("playing")
  })

  it("commits only the next exact revision", () => {
    const state = { ...createRoom(), phase: "playing" as const }
    const rejected = reduceMultiplayerRoom(state, {
      type: "ACTION_COMMITTED",
      messageId: "action-2",
      baseRevision: 4,
      nextRevision: 5,
      nextStateHash: "hash-5",
    })
    expect(rejected.error).toBe("REVISION_MISMATCH")

    const accepted = reduceMultiplayerRoom(state, {
      type: "ACTION_COMMITTED",
      messageId: "action-1",
      baseRevision: 0,
      nextRevision: 1,
      nextStateHash: "hash-1",
    })
    expect(accepted.state.revision).toBe(1)
  })
})
