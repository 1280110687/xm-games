import { describe, expect, it } from "vitest"

import {
  GOMOKU_BOARD_SIZE,
  createGomokuState,
  placeGomokuStone,
  undoLastGomokuMove,
  validateAndRebuildLanGomokuSnapshot,
} from "./engine"

function place(
  state: ReturnType<typeof createGomokuState>,
  row: number,
  col: number,
) {
  const result = placeGomokuStone(state, row, col)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error)
  return result.state
}

describe("gomoku engine", () => {
  it("creates an empty serializable board with black to move", () => {
    const state = createGomokuState()

    expect(state.board).toHaveLength(GOMOKU_BOARD_SIZE)
    expect(state.board.flat().every((cell) => cell === null)).toBe(true)
    expect(state.currentPlayer).toBe("black")
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })

  it("alternates turns without mutating the previous state", () => {
    const initial = createGomokuState()
    const result = placeGomokuStone(initial, 7, 7)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(initial.board[7][7]).toBeNull()
    expect(result.state.board[7][7]).toBe("black")
    expect(result.state.currentPlayer).toBe("white")
  })

  it("rejects invalid, occupied and out-of-turn moves", () => {
    const initial = createGomokuState()
    expect(placeGomokuStone(initial, -1, 0)).toMatchObject({
      ok: false,
      error: "OUT_OF_BOUNDS",
    })
    expect(placeGomokuStone(initial, 0, 0, "white")).toMatchObject({
      ok: false,
      error: "WRONG_PLAYER",
    })

    const afterBlack = place(initial, 0, 0)
    expect(placeGomokuStone(afterBlack, 0, 0)).toMatchObject({
      ok: false,
      error: "CELL_OCCUPIED",
    })
  })

  it("detects a horizontal line of five or more", () => {
    let state = createGomokuState()
    for (let col = 0; col < 4; col += 1) {
      state = place(state, 7, col)
      state = place(state, 8, col)
    }
    state = place(state, 7, 4)

    expect(state.winner).toBe("black")
    expect(placeGomokuStone(state, 9, 9)).toMatchObject({
      ok: false,
      error: "GAME_FINISHED",
    })
  })

  it("allows each side to undo only once", () => {
    let state = place(createGomokuState(), 7, 7)
    const firstUndo = undoLastGomokuMove(state)
    expect(firstUndo.ok).toBe(true)
    if (!firstUndo.ok) return
    state = firstUndo.state
    expect(state.currentPlayer).toBe("black")
    expect(state.board[7][7]).toBeNull()

    state = place(state, 6, 6)
    expect(undoLastGomokuMove(state)).toMatchObject({
      ok: false,
      error: "UNDO_ALREADY_USED",
    })
  })
})

describe("LAN Gomoku snapshot validation", () => {
  it("rebuilds a valid snapshot from its complete move history", () => {
    let state = createGomokuState()
    state = place(state, 7, 7)
    state = place(state, 7, 8)
    state = place(state, 8, 8)

    expect(validateAndRebuildLanGomokuSnapshot(state, 3)).toEqual({
      ok: true,
      state,
    })
  })

  it("requires revision to equal the move history length", () => {
    const state = place(createGomokuState(), 7, 7)

    expect(validateAndRebuildLanGomokuSnapshot(state, 0)).toEqual({
      ok: false,
      error: "REVISION_MISMATCH",
    })
    expect(validateAndRebuildLanGomokuSnapshot(state, -1)).toEqual({
      ok: false,
      error: "INVALID_REVISION",
    })
  })

  it("rejects invalid move coordinates and out-of-turn stones", () => {
    const invalidCoordinate = {
      ...createGomokuState(),
      moveHistory: [{ row: GOMOKU_BOARD_SIZE, col: 0, stone: "black" }],
    }
    expect(validateAndRebuildLanGomokuSnapshot(invalidCoordinate, 1)).toEqual({
      ok: false,
      error: "INVALID_STATE_SHAPE",
    })

    const stringCoordinate = {
      ...createGomokuState(),
      moveHistory: [{ row: "7", col: 7, stone: "black" }],
    }
    expect(validateAndRebuildLanGomokuSnapshot(stringCoordinate, 1)).toEqual({
      ok: false,
      error: "INVALID_STATE_SHAPE",
    })

    const wrongTurn = {
      ...createGomokuState(),
      moveHistory: [{ row: 7, col: 7, stone: "white" }],
    }
    expect(validateAndRebuildLanGomokuSnapshot(wrongTurn, 1)).toEqual({
      ok: false,
      error: "INVALID_MOVE",
      moveIndex: 0,
      moveError: "WRONG_PLAYER",
    })

    const occupiedCell = {
      ...createGomokuState(),
      moveHistory: [
        { row: 7, col: 7, stone: "black" as const },
        { row: 7, col: 7, stone: "white" as const },
      ],
    }
    expect(validateAndRebuildLanGomokuSnapshot(occupiedCell, 2)).toEqual({
      ok: false,
      error: "INVALID_MOVE",
      moveIndex: 1,
      moveError: "CELL_OCCUPIED",
    })
  })

  it("rejects board, turn, winner, and draw fields that do not match replay", () => {
    const initial = createGomokuState()
    const boardMismatch = {
      ...initial,
      board: initial.board.map((row) => [...row]),
    }
    boardMismatch.board[0][0] = "black"
    expect(validateAndRebuildLanGomokuSnapshot(boardMismatch, 0)).toEqual({
      ok: false,
      error: "STATE_MISMATCH",
    })

    expect(validateAndRebuildLanGomokuSnapshot({
      ...initial,
      currentPlayer: "white",
    }, 0)).toEqual({ ok: false, error: "STATE_MISMATCH" })
    expect(validateAndRebuildLanGomokuSnapshot({
      ...initial,
      winner: "black",
    }, 0)).toEqual({ ok: false, error: "STATE_MISMATCH" })
    expect(validateAndRebuildLanGomokuSnapshot({
      ...initial,
      isDraw: true,
    }, 0)).toEqual({ ok: false, error: "STATE_MISMATCH" })
  })

  it("rejects undo metadata in LAN snapshots", () => {
    const state = createGomokuState()
    expect(validateAndRebuildLanGomokuSnapshot({
      ...state,
      undoUsed: { black: true, white: false },
    }, 0)).toEqual({
      ok: false,
      error: "UNDO_NOT_ALLOWED",
    })
  })

  it("rejects moves appended after the game has already ended", () => {
    let state = createGomokuState()
    for (let col = 0; col < 4; col += 1) {
      state = place(state, 7, col)
      state = place(state, 8, col)
    }
    state = place(state, 7, 4)

    const impossible = {
      ...state,
      moveHistory: [
        ...state.moveHistory,
        { row: 9, col: 9, stone: "white" as const },
      ],
    }
    expect(validateAndRebuildLanGomokuSnapshot(impossible, 10)).toEqual({
      ok: false,
      error: "INVALID_MOVE",
      moveIndex: 9,
      moveError: "GAME_FINISHED",
    })
  })

  it("rejects unexpected snapshot and move fields", () => {
    const state = createGomokuState()
    expect(validateAndRebuildLanGomokuSnapshot({ ...state, injected: true }, 0)).toEqual({
      ok: false,
      error: "INVALID_STATE_SHAPE",
    })
    expect(validateAndRebuildLanGomokuSnapshot({
      ...state,
      moveHistory: [{ row: 7, col: 7, stone: "black", injected: true }],
    }, 1)).toEqual({
      ok: false,
      error: "INVALID_STATE_SHAPE",
    })
  })
})
