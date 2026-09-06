import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parse } from "postcss"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const root = "styles/themes/theme-four/"
const scoped = (selector: string) => `html[data-theme='theme-four'] ${selector}`

function declarations(file: string, selector: string) {
  const values: Record<string, string[]> = {}
  parse(read(root + file)).walkRules((rule) => {
    if (!rule.selectors.includes(scoped(selector))) return
    rule.walkDecls((decl) => { (values[decl.prop] ??= []).push(decl.value) })
  })
  return values
}

describe("Theme Four secondary page layout contracts", () => {
  it("loads the utility and settings sheets from the theme entry", () => {
    const entry = read(root + "index.css")
    expect(entry).toContain("@import './utilities.css'")
    expect(entry).toContain("@import './settings.css'")
    expect(entry).toContain("@import './pwa.css'")
  })

  it("gives tools a real workbench and usable editor", () => {
    expect(declarations("utilities.css", ".utility-main").display).toContain("grid")
    expect(declarations("utilities.css", ".utility-workspace").display).toContain("grid")
    expect(declarations("utilities.css", ".utility-panel").padding).toContain("1rem")
    expect(declarations("utilities.css", ".utility-textarea").width).toContain("100%")
    expect(declarations("utilities.css", ".utility-textarea")["min-height"]).toContain("12rem")
    expect(declarations("utilities.css", ".offline-tool-stats").display).toContain("grid")
  })

  it("preserves output whitespace and confines long results", () => {
    const result = declarations("utilities.css", ".utility-result")
    expect(result["white-space"]).toContain("pre-wrap")
    expect(result["overflow-wrap"]).toContain("anywhere")
    expect(result.overflow).toContain("auto")
    expect(declarations("utilities.css", ".offline-tool-code-result")["white-space"]).toContain("pre")
  })

  it("lays out settings rows and reserves navigation space", () => {
    expect(declarations("settings.css", ".settings-row").display).toContain("grid")
    expect(declarations("settings.css", ".settings-row").padding).toContain("1rem")
    expect(declarations("settings.css", ".settings-shell")["padding-bottom"])
      .toContain("calc(5.5rem + env(safe-area-inset-bottom))")
    expect(declarations("settings.css", ".settings-shell .theme-current-label").display)
      .toContain("inline")
  })

  it("keeps new presentation rules isolated to Theme Four", () => {
    for (const file of ["utilities.css", "settings.css", "pwa.css"]) {
      parse(read(root + file)).walkRules((rule) => {
        for (const selector of rule.selectors) expect(selector).toMatch(/^html\[data-theme='theme-four'\]/)
      })
    }
  })

  it("reserves natural control width in the compact header", () => {
    expect(declarations("index.css", ".game-header[data-layout='centered']")["grid-template-columns"])
      .toContain("auto minmax(0, 1fr) auto")
  })

  it("makes only the minesweeper summary explicitly horizontal", () => {
    const source = read("features/minesweeper/components/minesweeper-game.tsx")
    expect(source).toMatch(/className="game-summary surface-panel flex flex-row /)
  })

  it("keeps the delayed install prompt out of document flow and above navigation", () => {
    const prompt = declarations("pwa.css", ".pwa-install-prompt")
    expect(prompt.position).toContain("fixed")
    expect(prompt.display).toContain("grid")
    expect(prompt["overflow-y"]).toContain("auto")
    expect(prompt.bottom).toContain("calc(5.25rem + env(safe-area-inset-bottom))")
    expect(declarations("pwa.css", ".pwa-install-prompt__close").position).toContain("absolute")
  })
})
