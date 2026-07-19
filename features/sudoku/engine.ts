export type SudokuBoard = (number | null)[][]
export type Difficulty = "easy" | "medium" | "hard"
export type RandomSource = () => number

export const DIFFICULTY_REMOVALS: Record<Difficulty, number> = {
  easy: 38,
  medium: 46,
  hard: 54,
}

const BOARD_SIZE = 9
const BOX_SIZE = 3
const ALL_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function cloneBoard(board: SudokuBoard): SudokuBoard {
  return board.map((row) => [...row])
}

function boxIndex(row: number, col: number): number {
  return Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(col / BOX_SIZE)
}

function createMasks(board: SudokuBoard) {
  if (
    board.length !== BOARD_SIZE ||
    board.some((row) => row.length !== BOARD_SIZE)
  ) {
    return null
  }

  const rows = Array(BOARD_SIZE).fill(0)
  const cols = Array(BOARD_SIZE).fill(0)
  const boxes = Array(BOARD_SIZE).fill(0)

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const value = board[row][col]
      if (value === null) continue
      if (!Number.isInteger(value) || value < 1 || value > 9) return null

      const bit = 1 << value
      const box = boxIndex(row, col)
      if ((rows[row] & bit) || (cols[col] & bit) || (boxes[box] & bit)) {
        return null
      }
      rows[row] |= bit
      cols[col] |= bit
      boxes[box] |= bit
    }
  }

  return { rows, cols, boxes }
}

function candidatesFor(
  row: number,
  col: number,
  masks: NonNullable<ReturnType<typeof createMasks>>,
): number[] {
  const used = masks.rows[row] | masks.cols[col] | masks.boxes[boxIndex(row, col)]
  return ALL_DIGITS.filter((digit) => (used & (1 << digit)) === 0)
}

export function countSolutions(board: SudokuBoard, limit = 2): number {
  const working = cloneBoard(board)
  const masks = createMasks(working)
  if (!masks) return 0

  const solutionLimit = Math.max(1, Math.floor(limit))
  let solutions = 0

  const search = () => {
    if (solutions >= solutionLimit) return

    let bestRow = -1
    let bestCol = -1
    let bestCandidates: number[] | null = null

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (working[row][col] !== null) continue
        const candidates = candidatesFor(row, col, masks)
        if (candidates.length === 0) return
        if (!bestCandidates || candidates.length < bestCandidates.length) {
          bestRow = row
          bestCol = col
          bestCandidates = candidates
          if (candidates.length === 1) break
        }
      }
      if (bestCandidates?.length === 1) break
    }

    if (!bestCandidates) {
      solutions++
      return
    }

    const box = boxIndex(bestRow, bestCol)
    for (const digit of bestCandidates) {
      const bit = 1 << digit
      working[bestRow][bestCol] = digit
      masks.rows[bestRow] |= bit
      masks.cols[bestCol] |= bit
      masks.boxes[box] |= bit

      search()

      working[bestRow][bestCol] = null
      masks.rows[bestRow] &= ~bit
      masks.cols[bestCol] &= ~bit
      masks.boxes[box] &= ~bit
      if (solutions >= solutionLimit) return
    }
  }

  search()
  return solutions
}

export function isSolvedSudoku(board: SudokuBoard): boolean {
  return (
    board.every((row) => row.every((cell) => cell !== null)) &&
    countSolutions(board, 1) === 1
  )
}

function shuffle<T>(values: T[], random: RandomSource): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index--) {
    const randomIndex = Math.min(index, Math.floor(random() * (index + 1)))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }
  return result
}

function createSolvedBoard(random: RandomSource): SudokuBoard {
  const bands = shuffle([0, 1, 2], random)
  const stacks = shuffle([0, 1, 2], random)
  const rows = bands.flatMap((band) =>
    shuffle([0, 1, 2], random).map((row) => band * BOX_SIZE + row),
  )
  const cols = stacks.flatMap((stack) =>
    shuffle([0, 1, 2], random).map((col) => stack * BOX_SIZE + col),
  )
  const digits = shuffle(ALL_DIGITS, random)
  const pattern = (row: number, col: number) =>
    (row * BOX_SIZE + Math.floor(row / BOX_SIZE) + col) % BOARD_SIZE

  return rows.map((row) => cols.map((col) => digits[pattern(row, col)]))
}

function carvePuzzle(
  solution: SudokuBoard,
  removals: number,
  random: RandomSource,
): SudokuBoard {
  const puzzle = cloneBoard(solution)
  const positions = shuffle(
    Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => index),
    random,
  )
  let removed = 0

  for (const position of positions) {
    if (removed >= removals) break
    const row = Math.floor(position / BOARD_SIZE)
    const col = position % BOARD_SIZE
    const previous = puzzle[row][col]
    puzzle[row][col] = null

    if (countSolutions(puzzle, 2) === 1) {
      removed++
    } else {
      puzzle[row][col] = previous
    }
  }

  return puzzle
}

export function generateSudoku(
  difficulty: Difficulty,
  random: RandomSource = Math.random,
): { puzzle: SudokuBoard; solution: SudokuBoard } {
  const targetRemovals = DIFFICULTY_REMOVALS[difficulty]
  let best: { puzzle: SudokuBoard; solution: SudokuBoard; removed: number } | null = null

  for (let attempt = 0; attempt < 6; attempt++) {
    const solution = createSolvedBoard(random)
    const puzzle = carvePuzzle(solution, targetRemovals, random)
    const removed = puzzle.flat().filter((cell) => cell === null).length

    if (!best || removed > best.removed) {
      best = { puzzle, solution, removed }
    }
    if (removed === targetRemovals) {
      return { puzzle, solution }
    }
  }

  if (!best) {
    throw new Error("Unable to generate a Sudoku puzzle")
  }
  return { puzzle: best.puzzle, solution: best.solution }
}
