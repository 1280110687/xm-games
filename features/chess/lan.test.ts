import { describe, expect, it } from "vitest"

import { bytesToBase64Url } from "../multiplayer/crypto"
import {
  MAX_MULTIPLAYER_MESSAGE_BYTES,
  MULTIPLAYER_PROTOCOL_VERSION,
  serializeMultiplayerMessage,
  type MultiplayerMessage,
} from "../multiplayer/protocol"
import {
  applyLanChessAction,
  CHESS_LAN_MAX_HALF_MOVES,
  chessLanAdapter,
  createLanChessState,
  encodeLanChessSnapshot,
  parseLanChessAction,
  validateAndRebuildLanChessSnapshot,
  type LanChessAction,
  type LanChessState,
} from "./lan"

function compactSnapshot(
  moves: Array<{ from: [number, number]; to: [number, number] }>,
) {
  const bytes = new Uint8Array(moves.length * 2)
  moves.forEach((item, index) => {
    const from = item.from[0] * 8 + item.from[1]
    const to = item.to[0] * 8 + item.to[1]
    const packed = (from << 6) | to
    bytes[index * 2] = packed >>> 8
    bytes[index * 2 + 1] = packed & 0xff
  })
  return { v: 2, moves: bytes.length === 0 ? "" : bytesToBase64Url(bytes) }
}

function move(
  state: LanChessState,
  from: [number, number],
  to: [number, number],
): LanChessState {
  const action: LanChessAction = {
    type: "move",
    from: { row: from[0], col: from[1] },
    to: { row: to[0], col: to[1] },
  }
  const result = applyLanChessAction(state, action, state.currentTurn)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.code)
  return result.state
}

function foolsMate(): LanChessState {
  let state = createLanChessState()
  state = move(state, [6, 5], [5, 5])
  state = move(state, [1, 4], [3, 4])
  state = move(state, [6, 6], [4, 6])
  return move(state, [0, 3], [4, 7])
}

describe("LAN chess adapter", () => {
  it("assigns the dice winner to white and creates the standard initial state", () => {
    expect(chessLanAdapter.firstSide).toBe("white")
    expect(chessLanAdapter.secondSide).toBe("black")
    expect(chessLanAdapter.engineVersion).toBe("chess-free-v3")

    const state = chessLanAdapter.createInitialState()
    expect(state.currentTurn).toBe("white")
    expect(state.status).toBe("playing")
    expect(state.board[7][4]).toEqual({ type: "king", color: "white" })
    expect(chessLanAdapter.getRevision(state)).toBe(0)
    expect(chessLanAdapter.getCurrentSide(state)).toBe("white")
  })

  it("parses only exact, in-bounds move actions", () => {
    expect(parseLanChessAction({
      type: "move",
      from: { row: 6, col: 4 },
      to: { row: 4, col: 4 },
    })).toEqual({
      type: "move",
      from: { row: 6, col: 4 },
      to: { row: 4, col: 4 },
    })
    expect(parseLanChessAction({
      type: "move",
      from: { row: 6, col: 4 },
      to: { row: 8, col: 4 },
    })).toBeNull()
    expect(parseLanChessAction({
      type: "move",
      from: { row: 6, col: 4 },
      to: { row: 4, col: 4 },
      injected: true,
    })).toBeNull()
  })

  it("rejects the wrong side and illegal moves without mutating state", () => {
    const initial = createLanChessState()
    expect(applyLanChessAction(initial, {
      type: "move",
      from: { row: 1, col: 4 },
      to: { row: 3, col: 4 },
    }, "black")).toEqual({ ok: false, code: "WRONG_PLAYER" })
    expect(applyLanChessAction(initial, {
      type: "move",
      from: { row: 6, col: 4 },
      to: { row: 3, col: 4 },
    }, "white")).toEqual({ ok: false, code: "ILLEGAL_MOVE" })
    expect(initial).toEqual(createLanChessState())
  })

  it("derives en passant state and alternating turns from legal actions", () => {
    const initial = createLanChessState()
    const afterWhite = move(initial, [6, 4], [4, 4])

    expect(afterWhite.currentTurn).toBe("black")
    expect(afterWhite.enPassantTarget).toEqual({ row: 5, col: 4 })
    expect(afterWhite.moveHistory).toEqual([{
      from: { row: 6, col: 4 },
      to: { row: 4, col: 4 },
      side: "white",
    }])
    expect(initial.board[6][4]).toEqual({ type: "pawn", color: "white" })

    const afterBlack = move(afterWhite, [1, 0], [2, 0])
    expect(afterBlack.currentTurn).toBe("white")
    expect(afterBlack.enPassantTarget).toBeNull()
  })

  it("detects checkmate, hides the current side, and rejects later moves", () => {
    const state = foolsMate()

    expect(state.status).toBe("checkmate")
    expect(state.winner).toBe("black")
    expect(state.currentTurn).toBe("white")
    expect(chessLanAdapter.getCurrentSide(state)).toBeNull()
    expect(chessLanAdapter.getOutcome(state)).toEqual({ status: "won", winner: "black" })
    expect(applyLanChessAction(state, {
      type: "move",
      from: { row: 6, col: 0 },
      to: { row: 5, col: 0 },
    }, "white")).toEqual({ ok: false, code: "GAME_FINISHED" })
  })
})

describe("LAN chess compact snapshots", () => {
  it("rebuilds the complete board and special-move state from compact history", () => {
    let state = createLanChessState()
    state = move(state, [6, 4], [4, 4])
    state = move(state, [1, 0], [2, 0])
    state = move(state, [7, 6], [5, 5])
    state = move(state, [2, 0], [3, 0])
    state = move(state, [7, 5], [6, 4])
    state = move(state, [3, 0], [4, 0])
    state = move(state, [7, 4], [7, 6])

    const encoded = encodeLanChessSnapshot(state)
    expect(encoded).toEqual(compactSnapshot([
      { from: [6, 4], to: [4, 4] },
      { from: [1, 0], to: [2, 0] },
      { from: [7, 6], to: [5, 5] },
      { from: [2, 0], to: [3, 0] },
      { from: [7, 5], to: [6, 4] },
      { from: [3, 0], to: [4, 0] },
      { from: [7, 4], to: [7, 6] },
    ]))
    expect(validateAndRebuildLanChessSnapshot(encoded, 7)).toEqual({ ok: true, state })
    expect(state.board[7][6]).toEqual({ type: "king", color: "white" })
    expect(state.board[7][5]).toEqual({ type: "rook", color: "white" })
    expect(state.castlingRights.whiteKing).toBe(false)
  })

  it("rejects invalid and mismatched revisions", () => {
    expect(validateAndRebuildLanChessSnapshot(compactSnapshot([]), -1)).toEqual({
      ok: false,
      code: "INVALID_REVISION",
    })
    expect(validateAndRebuildLanChessSnapshot(compactSnapshot([]), 1)).toEqual({
      ok: false,
      code: "REVISION_MISMATCH",
    })
    expect(validateAndRebuildLanChessSnapshot(
      compactSnapshot([]),
      CHESS_LAN_MAX_HALF_MOVES + 1,
    )).toEqual({ ok: false, code: "INVALID_REVISION" })
  })

  it("rejects malformed, non-canonical and illegal packed histories", () => {
    expect(validateAndRebuildLanChessSnapshot({ ...compactSnapshot([]), injected: true }, 0)).toEqual({
      ok: false,
      code: "INVALID_STATE_SHAPE",
    })
    expect(validateAndRebuildLanChessSnapshot({ v: 2, moves: "AA" }, 1)).toEqual({
      ok: false,
      code: "INVALID_STATE_SHAPE",
    })
    expect(validateAndRebuildLanChessSnapshot({ v: 2, moves: "not+url-safe" }, 1)).toEqual({
      ok: false,
      code: "INVALID_STATE_SHAPE",
    })
    expect(validateAndRebuildLanChessSnapshot(compactSnapshot([
      { from: [1, 4], to: [3, 4] },
    ]), 1)).toEqual({
      ok: false,
      code: "INVALID_MOVE",
      moveIndex: 0,
      moveError: "ILLEGAL_MOVE",
    })
    expect(validateAndRebuildLanChessSnapshot(compactSnapshot([
      { from: [6, 4], to: [3, 4] },
    ]), 1)).toEqual({
      ok: false,
      code: "INVALID_MOVE",
      moveIndex: 0,
      moveError: "ILLEGAL_MOVE",
    })
  })

  it("rejects history appended after a terminal position", () => {
    const terminal = foolsMate()
    const impossible = encodeLanChessSnapshot({
      ...terminal,
      moveHistory: [
        ...terminal.moveHistory,
        {
          from: { row: 6, col: 0 },
          to: { row: 5, col: 0 },
          side: "white",
        },
      ],
    })

    expect(validateAndRebuildLanChessSnapshot(impossible, 5)).toEqual({
      ok: false,
      code: "INVALID_MOVE",
      moveIndex: 4,
      moveError: "GAME_FINISHED",
    })
  })

  it("keeps the maximum LAN recovery message below 32 KiB", () => {
    const initial = createLanChessState()
    const dummyMove = {
      from: { row: 6, col: 0 },
      to: { row: 5, col: 0 },
      side: "white" as const,
    }
    const state: LanChessState = {
      ...initial,
      moveHistory: Array.from(
        { length: CHESS_LAN_MAX_HALF_MOVES },
        () => dummyMove,
      ),
    }
    const message: MultiplayerMessage<"sync.snapshot"> = {
      v: MULTIPLAYER_PROTOCOL_VERSION,
      type: "sync.snapshot",
      messageId: "message-id",
      roomId: "123456",
      matchId: "match-id",
      senderId: "sender-id",
      sentAt: 1,
      payload: {
        gameNumber: 1,
        revision: CHESS_LAN_MAX_HALF_MOVES,
        stateHash: "a".repeat(64),
        state: encodeLanChessSnapshot(state),
      },
    }

    const serialized = serializeMultiplayerMessage(message)
    expect(new TextEncoder().encode(serialized).byteLength)
      .toBeLessThan(MAX_MULTIPLAYER_MESSAGE_BYTES)
    expect(() => encodeLanChessSnapshot({
      ...state,
      moveHistory: [...state.moveHistory, dummyMove],
    })).toThrowError("LAN chess move limit exceeded")
  })

  it("adjudicates the LAN half-move ceiling as a terminal draw", () => {
    const initial = createLanChessState()
    const dummyMove = {
      from: { row: 6, col: 0 },
      to: { row: 5, col: 0 },
      side: "white" as const,
    }
    const nearLimit: LanChessState = {
      ...initial,
      moveHistory: Array.from(
        { length: CHESS_LAN_MAX_HALF_MOVES - 1 },
        () => dummyMove,
      ),
    }
    const result = applyLanChessAction(nearLimit, {
      type: "move",
      from: { row: 6, col: 4 },
      to: { row: 4, col: 4 },
    }, "white")

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.status).toBe("stalemate")
    expect(result.state.winner).toBeNull()
    expect(chessLanAdapter.getCurrentSide(result.state)).toBeNull()
    expect(chessLanAdapter.getOutcome(result.state)).toEqual({ status: "draw" })
    expect(applyLanChessAction(result.state, {
      type: "move",
      from: { row: 1, col: 4 },
      to: { row: 3, col: 4 },
    }, "black")).toEqual({ ok: false, code: "GAME_FINISHED" })
  })

  it("preserves a natural checkmate reached on the final allowed half-move", () => {
    let beforeMate = createLanChessState()
    beforeMate = move(beforeMate, [6, 5], [5, 5])
    beforeMate = move(beforeMate, [1, 4], [3, 4])
    beforeMate = move(beforeMate, [6, 6], [4, 6])
    const filler = beforeMate.moveHistory[0]
    beforeMate = {
      ...beforeMate,
      moveHistory: [
        ...Array.from(
          { length: CHESS_LAN_MAX_HALF_MOVES - 1 - beforeMate.moveHistory.length },
          () => filler,
        ),
        ...beforeMate.moveHistory,
      ],
    }

    const result = applyLanChessAction(beforeMate, {
      type: "move",
      from: { row: 0, col: 3 },
      to: { row: 4, col: 7 },
    }, "black")

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.status).toBe("checkmate")
    expect(result.state.winner).toBe("black")
  })
})
