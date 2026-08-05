import { describe, expect, it } from "vitest"

import { bytesToBase64Url } from "../multiplayer/crypto"
import {
  MAX_MULTIPLAYER_MESSAGE_BYTES,
  MULTIPLAYER_PROTOCOL_VERSION,
  serializeMultiplayerMessage,
  type MultiplayerMessage,
} from "../multiplayer/protocol"
import { sideForPeer } from "../multiplayer/turn-game"
import {
  applyMove,
  createInitialState,
  evaluateGameResult,
  type XiangqiMove,
  type XiangqiState,
} from "./engine"
import {
  applyChineseChessLanAction,
  CHINESE_CHESS_LAN_MAX_HALF_MOVES,
  chineseChessLanAdapter,
  encodeChineseChessLanAction,
  encodeChineseChessLanSnapshot,
  parseChineseChessLanAction,
  validateAndRebuildChineseChessLanSnapshot,
  type ChineseChessLanMoveAction,
} from "./lan"

function compactSnapshot(moves: XiangqiMove[]) {
  const bytes = new Uint8Array(moves.length * 2)
  moves.forEach((move, index) => {
    const from = move.from.row * 9 + move.from.col
    const to = move.to.row * 9 + move.to.col
    const packed = from * 90 + to
    bytes[index * 2] = packed >>> 8
    bytes[index * 2 + 1] = packed & 0xff
  })
  return { v: 2, moves: bytes.length === 0 ? "" : bytesToBase64Url(bytes) }
}

function action(move: XiangqiMove): ChineseChessLanMoveAction {
  return { type: "move", ...move }
}

function applyOrThrow(
  state: XiangqiState,
  move: XiangqiMove,
): XiangqiState {
  const result = applyMove(state, move)
  if (!result.ok) throw new Error(`Expected legal move, received ${result.error}`)
  return result.state
}

const RED_HORSE_OUT: XiangqiMove = {
  from: { row: 9, col: 1 },
  to: { row: 7, col: 2 },
}

const BLACK_HORSE_OUT: XiangqiMove = {
  from: { row: 0, col: 1 },
  to: { row: 2, col: 2 },
}

describe("Chinese chess LAN adapter", () => {
  it("assigns the dice winner to red, the only first-moving side", () => {
    expect(chineseChessLanAdapter.firstSide).toBe("red")
    expect(chineseChessLanAdapter.secondSide).toBe("black")
    expect(chineseChessLanAdapter.engineVersion).toBe("xiangqi-free-v2")
    expect(chineseChessLanAdapter.createInitialState().currentTurn).toBe("red")

    expect(sideForPeer(
      chineseChessLanAdapter,
      "peer-b",
      "peer-a",
      "peer-b",
      "peer-b",
    )).toBe("red")
    expect(sideForPeer(
      chineseChessLanAdapter,
      "peer-b",
      "peer-a",
      "peer-b",
      "peer-a",
    )).toBe("black")
  })

  it("strictly parses and canonically encodes move actions", () => {
    const input = action(RED_HORSE_OUT)
    expect(parseChineseChessLanAction(input)).toEqual(input)
    expect(encodeChineseChessLanAction(input)).toEqual({
      type: "move",
      from: { row: 9, col: 1 },
      to: { row: 7, col: 2 },
    })

    expect(parseChineseChessLanAction({ ...input, injected: true })).toBeNull()
    expect(parseChineseChessLanAction({
      ...input,
      from: { ...input.from, injected: true },
    })).toBeNull()
    expect(parseChineseChessLanAction({
      ...input,
      from: { row: "9", col: 1 },
    })).toBeNull()
    expect(parseChineseChessLanAction({
      ...input,
      to: { row: 7.5, col: 2 },
    })).toBeNull()
    expect(parseChineseChessLanAction({
      ...input,
      to: { row: 10, col: 2 },
    })).toBeNull()
  })

  it("uses the local engine to reject the wrong author and illegal moves", () => {
    const initial = createInitialState()

    expect(applyChineseChessLanAction(initial, action(RED_HORSE_OUT), "black"))
      .toEqual({ ok: false, code: "WRONG_SIDE" })
    expect(applyChineseChessLanAction(initial, action({
      from: { row: 9, col: 0 },
      to: { row: 8, col: 1 },
    }), "red")).toEqual({ ok: false, code: "ILLEGAL_MOVE" })

    const redMove = applyChineseChessLanAction(initial, action(RED_HORSE_OUT), "red")
    expect(redMove.ok).toBe(true)
    if (!redMove.ok) return

    const blackMove = applyChineseChessLanAction(
      redMove.state,
      action(BLACK_HORSE_OUT),
      "black",
    )
    expect(blackMove.ok).toBe(true)
    if (!blackMove.ok) return
    expect(blackMove.state.currentTurn).toBe("red")
    expect(chineseChessLanAdapter.getRevision(blackMove.state)).toBe(2)
  })
})

describe("Chinese chess LAN snapshots", () => {
  it("encodes only compact coordinates and rebuilds all derived state by replay", () => {
    let state = createInitialState()
    state = applyOrThrow(state, RED_HORSE_OUT)
    state = applyOrThrow(state, BLACK_HORSE_OUT)

    const snapshot = encodeChineseChessLanSnapshot(state)
    expect(snapshot).toEqual(compactSnapshot([RED_HORSE_OUT, BLACK_HORSE_OUT]))
    expect(JSON.stringify(snapshot)).not.toContain("board")
    expect(JSON.stringify(snapshot)).not.toContain("positionHistory")
    expect(validateAndRebuildChineseChessLanSnapshot(snapshot, 2)).toEqual({
      ok: true,
      state,
    })
  })

  it("requires a safe revision equal to the complete move history", () => {
    const snapshot = compactSnapshot([RED_HORSE_OUT])

    expect(validateAndRebuildChineseChessLanSnapshot(snapshot, -1))
      .toEqual({ ok: false, code: "INVALID_REVISION" })
    expect(validateAndRebuildChineseChessLanSnapshot(snapshot, 0))
      .toEqual({ ok: false, code: "REVISION_MISMATCH" })
    expect(validateAndRebuildChineseChessLanSnapshot(snapshot, 1.5))
      .toEqual({ ok: false, code: "INVALID_REVISION" })
    expect(validateAndRebuildChineseChessLanSnapshot(
      compactSnapshot([]),
      CHINESE_CHESS_LAN_MAX_HALF_MOVES + 1,
    )).toEqual({ ok: false, code: "INVALID_REVISION" })
  })

  it("rejects malformed or injected snapshot fields and coordinates", () => {
    expect(validateAndRebuildChineseChessLanSnapshot({
      ...compactSnapshot([]),
      board: [],
    }, 0)).toEqual({ ok: false, code: "INVALID_SNAPSHOT" })
    expect(validateAndRebuildChineseChessLanSnapshot({
      v: 1,
      moves: "",
    }, 0)).toEqual({ ok: false, code: "INVALID_SNAPSHOT" })
    expect(validateAndRebuildChineseChessLanSnapshot({
      v: 2,
      moves: "AA",
    }, 1)).toEqual({ ok: false, code: "INVALID_SNAPSHOT" })
    expect(validateAndRebuildChineseChessLanSnapshot({
      v: 2,
      moves: "not+url-safe",
    }, 1)).toEqual({ ok: false, code: "INVALID_SNAPSHOT" })
    expect(validateAndRebuildChineseChessLanSnapshot({
      v: 2,
      moves: bytesToBase64Url(Uint8Array.from([0x1f, 0xa4])),
    }, 1)).toEqual({ ok: false, code: "INVALID_SNAPSHOT" })
  })

  it("rejects replayed moves from the wrong side or with tampered destinations", () => {
    expect(validateAndRebuildChineseChessLanSnapshot(
      compactSnapshot([BLACK_HORSE_OUT]),
      1,
    )).toEqual({ ok: false, code: "INVALID_MOVE" })
    expect(validateAndRebuildChineseChessLanSnapshot(compactSnapshot([{
      from: { row: 9, col: 0 },
      to: { row: 8, col: 1 },
    }]), 1)).toEqual({ ok: false, code: "INVALID_MOVE" })
  })

  it("rejects actions appended after a terminal repetition draw", () => {
    const cycle: XiangqiMove[] = [
      RED_HORSE_OUT,
      BLACK_HORSE_OUT,
      { from: { row: 7, col: 2 }, to: { row: 9, col: 1 } },
      { from: { row: 2, col: 2 }, to: { row: 0, col: 1 } },
    ]
    let terminal = createInitialState()
    for (const move of [...cycle, ...cycle]) terminal = applyOrThrow(terminal, move)

    expect(chineseChessLanAdapter.getCurrentSide(terminal)).toBeNull()
    const appended = encodeChineseChessLanSnapshot({
      ...terminal,
      moveHistory: [
        ...terminal.moveHistory,
        {
          from: { ...RED_HORSE_OUT.from },
          to: { ...RED_HORSE_OUT.to },
          piece: { type: "horse", color: "red" },
          capturedPiece: null,
          positionKey: terminal.positionHistory.at(-1) ?? "",
        },
      ],
    })

    expect(validateAndRebuildChineseChessLanSnapshot(appended, 9))
      .toEqual({ ok: false, code: "INVALID_MOVE" })
    expect(applyChineseChessLanAction(terminal, action(RED_HORSE_OUT), "red"))
      .toEqual({ ok: false, code: "GAME_OVER" })
  })

  it("keeps the maximum LAN recovery message below 32 KiB", () => {
    const initial = createInitialState()
    const firstMove = applyMove(initial, RED_HORSE_OUT)
    if (!firstMove.ok) throw new Error(firstMove.error)
    const dummyMove = firstMove.state.moveHistory[0]
    const state: XiangqiState = {
      ...initial,
      moveHistory: Array.from(
        { length: CHINESE_CHESS_LAN_MAX_HALF_MOVES },
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
        revision: CHINESE_CHESS_LAN_MAX_HALF_MOVES,
        stateHash: "a".repeat(64),
        state: encodeChineseChessLanSnapshot(state),
      },
    }

    const serialized = serializeMultiplayerMessage(message)
    expect(new TextEncoder().encode(serialized).byteLength)
      .toBeLessThan(MAX_MULTIPLAYER_MESSAGE_BYTES)
    expect(() => encodeChineseChessLanSnapshot({
      ...state,
      moveHistory: [...state.moveHistory, dummyMove],
    })).toThrowError("Chinese chess LAN move limit exceeded")
  })

  it("adjudicates the LAN half-move ceiling as a terminal draw", () => {
    const initial = createInitialState()
    const firstMove = applyMove(initial, RED_HORSE_OUT)
    if (!firstMove.ok) throw new Error(firstMove.error)
    const dummyMove = firstMove.state.moveHistory[0]
    const nearLimit: XiangqiState = {
      ...initial,
      moveHistory: Array.from(
        { length: CHINESE_CHESS_LAN_MAX_HALF_MOVES - 1 },
        () => dummyMove,
      ),
    }
    const result = applyChineseChessLanAction(
      nearLimit,
      action(RED_HORSE_OUT),
      "red",
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(evaluateGameResult(result.state)).toEqual({
      over: true,
      winner: null,
      reason: "move-limit",
      inCheck: false,
    })
    expect(chineseChessLanAdapter.getCurrentSide(result.state)).toBeNull()
    expect(applyChineseChessLanAction(
      result.state,
      action(BLACK_HORSE_OUT),
      "black",
    )).toEqual({ ok: false, code: "GAME_OVER" })
  })
})
