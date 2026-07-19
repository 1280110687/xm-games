export type Stone = "black" | "white" | null

export type Position = {
  row: number
  col: number
}

export type Territory = {
  black: number
  white: number
}

export function createEmptyBoard(boardSize: number): Stone[][] {
  return Array.from({ length: boardSize }, () =>
    Array<Stone>(boardSize).fill(null),
  )
}

export function getAdjacentPositions(
  board: Stone[][],
  row: number,
  col: number,
): Position[] {
  const adjacent: Position[] = []
  const rowCount = board.length
  const columnCount = board[row]?.length ?? 0

  if (row > 0) adjacent.push({ row: row - 1, col })
  if (row < rowCount - 1) adjacent.push({ row: row + 1, col })
  if (col > 0) adjacent.push({ row, col: col - 1 })
  if (col < columnCount - 1) adjacent.push({ row, col: col + 1 })

  return adjacent
}

export function getGroup(
  board: Stone[][],
  row: number,
  col: number,
): Position[] {
  const color = board[row]?.[col]
  if (!color) return []

  const group: Position[] = []
  const visited = new Set<string>()
  const stack: Position[] = [{ row, col }]

  while (stack.length > 0) {
    const position = stack.pop()!
    const key = `${position.row},${position.col}`
    if (visited.has(key)) continue
    visited.add(key)

    if (board[position.row][position.col] === color) {
      group.push(position)

      for (const adjacent of getAdjacentPositions(
        board,
        position.row,
        position.col,
      )) {
        if (!visited.has(`${adjacent.row},${adjacent.col}`)) {
          stack.push(adjacent)
        }
      }
    }
  }

  return group
}

export function countLiberties(
  board: Stone[][],
  group: Position[],
): number {
  const liberties = new Set<string>()

  for (const position of group) {
    for (const adjacent of getAdjacentPositions(
      board,
      position.row,
      position.col,
    )) {
      if (board[adjacent.row][adjacent.col] === null) {
        liberties.add(`${adjacent.row},${adjacent.col}`)
      }
    }
  }

  return liberties.size
}

export function removeGroup(
  board: Stone[][],
  group: Position[],
): Stone[][] {
  const newBoard = board.map((row) => [...row])

  for (const position of group) {
    newBoard[position.row][position.col] = null
  }

  return newBoard
}

export function isBoardSame(board1: Stone[][], board2: Stone[][]): boolean {
  if (board1.length !== board2.length) return false

  for (let row = 0; row < board1.length; row++) {
    if (board1[row].length !== board2[row].length) return false

    for (let col = 0; col < board1[row].length; col++) {
      if (board1[row][col] !== board2[row][col]) return false
    }
  }

  return true
}

export function calculateTerritory(board: Stone[][]): Territory {
  const visited = new Set<string>()
  let blackTerritory = 0
  let whiteTerritory = 0

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] !== null || visited.has(`${row},${col}`)) continue

      const region: Position[] = []
      const stack: Position[] = [{ row, col }]
      const borders = new Set<Stone>()

      while (stack.length > 0) {
        const position = stack.pop()!
        const key = `${position.row},${position.col}`
        if (visited.has(key)) continue
        visited.add(key)

        region.push(position)

        for (const adjacent of getAdjacentPositions(
          board,
          position.row,
          position.col,
        )) {
          const adjacentStone = board[adjacent.row][adjacent.col]

          if (adjacentStone === null) {
            if (!visited.has(`${adjacent.row},${adjacent.col}`)) {
              stack.push(adjacent)
            }
          } else {
            borders.add(adjacentStone)
          }
        }
      }

      if (borders.size === 1) {
        const color = Array.from(borders)[0]

        if (color === "black") {
          blackTerritory += region.length
        } else {
          whiteTerritory += region.length
        }
      }
    }
  }

  return { black: blackTerritory, white: whiteTerritory }
}
