import { describe, expect, it } from "vitest"
import {
  INITIAL_CASTLING_RIGHTS,
  applyMove,
  getValidMoves,
  isSquareAttacked,
  type CastlingRights,
  type ChessBoard,
  type ChessPositionState,
  type Color,
  type PieceType,
  type Position,
} from "./engine"

function emptyBoard(): ChessBoard {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null))
}

function piece(type: PieceType, color: Color) {
  return { type, color } as const
}

function stateWith(
  board: ChessBoard,
  overrides: Partial<Omit<ChessPositionState, "board">> = {},
): ChessPositionState {
  return {
    board,
    castlingRights: { ...INITIAL_CASTLING_RIGHTS },
    enPassantTarget: null,
    ...overrides,
  }
}

function whiteCastlingBoard(): ChessBoard {
  const board = emptyBoard()
  board[0][4] = piece("king", "black")
  board[7][0] = piece("rook", "white")
  board[7][4] = piece("king", "white")
  board[7][7] = piece("rook", "white")
  return board
}

function hasMove(moves: Position[], row: number, col: number): boolean {
  return moves.some((move) => move.row === row && move.col === col)
}

describe("castling", () => {
  it("allows both white castling moves when the path and king are safe", () => {
    const moves = getValidMoves(stateWith(whiteCastlingBoard()), { row: 7, col: 4 })

    expect(hasMove(moves, 7, 6)).toBe(true)
    expect(hasMove(moves, 7, 2)).toBe(true)
  })

  it("requires the matching rook even if castling rights are still set", () => {
    const board = whiteCastlingBoard()
    board[7][7] = null

    const moves = getValidMoves(stateWith(board), { row: 7, col: 4 })

    expect(hasMove(moves, 7, 6)).toBe(false)
    expect(hasMove(moves, 7, 2)).toBe(true)
  })

  it("does not allow castling while the king is in check", () => {
    const board = whiteCastlingBoard()
    board[0][4] = piece("rook", "black")
    board[0][0] = piece("king", "black")

    const moves = getValidMoves(stateWith(board), { row: 7, col: 4 })

    expect(hasMove(moves, 7, 6)).toBe(false)
    expect(hasMove(moves, 7, 2)).toBe(false)
  })

  it("does not castle through a square attacked by a pawn", () => {
    const board = whiteCastlingBoard()
    board[6][6] = piece("pawn", "black") // g2 attacks the empty f1 transit square

    expect(isSquareAttacked(board, { row: 7, col: 5 }, "black")).toBe(true)

    const moves = getValidMoves(stateWith(board), { row: 7, col: 4 })
    expect(hasMove(moves, 7, 6)).toBe(false)
  })

  it("does not castle into check", () => {
    const board = whiteCastlingBoard()
    board[0][4] = null
    board[0][0] = piece("king", "black")
    board[0][6] = piece("rook", "black")

    const moves = getValidMoves(stateWith(board), { row: 7, col: 4 })

    expect(hasMove(moves, 7, 6)).toBe(false)
  })

  it("moves the rook and permanently clears both rights when castling", () => {
    const original = stateWith(whiteCastlingBoard())

    const result = applyMove(original, { row: 7, col: 4 }, { row: 7, col: 6 })

    expect(result.board[7][4]).toBeNull()
    expect(result.board[7][7]).toBeNull()
    expect(result.board[7][5]).toEqual(piece("rook", "white"))
    expect(result.board[7][6]).toEqual(piece("king", "white"))
    expect(result.castlingRights.whiteKing).toBe(false)
    expect(result.castlingRights.whiteQueen).toBe(false)
    expect(original.board[7][4]).toEqual(piece("king", "white"))
    expect(original.castlingRights.whiteKing).toBe(true)
  })
})

describe("castling rights", () => {
  const captureCases: Array<{
    name: string
    corner: Position
    attacker: Position
    capturedColor: Color
    right: keyof CastlingRights
  }> = [
    {
      name: "white queenside rook on a1",
      corner: { row: 7, col: 0 },
      attacker: { row: 6, col: 1 },
      capturedColor: "white",
      right: "whiteQueen",
    },
    {
      name: "white kingside rook on h1",
      corner: { row: 7, col: 7 },
      attacker: { row: 6, col: 6 },
      capturedColor: "white",
      right: "whiteKing",
    },
    {
      name: "black queenside rook on a8",
      corner: { row: 0, col: 0 },
      attacker: { row: 1, col: 1 },
      capturedColor: "black",
      right: "blackQueen",
    },
    {
      name: "black kingside rook on h8",
      corner: { row: 0, col: 7 },
      attacker: { row: 1, col: 6 },
      capturedColor: "black",
      right: "blackKing",
    },
  ]

  for (const { name, corner, attacker, capturedColor, right } of captureCases) {
    it(`clears ${name} rights when it is captured`, () => {
      const board = emptyBoard()
      board[corner.row][corner.col] = piece("rook", capturedColor)
      board[attacker.row][attacker.col] = piece(
        "bishop",
        capturedColor === "white" ? "black" : "white",
      )

      const original = stateWith(board)
      const result = applyMove(original, attacker, corner)

      expect(result.castlingRights[right]).toBe(false)
      expect(original.castlingRights[right]).toBe(true)
    })
  }
})

describe("en passant move simulation", () => {
  it("rejects en passant when removing both pawns would expose the king", () => {
    const board = emptyBoard()
    board[0][0] = piece("king", "black")
    board[3][4] = piece("king", "white") // e5
    board[3][5] = piece("pawn", "white") // f5
    board[3][6] = piece("pawn", "black") // g5
    board[3][7] = piece("rook", "black") // h5

    const state = stateWith(board, { enPassantTarget: { row: 2, col: 6 } })
    const moves = getValidMoves(state, { row: 3, col: 5 })

    expect(hasMove(moves, 2, 6)).toBe(false)
  })

  it("removes the captured pawn when applying a legal en passant move", () => {
    const board = emptyBoard()
    board[0][0] = piece("king", "black")
    board[7][4] = piece("king", "white")
    board[3][5] = piece("pawn", "white")
    board[3][6] = piece("pawn", "black")

    const result = applyMove(
      stateWith(board, { enPassantTarget: { row: 2, col: 6 } }),
      { row: 3, col: 5 },
      { row: 2, col: 6 },
    )

    expect(result.board[3][5]).toBeNull()
    expect(result.board[3][6]).toBeNull()
    expect(result.board[2][6]).toEqual(piece("pawn", "white"))
    expect(result.enPassantTarget).toBeNull()
  })
})
