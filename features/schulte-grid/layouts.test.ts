import { describe, expect, it } from "vitest"

import {
  SCHULTE_LAYOUT_COUNTS,
  SCHULTE_LAYOUT_TEMPLATES,
  createSchulteLayout,
  type SchultePoint,
} from "./layouts"

const EPSILON = 1e-5

function signedArea(points: readonly SchultePoint[]) {
  let twiceArea = 0
  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    const next = points[(index + 1) % points.length]
    twiceArea += point.x * next.y - next.x * point.y
  }
  return twiceArea / 2
}

function area(points: readonly SchultePoint[]) {
  return Math.abs(signedArea(points))
}

function pointInsideConvexPolygon(
  point: SchultePoint,
  polygon: readonly SchultePoint[],
) {
  const orientation = signedArea(polygon) >= 0 ? 1 : -1

  return polygon.every((start, index) => {
    const end = polygon[(index + 1) % polygon.length]
    const cross = (
      (end.x - start.x) * (point.y - start.y)
      - (end.y - start.y) * (point.x - start.x)
    )
    return cross * orientation >= -EPSILON
  })
}

function lineIntersection(
  start: SchultePoint,
  end: SchultePoint,
  clipStart: SchultePoint,
  clipEnd: SchultePoint,
) {
  const segmentX = end.x - start.x
  const segmentY = end.y - start.y
  const clipX = clipEnd.x - clipStart.x
  const clipY = clipEnd.y - clipStart.y
  const denominator = segmentX * clipY - segmentY * clipX

  if (Math.abs(denominator) <= EPSILON) return end

  const ratio = (
    (clipStart.x - start.x) * clipY
    - (clipStart.y - start.y) * clipX
  ) / denominator
  return {
    x: start.x + segmentX * ratio,
    y: start.y + segmentY * ratio,
  }
}

function intersectConvexPolygons(
  subject: readonly SchultePoint[],
  clip: readonly SchultePoint[],
) {
  let output = [...subject]
  const orientation = signedArea(clip) >= 0 ? 1 : -1

  for (let clipIndex = 0; clipIndex < clip.length; clipIndex++) {
    const clipStart = clip[clipIndex]
    const clipEnd = clip[(clipIndex + 1) % clip.length]
    const input = output
    output = []
    if (input.length === 0) break

    const isInside = (point: SchultePoint) => {
      const cross = (
        (clipEnd.x - clipStart.x) * (point.y - clipStart.y)
        - (clipEnd.y - clipStart.y) * (point.x - clipStart.x)
      )
      return cross * orientation >= -EPSILON
    }

    for (let index = 0; index < input.length; index++) {
      const current = input[index]
      const next = input[(index + 1) % input.length]
      const currentInside = isInside(current)
      const nextInside = isInside(next)

      if (currentInside && nextInside) {
        output.push(next)
      } else if (currentInside && !nextInside) {
        output.push(lineIntersection(current, next, clipStart, clipEnd))
      } else if (!currentInside && nextInside) {
        output.push(lineIntersection(current, next, clipStart, clipEnd), next)
      }
    }
  }

  return output
}

describe("Schulte irregular layouts", () => {
  it.each(
    SCHULTE_LAYOUT_COUNTS.flatMap((count) => (
      SCHULTE_LAYOUT_TEMPLATES.map((template) => [count, template] as const)
    )),
  )(
    "creates a complete, non-overlapping %i-cell %s layout",
    (count, template) => {
      const layout = createSchulteLayout({ count, template, seed: "round-17" })
      const expectedSide = Math.sqrt(count)

      expect(layout.cells).toHaveLength(count)
      expect(layout.side).toBe(expectedSide)
      expect(layout.rows).toBe(expectedSide)
      expect(layout.columns).toBe(expectedSide)
      expect(layout.template).toBe(template)
      expect(layout.minCellDimension).toBeGreaterThan(30)

      for (const cell of layout.cells) {
        expect(cell.points.length).toBeGreaterThanOrEqual(3)
        expect(area(cell.points)).toBeGreaterThan(1)
        expect(pointInsideConvexPolygon(cell.center, cell.points)).toBe(true)
        expect(cell.minDimension).toBeGreaterThan(30)
        expect(cell.safeDiameter).toBeCloseTo(cell.minDimension, 8)
        expect(cell.bounds.width).toBeGreaterThanOrEqual(cell.minDimension)
        expect(cell.bounds.height).toBeGreaterThanOrEqual(cell.minDimension)
        expect(cell.hitPath).toMatch(/^M.* Z$/)
        expect(cell.path).toMatch(/^M.* Z$/)

        const distanceFromBoardCenter = Math.hypot(
          cell.center.x - layout.clipCircle.cx,
          cell.center.y - layout.clipCircle.cy,
        )
        expect(distanceFromBoardCenter).toBeLessThan(layout.clipCircle.r)

        for (const point of cell.points) {
          const pointRadius = Math.hypot(
            point.x - layout.clipCircle.cx,
            point.y - layout.clipCircle.cy,
          )
          expect(pointRadius).toBeLessThanOrEqual(layout.clipCircle.r + EPSILON)
        }
      }

      const cellsArea = layout.cells.reduce(
        (sum, cell) => sum + area(cell.points),
        0,
      )
      const boardArea = area(layout.boundary)
      expect(Math.abs(cellsArea - boardArea) / boardArea).toBeLessThan(1e-8)

      for (let left = 0; left < layout.cells.length; left++) {
        for (let right = left + 1; right < layout.cells.length; right++) {
          const intersection = intersectConvexPolygons(
            layout.cells[left].points,
            layout.cells[right].points,
          )
          expect(area(intersection)).toBeLessThan(0.01)
        }
      }
    },
  )

  it("is deterministic for the same seed and changes safely for another seed", () => {
    const first = createSchulteLayout({
      count: 49,
      template: "golden-angle",
      seed: "same-round",
    })
    const repeated = createSchulteLayout({
      count: 49,
      template: "golden-angle",
      seed: "same-round",
    })
    const different = createSchulteLayout({
      count: 49,
      template: "golden-angle",
      seed: "another-round",
    })

    expect(repeated).toEqual(first)
    expect(different.seed).not.toBe(first.seed)
    expect(different.cells.map((cell) => cell.center)).not.toEqual(
      first.cells.map((cell) => cell.center),
    )
    expect(different.minCellDimension).toBeGreaterThan(30)
  })

  it("keeps all three base topology families geometrically distinct", () => {
    const signatures = SCHULTE_LAYOUT_TEMPLATES.map((template) => {
      const layout = createSchulteLayout({ count: 36, template, seed: 42 })
      return layout.cells
        .map((cell) => `${cell.center.x.toFixed(2)},${cell.center.y.toFixed(2)}`)
        .join("|")
    })

    expect(new Set(signatures)).toHaveLength(SCHULTE_LAYOUT_TEMPLATES.length)
  })

  it("reduces seeded deformation to satisfy an achievable minimum size", () => {
    const unrestricted = createSchulteLayout({
      count: 49,
      template: "concentric",
      seed: "minimum-size",
    })
    const requestedMinimum = unrestricted.minCellDimension + 1
    const constrained = createSchulteLayout({
      count: 49,
      template: "concentric",
      seed: "minimum-size",
      minimumCellDimension: requestedMinimum,
    })

    expect(constrained.minCellDimension).toBeGreaterThanOrEqual(
      requestedMinimum,
    )
    expect(constrained.deformation).toBeLessThan(unrestricted.deformation)
  })

  it("selects a template deterministically when none is provided", () => {
    const first = createSchulteLayout({ count: 25, seed: "auto-template" })
    const second = createSchulteLayout({ count: 25, seed: "auto-template" })
    expect(second.template).toBe(first.template)
    expect(SCHULTE_LAYOUT_TEMPLATES).toContain(first.template)
  })

  it("rejects invalid runtime geometry options and impossible minimums", () => {
    expect(() => createSchulteLayout({ count: 16 as 25 })).toThrow(RangeError)
    expect(() => createSchulteLayout({ count: 25, size: 0 })).toThrow(RangeError)
    expect(() => createSchulteLayout({ count: 25, padding: 400 })).toThrow(RangeError)
    expect(() => createSchulteLayout({ count: 25, gap: -1 })).toThrow(RangeError)
    expect(() => createSchulteLayout({ count: 25, deformation: 1.1 })).toThrow(RangeError)
    expect(() => createSchulteLayout({
      count: 49,
      minimumCellDimension: 500,
    })).toThrow(RangeError)
  })
})
