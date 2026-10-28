/**
 * Adapted from Grid.generateFast / Grid.breakDown in 0h h1 (Q42, 2014), MIT.
 * https://github.com/florisluiten/0hh1/blob/25910e5/js/grid.js
 * Valid balanced row combinations build a complete board; removable clues are
 * checked by an exhaustive solver so every published puzzle has one solution.
 * See LICENSE and SOURCES.md in this directory.
 */
export type OhHiSize = 4 | 6 | 8
export type OhHiTile = 0 | 1 | 2
export type OhHiBoard = OhHiTile[]
export type OhHiIssue = "triple" | "balance" | "duplicate"

export interface OhHiPuzzle {
  size: OhHiSize
  givens: OhHiBoard
  solution: OhHiBoard
}

export interface OhHiGameState {
  puzzle: OhHiPuzzle
  board: OhHiBoard
  history: OhHiBoard[]
  moves: number
  hintsUsed: number
  highlighted: number | null
}

const ROW_CACHE = new Map<OhHiSize, OhHiBoard[]>()

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

function validRows(size: OhHiSize): OhHiBoard[] {
  const cached = ROW_CACHE.get(size)
  if (cached) return cached
  const rows: OhHiBoard[] = []
  for (let mask = 0; mask < 2 ** size; mask++) {
    const row = Array.from({ length: size }, (_, column) => ((mask >> column) & 1) + 1) as OhHiBoard
    if (row.filter(tile => tile === 1).length !== size / 2) continue
    if (row.some((tile, column) => column >= 2 && tile === row[column - 1] && tile === row[column - 2])) continue
    rows.push(row)
  }
  ROW_CACHE.set(size, rows)
  return rows
}

function assertBoard(board: OhHiBoard, size: OhHiSize) {
  if (![4, 6, 8].includes(size) || board.length !== size * size || board.some(tile => ![0, 1, 2].includes(tile))) {
    throw new Error("Invalid 0h h1 board")
  }
}

/** Complete solution search, capped once the requested number is reached. */
export function solveOhHi(board: OhHiBoard, size: OhHiSize, limit = 2, random?: () => number): OhHiBoard[] {
  assertBoard(board, size)
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Invalid solution limit")
  const candidates = Array.from({ length: size }, (_, row) => {
    const possible = validRows(size).filter(values => values.every((value, column) => {
      const clue = board[row * size + column]
      return clue === 0 || clue === value
    }))
    return random ? shuffled(possible, random) : possible
  })
  const placed: OhHiBoard[] = []
  const usedRows = new Set<string>()
  const counts = Array.from({ length: size }, () => [0, 0, 0])
  const solutions: OhHiBoard[] = []

  function visit(rowIndex: number) {
    if (solutions.length >= limit) return
    if (rowIndex === size) {
      const columns = new Set<string>()
      for (let column = 0; column < size; column++) {
        const key = placed.map(row => row[column]).join("")
        if (columns.has(key)) return
        columns.add(key)
      }
      solutions.push(placed.flat())
      return
    }
    for (const row of candidates[rowIndex]) {
      const key = row.join("")
      if (usedRows.has(key)) continue
      const invalid = row.some((tile, column) => (
        counts[column][tile] >= size / 2
        || (rowIndex >= 2 && tile === placed[rowIndex - 1][column] && tile === placed[rowIndex - 2][column])
      ))
      if (invalid) continue
      placed.push(row)
      usedRows.add(key)
      row.forEach((tile, column) => { counts[column][tile]++ })
      visit(rowIndex + 1)
      row.forEach((tile, column) => { counts[column][tile]-- })
      usedRows.delete(key)
      placed.pop()
      if (solutions.length >= limit) return
    }
  }
  visit(0)
  return solutions
}

export function createOhHiPuzzle(size: OhHiSize, random: () => number = Math.random): OhHiPuzzle {
  const empty = Array<OhHiTile>(size * size).fill(0)
  const solution = solveOhHi(empty, size, 1, random)[0]
  if (!solution) throw new Error("Could not generate 0h h1 puzzle")
  const givens = [...solution]
  const minimumClues = Math.ceil(size * size * .3)
  let remaining = givens.length
  for (const index of shuffled(empty.map((_, index) => index), random)) {
    if (remaining <= minimumClues) break
    const previous = givens[index]
    givens[index] = 0
    if (solveOhHi(givens, size).length === 1) remaining--
    else givens[index] = previous
  }
  return { size, givens, solution }
}

export function getOhHiViolations(board: OhHiBoard, size: OhHiSize) {
  assertBoard(board, size)
  const cells = new Set<number>()
  const issues = new Set<OhHiIssue>()
  for (const axis of ["row", "column"] as const) {
    const completeLines = new Map<string, number[]>()
    for (let line = 0; line < size; line++) {
      const indexes = Array.from({ length: size }, (_, position) => axis === "row" ? line * size + position : position * size + line)
      const values = indexes.map(index => board[index])
      for (let position = 2; position < size; position++) {
        if (values[position] !== 0 && values[position] === values[position - 1] && values[position] === values[position - 2]) {
          issues.add("triple")
          indexes.slice(position - 2, position + 1).forEach(index => cells.add(index))
        }
      }
      for (const color of [1, 2]) {
        if (values.filter(tile => tile === color).length > size / 2) {
          issues.add("balance")
          indexes.filter(index => board[index] === color).forEach(index => cells.add(index))
        }
      }
      if (values.includes(0)) continue
      const key = values.join("")
      const previous = completeLines.get(key)
      if (previous) {
        issues.add("duplicate")
        ;[...previous, ...indexes].forEach(index => cells.add(index))
      } else completeLines.set(key, indexes)
    }
  }
  return { cells, issues }
}

export function isOhHiComplete(board: OhHiBoard, size: OhHiSize): boolean {
  return !board.includes(0) && getOhHiViolations(board, size).issues.size === 0
}

export function createOhHiGame(puzzle: OhHiPuzzle): OhHiGameState {
  return { puzzle, board: [...puzzle.givens], history: [], moves: 0, hintsUsed: 0, highlighted: null }
}

export function changeOhHiCell(state: OhHiGameState, index: number, value?: OhHiTile): OhHiGameState {
  if (!Number.isInteger(index) || index < 0 || index >= state.board.length || state.puzzle.givens[index] !== 0 || isOhHiComplete(state.board, state.puzzle.size)) return state
  const next = value ?? ((state.board[index] + 1) % 3) as OhHiTile
  if (next === state.board[index]) return state
  const board = [...state.board]
  board[index] = next
  return { ...state, board, history: [...state.history, state.board], moves: state.moves + 1, highlighted: null }
}

export function undoOhHi(state: OhHiGameState): OhHiGameState {
  const previous = state.history.at(-1)
  if (!previous) return state
  return { ...state, board: previous, history: state.history.slice(0, -1), moves: state.moves + 1, highlighted: null }
}

/** Correct a mistaken editable tile first, otherwise reveal one empty tile. */
export function hintOhHi(state: OhHiGameState): OhHiGameState {
  if (state.hintsUsed >= 3 || isOhHiComplete(state.board, state.puzzle.size)) return state
  let index = state.board.findIndex((tile, index) => state.puzzle.givens[index] === 0 && tile !== 0 && tile !== state.puzzle.solution[index])
  if (index === -1) index = state.board.findIndex(tile => tile === 0)
  if (index === -1) return state
  const next = changeOhHiCell(state, index, state.puzzle.solution[index])
  return { ...next, hintsUsed: state.hintsUsed + 1, highlighted: index }
}
