import { describe, expect, it } from "vitest"

import {
  changeOhHiCell,
  createOhHiGame,
  createOhHiPuzzle,
  getOhHiViolations,
  hintOhHi,
  isOhHiComplete,
  solveOhHi,
  undoOhHi,
  type OhHiBoard,
  type OhHiSize,
} from "./engine"

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

describe("0h h1 puzzle generation", () => {
  for (const size of [4, 6, 8] as OhHiSize[]) {
    it(`generates varied, uniquely solvable ${size}×${size} puzzles with immutable clues`, () => {
      const signatures = new Set<string>()
      for (let seed = 1; seed <= 8; seed++) {
        const puzzle = createOhHiPuzzle(size, seeded(seed))
        expect(isOhHiComplete(puzzle.solution, size)).toBe(true)
        expect(puzzle.givens.some(tile => tile === 0)).toBe(true)
        expect(puzzle.givens.some(tile => tile !== 0)).toBe(true)
        expect(solveOhHi(puzzle.givens, size, 2)).toEqual([puzzle.solution])
        expect(puzzle.givens.every((tile, index) => tile === 0 || tile === puzzle.solution[index])).toBe(true)
        const initial = createOhHiGame(puzzle)
        const clueIndex = puzzle.givens.findIndex(tile => tile !== 0)
        expect(changeOhHiCell(initial, clueIndex)).toBe(initial)
        signatures.add(puzzle.givens.join(""))
      }
      expect(signatures.size).toBeGreaterThan(1)
    })
  }

  it("recognizes ambiguous and impossible boards", () => {
    expect(solveOhHi(Array(16).fill(0), 4, 2)).toHaveLength(2)
    const impossible: OhHiBoard = [1, 1, 1, 0, ...Array<0>(12).fill(0)]
    expect(solveOhHi(impossible, 4)).toEqual([])
    expect(() => solveOhHi([0], 4)).toThrow()
  })
})

describe("0h h1 rules", () => {
  it("reports triples and overfull colors on either axis", () => {
    const board = Array<0 | 1 | 2>(16).fill(0)
    board[0] = board[1] = board[2] = 1
    board[4] = board[8] = 1
    const errors = getOhHiViolations(board, 4)
    expect([...errors.issues]).toEqual(expect.arrayContaining(["triple", "balance"]))
    expect([...errors.cells]).toEqual(expect.arrayContaining([0, 1, 2, 4, 8]))
    expect(isOhHiComplete(board, 4)).toBe(false)
  })

  it("rejects equal complete rows and columns even with balanced lines and no triples", () => {
    const repeated: OhHiBoard = [1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1]
    expect(getOhHiViolations(repeated, 4).issues.has("duplicate")).toBe(true)
    expect(isOhHiComplete(repeated, 4)).toBe(false)
    const transposed = repeated.map((_, index) => repeated[(index % 4) * 4 + Math.floor(index / 4)])
    expect(getOhHiViolations(transposed, 4).issues.has("duplicate")).toBe(true)
  })
})

describe("0h h1 interaction state", () => {
  it("cycles empty / first color / second color, then undoes without mutating the puzzle", () => {
    const puzzle = createOhHiPuzzle(4, seeded(10))
    const initial = createOhHiGame(puzzle)
    const index = puzzle.givens.findIndex(tile => tile === 0)
    const one = changeOhHiCell(initial, index)
    const two = changeOhHiCell(one, index)
    const empty = changeOhHiCell(two, index)
    expect([one.board[index], two.board[index], empty.board[index]]).toEqual([1, 2, 0])
    expect(undoOhHi(two).board).toEqual(one.board)
    expect(initial.board).toEqual(puzzle.givens)
    expect(changeOhHiCell(initial, -1)).toBe(initial)
  })

  it("corrects a mistake before revealing an empty cell, limits hints and supports undo", () => {
    let state = createOhHiGame(createOhHiPuzzle(6, seeded(12)))
    const index = state.board.findIndex(tile => tile === 0)
    const wrongValue = state.puzzle.solution[index] === 1 ? 2 : 1
    state = changeOhHiCell(state, index, wrongValue)
    const hint = hintOhHi(state)
    expect(hint.board[index]).toBe(state.puzzle.solution[index])
    expect(hint.highlighted).toBe(index)
    expect(hint.hintsUsed).toBe(1)
    expect(undoOhHi(hint).board[index]).toBe(wrongValue)
    state = hintOhHi(hintOhHi(hint))
    expect(state.hintsUsed).toBe(3)
    expect(hintOhHi(state)).toBe(state)
  })

  it("finishes only when all rules hold and does not change a completed puzzle", () => {
    const puzzle = createOhHiPuzzle(4, seeded(42))
    let state = createOhHiGame(puzzle)
    puzzle.solution.forEach((tile, index) => { state = changeOhHiCell(state, index, tile) })
    expect(isOhHiComplete(state.board, 4)).toBe(true)
    expect(changeOhHiCell(state, state.board.findIndex((_, index) => puzzle.givens[index] === 0))).toBe(state)
    expect(isOhHiComplete(undoOhHi(state).board, 4)).toBe(false)
  })
})
