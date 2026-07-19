import { describe, expect, it } from "vitest"

import {
  calculateTerritory,
  createEmptyBoard,
  getAdjacentPositions,
  type Stone,
} from "./engine"

describe("getAdjacentPositions", () => {
  it("uses the current board size at opposite boundary corners", () => {
    const board = createEmptyBoard(13)

    expect(getAdjacentPositions(board, 0, 0)).toEqual([
      { row: 1, col: 0 },
      { row: 0, col: 1 },
    ])
    expect(getAdjacentPositions(board, 12, 12)).toEqual([
      { row: 11, col: 12 },
      { row: 12, col: 11 },
    ])
  })
})

describe("calculateTerritory", () => {
  it("does not reuse visited boundary stones across separate empty regions", () => {
    const board: Stone[][] = [
      ["white", "white", "white"],
      [null, "black", null],
      ["white", "white", "white"],
    ]

    expect(calculateTerritory(board)).toEqual({ black: 0, white: 0 })
  })
})
