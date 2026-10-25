import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { DEFAULT_THEME, normalizeTheme, themes } from "../../../lib/theme"

const read = (path: string) => readFileSync(resolve(path), "utf8")

describe("legacy theme retirement", () => {
  it("offers only active themes and migrates retired preferences to Pocket", () => {
    expect(themes).toEqual(["theme-pocket", "theme-three", "theme-four", "theme-retro"])
    expect(DEFAULT_THEME).toBe("theme-pocket")
    expect(normalizeTheme("theme-one")).toBe("theme-pocket")
    expect(normalizeTheme("theme-two")).toBe("theme-pocket")
    expect(normalizeTheme("theme-arcade")).toBe("theme-pocket")
  })

  it("removes legacy theme entry points and exclusive styles", () => {
    for (const theme of ["theme-one", "theme-two", "theme-arcade"]) {
      for (const file of ["index.css", "classic-games.css", "schulte-grid.css"]) {
        expect(existsSync(resolve(`styles/themes/${theme}/${file}`))).toBe(false)
      }
    }
    expect(existsSync(resolve("features/themes/theme-arcade"))).toBe(false)
    expect(existsSync(resolve("public/images/theme-arcade"))).toBe(false)
    expect(existsSync(resolve("features/themes/theme-two/theme-two-tab-bar.tsx"))).toBe(false)
    for (const path of [
      "app/layout.tsx",
      "app/pwa-safe-area.css",
      "app/2048/page.tsx",
      "app/tetris/page.tsx",
      "app/schulte-grid/page.tsx",
      "app/alternating-trail/page.tsx",
      "features/themes/shared/theme-switcher.tsx",
      "features/themes/shared/theme-navigation.tsx",
      "components/game-header.tsx",
      "features/tools/components/text-tool.tsx",
      "features/anime-tracker/components/anime-tracker.tsx",
      "features/schulte-grid/components/schulte-grid-game.tsx",
      "scripts/build-theme-assets.mjs",
      "scripts/generate-offline-assets.mjs",
    ]) {
      expect(read(path)).not.toMatch(/theme-one|theme-two|theme-arcade|ThemeOne|ThemeTwo/)
    }
  })

  it("keeps the route as a dispatcher instead of owning a themed catalog", () => {
    const home = read("app/page.tsx")
    expect(home).toContain('@/features/catalog/catalog')
    expect(home).toContain("<ThemeThreeHome categories={HOME_CATEGORIES} />")
    expect(home).toContain("<ThemeFourHome rooms={HOME_CATEGORIES} />")
    expect(home).not.toMatch(/home-shell|GameCard|CATEGORIES\s*=/)
  })

  it("gives the paper focus layout to Theme Four without a legacy dependency", () => {
    const game = read("features/schulte-grid/components/schulte-grid-game.tsx")
    expect(game).toContain('@/features/themes/theme-four/schulte-view')
    expect(game).not.toMatch(/SchulteThemeOneView|SchulteThemeTwoView|schulte-two|schulte-one/)
    expect(read("styles/themes/theme-four/schulte-grid.css")).not.toContain("schulte-two")
  })

  it("derives server-rendered startup appearance from the active default", () => {
    const layout = read("app/layout.tsx")
    expect(layout).toContain("data-theme={DEFAULT_THEME}")
    expect(layout).toContain("themeColor: THEME_CONFIG[DEFAULT_THEME].themeColor")
    expect(read("app/globals.css")).toContain("@import '../styles/base/tokens.css'")
  })
})
