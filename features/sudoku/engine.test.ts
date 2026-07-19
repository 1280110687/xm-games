import { describe, expect, it } from "vitest"

import {
  countSolutions,
  DIFFICULTY_REMOVALS,
  generateSudoku,
  isSolvedSudoku,
  type Difficulty,
  type SudokuBoard,
} from "./engine"

const UNIQUE_PUZZLE: SudokuBoard = [
  [5, 3, null, null, 7, null, null, null, null],
  [6, null, null, 1, 9, 5, null, null, null],
  [null, 9, 8, null, null, null, null, 6, null],
  [8, null, null, null, 6, null, null, null, 3],
  [4, null, null, 8, null, 3, null, null, 1],
  [7, null, null, null, 2, null, null, null, 6],
  [null, 6, null, null, null, null, 2, 8, null],
  [null, null, null, 4, 1, 9, null, null, 5],
  [null, null, null, null, 8, null, null, 7, 9],
]

function seededRandom(initialSeed: number) {
  let seed = initialSeed >>> 0
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0x1_0000_0000
  }
}

describe("countSolutions", () => {
  it("distinguishes unique, multiple, and invalid boards", () => {
    expect(countSolutions(UNIQUE_PUZZLE)).toBe(1)
    expect(countSolutions(Array.from({ length: 9 }, () => Array(9).fill(null)))).toBe(2)

    const invalid = UNIQUE_PUZZLE.map((row) => [...row])
    invalid[0][2] = 5
    expect(countSolutions(invalid)).toBe(0)
  })

  it("does not mutate the supplied board", () => {
    const before = UNIQUE_PUZZLE.map((row) => [...row])
    countSolutions(UNIQUE_PUZZLE)
    expect(UNIQUE_PUZZLE).toEqual(before)
  })
})

describe("generateSudoku", () => {
  it.each(["easy", "medium", "hard"] as Difficulty[])(
    "creates a unique %s puzzle",
    (difficulty) => {
      const { puzzle, solution } = generateSudoku(difficulty, seededRandom(20260719))
      const removed = puzzle.flat().filter((cell) => cell === null).length

      expect(isSolvedSudoku(solution)).toBe(true)
      expect(countSolutions(puzzle, 2)).toBe(1)
      expect(removed).toBe(DIFFICULTY_REMOVALS[difficulty])
      expect(puzzle.every((row, rowIndex) => row !== solution[rowIndex])).toBe(true)
      puzzle.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          if (cell !== null) expect(cell).toBe(solution[rowIndex][colIndex])
        })
      })
    },
  )

  it("reaches each difficulty target across different random boards", () => {
    for (let seed = 1; seed <= 12; seed++) {
      for (const difficulty of ["easy", "medium", "hard"] as Difficulty[]) {
        const { puzzle } = generateSudoku(difficulty, seededRandom(seed))

        expect(puzzle.flat().filter((cell) => cell === null)).toHaveLength(
          DIFFICULTY_REMOVALS[difficulty],
        )
        expect(countSolutions(puzzle, 2)).toBe(1)
      }
    }
  })
})
