import { readFileSync, readdirSync, statSync } from "node:fs"
import { describe, expect, it } from "vitest"
import postcss from "postcss"
import { HOME_CATEGORIES } from "../../catalog/catalog"
import { normalizeTheme, themeLoadsWebglExperience, themeBootstrapScript } from "../../../lib/theme"
import { getPocketEntries, getPocketSection, POCKET_ART, POCKET_TOOL_ART, POCKET_FEATURED, POCKET_NAV_ITEMS } from "./model"
import { POCKET_COPY } from "./copy"

const read = (path: string) => readFileSync(path, "utf8")
describe("pocket launcher", () => {
  it("has its own theme identity and preserves retired preference migration", () => {
    expect(normalizeTheme("theme-pocket")).toBe("theme-pocket")
    expect(normalizeTheme("theme-two")).toBe("theme-pocket")
    expect(themeLoadsWebglExperience("theme-pocket")).toBe(false)
    expect(themeBootstrapScript).toContain('"theme-pocket"')
  })
  it("matches the selected six-icon order and three-destination navigation", () => {
    expect(getPocketEntries(HOME_CATEGORIES,"home","featured").map(entry => entry.href)).toEqual(POCKET_FEATURED)
    expect(POCKET_FEATURED).toEqual(["/bingo","/2048","/snake","/gomoku","/chess","/tetris"])
    expect(POCKET_NAV_ITEMS.map(item => item.key)).toEqual(["home","games","tools"])
  })
  it("keeps all 22 entries reachable including focus exercises and bingo", () => {
    expect(getPocketEntries(HOME_CATEGORIES,"games","featured")).toHaveLength(16)
    expect(getPocketEntries(HOME_CATEGORIES,"tools","featured")).toHaveLength(6)
    const filtered = ["board","puzzle","arcade"] as const
    expect(new Set(filtered.flatMap(filter => getPocketEntries(HOME_CATEGORIES,"games",filter).map(entry => entry.href))).size).toBe(16)
    for (const category of HOME_CATEGORIES) for (const entry of category.games) {
      expect(getPocketSection(`${entry.href}/`,"#pocket-tools")).toBe(category.titleKey === "categoryTools" ? "tools" : "games")
    }
  })
  it("retains navigation intent across appearance switches", () => {
    expect(getPocketSection("/","#arcade-games")).toBe("games")
    expect(getPocketSection("/","#theme-three-tools")).toBe("tools")
    expect(getPocketSection("/","")).toBe("home")
  })
  it("does not import any other theme presentation", () => {
    for (const file of readdirSync("features/themes/theme-pocket").filter(file => /\.tsx?$/.test(file) && !file.endsWith("test.ts"))) {
      expect(read(`features/themes/theme-pocket/${file}`)).not.toMatch(/theme-arcade|theme-three|theme-four/)
    }
    for (const file of readdirSync("styles/themes/theme-pocket")) {
      const css = read(`styles/themes/theme-pocket/${file}`)
      expect(css).not.toMatch(/theme-arcade|theme-three|theme-four/)
      expect(() => postcss.parse(css)).not.toThrow()
    }
  })
  it("gives every game its own cover instead of mixing illustrations and line icons", () => {
    const games = getPocketEntries(HOME_CATEGORIES,"games","featured")
    expect(Object.keys(POCKET_ART).sort()).toEqual(games.map(game => game.href).sort())
    expect(new Set(Object.values(POCKET_ART)).size).toBe(games.length)
  })
  it("gives every tool its own artwork, shared with the home shortcuts", () => {
    const tools = getPocketEntries(HOME_CATEGORIES,"tools","featured")
    expect(Object.keys(POCKET_TOOL_ART).sort()).toEqual(tools.map(tool => tool.href).sort())
    expect(new Set(Object.values(POCKET_TOOL_ART)).size).toBe(tools.length)
    expect(POCKET_TOOL_ART["/text-tool"]).toBe("documents")
    const home = read("features/themes/theme-pocket/home.tsx")
    expect(home).toContain("POCKET_TOOL_ART[entry.href]")
    expect(home).toContain('POCKET_TOOL_ART["/anime-tracker"]')
    expect(home).toContain('POCKET_TOOL_ART["/text-tool"]')
    expect(home).not.toContain("<Tv ")
  })
  it("ships all covers offline while retaining the featured download budget", () => {
    const dir = "public/images/theme-pocket"
    const files = readdirSync(dir).sort()
    expect(files).toEqual([...Object.values(POCKET_ART),...Object.values(POCKET_TOOL_ART)].map(name => `${name}.webp`).sort())
    for (const file of files) {
      expect(readFileSync(`${dir}/${file}`).subarray(8,12).toString()).toBe("WEBP")
      expect(statSync(`${dir}/${file}`).size).toBeLessThan(35_000)
    }
    const sizeOf = (names: string[]) => names.reduce((total,name) => total + statSync(`${dir}/${name}.webp`).size,0)
    expect(sizeOf([...Object.values(POCKET_ART),"documents"])).toBeLessThan(250_000)
    expect(sizeOf(Object.values(POCKET_TOOL_ART))).toBeLessThan(100_000)
    expect(files.reduce((total,file) => total + statSync(`${dir}/${file}`).size,0)).toBeLessThan(340_000)
    const featuredFiles = [...POCKET_FEATURED.map(href => `${POCKET_ART[href]}.webp`),"documents.webp"]
    expect(featuredFiles.reduce((total,file) => total + statSync(`${dir}/${file}`).size,0)).toBeLessThan(100_000)
    expect(sizeOf([...POCKET_FEATURED.map(href => POCKET_ART[href]),POCKET_TOOL_ART["/text-tool"],POCKET_TOOL_ART["/anime-tracker"]])).toBeLessThan(120_000)
    expect(read("scripts/generate-offline-assets.mjs")).toContain('"images/theme-pocket"')
  })
  it("provides localized copy and equal icon-only header controls", () => {
    for (const locale of ["zh","en","th"] as const) expect(Object.values(POCKET_COPY[locale]).every(Boolean)).toBe(true)
    const css = read("styles/themes/theme-pocket/index.css")
    expect(css).toContain("position: sticky")
    expect(css).toContain("var(--xm-safe-area-top")
    expect(css).toContain(".language-switcher-trigger > :not(svg:first-child) { display: none; }")
    expect(css).toContain("prefers-reduced-motion: no-preference")
    expect(read("components/game-header.tsx")).toContain("<PocketPageHeader")
    expect(read("features/schulte-grid/components/schulte-grid-game.tsx")).toContain("PocketSchulteView")
  })
  it("centers header icons without inheriting the select trigger's space-between alignment", () => {
    const declarations: Record<string, string> = {}
    postcss.parse(read("styles/themes/theme-pocket/index.css")).walkRules(rule => {
      if (rule.selector !== "html[data-theme='theme-pocket'] .pocket-header-controls :is(.language-switcher-trigger,.theme-switcher-trigger)") return
      rule.walkDecls(decl => { declarations[decl.prop] = decl.value })
    })
    expect(declarations).toMatchObject({
      display: "grid",
      "place-items": "center",
      "justify-content": "center",
      gap: "0",
      width: "40px",
      height: "40px",
    })
  })
})
