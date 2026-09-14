import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { DEFAULT_THEME, normalizeTheme, themes } from "../../../lib/theme"

const read = (path: string) => readFileSync(resolve(path), "utf8")

describe("legacy theme retirement", () => {
  it("offers only the retained themes and migrates old preferences to glass", () => {
    expect(themes).toEqual(["theme-arcade", "theme-pocket", "theme-three", "theme-four"])
    expect(DEFAULT_THEME).toBe("theme-three")
    expect(normalizeTheme("theme-one")).toBe("theme-three")
    expect(normalizeTheme("theme-two")).toBe("theme-three")
  })

  it("removes legacy theme entry points and exclusive styles", () => {
    for (const theme of ["theme-one", "theme-two"]) {
      for (const file of ["index.css", "classic-games.css", "schulte-grid.css"]) {
        expect(existsSync(resolve(`styles/themes/${theme}/${file}`))).toBe(false)
      }
    }
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
    ]) {
      expect(read(path)).not.toMatch(/theme-one|theme-two|ThemeOne|ThemeTwo/)
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
