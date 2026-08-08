import { describe, expect, it } from "vitest"

import {
  createBingoCard,
  generateBingoCardGrid,
  isBingoCardGrid,
} from "./cards"

describe("Bingo card generation", () => {
  it("generates a valid 75-ball card with a free center", () => {
    const grid = generateBingoCardGrid()

    expect(isBingoCardGrid(grid)).toBe(true)
    expect(grid[2][2]).toBeNull()
    expect(grid.flat().filter((cell) => cell !== null)).toHaveLength(24)
  })

  it("assigns a stable card shape and caller-provided name", () => {
    const card = createBingoCard("Card 1")

    expect(card.id.length).toBeGreaterThanOrEqual(8)
    expect(card.name).toBe("Card 1")
    expect(isBingoCardGrid(card.numbers)).toBe(true)
  })

  it("rejects a number outside its BINGO column", () => {
    const grid = generateBingoCardGrid().map((row) => [...row])
    grid[0][0] = 75

    expect(isBingoCardGrid(grid)).toBe(false)
  })
})
