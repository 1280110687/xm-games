import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("mobile startup budget", () => {
  it("allows browser zoom outside game gesture surfaces", () => {
    const layout = read("app/layout.tsx")
    expect(layout).not.toContain("userScalable: false")
    expect(layout).not.toContain("maximumScale: 1")
  })

  it("does not put every theme stylesheet on the critical path", () => {
    expect(read("app/layout.tsx")).not.toMatch(/import ['"]@\/styles\/themes\//)
  })

  it("does not bulk-prefetch every visible link before user intent", () => {
    const link = read("components/prefetch-link.tsx")
    expect(link).toContain("onPointerEnter")
    expect(link).toContain("onTouchStart")
    expect(link).toContain("onFocus")
    expect(link).toContain("intent")
  })

  it("defers registration itself, not just the post-install warmup", () => {
    const host = read("components/pwa-register.tsx")
    expect(host).toContain('window.addEventListener("load", scheduleRegistration')
    expect(host).not.toContain('window.addEventListener("load", register')
    expect(host).toContain("installed ? 0 : WEB_OFFLINE_WARMUP_DELAY_MS")
    expect(read("features/pwa/offline-package.ts")).toContain("await ensurePwaRegistration()")
  })

  it("gives the text card enough foreground contrast", () => {
    expect(read("styles/themes/theme-pocket/index.css")).not.toContain("#566b8c")
  })
})
