import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync, statSync } from "node:fs"
import { describe, expect, it } from "vitest"
import sharp from "sharp"
import { PocketArt } from "./art-image"
import { POCKET_DOCUMENT_SIZES, pocketArtSrcSet } from "./art"
import { POCKET_ART, POCKET_TOOL_ART } from "./model"

describe("portable responsive artwork", () => {
  it("eagerly loads the LCP artwork without a runtime image service", () => {
    const html = renderToStaticMarkup(createElement(PocketArt, { name: "documents", sizes: POCKET_DOCUMENT_SIZES, critical: true }))
    expect(html).toContain('loading="eager"')
    expect(html).toContain('fetchPriority="high"')
    expect(html).not.toContain("/_next/image")
    expect(html).toContain('width="320" height="320"')
  })

  it("keeps optional artwork lazy", () => {
    expect(renderToStaticMarkup(createElement(PocketArt, { name: "anime-tracker", sizes: "48px" }))).toContain('loading="lazy"')
  })

  it("builds correctly sized offline variants for every game and tool", async () => {
    const offline = JSON.parse(readFileSync("public/offline-assets.json", "utf8")).assets as string[]
    for (const name of [...Object.values(POCKET_ART), ...Object.values(POCKET_TOOL_ART)]) {
      expect(pocketArtSrcSet(name)).toContain(`${name}.webp 320w`)
      for (const size of name === "documents" ? [96, 160, 240, 256] : [96, 160, 240]) {
        const url = `/images/theme-pocket/responsive/${name}-${size}.webp`
        const metadata = await sharp(`public${url}`).metadata()
        expect(metadata.width).toBe(size)
        expect(metadata.height).toBe(size)
        expect(offline).toContain(url)
      }
    }
    expect(statSync("public/images/theme-pocket/responsive/anime-tracker-96.webp").size)
      .toBeLessThan(statSync("public/images/theme-pocket/anime-tracker.webp").size / 2)
  })
})
