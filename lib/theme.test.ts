import { describe, expect, it } from "vitest"

import {
  DEFAULT_THEME,
  THEME_CONFIG,
  isThemeId,
  normalizeTheme,
  themeBootstrapScript,
  themeUsesDarkChrome,
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
  it("accepts the two supported themes", () => {
    expect(isThemeId("theme-one")).toBe(true)
    expect(isThemeId("theme-two")).toBe(true)
  })

  it("falls back safely for missing or legacy values", () => {
    expect(normalizeTheme(null)).toBe(DEFAULT_THEME)
    expect(normalizeTheme("dark")).toBe(DEFAULT_THEME)
    expect(normalizeTheme("theme-three")).toBe(DEFAULT_THEME)
  })

  it("keeps the current theme as the dark chrome theme", () => {
    expect(themeUsesDarkChrome("theme-one")).toBe(true)
    expect(themeUsesDarkChrome("theme-two")).toBe(false)
    expect(THEME_CONFIG["theme-one"].colorScheme).toBe("dark")
    expect(THEME_CONFIG["theme-two"].colorScheme).toBe("light")
  })

  it("applies a saved Theme Two before the application renders", () => {
    const { root, classes, themeColor } = runBootstrap("theme-two")

    expect(root.dataset.theme).toBe("theme-two")
    expect(root.style.colorScheme).toBe("light")
    expect(classes.has("dark")).toBe(false)
    expect(themeColor.content).toBe(THEME_CONFIG["theme-two"].themeColor)
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
