export const BOARD_SIZE = 4

export type Cell = number | null
export type Board2048 = Cell[][]
export type MoveDirection = "left" | "right" | "up" | "down"

export interface MoveResult {
  board: Board2048
  score: number
  moved: boolean
}

export interface TilePlacement {
  board: Board2048
  position: [number, number] | null
}

export function createEmptyBoard(): Board2048 {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<Cell>(BOARD_SIZE).fill(null)
  )
}

export function createInitialBoard(): Board2048 {
  const board = createEmptyBoard()
  board[1][1] = 2
  board[2][2] = 2
  return board
}

export function addRandomTile(
  board: Board2048,
  random: () => number = Math.random
): TilePlacement {
  const nextBoard = board.map((row) => [...row])
  const emptyCells: Array<[number, number]> = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let column = 0; column < BOARD_SIZE; column++) {
      if (nextBoard[row][column] === null) {
        emptyCells.push([row, column])
      }
    }
  }

  if (emptyCells.length === 0) {
    return { board: nextBoard, position: null }
  }

  const index = Math.min(
    Math.floor(random() * emptyCells.length),
    emptyCells.length - 1
  )
  const position = emptyCells[index]
  nextBoard[position[0]][position[1]] = random() < 0.9 ? 2 : 4

  return { board: nextBoard, position }
}

export function createRandomBoard(
  random: () => number = Math.random
): Board2048 {
  const first = addRandomTile(createEmptyBoard(), random)
  return addRandomTile(first.board, random).board
}

export function slideRow(row: Cell[]): {
  row: Cell[]
  score: number
} {
  const tiles = row.filter((cell): cell is number => cell !== null)
  const nextRow: Cell[] = []
  let score = 0

  for (let index = 0; index < tiles.length; index++) {
    const value = tiles[index]
    if (value === tiles[index + 1]) {
      const merged = value * 2
      nextRow.push(merged)
      score += merged
      index += 1
    } else {
      nextRow.push(value)
    }
  }

  while (nextRow.length < BOARD_SIZE) nextRow.push(null)
  return { row: nextRow, score }
}

function rotateClockwise(board: Board2048): Board2048 {
  const rotated = createEmptyBoard()
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let column = 0; column < BOARD_SIZE; column++) {
      rotated[column][BOARD_SIZE - row - 1] = board[row][column]
    }
  }
  return rotated
}

function rotateTimes(board: Board2048, count: number): Board2048 {
  let rotated = board.map((row) => [...row])
  for (let index = 0; index < count; index++) {
    rotated = rotateClockwise(rotated)
  }
  return rotated
}

function boardsEqual(left: Board2048, right: Board2048): boolean {
  return left.every((row, rowIndex) =>
    row.every((cell, columnIndex) => cell === right[rowIndex][columnIndex])
  )
}

export function moveBoard(
  board: Board2048,
  direction: MoveDirection
): MoveResult {
  const rotations: Record<MoveDirection, number> = {
    left: 0,
    up: 3,
    right: 2,
    down: 1,
  }
  const rotationCount = rotations[direction]
  const normalized = rotateTimes(board, rotationCount)
  let score = 0
  const shifted = normalized.map((row) => {
    const result = slideRow(row)
    score += result.score
    return result.row
  })
  const result = rotateTimes(
    shifted,
    (BOARD_SIZE - rotationCount) % BOARD_SIZE
  )

  return {
    board: result,
    score,
    moved: !boardsEqual(board, result),
  }
}

export function canMove(board: Board2048): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let column = 0; column < BOARD_SIZE; column++) {
      const value = board[row][column]
      if (value === null) return true
      if (column < BOARD_SIZE - 1 && board[row][column + 1] === value) {
        return true
      }
      if (row < BOARD_SIZE - 1 && board[row + 1][column] === value) {
        return true
      }
    }
  }

  return false
}

export function hasWon(board: Board2048): boolean {
  return board.some((row) => row.some((cell) => cell === 2048))
}
