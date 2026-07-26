import { describe, expect, it } from "vitest"

import {
  addRandomTile,
  canMove,
  createEmptyBoard,
  hasWon,
  moveBoard,
  slideRow,
  type Board2048,
} from "./engine"

describe("2048 engine", () => {
  it("merges each tile at most once and scores the result", () => {
    expect(slideRow([2, 2, 2, 2])).toEqual({
      row: [4, 4, null, null],
      score: 8,
    })
    expect(slideRow([4, 4, 8, null])).toEqual({
      row: [8, 8, null, null],
      score: 8,
    })
  })

  it("moves and merges in all four directions without mutating input", () => {
    const board: Board2048 = [
      [2, null, 2, null],
      [null, 4, null, 4],
      [2, null, null, null],
      [2, null, null, null],
    ]
    const original = board.map((row) => [...row])

    expect(moveBoard(board, "left")).toMatchObject({
      board: [
        [4, null, null, null],
        [8, null, null, null],
        [2, null, null, null],
        [2, null, null, null],
      ],
      score: 12,
      moved: true,
    })
    expect(moveBoard(board, "right").board[0]).toEqual([
      null,
      null,
      null,
      4,
    ])
    expect(moveBoard(board, "up").board[0][0]).toBe(4)
    expect(moveBoard(board, "down").board[3][0]).toBe(4)
    expect(board).toEqual(original)
  })

  it("does not report a move when the board is unchanged", () => {
    const board: Board2048 = [
      [2, 4, 8, 16],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]

    expect(moveBoard(board, "left")).toMatchObject({
      board,
      score: 0,
      moved: false,
    })
  })

  it("places a deterministic tile without mutating the source board", () => {
    const board = createEmptyBoard()
    const values = [0.5, 0.95]
    const result = addRandomTile(board, () => values.shift() ?? 0)

    expect(result.position).toEqual([2, 0])
    expect(result.board[2][0]).toBe(4)
    expect(board[2][0]).toBeNull()
  })

  it("detects win and terminal boards", () => {
    const won = createEmptyBoard()
    won[0][0] = 2048
    expect(hasWon(won)).toBe(true)

    const terminal: Board2048 = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]
    expect(canMove(terminal)).toBe(false)
    terminal[3][3] = null
    expect(canMove(terminal)).toBe(true)
  })
})
