export type MinesweeperCell = {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  adjacentMines: number
}

export type MinesweeperBoard = MinesweeperCell[][]
export type Position = { row: number; col: number }
export type RandomSource = () => number

export function createEmptyBoard(rows: number, cols: number): MinesweeperBoard {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    })),
  )
}

function getNeighbors(
  board: MinesweeperBoard,
  row: number,
  col: number,
): Position[] {
  const neighbors: Position[] = []

  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      if (rowOffset === 0 && colOffset === 0) continue

      const nextRow = row + rowOffset
      const nextCol = col + colOffset
      if (
        nextRow >= 0
        && nextRow < board.length
        && nextCol >= 0
        && nextCol < (board[nextRow]?.length ?? 0)
      ) {
        neighbors.push({ row: nextRow, col: nextCol })
      }
    }
  }

  return neighbors
}

function shuffle<T>(values: T[], random: RandomSource): T[] {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.min(index, Math.floor(random() * (index + 1)))
    ;[shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ]
  }

  return shuffled
}

export function populateMines(
  board: MinesweeperBoard,
  mineCount: number,
  safePosition: Position,
  random: RandomSource = Math.random,
): MinesweeperBoard {
  const populated = board.map((row) =>
    row.map((cell) => ({
      ...cell,
      isMine: false,
      adjacentMines: 0,
    })),
  )
  const candidates: Position[] = []

  for (let row = 0; row < populated.length; row++) {
    for (let col = 0; col < populated[row].length; col++) {
      const isSafe =
        Math.abs(row - safePosition.row) <= 1
        && Math.abs(col - safePosition.col) <= 1
      if (!isSafe) candidates.push({ row, col })
    }
  }

  if (mineCount < 0 || mineCount > candidates.length) {
    throw new RangeError("Mine count exceeds the available cells")
  }

  for (const { row, col } of shuffle(candidates, random).slice(0, mineCount)) {
    populated[row][col].isMine = true
  }

  for (let row = 0; row < populated.length; row++) {
    for (let col = 0; col < populated[row].length; col++) {
      if (populated[row][col].isMine) continue
      populated[row][col].adjacentMines = getNeighbors(populated, row, col)
        .filter((position) => populated[position.row][position.col].isMine)
        .length
    }
  }

  return populated
}

export function revealCells(
  board: MinesweeperBoard,
  row: number,
  col: number,
): MinesweeperBoard {
  const revealed = board.map((boardRow) =>
    boardRow.map((cell) => ({ ...cell })),
  )
  const stack: Position[] = [{ row, col }]

  while (stack.length > 0) {
    const position = stack.pop()!
    const cell = revealed[position.row]?.[position.col]
    if (!cell || cell.isRevealed || cell.isFlagged) continue

    cell.isRevealed = true
    if (cell.isMine || cell.adjacentMines !== 0) continue

    for (const neighbor of getNeighbors(revealed, position.row, position.col)) {
      const neighborCell = revealed[neighbor.row][neighbor.col]
      if (!neighborCell.isRevealed && !neighborCell.isFlagged) {
        stack.push(neighbor)
      }
    }
  }

  return revealed
}

export function revealAllMines(board: MinesweeperBoard): MinesweeperBoard {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      isRevealed: cell.isMine || cell.isRevealed,
    })),
  )
}

export function toggleFlag(
  board: MinesweeperBoard,
  row: number,
  col: number,
): MinesweeperBoard {
  if (!board[row]?.[col] || board[row][col].isRevealed) return board

  return board.map((boardRow, rowIndex) =>
    boardRow.map((cell, colIndex) =>
      rowIndex === row && colIndex === col
        ? { ...cell, isFlagged: !cell.isFlagged }
        : { ...cell },
    ),
  )
}

export function countFlags(board: MinesweeperBoard): number {
  return board.flat().filter((cell) => cell.isFlagged).length
}

export function hasWon(board: MinesweeperBoard): boolean {
  return board.every((row) =>
    row.every((cell) => cell.isMine || cell.isRevealed),
  )
}
