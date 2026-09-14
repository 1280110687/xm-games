import { describe, expect, it } from "vitest"

import {
  DEFAULT_THEME,
  THEME_CONFIG,
  isThemeId,
  normalizeTheme,
  themeBootstrapScript,
  themeLoadsWebglExperience,
  themeUsesDarkChrome,
  themes,
} from "./theme"

function runBootstrap(storedTheme: string | null, storageError = false, writeError = false, pathname = "/") {
  const classes = new Set<string>()
  const root = {
    dataset: {} as Record<string, string>,
    classList: {
      toggle(name: string, enabled: boolean) {
        if (enabled) classes.add(name)
        else classes.delete(name)
      },
    },
    style: {} as Record<string, string>,
  }
  const themeColor = {
    content: "",
    setAttribute(name: string, value: string) {
      if (name === "content") this.content = value
    },
  }
  const writes: Array<[string, string]> = []
  const storage = {
    getItem() {
      if (storageError) throw new Error("storage unavailable")
      return storedTheme
    },
    setItem(key: string, value: string) {
      if (writeError) throw new Error("storage is read-only")
      writes.push([key, value])
    },
  }

  Function("document", "localStorage", "location", themeBootstrapScript)(
    {
      documentElement: root,
      querySelector: () => themeColor,
    },
    storage,
    { pathname },
  )

  return { root, classes, themeColor, writes }
}

describe("theme configuration", () => {
  it("accepts only active themes", () => {
    expect(isThemeId("theme-arcade")).toBe(true)
    expect(isThemeId("theme-one")).toBe(false)
    expect(isThemeId("theme-two")).toBe(false)
    expect(isThemeId("theme-three")).toBe(true)
    expect(isThemeId("theme-four")).toBe(true)
    expect(Object.keys(THEME_CONFIG)).toEqual([...themes])
  })

  it("falls back safely for missing or legacy values", () => {
    expect(normalizeTheme(null)).toBe(DEFAULT_THEME)
    expect(normalizeTheme("dark")).toBe(DEFAULT_THEME)
    expect(normalizeTheme("theme-five")).toBe(DEFAULT_THEME)
  })

  it("keeps dark browser chrome aligned with every theme config", () => {
    expect(themeUsesDarkChrome("theme-three")).toBe(true)
    expect(themeUsesDarkChrome("theme-four")).toBe(false)
    expect(THEME_CONFIG["theme-three"].colorScheme).toBe("dark")
    expect(THEME_CONFIG["theme-four"].colorScheme).toBe("light")
  })

  it("loads the isolated WebGL experience only for Theme Four", () => {
    expect(themeLoadsWebglExperience("theme-arcade")).toBe(false)
    expect(themeLoadsWebglExperience("theme-three")).toBe(false)
    expect(themeLoadsWebglExperience("theme-four")).toBe(true)
  })

  it.each(["/", "/text-tool", "/text-tool/"])("renders arcade on %s before first paint", pathname => {
    const { root, classes, writes } = runBootstrap("theme-arcade", false, false, pathname)
    expect(root.dataset.theme).toBe("theme-arcade")
    expect(classes.has("dark")).toBe(false)
    expect(writes).toEqual([])
  })

  it.each(["/snake", "/settings", "/anime-tracker", "/2048", "/qr-code", "/schulte-grid"])("keeps arcade on %s before first paint", pathname => {
    const { root, classes, writes } = runBootstrap("theme-arcade", false, false, pathname)
    expect(root.dataset.theme).toBe("theme-arcade")
    expect(classes.has("dark")).toBe(false)
    expect(writes).toEqual([])
  })

  it.each(["theme-one", "theme-two"])("migrates retired %s before first paint", (retired) => {
    const { root, classes, themeColor, writes } = runBootstrap(retired)
    expect(root.dataset.theme).toBe("theme-three")
    expect(root.style.colorScheme).toBe("dark")
    expect(classes.has("dark")).toBe(true)
    expect(themeColor.content).toBe(THEME_CONFIG["theme-three"].themeColor)
    expect(writes).toEqual([["xm-games-theme:v1", "theme-three"]])
  })

  it("still renders the fallback when migration cannot be persisted", () => {
    const { root, writes } = runBootstrap("theme-two", false, true)
    expect(root.dataset.theme).toBe(DEFAULT_THEME)
    expect(writes).toEqual([])
  })

  it("applies a saved Theme Three before the application renders", () => {
    const { root, classes, themeColor, writes } = runBootstrap("theme-three")

    expect(root.dataset.theme).toBe("theme-three")
    expect(root.style.colorScheme).toBe("dark")
    expect(classes.has("dark")).toBe(true)
    expect(themeColor.content).toBe(THEME_CONFIG["theme-three"].themeColor)
    expect(writes).toEqual([])
  })

  it("applies a saved Theme Four before the application renders", () => {
    const { root, classes, themeColor, writes } = runBootstrap("theme-four")

    expect(root.dataset.theme).toBe("theme-four")
    expect(root.style.colorScheme).toBe("light")
    expect(classes.has("dark")).toBe(false)
    expect(themeColor.content).toBe(THEME_CONFIG["theme-four"].themeColor)
    expect(writes).toEqual([])
  })

  it("keeps the default theme when storage is invalid or unavailable", () => {
    for (const [storedTheme, storageError] of [
      ["legacy-theme", false],
      [null, true],
    ] as const) {
      const { root, classes, themeColor } = runBootstrap(storedTheme, storageError)
      expect(root.dataset.theme).toBe(DEFAULT_THEME)
      expect(root.style.colorScheme).toBe("dark")
      expect(classes.has("dark")).toBe(true)
      expect(themeColor.content).toBe(THEME_CONFIG[DEFAULT_THEME].themeColor)
    }
  })
})
