import { describe, expect, it } from "vitest"

import {
  checkBingo,
  getMarkedNumbersNewestFirst,
  removeMarkedNumber,
  type BingoCardGrid,
} from "./card-rules"

const card: BingoCardGrid = [
  [1, 16, 31, 46, 61],
  [2, 17, 32, 47, 62],
  [3, 18, null, 48, 63],
  [4, 19, 34, 49, 64],
  [5, 20, 35, 50, 65],
]

describe("removeMarkedNumber", () => {
  it("removes only the selected number without mutating the input set", () => {
    const markedNumbers = new Set([3, 10, 19])
    const result = removeMarkedNumber(markedNumbers, 10)

    expect(result).toEqual(new Set([3, 19]))
    expect(result).not.toBe(markedNumbers)
    expect(markedNumbers).toEqual(new Set([3, 10, 19]))
  })

  it("is idempotent when the number is already unmarked", () => {
    const markedNumbers = new Set([3, 19])

    expect(removeMarkedNumber(markedNumbers, 10)).toBe(markedNumbers)
    expect(
      removeMarkedNumber(removeMarkedNumber(markedNumbers, 10), 10),
    ).toBe(markedNumbers)
  })

  it("can remove the final marked number", () => {
    expect(removeMarkedNumber(new Set([3]), 3)).toEqual(new Set())
  })
})

describe("checkBingo after an undo", () => {
  it("removes Bingo when the withdrawn number breaks the completed pattern", () => {
    const completedRow = new Set([1, 16, 31, 46, 61])

    expect(checkBingo(card, completedRow)).toBe(true)
    expect(checkBingo(card, removeMarkedNumber(completedRow, 31))).toBe(false)
  })
})

describe("getMarkedNumbersNewestFirst", () => {
  it("keeps the most recently marked number first", () => {
    expect(getMarkedNumbersNewestFirst(new Set([2, 10, 75]))).toEqual([
      75,
      10,
      2,
    ])
  })

  it("moves a removed and re-added number back to the front", () => {
    const markedNumbers = new Set([2, 10, 75])
    const afterUndo = removeMarkedNumber(markedNumbers, 10)
    const afterRemark = new Set([...afterUndo, 10])

    expect(getMarkedNumbersNewestFirst(afterUndo)).toEqual([75, 2])
    expect(getMarkedNumbersNewestFirst(afterRemark)).toEqual([10, 75, 2])
  })
})
