import { describe, expect, it } from "vitest"

import {
  createAlternatingTrailSequence,
  formatAlternatingTrailTarget,
  getAlternatingTrailTarget,
} from "./sequence"

describe("alternating trail sequence", () => {
  it.each([
    [25, "1", "L", "13", 13, 12],
    [36, "1", "18", "R", 18, 18],
    [49, "1", "X", "25", 25, 24],
  ] as const)(
    "creates the complete %i-target sequence",
    (cellCount, first, penultimate, last, numberCount, letterCount) => {
      const sequence = createAlternatingTrailSequence(cellCount)

      expect(sequence).toHaveLength(cellCount)
      expect(sequence[0].label).toBe(first)
      expect(sequence.at(-2)?.label).toBe(penultimate)
      expect(sequence.at(-1)?.label).toBe(last)
      expect(sequence.filter((target) => target.kind === "number")).toHaveLength(
        numberCount,
      )
      expect(sequence.filter((target) => target.kind === "letter")).toHaveLength(
        letterCount,
      )
      expect(new Set(sequence.map((target) => target.label)).size).toBe(cellCount)
      expect(sequence.map((target) => target.ordinal)).toEqual(
        Array.from({ length: cellCount }, (_, index) => index + 1),
      )
    },
  )

  it("alternates numbers and letters by ordinal", () => {
    expect(getAlternatingTrailTarget(1)).toEqual({
      ordinal: 1,
      kind: "number",
      label: "1",
    })
    expect(getAlternatingTrailTarget(2)).toEqual({
      ordinal: 2,
      kind: "letter",
      label: "A",
    })
    expect(formatAlternatingTrailTarget(3)).toBe("2")
    expect(formatAlternatingTrailTarget(24)).toBe("L")
    expect(formatAlternatingTrailTarget(49)).toBe("25")
  })

  it.each([0, -1, 1.5, 50, Number.NaN])(
    "rejects invalid ordinal %s",
    (ordinal) => {
      expect(() => getAlternatingTrailTarget(ordinal)).toThrow(RangeError)
    },
  )
})
