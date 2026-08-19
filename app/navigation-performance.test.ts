import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const PROJECT_ROOT = process.cwd()
const NAVIGATION_FILES = [
  "app/page.tsx",
  "components/game-header.tsx",
  "components/settings-page.tsx",
  "components/theme-four-home.tsx",
  "components/theme-four-navigation.tsx",
  "components/theme-three-navigation.tsx",
  "components/theme-two-tab-bar.tsx",
]

describe("route navigation performance", () => {
  it("allows visible route links to use Next.js prefetching", () => {
    for (const file of NAVIGATION_FILES) {
      const source = readFileSync(join(PROJECT_ROOT, file), "utf8")

      expect(source).not.toContain("prefetch={false}")
      expect(source).toContain("PrefetchLink as Link")
    }
  })

  it("disables RSC prefetch attempts after the app goes offline", () => {
    const source = readFileSync(
      join(PROJECT_ROOT, "components", "prefetch-link.tsx"),
      "utf8",
    )

    expect(source).toContain('window.addEventListener("offline", handleOffline)')
    expect(source).toContain("prefetch={online ? prefetch : false}")
  })

  it("delays the loading label and uses cached documents while offline", () => {
    const source = readFileSync(
      join(PROJECT_ROOT, "components", "route-progress.tsx"),
      "utf8",
    )

    expect(source).toContain("const ROUTE_PROGRESS_DELAY_MS = 150")
    expect(source).toContain("if (!navigator.onLine)")
    expect(source).toContain("window.location.assign(nextUrl.href)")
  })

  it("keeps normal web offline warming out of the first interaction window", () => {
    const source = readFileSync(
      join(PROJECT_ROOT, "components", "pwa-register.tsx"),
      "utf8",
    )

    expect(source).toContain("const WEB_OFFLINE_WARMUP_DELAY_MS = 30_000")
    expect(source).toContain("installed ? 0 : WEB_OFFLINE_WARMUP_DELAY_MS")
  })
})
