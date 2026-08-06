import { describe, expect, it } from "vitest"

import {
  REVERSI_BOARD_SIZE,
  createReversiState,
  getReversiValidMoves,
  type ReversiBoard,
  type ReversiState,
} from "./engine"
import {
  applyLanReversiAction,
  encodeLanReversiSnapshot,
  parseLanReversiAction,
  reversiLanAdapter,
  validateAndRebuildLanReversiSnapshot,
} from "./lan"

function placeFirstValid(state: ReversiState): ReversiState {
  const next = getReversiValidMoves(state.board, state.currentPlayer)[0]
  if (!next) throw new Error("Expected a legal move")
  const result = applyLanReversiAction(state, {
    type: "place",
    row: next.row,
    col: next.col,
  }, state.currentPlayer)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.code)
  return result.state
}

function playDeterministicGame(): ReversiState {
  let state = createReversiState()
  while (!state.gameOver) state = placeFirstValid(state)
  return state
}

function playUntilForcedPass(): ReversiState | null {
  let state = createReversiState()
  while (!state.gameOver) {
    state = placeFirstValid(state)
    if (state.lastPassedPlayer) return state
  }
  return null
}

function emptyBoard(): ReversiBoard {
  return Array.from({ length: REVERSI_BOARD_SIZE }, () =>
    Array(REVERSI_BOARD_SIZE).fill(null),
  )
}

describe("LAN reversi adapter", () => {
  it("assigns the dice winner to black and creates a black-first game", () => {
    expect(reversiLanAdapter.firstSide).toBe("black")
    expect(reversiLanAdapter.secondSide).toBe("white")
    expect(reversiLanAdapter.engineVersion).toBe("reversi-free-v2")

    const state = reversiLanAdapter.createInitialState()
    expect(state.currentPlayer).toBe("black")
    expect(reversiLanAdapter.getRevision(state)).toBe(0)
    expect(reversiLanAdapter.getCurrentSide(state)).toBe("black")
  })

  it("parses only exact, in-bounds placement actions", () => {
    expect(parseLanReversiAction({ type: "place", row: 2, col: 3 })).toEqual({
      type: "place",
      row: 2,
      col: 3,
    })
    expect(parseLanReversiAction({ type: "place", row: 8, col: 0 })).toBeNull()
    expect(parseLanReversiAction({
      type: "place",
      row: 2,
      col: 3,
      stone: "black",
    })).toBeNull()
  })

  it("rejects wrong-side and illegal placements", () => {
    const state = createReversiState()
    expect(applyLanReversiAction(state, {
      type: "place",
      row: 2,
      col: 3,
    }, "white")).toEqual({ ok: false, code: "WRONG_PLAYER" })
    expect(applyLanReversiAction(state, {
      type: "place",
      row: 0,
      col: 0,
    }, "black")).toEqual({ ok: false, code: "NO_FLIPS" })
  })

  it("applies flips and a forced pass as one replicated action", () => {
    const board = emptyBoard()
    board[0][0] = "black"
    board[0][1] = "white"
    board[1][0] = "black"
    board[1][1] = "white"
    const state: ReversiState = {
      board,
      currentPlayer: "black",
      gameOver: false,
      winner: null,
      lastPassedPlayer: null,
      moveHistory: [],
    }

    const result = applyLanReversiAction(state, {
      type: "place",
      row: 0,
      col: 2,
    }, "black")

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.board[0].slice(0, 3)).toEqual(["black", "black", "black"])
    expect(result.state.currentPlayer).toBe("black")
    expect(result.state.lastPassedPlayer).toBe("white")
    expect(result.state.moveHistory).toEqual([{ row: 0, col: 2, stone: "black" }])
  })

  it("returns no current side after the deterministic game ends", () => {
    const state = playDeterministicGame()

    expect(state.gameOver).toBe(true)
    expect(state.winner).not.toBeNull()
    expect(reversiLanAdapter.getCurrentSide(state)).toBeNull()
    expect(reversiLanAdapter.getOutcome(state)).toEqual(
      state.winner === "tie"
        ? { status: "draw" }
        : { status: "won", winner: state.winner },
    )
    expect(applyLanReversiAction(state, {
      type: "place",
      row: 0,
      col: 0,
    }, state.currentPlayer)).toEqual({ ok: false, code: "GAME_FINISHED" })
  })
})

describe("LAN reversi compact snapshots", () => {
  it("rebuilds all flips, turns, and forced-pass state from compact history", () => {
    const state = playUntilForcedPass()
    expect(state).not.toBeNull()
    if (!state) return
    expect(state.lastPassedPlayer).not.toBeNull()

    const snapshot = encodeLanReversiSnapshot(state)
    expect(snapshot).toEqual({
      moves: state.moveHistory.map((move) => [move.row, move.col, move.stone]),
    })
    expect(validateAndRebuildLanReversiSnapshot(
      snapshot,
      state.moveHistory.length,
    )).toEqual({ ok: true, state })
  })

  it("rejects invalid, mismatched, malformed, and unexpected snapshot shapes", () => {
    expect(validateAndRebuildLanReversiSnapshot({ moves: [] }, -1)).toEqual({
      ok: false,
      code: "INVALID_REVISION",
    })
    expect(validateAndRebuildLanReversiSnapshot({ moves: [] }, 1)).toEqual({
      ok: false,
      code: "REVISION_MISMATCH",
    })
    expect(validateAndRebuildLanReversiSnapshot({ moves: [], injected: true }, 0)).toEqual({
      ok: false,
      code: "INVALID_STATE_SHAPE",
    })
    expect(validateAndRebuildLanReversiSnapshot({ moves: [[8, 0, "black"]] }, 1)).toEqual({
      ok: false,
      code: "INVALID_STATE_SHAPE",
    })
  })

  it("rejects out-of-turn and illegal move histories", () => {
    expect(validateAndRebuildLanReversiSnapshot({
      moves: [[2, 3, "white"]],
    }, 1)).toEqual({
      ok: false,
      code: "INVALID_MOVE",
      moveIndex: 0,
      moveError: "WRONG_PLAYER",
    })
    expect(validateAndRebuildLanReversiSnapshot({
      moves: [[0, 0, "black"]],
    }, 1)).toEqual({
      ok: false,
      code: "INVALID_MOVE",
      moveIndex: 0,
      moveError: "NO_FLIPS",
    })
  })

  it("rejects moves appended after a terminal position", () => {
    const terminal = playDeterministicGame()
    const snapshot = encodeLanReversiSnapshot(terminal) as { moves: unknown[] }
    const impossible = {
      moves: [...snapshot.moves, [0, 0, terminal.currentPlayer]],
    }

    expect(validateAndRebuildLanReversiSnapshot(
      impossible,
      terminal.moveHistory.length + 1,
    )).toEqual({
      ok: false,
      code: "INVALID_MOVE",
      moveIndex: terminal.moveHistory.length,
      moveError: "GAME_FINISHED",
    })
  })
})
