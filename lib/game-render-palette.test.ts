import { afterEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_GAME_RENDER_PALETTE, parseGameRenderColor, readGameRenderPalette } from "./game-render-palette"

afterEach(() => vi.unstubAllGlobals())

describe("canvas theme colors", () => {
  it("parses CSS hex colors without treating malformed values as black", () => {
    expect(parseGameRenderColor(" #a1B2c3 ", 7)).toBe(0xa1b2c3)
    expect(parseGameRenderColor("#AbC", 7)).toBe(0xaabbcc)
    for (const value of ["", "#12", "#bad-token", "#123456junk", "transparent", "var(--other)"]) {
      expect(parseGameRenderColor(value, 7)).toBe(7)
    }
  })

  it("reads inherited CSS variables from the live element each time", () => {
    const element = {} as Element
    const values: Record<string, string> = {
      "--game-canvas": "#edf4ff",
      "--game-accent": "#2860ed",
      "--game-ink": "#20324e",
      "--game-brick-1": "#467eea",
      "--game-brick-5": "#3d64a9",
    }
    const computed = vi.fn(() => ({ getPropertyValue: (token: string) => values[token] ?? "" }))
    vi.stubGlobal("getComputedStyle", computed)
    const pocket = readGameRenderPalette(element)
    expect(pocket.canvas).toBe(0xedf4ff)
    expect(pocket.accent).toBe(0x2860ed)
    expect(pocket.bricks).toEqual([
      0x467eea,
      ...DEFAULT_GAME_RENDER_PALETTE.bricks.slice(1, 4),
      0x3d64a9,
    ])
    values["--game-canvas"] = "#d8ddbe"
    values["--game-ink"] = "#34442b"
    const retro = readGameRenderPalette(element)
    expect(retro.canvas).toBe(0xd8ddbe)
    expect(retro.ink).toBe(0x34442b)
    expect(pocket.canvas).toBe(0xedf4ff)
    expect(computed).toHaveBeenCalledWith(element)
  })

  it("can be imported without a browser during server rendering", () => {
    expect(readGameRenderPalette()).toEqual(DEFAULT_GAME_RENDER_PALETTE)
  })
})
