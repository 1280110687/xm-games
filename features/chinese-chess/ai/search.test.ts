import { describe, expect, it } from "vitest"
import {
  createEmptyBoard,
  createInitialState,
  createPositionKey,
  generateLegalMoves,
  isInCheck,
  applyMove,
  type Board,
  type PieceColor,
  type XiangqiState,
} from "../engine"
import { XiangqiAiEngine } from "./search"
import { XIANGQI_AI_LIMITS } from "../ai-protocol"

function stateWith(board: Board, currentTurn: PieceColor = "red"): XiangqiState {
  const positionKey = createPositionKey(board, currentTurn)
  return {
    board,
    currentTurn,
    moveHistory: [],
    positionHistory: [positionKey],
  }
}

function fixedClock(): () => number {
  return () => 0
}

describe("XiangqiAiEngine", () => {
  it("uses H5-calibrated depth, node, and hard-time budgets", () => {
    expect(XIANGQI_AI_LIMITS).toEqual({
      easy: { maxDepth: 1, nodeLimit: 2_000, timeLimitMs: 150 },
      medium: { maxDepth: 2, nodeLimit: 12_000, timeLimitMs: 500 },
      hard: { maxDepth: 3, nodeLimit: 40_000, timeLimitMs: 1_800 },
    })
  })

  it("returns the same legal move for the same position and fixed budget", () => {
    const state = createInitialState()
    const options = {
      limits: { maxDepth: 1, nodeLimit: 500, timeLimitMs: 10_000 },
      now: fixedClock(),
    }

    const engine = new XiangqiAiEngine()
    const first = engine.search(state, "easy", options)
    const second = engine.search(state, "easy", options)

    expect(first.move).toEqual(second.move)
    expect(first.move).not.toBeNull()
    expect(generateLegalMoves(state)).toContainEqual(first.move)
    expect(first.stats.completed).toBe(true)
    expect(first.stats.depth).toBe(1)
  })

  it("keeps a deterministic legal fallback when the node budget expires immediately", () => {
    const state = createInitialState()
    const result = new XiangqiAiEngine().search(state, "easy", {
      limits: { maxDepth: 4, nodeLimit: 1, timeLimitMs: 10_000 },
      now: fixedClock(),
    })

    expect(result.move).not.toBeNull()
    expect(generateLegalMoves(state)).toContainEqual(result.move)
    expect(result.stats.depth).toBe(0)
    expect(result.stats.completed).toBe(false)
    expect(result.stats.nodes).toBe(1)
  })

  it("returns a legal fallback when the hard time limit expires before depth one", () => {
    const state = createInitialState()
    let clockReads = 0
    const result = new XiangqiAiEngine().search(state, "easy", {
      limits: { maxDepth: 4, nodeLimit: 100_000, timeLimitMs: 10 },
      now: () => clockReads++ === 0 ? 0 : 20,
    })

    expect(result.move).not.toBeNull()
    expect(generateLegalMoves(state)).toContainEqual(result.move)
    expect(result.stats.depth).toBe(0)
    expect(result.stats.completed).toBe(false)
  })

  it("prefers a free high-value capture at shallow depth", () => {
    const board = createEmptyBoard()
    board[0][4] = { type: "king", color: "black" }
    board[0][3] = { type: "advisor", color: "black" }
    board[0][5] = { type: "advisor", color: "black" }
    board[9][4] = { type: "king", color: "red" }
    board[5][4] = { type: "pawn", color: "red" }
    board[5][0] = { type: "chariot", color: "red" }
    board[5][3] = { type: "chariot", color: "black" }
    const state = stateWith(board)

    const result = new XiangqiAiEngine().search(state, "easy", {
      limits: { maxDepth: 1, nodeLimit: 2_000, timeLimitMs: 10_000 },
      now: fixedClock(),
    })

    expect(result.move).toEqual({
      from: { row: 5, col: 0 },
      to: { row: 5, col: 3 },
    })
  })

  it("finds a checkmate in one instead of a merely positional move", () => {
    const board = createEmptyBoard()
    board[0][3] = { type: "chariot", color: "black" }
    board[0][4] = { type: "king", color: "black" }
    board[0][5] = { type: "chariot", color: "black" }
    board[1][0] = { type: "chariot", color: "red" }
    board[1][4] = { type: "pawn", color: "black" }
    board[2][4] = { type: "chariot", color: "red" }
    board[9][4] = { type: "king", color: "red" }
    const state = stateWith(board)
    const matingMove = {
      from: { row: 2, col: 4 },
      to: { row: 1, col: 4 },
    }
    const matingResult = applyMove(state, matingMove)
    expect(matingResult.ok).toBe(true)
    if (matingResult.ok) {
      expect(matingResult.result).toMatchObject({ over: true, winner: "red" })
    }

    const result = new XiangqiAiEngine().search(state, "easy", {
      limits: { maxDepth: 1, nodeLimit: 2_000, timeLimitMs: 10_000 },
      now: fixedClock(),
    })

    expect(result.move).not.toBeNull()
    const selectedResult = applyMove(state, result.move!)
    expect(selectedResult.ok).toBe(true)
    if (selectedResult.ok) {
      expect(selectedResult.result).toMatchObject({ over: true, winner: "red" })
    }
    expect(result.stats.score).toBeGreaterThan(900_000)
  })

  it("returns a legal evasion when the side to move is in check", () => {
    const board = createEmptyBoard()
    board[0][4] = { type: "king", color: "black" }
    board[5][4] = { type: "chariot", color: "black" }
    board[9][4] = { type: "king", color: "red" }
    const state = stateWith(board)
    expect(isInCheck(state.board, "red")).toBe(true)

    const result = new XiangqiAiEngine().search(state, "easy", {
      limits: { maxDepth: 1, nodeLimit: 2_000, timeLimitMs: 10_000 },
      now: fixedClock(),
    })

    expect(result.move).not.toBeNull()
    const applied = applyMove(state, result.move!)
    expect(applied.ok).toBe(true)
    if (applied.ok) expect(isInCheck(applied.state.board, "red")).toBe(false)
  })

  it("returns no move for a terminal repetition position", () => {
    const initial = createInitialState()
    const positionKey = createPositionKey(initial.board, initial.currentTurn)
    const state: XiangqiState = {
      ...initial,
      positionHistory: [positionKey, positionKey, positionKey],
    }

    const result = new XiangqiAiEngine().search(state, "hard", {
      now: fixedClock(),
    })

    expect(result.move).toBeNull()
    expect(result.stats.completed).toBe(true)
    expect(result.stats.depth).toBe(0)
    expect(result.stats.score).toBe(0)
  })

  it("honors an external cancellation guard and still returns the fallback", () => {
    const state = createInitialState()
    const result = new XiangqiAiEngine().search(state, "hard", {
      limits: { maxDepth: 6, nodeLimit: 100_000, timeLimitMs: 10_000 },
      now: fixedClock(),
      shouldStop: () => true,
    })

    expect(result.move).not.toBeNull()
    expect(generateLegalMoves(state)).toContainEqual(result.move)
    expect(result.stats.completed).toBe(false)
    expect(result.stats.depth).toBe(0)
  })
})
