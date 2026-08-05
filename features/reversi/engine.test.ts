import { describe, expect, it } from "vitest"

import {
  REVERSI_BOARD_SIZE,
  countReversiStones,
  createReversiState,
  getFlippableReversiStones,
  getReversiValidMoves,
  placeReversiStone,
  type ReversiBoard,
  type ReversiState,
} from "./engine"

function emptyBoard(): ReversiBoard {
  return Array.from({ length: REVERSI_BOARD_SIZE }, () =>
    Array(REVERSI_BOARD_SIZE).fill(null),
  )
}

function stateWith(board: ReversiBoard, currentPlayer: "black" | "white" = "black"): ReversiState {
  return {
    board,
    currentPlayer,
    gameOver: false,
    winner: null,
    lastPassedPlayer: null,
    moveHistory: [],
  }
}

describe("reversi engine", () => {
  it("creates the standard board with black to move", () => {
    const state = createReversiState()

    expect(countReversiStones(state.board)).toEqual({ black: 2, white: 2 })
    expect(state.currentPlayer).toBe("black")
    expect(getReversiValidMoves(state.board, "black")).toEqual([
      { row: 2, col: 3 },
      { row: 3, col: 2 },
      { row: 4, col: 5 },
      { row: 5, col: 4 },
    ])
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })

  it("places and flips without mutating the previous board", () => {
    const initial = createReversiState()
    const result = placeReversiStone(initial, 2, 3)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(initial.board[2][3]).toBeNull()
    expect(initial.board[3][3]).toBe("white")
    expect(result.state.board[2][3]).toBe("black")
    expect(result.state.board[3][3]).toBe("black")
    expect(result.state.currentPlayer).toBe("white")
    expect(result.state.moveHistory).toEqual([{ row: 2, col: 3, stone: "black" }])
  })

  it("collects flips in all eight directions", () => {
    const board = emptyBoard()
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1],
    ] as const
    for (const [rowStep, colStep] of directions) {
      board[3 + rowStep][3 + colStep] = "white"
      board[3 + rowStep * 2][3 + colStep * 2] = "black"
    }

    expect(getFlippableReversiStones(board, 3, 3, "black")).toHaveLength(8)
    const result = placeReversiStone(stateWith(board), 3, 3)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    for (const [rowStep, colStep] of directions) {
      expect(result.state.board[3 + rowStep][3 + colStep]).toBe("black")
    }
  })

  it("rejects out-of-bounds, wrong-player, occupied, and non-flipping moves", () => {
    const state = createReversiState()
    expect(placeReversiStone(state, -1, 0)).toMatchObject({
      ok: false,
      error: "OUT_OF_BOUNDS",
    })
    expect(placeReversiStone(state, 2, 3, "white")).toMatchObject({
      ok: false,
      error: "WRONG_PLAYER",
    })
    expect(placeReversiStone(state, 3, 3)).toMatchObject({
      ok: false,
      error: "CELL_OCCUPIED",
    })
    expect(placeReversiStone(state, 0, 0)).toMatchObject({
      ok: false,
      error: "NO_FLIPS",
    })
  })

  it("atomically skips an opponent with no move", () => {
    const board = emptyBoard()
    board[0][0] = "black"
    board[0][1] = "white"
    board[1][0] = "black"
    board[1][1] = "white"

    const result = placeReversiStone(stateWith(board), 0, 2)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(getReversiValidMoves(result.state.board, "white")).toEqual([])
    expect(getReversiValidMoves(result.state.board, "black")).toContainEqual({ row: 1, col: 2 })
    expect(result.state.currentPlayer).toBe("black")
    expect(result.state.lastPassedPlayer).toBe("white")
    expect(result.state.gameOver).toBe(false)
  })

  it("finishes and scores when neither side can move", () => {
    const board = emptyBoard()
    board[0][0] = "black"
    board[0][1] = "white"

    const result = placeReversiStone(stateWith(board), 0, 2)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.gameOver).toBe(true)
    expect(result.state.winner).toBe("black")
    expect(result.state.lastPassedPlayer).toBeNull()
    expect(placeReversiStone(result.state, 1, 1)).toMatchObject({
      ok: false,
      error: "GAME_FINISHED",
    })
  })

  it("scores a tie after the final legal placement", () => {
    const board = Array.from({ length: REVERSI_BOARD_SIZE }, () =>
      Array<"black" | "white" | null>(REVERSI_BOARD_SIZE).fill("white"),
    )
    board[0][2] = null
    let blackStones = 0
    for (let row = 0; row < REVERSI_BOARD_SIZE && blackStones < 30; row += 1) {
      for (let col = 0; col < REVERSI_BOARD_SIZE && blackStones < 30; col += 1) {
        if ((row === 0 && col === 1) || (row === 0 && col === 2)) continue
        board[row][col] = "black"
        blackStones += 1
      }
    }

    expect(countReversiStones(board)).toEqual({ black: 30, white: 33 })
    const result = placeReversiStone(stateWith(board), 0, 2)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(countReversiStones(result.state.board)).toEqual({ black: 32, white: 32 })
    expect(result.state.gameOver).toBe(true)
    expect(result.state.winner).toBe("tie")
  })
})
