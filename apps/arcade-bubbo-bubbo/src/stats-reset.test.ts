import { afterEach, expect, it, vi } from "vitest"

// The score update itself needs no renderer or physics; keep their UI dependencies out of this unit test.
vi.mock("../upstream/src/game/systems/HudSystem", () => ({ HudSystem: class {} }))
vi.mock("../upstream/src/game/systems/PhysicsSystem", () => ({ PhysicsSystem: class {} }))

import type { Game } from "../upstream/src/game/Game"
import { Stats } from "../upstream/src/game/Stats"
import { ScoreSystem } from "../upstream/src/game/systems/ScoreSystem"
import { storage } from "../upstream/src/storage"

afterEach(() => vi.unstubAllGlobals())

it("keeps the saved 50,000 high score when a reused game starts over and earns less", () => {
  const saved = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
  })
  storage.setStorage({ muted: false, highscore: 50_000 })
  const stats = new Stats()
  stats.set("score", 2_600)
  stats.set("bubblesPopped", 9)

  stats.reset()
  stats.increment("score", 1_200)
  const score = new ScoreSystem()
  score.game = { stats } as Game
  score.updateHighscore()

  expect(stats.get("score")).toBe(1_200)
  expect(stats.get("bubblesPopped")).toBe(0)
  expect(stats.get("highscore")).toBe(50_000)
  expect(storage.getStorageItem("highscore")).toBe(50_000)
})
