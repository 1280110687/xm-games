import { describe, expect, it } from "vitest"
import {
  applyMove,
  createEmptyBoard,
  createInitialState,
  createPositionKey,
  evaluateGameResult,
  generateLegalMoves,
  generatePseudoLegalMoves,
  isInCheck,
  type Board,
  type Piece,
  type PieceColor,
  type PieceType,
  type Position,
  type XiangqiMove,
  type XiangqiState,
} from "./engine"

function piece(type: PieceType, color: PieceColor): Piece {
  return { type, color }
}

function stateWith(
  board: Board,
  currentTurn: PieceColor = "red",
  positionHistory?: readonly string[],
): XiangqiState {
  const key = createPositionKey(board, currentTurn)
  return {
    board,
    currentTurn,
    moveHistory: [],
    positionHistory: positionHistory ?? [key],
  }
}

function boardWithKings(): Board {
  const board = createEmptyBoard()
  board[0][3] = piece("king", "black")
  board[9][4] = piece("king", "red")
  return board
}

function hasPosition(positions: readonly Position[], row: number, col: number): boolean {
  return positions.some((position) => position.row === row && position.col === col)
}

function hasMove(moves: readonly XiangqiMove[], from: Position, to: Position): boolean {
  return moves.some((move) =>
    move.from.row === from.row
    && move.from.col === from.col
    && move.to.row === to.row
    && move.to.col === to.col,
  )
}

function moveOrThrow(state: XiangqiState, move: XiangqiMove): XiangqiState {
  const result = applyMove(state, move)
  if (!result.ok) throw new Error(`Expected legal move, received ${result.error}`)
  return result.state
}

describe("initial state and position keys", () => {
  it("creates the standard 10x9 position with red to move", () => {
    const state = createInitialState()

    expect(state.board).toHaveLength(10)
    expect(state.board.every((row) => row.length === 9)).toBe(true)
    expect(state.board.flat().filter(Boolean)).toHaveLength(32)
    expect(state.board[0][4]).toEqual(piece("king", "black"))
    expect(state.board[9][4]).toEqual(piece("king", "red"))
    expect(state.currentTurn).toBe("red")
    expect(state.positionHistory).toEqual([createPositionKey(state.board, "red")])
  })

  it("includes the side to move and every piece identity in the position key", () => {
    const board = boardWithKings()
    const redKey = createPositionKey(board, "red")
    const blackKey = createPositionKey(board, "black")
    board[5][5] = piece("cannon", "red")

    expect(redKey).not.toBe(blackKey)
    expect(createPositionKey(board, "red")).not.toBe(redKey)
  })
})

describe("piece movement rules", () => {
  it("keeps the king and advisors inside their own palace", () => {
    const board = createEmptyBoard()
    board[9][4] = piece("king", "red")
    board[9][3] = piece("advisor", "red")
    board[0][4] = piece("king", "black")
    board[0][5] = piece("advisor", "black")

    const redKingMoves = generatePseudoLegalMoves(board, { row: 9, col: 4 })
    const redAdvisorMoves = generatePseudoLegalMoves(board, { row: 9, col: 3 })
    const blackAdvisorMoves = generatePseudoLegalMoves(board, { row: 0, col: 5 })

    expect(hasPosition(redKingMoves, 8, 4)).toBe(true)
    expect(hasPosition(redKingMoves, 9, 5)).toBe(true)
    expect(hasPosition(redKingMoves, 9, 2)).toBe(false)
    expect(redAdvisorMoves).toEqual([{ row: 8, col: 4 }])
    expect(blackAdvisorMoves).toEqual([{ row: 1, col: 4 }])
  })

  it("keeps elephants on their own side and blocks them at the elephant eye", () => {
    const board = createEmptyBoard()
    board[9][2] = piece("elephant", "red")

    let moves = generatePseudoLegalMoves(board, { row: 9, col: 2 })
    expect(hasPosition(moves, 7, 0)).toBe(true)
    expect(hasPosition(moves, 7, 4)).toBe(true)

    board[8][3] = piece("pawn", "black")
    moves = generatePseudoLegalMoves(board, { row: 9, col: 2 })
    expect(hasPosition(moves, 7, 4)).toBe(false)

    board[5][2] = piece("elephant", "red")
    expect(hasPosition(generatePseudoLegalMoves(board, { row: 5, col: 2 }), 3, 4)).toBe(false)
  })

  it("generates all eight horse destinations and applies the horse-leg block", () => {
    const board = createEmptyBoard()
    board[4][4] = piece("horse", "red")

    expect(generatePseudoLegalMoves(board, { row: 4, col: 4 })).toHaveLength(8)

    board[3][4] = piece("pawn", "black")
    board[4][5] = piece("pawn", "red")
    const blockedMoves = generatePseudoLegalMoves(board, { row: 4, col: 4 })

    expect(hasPosition(blockedMoves, 2, 3)).toBe(false)
    expect(hasPosition(blockedMoves, 2, 5)).toBe(false)
    expect(hasPosition(blockedMoves, 3, 6)).toBe(false)
    expect(hasPosition(blockedMoves, 5, 6)).toBe(false)
    expect(blockedMoves).toHaveLength(4)
  })

  it("stops a chariot at the first piece and permits an enemy capture", () => {
    const board = createEmptyBoard()
    board[4][4] = piece("chariot", "red")
    board[4][2] = piece("pawn", "red")
    board[4][6] = piece("pawn", "black")
    board[4][7] = piece("pawn", "black")

    const moves = generatePseudoLegalMoves(board, { row: 4, col: 4 })

    expect(hasPosition(moves, 4, 3)).toBe(true)
    expect(hasPosition(moves, 4, 2)).toBe(false)
    expect(hasPosition(moves, 4, 6)).toBe(true)
    expect(hasPosition(moves, 4, 7)).toBe(false)
  })

  it("requires exactly one cannon screen when capturing", () => {
    const board = createEmptyBoard()
    board[4][0] = piece("cannon", "red")
    board[4][2] = piece("pawn", "red")
    board[4][5] = piece("chariot", "black")
    board[4][7] = piece("pawn", "black")

    const moves = generatePseudoLegalMoves(board, { row: 4, col: 0 })

    expect(hasPosition(moves, 4, 1)).toBe(true)
    expect(hasPosition(moves, 4, 2)).toBe(false)
    expect(hasPosition(moves, 4, 3)).toBe(false)
    expect(hasPosition(moves, 4, 5)).toBe(true)
    expect(hasPosition(moves, 4, 7)).toBe(false)

    board[4][2] = null
    expect(hasPosition(generatePseudoLegalMoves(board, { row: 4, col: 0 }), 4, 5)).toBe(false)
  })

  it("lets pawns move only forward before the river and sideways after crossing", () => {
    const board = createEmptyBoard()
    board[6][4] = piece("pawn", "red")
    board[3][2] = piece("pawn", "black")
    board[4][7] = piece("pawn", "red")
    board[5][1] = piece("pawn", "black")

    expect(generatePseudoLegalMoves(board, { row: 6, col: 4 })).toEqual([{ row: 5, col: 4 }])
    expect(generatePseudoLegalMoves(board, { row: 3, col: 2 })).toEqual([{ row: 4, col: 2 }])

    const redCrossed = generatePseudoLegalMoves(board, { row: 4, col: 7 })
    expect(redCrossed).toEqual(expect.arrayContaining([
      { row: 3, col: 7 },
      { row: 4, col: 6 },
      { row: 4, col: 8 },
    ]))
    expect(hasPosition(redCrossed, 5, 7)).toBe(false)

    const blackCrossed = generatePseudoLegalMoves(board, { row: 5, col: 1 })
    expect(blackCrossed).toEqual(expect.arrayContaining([
      { row: 6, col: 1 },
      { row: 5, col: 0 },
      { row: 5, col: 2 },
    ]))
    expect(hasPosition(blackCrossed, 4, 1)).toBe(false)
  })

  it("rejects out-of-board movement and moving from an empty intersection", () => {
    const state = createInitialState()

    expect(generatePseudoLegalMoves(state.board, { row: -1, col: 0 })).toEqual([])
    expect(generatePseudoLegalMoves(state.board, { row: 5, col: 5 })).toEqual([])
    expect(applyMove(state, { from: { row: 10, col: 0 }, to: { row: 9, col: 0 } })).toEqual({
      ok: false,
      error: "OUT_OF_BOUNDS",
      state,
    })
  })
})

describe("check and legal move filtering", () => {
  it("detects flying generals and clears the check when a piece intervenes", () => {
    const board = createEmptyBoard()
    board[0][4] = piece("king", "black")
    board[9][4] = piece("king", "red")

    expect(isInCheck(board, "red")).toBe(true)
    expect(isInCheck(board, "black")).toBe(true)

    board[5][4] = piece("pawn", "red")
    expect(isInCheck(board, "red")).toBe(false)
    expect(isInCheck(board, "black")).toBe(false)
  })

  it("filters a pseudo-legal move that exposes the two generals", () => {
    const board = createEmptyBoard()
    board[0][4] = piece("king", "black")
    board[9][4] = piece("king", "red")
    board[5][4] = piece("chariot", "red")
    const state = stateWith(board)
    const from = { row: 5, col: 4 }
    const exposedMove = { row: 5, col: 5 }

    expect(hasPosition(generatePseudoLegalMoves(board, from), exposedMove.row, exposedMove.col)).toBe(true)
    expect(hasMove(generateLegalMoves(state, from), from, exposedMove)).toBe(false)
  })

  it("allows only moves that answer an active check", () => {
    const board = boardWithKings()
    board[5][4] = piece("chariot", "black")
    board[8][0] = piece("chariot", "red")
    const state = stateWith(board)

    expect(isInCheck(board, "red")).toBe(true)
    expect(hasPosition(generatePseudoLegalMoves(board, { row: 8, col: 0 }), 8, 1)).toBe(true)
    expect(hasMove(
      generateLegalMoves(state),
      { row: 8, col: 0 },
      { row: 8, col: 1 },
    )).toBe(false)
    expect(hasMove(
      generateLegalMoves(state),
      { row: 8, col: 0 },
      { row: 8, col: 4 },
    )).toBe(true)
  })

  it("never generates capture of the opposing king as a normal move", () => {
    const board = createEmptyBoard()
    board[0][4] = piece("king", "black")
    board[1][4] = piece("chariot", "red")
    board[9][3] = piece("king", "red")
    const from = { row: 1, col: 4 }

    expect(hasPosition(generatePseudoLegalMoves(board, from), 0, 4)).toBe(false)
    expect(hasMove(generateLegalMoves(stateWith(board), from), from, { row: 0, col: 4 })).toBe(false)
  })
})

describe("game result adjudication", () => {
  it("distinguishes checkmate from an ordinary check", () => {
    const checkingBoard = boardWithKings()
    checkingBoard[5][4] = piece("chariot", "black")

    expect(evaluateGameResult(stateWith(checkingBoard))).toEqual({
      over: false,
      winner: null,
      reason: null,
      inCheck: true,
    })

    const mateBoard = boardWithKings()
    mateBoard[9][0] = piece("chariot", "black")
    mateBoard[7][4] = piece("chariot", "black")

    expect(evaluateGameResult(stateWith(mateBoard))).toEqual({
      over: true,
      winner: "black",
      reason: "checkmate",
      inCheck: true,
    })
  })

  it("treats having no legal move without check as a loss, not a draw", () => {
    const board = boardWithKings()
    board[8][0] = piece("chariot", "black")
    board[7][3] = piece("chariot", "black")
    board[7][5] = piece("chariot", "black")

    expect(isInCheck(board, "red")).toBe(false)
    expect(evaluateGameResult(stateWith(board))).toEqual({
      over: true,
      winner: "black",
      reason: "no-legal-move",
      inCheck: false,
    })
  })

  it("declares a draw when the same position with the same turn appears three times", () => {
    let state = createInitialState()
    const cycle: XiangqiMove[] = [
      { from: { row: 9, col: 1 }, to: { row: 7, col: 2 } },
      { from: { row: 0, col: 1 }, to: { row: 2, col: 2 } },
      { from: { row: 7, col: 2 }, to: { row: 9, col: 1 } },
      { from: { row: 2, col: 2 }, to: { row: 0, col: 1 } },
    ]

    for (const move of [...cycle, ...cycle]) state = moveOrThrow(state, move)

    expect(evaluateGameResult(state)).toEqual({
      over: true,
      winner: null,
      reason: "repetition",
      inCheck: false,
    })
    expect(applyMove(state, cycle[0])).toEqual({ ok: false, error: "GAME_OVER", state })
  })
})

describe("immutable state transitions", () => {
  it("applies a legal move without mutating the source board or histories", () => {
    const state = createInitialState()
    const originalSnapshot = JSON.stringify(state)
    const result = applyMove(state, {
      from: { row: 9, col: 1 },
      to: { row: 7, col: 2 },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(JSON.stringify(state)).toBe(originalSnapshot)
    expect(result.state).not.toBe(state)
    expect(result.state.board).not.toBe(state.board)
    expect(result.state.board[9]).not.toBe(state.board[9])
    expect(result.state.board[7]).not.toBe(state.board[7])
    expect(result.state.board[0]).toBe(state.board[0])
    expect(result.state.board[0][0]).toBe(state.board[0][0])
    expect(state.board[9][1]).toEqual(piece("horse", "red"))
    expect(result.state.board[9][1]).toBeNull()
    expect(result.state.board[7][2]).toEqual(piece("horse", "red"))
    expect(result.state.currentTurn).toBe("black")
    expect(result.state.moveHistory).toHaveLength(1)
    expect(result.state.positionHistory).toHaveLength(2)
  })

  it("returns structured errors without changing the state", () => {
    const state = createInitialState()

    expect(applyMove(state, {
      from: { row: 0, col: 0 },
      to: { row: 1, col: 0 },
    })).toEqual({ ok: false, error: "WRONG_TURN", state })
    expect(applyMove(state, {
      from: { row: 5, col: 4 },
      to: { row: 4, col: 4 },
    })).toEqual({ ok: false, error: "EMPTY_INTERSECTION", state })
    expect(applyMove(state, {
      from: { row: 9, col: 0 },
      to: { row: 8, col: 1 },
    })).toEqual({ ok: false, error: "ILLEGAL_MOVE", state })
  })
})
