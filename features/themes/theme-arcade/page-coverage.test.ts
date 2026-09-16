import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import postcss from "postcss"
import { cleanText, getTextStats } from "../../../lib/offline-tools"
import { normalizeTheme, themeBootstrapScript } from "../../../lib/theme"
import { HOME_CATEGORIES } from "../../catalog/catalog"
import { ARCADE_NAV_ITEMS, getArcadeEntries, getArcadeSection, getArcadeRouteSection } from "./home-model"

describe("arcade full page coverage", () => {
  it("uses a new identity without resurrecting either retired preference", () => {
    expect(normalizeTheme("theme-arcade")).toBe("theme-arcade")
    expect(normalizeTheme("theme-one")).toBe("theme-pocket")
    expect(normalizeTheme("theme-two")).toBe("theme-pocket")
  })
  it("keeps the selected identity on every secondary route", () => {
    expect(themeBootstrapScript).not.toContain("location.pathname")
    expect(readFileSync("features/themes/shared/theme-provider.tsx", "utf8")).not.toContain("getThemeForPath")
    for (const category of HOME_CATEGORIES) {
      for (const entry of category.games) {
        const section = category.titleKey === "categoryTools" ? "tools" : "games"
        expect(getArcadeRouteSection(entry.href, "#arcade-tools")).toBe(section)
        expect(getArcadeRouteSection(`${entry.href}/`, "")).toBe(section)
      }
    }
    expect(getArcadeRouteSection("/", "#arcade-tools")).toBe("tools")
    expect(getArcadeRouteSection("/settings", "#arcade-games")).toBeNull()
    expect(getArcadeRouteSection("/unknown", "")).toBeNull()
  })
  it("has only three bottom destinations and retains header appearance controls", () => {
    expect(ARCADE_NAV_ITEMS.map(item => item.key)).toEqual(["home", "games", "tools"])
    expect(ARCADE_NAV_ITEMS.map(item => item.href)).toEqual(["/", "/#arcade-games", "/#arcade-tools"])
    expect(readFileSync("features/themes/theme-arcade/header.tsx", "utf8")).not.toContain("!tool &&")
  })
  it("keeps the sticky toolbar independent of scrolling page context and covers its safe-area gutter", () => {
    const header = readFileSync("features/themes/theme-arcade/header.tsx", "utf8")
    const pageHeader = header.slice(header.indexOf("export function ArcadePageHeader"))
    expect(pageHeader).toContain('<header className="arcade-header arcade-page-header"')
    expect(pageHeader.indexOf("</header>")).toBeLessThan(pageHeader.indexOf('className="arcade-page-context"'))

    const styles = postcss.parse(readFileSync("styles/themes/theme-arcade/index.css", "utf8"))
    const declarations = (selector: string) => {
      const values: Record<string, string> = {}
      styles.walkRules(selector, rule => { rule.walkDecls(decl => { values[decl.prop] = decl.value }) })
      return values
    }
    expect(declarations(".arcade-header")).toMatchObject({ position: "sticky", top: "var(--arcade-header-inset)", "z-index": "40" })
    expect(declarations(".arcade-header::before")).toMatchObject({ position: "absolute", background: "var(--background)", "pointer-events": "none" })
    expect(declarations("html[data-theme='theme-arcade']")["--arcade-header-inset"]).toContain("var(--xm-safe-area-top)")
  })
  it("keeps every existing entry reachable from its game or tool shelf", () => {
    const games = getArcadeEntries(HOME_CATEGORIES, "games", "featured")
    const tools = getArcadeEntries(HOME_CATEGORIES, "tools", "featured")
    expect(games).toHaveLength(16)
    expect(tools).toHaveLength(6)
    expect(new Set([...games, ...tools].map(item => item.href)).size).toBe(22)
    expect(getArcadeEntries(HOME_CATEGORIES, "games", "board")).toHaveLength(5)
    expect(getArcadeEntries(HOME_CATEGORIES, "games", "puzzle")).toHaveLength(4)
    expect(getArcadeEntries(HOME_CATEGORIES, "games", "arcade")).toHaveLength(3)
  })
  it("accepts retained navigation links when returning from an unfinished page", () => {
    expect(getArcadeSection("#theme-three-game-library")).toBe("games")
    expect(getArcadeSection("#theme-three-tools")).toBe("tools")
    expect(getArcadeSection("#arcade-tools")).toBe("tools")
    expect(getArcadeSection("")).toBe("home")
  })
  it("keeps real text statistics and existing blank-line behavior, not mock counts", () => {
    const input = "  Hello XM-Games  \n\nReady to play\nReady to play"
    expect(getTextStats(input)).toEqual({ characterCount: 47, nonWhitespaceCharacterCount: 35, wordCount: 9, lineCount: 4 })
    expect(cleanText(input)).toBe("Hello XM-Games\n\nReady to play")
  })
  it("ships the five illustrations locally within a small download budget", () => {
    const dir = "public/images/theme-arcade"
    const files = readdirSync(dir)
    expect(files.sort()).toEqual(["bingo.webp", "gomoku.webp", "snake.webp", "tetris.webp", "tiles.webp"])
    expect(files.reduce((bytes, file) => bytes + statSync(`${dir}/${file}`).size, 0)).toBeLessThan(100_000)
  })
})
