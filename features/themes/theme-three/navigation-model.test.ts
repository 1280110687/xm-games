import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  getThemeThreeNavigationSection,
  THEME_THREE_LIBRARY_HASH,
  THEME_THREE_TOOLS_HASH,
} from "./navigation-model"

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

  it("renders the requested labels in order with a real, search-resettable Tools anchor", () => {
    const nav = readFileSync(
      new URL("./theme-three-navigation.tsx", import.meta.url),
      "utf8",
    )
    const home = readFileSync(new URL("./home.tsx", import.meta.url), "utf8")
    expect(nav).toMatch(
      /home: "首页",\s+games: "游戏库",\s+tools: "工具",\s+settings: "设置中心"/,
    )
    expect(nav.match(/label: copy\.(\w+)/g)).toEqual([
      "label: copy.home",
      "label: copy.games",
      "label: copy.tools",
      "label: copy.settings",
    ])
    expect(nav).toContain("onNavigate={onNavigate}")
    expect(nav).toContain('window.addEventListener("popstate", syncHash)')
    expect(home).toContain('category.titleKey === "categoryTools"')
    expect(home).toContain("THEME_THREE_TOOLS_HASH.slice(1)")
    expect(home).toContain(
      "window.addEventListener(THEME_THREE_HOME_NAVIGATION, onHomeNavigation)",
    )
    expect(home).toContain('setQuery("")')
    expect(home).toContain("scrollIntoView()")
  })
})
