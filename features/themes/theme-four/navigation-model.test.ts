import { describe, expect, it } from "vitest"
import { getThemeFourActiveSection } from "./navigation-model"

describe("Theme Four active navigation", () => {
  it.each([
    ["/", null],
    ["/settings", "settings"],
    ["/anime-tracker", "tracker"],
    ["/text-tool", "rooms"],
    ["/gomoku", "rooms"],
  ])("selects one section for %s", (pathname, expected) => {
    expect(getThemeFourActiveSection(pathname as string)).toBe(expected)
  })
})
