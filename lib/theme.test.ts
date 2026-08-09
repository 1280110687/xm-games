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

function runBootstrap(storedTheme: string | null, storageError = false) {
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
  const storage = {
    getItem() {
      if (storageError) throw new Error("storage unavailable")
      return storedTheme
    },
  }

  Function("document", "localStorage", themeBootstrapScript)(
    {
      documentElement: root,
      querySelector: () => themeColor,
    },
    storage,
  )

  return { root, classes, themeColor }
}

describe("theme configuration", () => {
  it("accepts the four supported themes", () => {
    expect(isThemeId("theme-one")).toBe(true)
    expect(isThemeId("theme-two")).toBe(true)
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
    expect(themeUsesDarkChrome("theme-one")).toBe(true)
    expect(themeUsesDarkChrome("theme-two")).toBe(false)
    expect(themeUsesDarkChrome("theme-three")).toBe(true)
    expect(themeUsesDarkChrome("theme-four")).toBe(false)
    expect(THEME_CONFIG["theme-one"].colorScheme).toBe("dark")
    expect(THEME_CONFIG["theme-two"].colorScheme).toBe("light")
    expect(THEME_CONFIG["theme-three"].colorScheme).toBe("dark")
    expect(THEME_CONFIG["theme-four"].colorScheme).toBe("light")
  })

  it("loads the isolated WebGL experience only for Theme Four", () => {
    expect(themeLoadsWebglExperience("theme-one")).toBe(false)
    expect(themeLoadsWebglExperience("theme-two")).toBe(false)
    expect(themeLoadsWebglExperience("theme-three")).toBe(false)
    expect(themeLoadsWebglExperience("theme-four")).toBe(true)
  })

  it("applies a saved Theme Two before the application renders", () => {
    const { root, classes, themeColor } = runBootstrap("theme-two")

    expect(root.dataset.theme).toBe("theme-two")
    expect(root.style.colorScheme).toBe("light")
    expect(classes.has("dark")).toBe(false)
    expect(themeColor.content).toBe(THEME_CONFIG["theme-two"].themeColor)
  })

  it("applies a saved Theme Three before the application renders", () => {
    const { root, classes, themeColor } = runBootstrap("theme-three")

    expect(root.dataset.theme).toBe("theme-three")
    expect(root.style.colorScheme).toBe("dark")
    expect(classes.has("dark")).toBe(true)
    expect(themeColor.content).toBe(THEME_CONFIG["theme-three"].themeColor)
  })

  it("applies a saved Theme Four before the application renders", () => {
    const { root, classes, themeColor } = runBootstrap("theme-four")

    expect(root.dataset.theme).toBe("theme-four")
    expect(root.style.colorScheme).toBe("light")
    expect(classes.has("dark")).toBe(false)
    expect(themeColor.content).toBe(THEME_CONFIG["theme-four"].themeColor)
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
