import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"
import manifest from "./manifest"

const PROJECT_ROOT = process.cwd()
const APP_DIRECTORY = join(PROJECT_ROOT, "app")
const SERVICE_WORKER_PATH = join(PROJECT_ROOT, "public", "sw.js")

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

function readServiceWorkerRoutes(source: string): string[] {
  const routeBlock = source.match(/const APP_ROUTES = \[([\s\S]*?)\n\]/)?.[1]
  if (!routeBlock) throw new Error("APP_ROUTES is missing from public/sw.js")

  return [...routeBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1])
}

describe("web app manifest", () => {
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

  it("never uses a game page as the final navigation fallback", () => {
    expect(source).toContain('createSameOriginRequest("/")')
    expect(source).not.toContain('caches.match("/gomoku")')
  })
})
