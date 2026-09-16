import { readFileSync } from "node:fs"
import { describe, expect, it, vi, afterEach } from "vitest"
import { themeResourcesBootstrapScript } from "./theme-resources"
import { POCKET_DOCUMENT_SIZES, pocketArtSrcSet } from "../features/themes/theme-pocket/art"

type Link = { rel?: string; as?: string; href?: string; imageSrcset?: string; imageSizes?: string; fetchPriority?: string; dataset: Record<string, string>; onload: () => void; onerror: () => void; remove: () => void }

function bootstrap(theme = "theme-pocket", pathname = "/", hash = "") {
  vi.useFakeTimers()
  const links: Link[] = []
  const window = {} as { __xmLoadThemeStyle: (theme: string, href?: string) => Promise<void> }
  const document = {
    documentElement: { dataset: { theme } },
    head: { appendChild: (link: Link) => links.push(link) },
    createElement: () => ({ dataset: {}, remove: vi.fn() }),
  }
  Function("window", "document", "location", themeResourcesBootstrapScript)(window, document, { pathname, hash })
  return { links, load: window.__xmLoadThemeStyle }
}

afterEach(() => vi.useRealTimers())

describe("theme resources before hydration", () => {
  it("loads only the selected theme and deduplicates hydration requests", async () => {
    const { links, load } = bootstrap()
    const stylesheet = links.find(link => link.rel === "stylesheet")!
    expect(links.filter(link => link.rel === "stylesheet")).toHaveLength(1)
    expect(stylesheet.href).toMatch(/^\/theme-styles\/theme-pocket\.[a-f\d]+\.css$/)
    expect(readFileSync(`public${stylesheet.href}`, "utf8")).toContain("pocket-header")
    const first = load("theme-pocket")
    expect(load("theme-pocket")).toBe(first)
    stylesheet.onload()
    await first
    const next = load("theme-three")
    expect(links.at(-1)?.href).toContain("theme-three.")
    links.at(-1)!.onload()
    await next
  })

  it("preloads the document using exactly the rendered responsive source set", () => {
    const { links } = bootstrap()
    const picture = links.find(link => link.as === "image" && link.href?.endsWith("documents.webp"))!
    expect(picture.fetchPriority).toBe("high")
    expect(picture.imageSrcset).toBe(pocketArtSrcSet("documents"))
    expect(picture.imageSizes).toBe(POCKET_DOCUMENT_SIZES)
  })

  it("can load a new content hash during development without reusing stale CSS", async () => {
    const { links, load } = bootstrap()
    links[0].onload()
    await load("theme-pocket")
    const next = load("theme-pocket", "/theme-styles/theme-pocket.updated.css")
    expect(links.at(-1)?.href).toBe("/theme-styles/theme-pocket.updated.css")
    links.at(-1)!.onload()
    await next
  })

  it.each([["theme-three", "/", ""], ["theme-pocket", "/text-tool", ""], ["theme-pocket", "/", "#pocket-tools"]])(
    "does not preload unrelated artwork for %s %s %s", (theme, path, hash) => {
      expect(bootstrap(theme, path, hash).links.filter(link => link.as === "image")).toEqual([])
    },
  )

  it.each(["network", "timeout"])("releases failed stylesheet requests for retry: %s", async failure => {
    const { links, load } = bootstrap()
    const first = load("theme-pocket")
    const rejected = expect(first).rejects.toThrow("Theme stylesheet unavailable")
    if (failure === "network") links[0].onerror()
    else await vi.advanceTimersByTimeAsync(15000)
    await rejected
    expect(links[0].remove).toHaveBeenCalled()
    const second = load("theme-pocket")
    expect(second).not.toBe(first)
    links.at(-1)!.onload()
    await second
  })
})
