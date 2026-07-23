"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  DEFAULT_THEME,
  THEME_CONFIG,
  THEME_STORAGE_KEY,
  normalizeTheme,
  themeUsesDarkChrome,
  type ThemeId,
} from "@/lib/theme"

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function applyTheme(theme: ThemeId) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle("dark", themeUsesDarkChrome(theme))
  root.style.colorScheme = THEME_CONFIG[theme].colorScheme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_CONFIG[theme].themeColor)
}

function readDocumentTheme(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME
  return normalizeTheme(document.documentElement.dataset.theme)
}

function readStoredTheme(): ThemeId {
  const documentTheme = readDocumentTheme()

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return storedTheme === null ? DEFAULT_THEME : normalizeTheme(storedTheme)
  } catch {
    return documentTheme
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return
      const nextTheme = event.key === null
        ? DEFAULT_THEME
        : normalizeTheme(event.newValue)
      setThemeState(nextTheme)
      applyTheme(nextTheme)
    }

    window.addEventListener("storage", handleStorage)

    const initialTheme = readStoredTheme()
    setThemeState(initialTheme)
    applyTheme(initialTheme)

    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const setTheme = useCallback((nextTheme: ThemeId) => {
    setThemeState(nextTheme)
    applyTheme(nextTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // Theme switching remains available when storage is restricted.
    }
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
