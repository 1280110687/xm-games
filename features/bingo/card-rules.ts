import type { BingoCardGrid } from "./cards"

export type { BingoCardGrid } from "./cards"

function isCellMarked(
  card: BingoCardGrid,
  row: number,
  column: number,
  markedNumbers: ReadonlySet<number>,
): boolean {
  const number = card[row][column]
  return number === null || markedNumbers.has(number)
}

export function checkBingo(
  card: BingoCardGrid,
  markedNumbers: ReadonlySet<number>,
): boolean {
  for (let row = 0; row < 5; row++) {
    if (
      Array.from(
        { length: 5 },
        (_, column) => isCellMarked(card, row, column, markedNumbers),
      ).every(Boolean)
    ) {
      return true
    }
  }

  for (let column = 0; column < 5; column++) {
    if (
      Array.from(
        { length: 5 },
        (_, row) => isCellMarked(card, row, column, markedNumbers),
      ).every(Boolean)
    ) {
      return true
    }
  }

  const descendingDiagonalComplete = Array.from(
    { length: 5 },
    (_, index) => isCellMarked(card, index, index, markedNumbers),
  ).every(Boolean)
  const ascendingDiagonalComplete = Array.from(
    { length: 5 },
    (_, index) => isCellMarked(card, index, 4 - index, markedNumbers),
  ).every(Boolean)

  if (descendingDiagonalComplete || ascendingDiagonalComplete) return true

  const outerCorners = [
    [0, 0],
    [0, 4],
    [4, 0],
    [4, 4],
  ] as const
  if (
    outerCorners.every(([row, column]) =>
      isCellMarked(card, row, column, markedNumbers),
    )
  ) {
    return true
  }

  const innerCorners = [
    [1, 1],
    [1, 3],
    [3, 1],
    [3, 3],
  ] as const
  return innerCorners.every(([row, column]) =>
    isCellMarked(card, row, column, markedNumbers),
  )
}

export function removeMarkedNumber(
  markedNumbers: Set<number>,
  number: number,
): Set<number> {
  if (!markedNumbers.has(number)) return markedNumbers

  const nextMarkedNumbers = new Set(markedNumbers)
  nextMarkedNumbers.delete(number)
  return nextMarkedNumbers
}

export function getMarkedNumbersNewestFirst(
  markedNumbers: ReadonlySet<number>,
): number[] {
  return Array.from(markedNumbers).reverse()
}
