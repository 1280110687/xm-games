import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"
import manifest from "./manifest"
import { DEFAULT_THEME, THEME_CONFIG } from "../lib/theme"

const PROJECT_ROOT = process.cwd()
const APP_DIRECTORY = join(PROJECT_ROOT, "app")
const SERVICE_WORKER_PATH = join(PROJECT_ROOT, "public", "sw.js")
const OFFLINE_ASSET_MANIFEST_PATH = join(
  PROJECT_ROOT,
  "public",
  "offline-assets.json",
)
const OFFLINE_ASSET_DIRECTORIES = [
  join(PROJECT_ROOT, "public", "images", "theme-arcade"),
  join(PROJECT_ROOT, "public", "images", "theme-pocket"),
  join(PROJECT_ROOT, "public", "images", "theme-retro"),
  join(PROJECT_ROOT, "public", "fonts", "silkscreen"),
  join(PROJECT_ROOT, "public", "images", "theme-three"),
  join(PROJECT_ROOT, "public", "theme-four"),
  join(PROJECT_ROOT, "public", "theme-four-experience"),
]

function collectPageFiles(directory: string): string[] {
  const pageFiles: string[] = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      if (entry.name !== "api") {
        pageFiles.push(...collectPageFiles(entryPath))
      }
      continue
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      pageFiles.push(entryPath)
    }
  }

  return pageFiles
}

function pageFileToRoute(pageFile: string): string {
  const routeSegments = relative(APP_DIRECTORY, dirname(pageFile))
    .split(sep)
    .filter(
      (segment) =>
        segment && !segment.startsWith("(") && !segment.startsWith("@"),
    )

  return routeSegments.length > 0 ? `/${routeSegments.join("/")}` : "/"
}

function collectOfflineAssets(directory: string): string[] {
  const assets: string[] = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      assets.push(...collectOfflineAssets(entryPath))
      continue
    }

    if (
      entry.isFile() &&
      !entry.name.endsWith(".gz") &&
      entry.name !== "README.md"
    ) {
      assets.push(
        `/${relative(join(PROJECT_ROOT, "public"), entryPath)
          .split(sep)
          .join("/")}`,
      )
    }
  }

  return assets
}

function readServiceWorkerRoutes(source: string): string[] {
  const routeBlock = source.match(/const APP_ROUTES = \[([\s\S]*?)\n\]/)?.[1]
  if (!routeBlock) throw new Error("APP_ROUTES is missing from public/sw.js")

  return [...routeBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1])
}

describe("web app manifest", () => {
  it("aligns the installed splash with the active default theme", () => {
    expect(manifest().background_color).toBe(THEME_CONFIG[DEFAULT_THEME].themeColor)
    expect(manifest().theme_color).toBe(THEME_CONFIG[DEFAULT_THEME].themeColor)
  })
  it("uses a stable application identity and installable icon set", () => {
    const value = manifest()

    expect(value.id).toBe("/")
    expect(value.start_url).toBe("/")
    expect(value.scope).toBe("/")
    expect(value.display).toBe("standalone")
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    )
  })

  it("exposes shortcuts for the primary games and utility", () => {
    const shortcutUrls = manifest().shortcuts?.map((shortcut) => shortcut.url)

    expect(shortcutUrls).toEqual([
      "/bingo",
      "/bingo-cards",
      "/chinese-chess",
      "/qr-code",
    ])
  })
})

describe("service worker shell", () => {
  const source = readFileSync(SERVICE_WORKER_PATH, "utf8")

  it("keeps every static app page in the offline route list", () => {
    const actualRoutes = readServiceWorkerRoutes(source).sort()
    const expectedRoutes = collectPageFiles(APP_DIRECTORY)
      .map(pageFileToRoute)
      .sort()

    expect(actualRoutes).toEqual(expectedRoutes)
  })

  it("does not activate an update automatically", () => {
    const installHandler = source.match(
      /self\.addEventListener\("install"[\s\S]*?(?=self\.addEventListener\("message")/,
    )?.[0]

    expect(installHandler).toBeDefined()
    expect(installHandler).not.toContain("self.skipWaiting()")
  })

  it("retains complete route coverage before activating an update", () => {
    const installHandler = source.match(
      /self\.addEventListener\("install"[\s\S]*?(?=self\.addEventListener\("message")/,
    )?.[0]

    expect(installHandler).toContain("warmApplicationShell()")
    expect(installHandler).not.toContain("warmFullOfflinePackage()")
    expect(source).toContain("const OFFLINE_WARM_CONCURRENCY = 2")
    expect(source).toContain('event.data?.type === "WARM_OFFLINE_CACHE"')
  })

  it("reports offline package readiness only after every requested asset is cached", () => {
    expect(source).toContain('event.data?.type === "PREPARE_OFFLINE_PACKAGE"')
    expect(source).toContain('type: "OFFLINE_PACKAGE_READY"')
    expect(source).toContain("warmFullOfflinePackage()")
    expect(source).toContain("failures.length > 0")
  })

  it("keeps the full offline asset manifest aligned with local experience files", () => {
    const manifest = JSON.parse(
      readFileSync(OFFLINE_ASSET_MANIFEST_PATH, "utf8"),
    ) as { version: number; assets: string[] }
    const expectedAssets = OFFLINE_ASSET_DIRECTORIES
      .flatMap(collectOfflineAssets)
    const themeStyles = JSON.parse(readFileSync(join(PROJECT_ROOT, "lib/generated/theme-styles.json"), "utf8"))
    expectedAssets.push(...Object.values(themeStyles) as string[])
    expectedAssets.sort()

    expect(manifest.version).toBe(1)
    expect(manifest.assets).toEqual(expectedAssets)
    expect(manifest.assets).toContain("/theme-four-experience/textures/clubhouse/pale-oak.webp")
    expect(manifest.assets).toContain("/theme-four-experience/textures/clubhouse/ivory-plaster.webp")
  })

  it("does not fragment the clubhouse offline document cache by initial locale", () => {
    const home = readFileSync(join(PROJECT_ROOT, "features/themes/theme-four/home.tsx"), "utf8")
    expect(home).toContain("/theme-four-experience/index.html#locale=")
    expect(home).not.toContain("/theme-four-experience/index.html?locale=")
  })

  it("serves cached navigations immediately while refreshing in the background", () => {
    const navigationHandler = source.match(
      /async function cachedFirstNavigation[\s\S]*?(?=async function cacheFirst)/,
    )?.[0]

    expect(navigationHandler).toContain("matchCachedNavigation(request)")
    expect(navigationHandler).toContain("event.waitUntil(")
    expect(source).toContain("cachedFirstNavigation(request, event)")
  })

  it("never uses a game page as the final navigation fallback", () => {
    expect(source).toContain('createSameOriginRequest("/")')
    expect(source).not.toContain('caches.match("/gomoku")')
  })

  it("keeps APIs and RSC responses out of the offline package", () => {
    expect(source).toContain('url.pathname.startsWith("/api/")')
    expect(source).toContain('request.headers.has("rsc")')
    expect(source).toContain('request.headers.has("next-router-prefetch")')
  })
})
