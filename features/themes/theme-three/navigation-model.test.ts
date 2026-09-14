import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  getThemeThreeNavigationSection,
  THEME_THREE_LIBRARY_HASH,
  THEME_THREE_TOOLS_HASH,
  THEME_THREE_NAV_ITEMS,
} from "./navigation-model"

import { THEME_THREE_HOME_COPY } from "./home-copy"

describe("Theme Three navigation", () => {
  it.each([
    ["", "home"],
    [THEME_THREE_LIBRARY_HASH, "games"],
    [THEME_THREE_TOOLS_HASH, "tools"],
    ["#unknown", "home"],
  ])("selects the home destination for hash %s", (hash, expected) => {
    expect(getThemeThreeNavigationSection("/", hash)).toBe(expected)
  })

  it.each([
    "/anime-tracker",
    "/base64-tool",
    "/json-tool",
    "/qr-code",
    "/text-crypto",
    "/text-tool",
  ])("selects Tools instead of Library on %s", (pathname) => {
    expect(getThemeThreeNavigationSection(pathname, "")).toBe("tools")
  })

  it.each([
    "/2048",
    "/alternating-trail",
    "/bingo",
    "/bingo-cards",
    "/chess",
    "/chinese-chess",
    "/go",
    "/gomoku",
    "/memory-match",
    "/minesweeper",
    "/neon-breaker",
    "/reversi",
    "/schulte-grid",
    "/snake",
    "/sudoku",
    "/tetris",
  ])("keeps Library selected on %s even with a stale home hash", (pathname) => {
    expect(
      getThemeThreeNavigationSection(pathname, THEME_THREE_TOOLS_HASH),
    ).toBe("games")
  })

  it("handles settings and tracker descendants without misclassifying unknown pages", () => {
    expect(getThemeThreeNavigationSection("/settings", "")).toBe("settings")
    expect(getThemeThreeNavigationSection("/settings/profile", "")).toBe(
      "settings",
    )
    expect(getThemeThreeNavigationSection("/anime-tracker/details", "")).toBe("tools")
    expect(getThemeThreeNavigationSection("/unknown", "")).toBeUndefined()
  })

  it("renders three destinations and does not scroll the new view to a legacy hash anchor", () => {
    const nav = readFileSync(new URL("./theme-three-navigation.tsx", import.meta.url), "utf8")
    const home = readFileSync(new URL("./home.tsx", import.meta.url), "utf8")
    const hook = readFileSync(new URL("./use-section.ts", import.meta.url), "utf8")
    expect(THEME_THREE_NAV_ITEMS.map(item => item.key)).toEqual(["home", "games", "tools"])
    expect(THEME_THREE_NAV_ITEMS.map(item => THEME_THREE_HOME_COPY.zh[item.key])).toEqual(["首页", "游戏库", "工具"])
    expect(nav).toContain("scroll={false}")
    expect(nav).toContain("onNavigate={() => navigateThemeThree(hash)}")
    expect(nav).not.toContain('href="/settings"')
    expect(hook).toContain('window.addEventListener("popstate", sync)')
    expect(home).toContain('window.addEventListener(THEME_THREE_HOME_NAVIGATION, reset)')
    expect(home).toContain('setQuery("")')
    expect(home).not.toContain("scrollIntoView")
    expect(home).not.toContain('id="theme-three-tools"')
    expect(home).not.toContain('id="theme-three-game-library"')
  })
  it("keeps the selected destination across theme switches and trailing slashes", () => {
    expect(getThemeThreeNavigationSection("/", "#pocket-tools")).toBe("tools")
    expect(getThemeThreeNavigationSection("/", "#arcade-games")).toBe("games")
    expect(getThemeThreeNavigationSection("/text-tool/", "")).toBe("tools")
    expect(getThemeThreeNavigationSection("/2048/", "")).toBe("games")
  })
})
