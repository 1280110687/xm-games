import { describe, expect, it } from "vitest"

import {
  countFlags,
  createEmptyBoard,
  hasWon,
  populateMines,
  revealCells,
  toggleFlag,
} from "./engine"

function seededRandom(initialSeed: number) {
  let seed = initialSeed >>> 0
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0x1_0000_0000
  }
}

describe("populateMines", () => {
  it("preserves flags placed before the first reveal", () => {
    const flagged = toggleFlag(createEmptyBoard(9, 9), 8, 8)
    const board = populateMines(flagged, 10, { row: 4, col: 4 }, seededRandom(1))

    expect(board[8][8].isFlagged).toBe(true)
    expect(countFlags(board)).toBe(1)
    expect(board.flat().filter((cell) => cell.isMine)).toHaveLength(10)
  })

  it("keeps the first cell and all adjacent cells mine-free", () => {
    const board = populateMines(
      createEmptyBoard(9, 9),
      10,
      { row: 4, col: 4 },
      seededRandom(2),
    )

    for (let row = 3; row <= 5; row++) {
      for (let col = 3; col <= 5; col++) {
        expect(board[row][col].isMine).toBe(false)
      }
    }
  })
})

describe("board actions", () => {
  it("does not reveal flagged cells during a zero-cell expansion", () => {
    let board = createEmptyBoard(3, 3)
    board = toggleFlag(board, 1, 1)
    board = revealCells(board, 0, 0)

    expect(board[1][1].isFlagged).toBe(true)
    expect(board[1][1].isRevealed).toBe(false)
    expect(hasWon(board)).toBe(false)
  })
})
