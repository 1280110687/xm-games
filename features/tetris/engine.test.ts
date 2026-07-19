import { describe, expect, it } from "vitest"
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  clearCompletedLines,
  createEmptyBoard,
  createInitialState,
  spawnPiece,
  tetrisReducer,
  type TetrisState,
} from "./engine"

describe("tetrisReducer", () => {
  it("locks and scores a landed piece exactly once in one tick", () => {
    const board = createEmptyBoard()
    board[BOARD_HEIGHT - 1] = Array(BOARD_WIDTH).fill(1)
    for (let x = 3; x <= 6; x++) board[BOARD_HEIGHT - 1][x] = 0

    const piece = spawnPiece("I", board)
    expect(piece).not.toBeNull()

    const state: TetrisState = {
      board,
      currentPiece: { ...piece!, y: BOARD_HEIGHT - 1 },
      nextPiece: "T",
      score: 0,
      lines: 0,
      level: 1,
      phase: "playing",
    }
    const originalBoard = state.board.map((row) => [...row])

    const next = tetrisReducer(state, { type: "tick", nextPiece: "O" })

    expect(next.score).toBe(100)
    expect(next.lines).toBe(1)
    expect(next.level).toBe(1)
    expect(next.phase).toBe("playing")
    expect(next.currentPiece?.type).toBe("T")
    expect(next.nextPiece).toBe("O")
    expect(next.board.every((row) => row.every((cell) => cell === 0))).toBe(
      true
    )
    expect(state.board).toEqual(originalBoard)
    expect(state.score).toBe(0)
  })

  it("clears every completed row and preserves board dimensions", () => {
    const board = createEmptyBoard()
    board[18] = Array(BOARD_WIDTH).fill(2)
    board[19] = Array(BOARD_WIDTH).fill(3)
    board[17][4] = 4

    const result = clearCompletedLines(board)

    expect(result.linesCleared).toBe(2)
    expect(result.board).toHaveLength(BOARD_HEIGHT)
    expect(result.board.every((row) => row.length === BOARD_WIDTH)).toBe(true)
    expect(result.board[19][4]).toBe(4)
    expect(result.board[0].every((cell) => cell === 0)).toBe(true)
    expect(result.board[1].every((cell) => cell === 0)).toBe(true)
  })

  it("does not tick while paused and only resumes from paused", () => {
    const started = tetrisReducer(createInitialState(), {
      type: "start",
      firstPiece: "O",
      nextPiece: "I",
    })
    const paused = tetrisReducer(started, { type: "pause" })

    expect(paused.phase).toBe("paused")
    expect(
      tetrisReducer(paused, { type: "tick", nextPiece: "T" })
    ).toBe(paused)
    expect(tetrisReducer(paused, { type: "pause" })).toBe(paused)
    expect(tetrisReducer(paused, { type: "resume" }).phase).toBe("playing")
  })

  it("uses a deterministic idle preview until start inputs are supplied", () => {
    const idle = createInitialState()
    expect(idle.phase).toBe("idle")
    expect(idle.nextPiece).toBe("I")

    const started = tetrisReducer(idle, {
      type: "start",
      firstPiece: "L",
      nextPiece: "S",
    })
    expect(started.currentPiece?.type).toBe("L")
    expect(started.nextPiece).toBe("S")
  })
})
