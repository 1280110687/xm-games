import { describe, expect, it } from "vitest"
import { clampExitPosition, immersiveGameExitHref } from "./manifest"

describe("immersive exit control", () => {
  it("keeps a dragged exit reachable after portrait rotates to a short landscape viewport", () => {
    expect(clampExitPosition({ x: 330, y: 740 }, { left: 8, top: 32, right: 804, bottom: 367 })).toEqual({ x: 330, y: 323 })
    expect(clampExitPosition({ x: -90, y: 0 }, { left: 32, top: 8, right: 740, bottom: 367 })).toEqual({ x: 32, y: 8 })
  })
  it("returns to the active theme's game collection", () => {
    expect(immersiveGameExitHref("theme-pocket")).toBe("/#pocket-games")
    expect(immersiveGameExitHref("theme-three")).toBe("/#theme-three-game-library")
    expect(immersiveGameExitHref("theme-retro")).toBe("/#retro-games")
    expect(immersiveGameExitHref("theme-four")).toBe("/")
  })
})
