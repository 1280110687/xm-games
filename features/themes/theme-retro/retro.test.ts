import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { isThemeId, normalizeTheme, THEME_CONFIG, themeLoadsWebglExperience } from "../../../lib/theme"
import { HOME_CATEGORIES } from "../../catalog/catalog"
import { getRetroCatalog, getRetroSection, RETRO_ART, RETRO_FEATURED, wrapCartridge } from "./model"
import { RETRO_COPY } from "./copy"
import { existsSync } from "node:fs"
import postcss from "postcss"

describe("retro handheld theme registration", () => {
  it("accepts a saved retro preference without opting into WebGL", () => {
    expect(isThemeId("theme-retro")).toBe(true)
    expect(normalizeTheme("theme-retro")).toBe("theme-retro")
    expect(THEME_CONFIG[normalizeTheme("theme-retro")].colorScheme).toBe("light")
    expect(themeLoadsWebglExperience(normalizeTheme("theme-retro"))).toBe(false)
  })
  it("dispatches home and secondary headers to their own implementation", () => {
    expect(readFileSync("app/page.tsx", "utf8")).toContain("<RetroHome categories={HOME_CATEGORIES}")
    expect(readFileSync("components/game-header.tsx", "utf8")).toContain("<RetroPageHeader")
  })
})

describe("retro catalog and navigation", () => {
  const { games, tools } = getRetroCatalog(HOME_CATEGORIES)
  const toolPaths = tools.map(entry => entry.href)
  it("preserves every real game and tool without duplicate entries", () => {
    expect(games).toHaveLength(16)
    expect(tools).toHaveLength(6)
    expect(new Set([...games, ...tools].map(entry => entry.href)).size).toBe(22)
    for (const path of RETRO_FEATURED) expect(games.some(entry => entry.href === path)).toBe(true)
  })
  it.each(["#retro-tools", "#pocket-tools", "#theme-three-toolbox", "#arcade-tools"])("keeps the tools destination from %s", hash => {
    expect(getRetroSection("/", hash, toolPaths)).toBe("tools")
  })
  it.each(["#retro-games", "#theme-three-game-library", "#pocket-games"])("keeps the library destination from %s", hash => {
    expect(getRetroSection("/", hash, toolPaths)).toBe("games")
  })
  it("returns secondary routes to the matching catalog, including trailing slashes", () => {
    expect(getRetroSection("/", "", toolPaths)).toBe("home")
    for (const entry of tools) expect(getRetroSection(entry.href + "/", "", toolPaths)).toBe("tools")
    for (const entry of games) expect(getRetroSection(entry.href, "", toolPaths)).toBe("games")
  })
  it("wraps cartridge selection safely in both directions", () => {
    expect(wrapCartridge(-1, 3)).toBe(2)
    expect(wrapCartridge(3, 3)).toBe(0)
    expect(wrapCartridge(100, 0)).toBe(0)
  })
  it("has complete Chinese, English and Thai presentation copy", () => {
    for (const locale of ["en", "th"] as const) expect(Object.keys(RETRO_COPY[locale])).toEqual(Object.keys(RETRO_COPY.zh))
    for (const copy of Object.values(RETRO_COPY)) expect(Object.values(copy).every(value => value.trim())).toBe(true)
  })
})

describe("retro presentation boundaries", () => {
  it("owns its CSS, preserves route splitting and keeps all assets offline", () => {
    const manifest = JSON.parse(readFileSync("public/offline-assets.json", "utf8"))
    const serialized = JSON.stringify(manifest)
    for (const name of ["lcd-frame", "cartridge", "shell-texture", "vent-grille", ...Object.values(RETRO_ART)]) {
      const url = `/images/theme-retro/${name}.webp`
      expect(existsSync(`public${url}`)).toBe(true)
      expect(serialized).toContain(url)
    }
    expect(serialized).toContain("/fonts/silkscreen/Silkscreen-Bold.ttf")
    for (const file of ["index", "shared", "tools", "games", "classic-games", "schulte-grid"]) {
      const css = readFileSync(`styles/themes/theme-retro/${file}.css`, "utf8")
      expect(() => postcss.parse(css)).not.toThrow()
      expect(css).not.toMatch(/theme-pocket|theme-arcade|theme-three|theme-four/)
    }
  })
  it("keeps header icons centered and the pixel title on one line", () => {
    const css = readFileSync("styles/themes/theme-retro/index.css", "utf8")
    expect(css).toContain("justify-content: center; gap: 0; width: 44px")
    expect(css).toContain("white-space: nowrap")
    expect(css).toContain("prefers-reduced-motion: no-preference")
    expect(css).toContain("--surface-low:")
  })
})
