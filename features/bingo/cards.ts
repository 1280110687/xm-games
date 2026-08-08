export type BingoCardGrid = ReadonlyArray<ReadonlyArray<number | null>>

export interface BingoCard {
  id: string
  numbers: BingoCardGrid
  name: string
}

const BINGO_COLUMNS = [
  { min: 1, max: 15 },
  { min: 16, max: 30 },
  { min: 31, max: 45 },
  { min: 46, max: 60 },
  { min: 61, max: 75 },
] as const

function randomIndex(length: number): number {
  if (length <= 0) throw new RangeError("length must be positive")

  if (globalThis.crypto?.getRandomValues) {
    const rejectionLimit = Math.floor(0x1_0000_0000 / length) * length
    const value = new Uint32Array(1)
    do {
      globalThis.crypto.getRandomValues(value)
    } while (value[0] >= rejectionLimit)
    return value[0] % length
  }

  return Math.floor(Math.random() * length)
}

function createCardId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `bingo-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function generateBingoCardGrid(): BingoCardGrid {
  const columns = BINGO_COLUMNS.map(({ min, max }, columnIndex) => {
    const available = Array.from({ length: max - min + 1 }, (_, index) => min + index)
    return Array.from({ length: 5 }, (_, rowIndex) => {
      if (columnIndex === 2 && rowIndex === 2) return null
      return available.splice(randomIndex(available.length), 1)[0]
    })
  })

  return Array.from({ length: 5 }, (_, rowIndex) => (
    columns.map((column) => column[rowIndex])
  ))
}

export function createBingoCard(name: string): BingoCard {
  return {
    id: createCardId(),
    numbers: generateBingoCardGrid(),
    name,
  }
}

export function isBingoCardGrid(value: unknown): value is BingoCardGrid {
  if (!Array.isArray(value) || value.length !== 5) return false

  const seenByColumn = Array.from({ length: 5 }, () => new Set<number>())
  return value.every((row, rowIndex) => (
    Array.isArray(row)
    && row.length === 5
    && row.every((cell, columnIndex) => {
      if (rowIndex === 2 && columnIndex === 2) return cell === null
      if (!Number.isInteger(cell)) return false

      const number = Number(cell)
      const range = BINGO_COLUMNS[columnIndex]
      if (number < range.min || number > range.max) return false
      if (seenByColumn[columnIndex].has(number)) return false
      seenByColumn[columnIndex].add(number)
      return true
    })
  ))
}

export function isBingoCard(value: unknown): value is BingoCard {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === "string"
    && candidate.id.length >= 8
    && candidate.id.length <= 128
    && typeof candidate.name === "string"
    && candidate.name.length >= 1
    && candidate.name.length <= 32
    && isBingoCardGrid(candidate.numbers)
  )
}

export function cloneBingoCards(cards: readonly BingoCard[]): BingoCard[] {
  return cards.map((card) => ({
    id: card.id,
    name: card.name,
    numbers: card.numbers.map((row) => [...row]),
  }))
}
