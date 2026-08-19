import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const PROJECT_ROOT = process.cwd()

const CLASSIC_STYLE_IMPORTS = [
  "classic-games.css",
  "theme-one-classic-games.css",
  "theme-two-classic-games.css",
  "theme-three-classic-games.css",
  "theme-four-classic-games.css",
] as const

const FOCUS_STYLE_IMPORTS = [
  "schulte-grid.css",
  "theme-one-schulte-grid.css",
  "theme-two-schulte-grid.css",
  "theme-three-schulte-grid.css",
  "theme-four-schulte-grid.css",
] as const

function readProjectFile(path: string): string {
  return readFileSync(join(PROJECT_ROOT, path), "utf8")
}

describe("route CSS loading", () => {
  it("keeps game-specific styles out of the root layout", () => {
    const rootLayout = readProjectFile("app/layout.tsx")

    for (const stylesheet of [
      ...CLASSIC_STYLE_IMPORTS,
      ...FOCUS_STYLE_IMPORTS,
    ]) {
      expect(rootLayout).not.toContain(stylesheet)
    }
  })

  it.each(["app/2048/page.tsx", "app/tetris/page.tsx"])(
    "loads the classic game styles only from %s",
    (pagePath) => {
      const page = readProjectFile(pagePath)
      for (const stylesheet of CLASSIC_STYLE_IMPORTS) {
        expect(page).toContain(stylesheet)
      }
    },
  )

  it.each([
    "app/schulte-grid/page.tsx",
    "app/alternating-trail/page.tsx",
  ])("loads the focus exercise styles only from %s", (pagePath) => {
    const page = readProjectFile(pagePath)
    for (const stylesheet of FOCUS_STYLE_IMPORTS) {
      expect(page).toContain(stylesheet)
    }
  })
})
