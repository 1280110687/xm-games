import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { parse } from "postcss"
import { describe, expect, it } from "vitest"
import { THEME_CONFIG } from "../../../../lib/theme"

const root = "styles/themes/theme-three/"
const sheets = [
  "tokens.css",
  "materials.css",
  "chrome.css",
  "home.css",
  "tools.css",
  "secondary.css",
  "pwa.css",
]
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const css = (sheet: string) => read(root + "glass/" + sheet)

describe("Theme Three shared glass system", () => {
  it("centers both header icons without inheriting SelectTrigger's space-between alignment", () => {
    const declarations: Record<string, string> = {}
    parse(css("chrome.css")).walkRules((rule) => {
      if (rule.selector !== "html[data-theme='theme-three'] .t3-topbar-controls :is(.language-switcher-trigger,.theme-switcher-trigger)") return
      rule.walkDecls(decl => { declarations[decl.prop] = decl.value })
    })
    expect(declarations).toMatchObject({
      display: "grid",
      "place-items": "center",
      "justify-content": "center",
      gap: "0",
      width: "44px",
      height: "44px",
    })
  })

  it("scopes every material rule to Theme Three without a sample-page gate", () => {
    for (const sheet of sheets) {
      const source = css(sheet)
      expect(source).not.toMatch(/data-t3-sample/)
      // Only the backdrop may respond to page context; component layout is never gated.
      if (sheet !== "tokens.css") expect(source).not.toContain("body:has")
      parse(source).walkRules((rule) => {
        for (const selector of rule.selectors)
          expect(
            selector
              .replace(/\s+/g, " ")
              .startsWith("html[data-theme='theme-three']"),
            selector,
          ).toBe(true)
      })
    }
  })

  it("owns its layout without the retired foundation and preserves route-lazy game CSS", () => {
    const entry = read(root + "index.css")
    expect(entry).not.toContain("foundation.css")
    expect(existsSync(root + "foundation.css")).toBe(false)
    for (const sheet of sheets)
      expect(css("index.css")).toContain(`@import './${sheet}'`)
    for (const source of [
      entry,
      css("index.css"),
    ])
      expect(source).not.toMatch(/@import.*(?:classic-games|schulte-grid)/)
  })

  it("keeps PWA chrome aligned with the page background", () => {
    expect(THEME_CONFIG["theme-three"].themeColor).toBe("#0c1827")
    expect(css("tokens.css")).toContain(
      `background: ${THEME_CONFIG["theme-three"].themeColor}`,
    )
  })

  it("covers all five utility routes through their existing shared page class", () => {
    for (const [component, label] of [
      ["text-tool", "text-tool"],
      ["json-tool", "json-tool"],
      ["base64-tool", "base64-tool"],
      ["qr-code-tool", "qr-code"],
      ["text-crypto-tool", "text-crypto"],
    ]) {
      const source = read(`features/tools/components/${component}.tsx`)
      expect(source).toContain("utility-page")
      expect(source).toContain(`aria-labelledby="${label}-input-label"`)
      expect(source).toContain(`id="${label}-input-label"`)
    }
    expect(css("tools.css")).not.toContain("[data-page='text-tool']")
    expect(css("tools.css")).toContain(".offline-tool-workspace")
    expect(css("tools.css")).toContain(":not(.qr-workspace)")
  })

  it("covers navigation, games, tracker, settings and portalled overlays", () => {
    const material = css("materials.css")
    for (const selector of [
      "[data-t3-glass='dock']",
      ".settings-panel",
      ".anime-overview",
      ".anime-library",
      ".classic-2048-shell",
      ".tetris-handheld",
      ".schulte-three-stage",
      ".gomoku-lan-panel",
      ".bingo-lan-panel",
      ".pwa-install-prompt",
      "[data-slot='dialog-content']",
      "[data-slot='select-content']",
      "[data-slot='dropdown-menu-content']",
    ])
      expect(material).toContain(selector)
    // The common material layer must not recolor boards or individual cells.
    expect(material).not.toMatch(
      /\.game-stage\b|\.classic-2048-cell\b|\.schulte-cell\b/,
    )
  })

  it("provides solid fallback and avoids additional blur in nested panels and inputs", () => {
    const material = css("materials.css")
    expect(material).toContain("prefers-reduced-transparency: reduce")
    expect(material).toContain("prefers-reduced-motion: reduce")
    expect(material).toMatch(/@supports not\s*\(/)
    expect(material).toContain("background: var(--t3-solid)")
    expect(material).toContain("Never compound backdrop filters")
    expect(material).toContain("-webkit-backdrop-filter: none")
    for (const sheet of ["home.css", "tools.css", "secondary.css"])
      parse(css(sheet)).walkDecls(/backdrop-filter/, (decl) =>
        expect(decl.value).toBe("none"),
      )
  })

  it("preserves home navigation and removes the pilot marker from components", () => {
    const home = read("features/themes/theme-three/home.tsx")
    expect(home).not.toMatch(
      /data-t3-sample|87%|100%|LOCAL|systemOnline|offlineReady/,
    )
    expect(home).toContain('id="t3-catalog"')
    expect(home).toContain('section === "home" && !searching')
    expect(read("app/page.tsx")).toContain(
      "<ThemeThreeHome categories={HOME_CATEGORIES} />",
    )
    expect(read("features/tools/components/text-tool.tsx")).not.toContain(
      "data-t3-sample",
    )
  })

  it("retains selected controls and lets Bingo's expanded toolbar fit on phones", () => {
    const material = css("materials.css")
    expect(material).toContain("[aria-pressed='true']")
    expect(material).toContain("[aria-selected='true']")
    const secondary = css("secondary.css").replace(/\s+/g, " ")
    expect(secondary).toContain(".game-page[data-page='bingo'] .game-content")
    expect(secondary).toContain("flex-direction: column")
    expect(secondary).toContain("overflow-y: auto")
    expect(secondary).toContain(".settings-control .theme-current-label")
    expect(secondary).toContain(".neon-dashboard .game-actions { order: -1; }")
    expect(read(root + "classic-games.css")).toContain(".classic-tetris-content { flex-direction: column; align-items: center; }")
  })

  it("ships the four original local assets in the offline manifest within a 220KB budget", () => {
    const dir = "public/images/theme-three"
    const files = readdirSync(dir).filter(name => name.endsWith(".webp")).sort()
    expect(files).toEqual(["crystal-2048.webp", "gomoku.webp", "night-lake.webp", "snake.webp"])
    expect(files.reduce((size, name) => size + statSync(`${dir}/${name}`).size, 0)).toBeLessThan(220_000)
    const manifest = JSON.parse(read("public/offline-assets.json"))
    for (const file of files) {
      expect(readFileSync(`${dir}/${file}`).subarray(8,12).toString()).toBe("WEBP")
      expect(manifest.assets).toContain(`/images/theme-three/${file}`)
    }
    expect(read("scripts/generate-offline-assets.mjs")).toContain('"images/theme-three"')
    expect(css("tokens.css")).toContain("/images/theme-three/night-lake.webp")
  })
})
