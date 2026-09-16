"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { loadThemeStyle } from "@/lib/theme-resources"

interface ThemeContextValue {
  theme: ThemeId
  isResolved: boolean
  styleError: boolean
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
  const [isResolved, setIsResolved] = useState(false)
  const [styleError, setStyleError] = useState(false)
  const requestRef = useRef(0)

  const loadTheme = useCallback(async (nextTheme: ThemeId, persist = false) => {
    const request = ++requestRef.current
    setStyleError(false)
    try {
      await loadThemeStyle(nextTheme)
      if (request !== requestRef.current) return
      setThemeState(nextTheme)
      applyTheme(nextTheme)
      setIsResolved(true)
      if (persist) {
        try { localStorage.setItem(THEME_STORAGE_KEY, nextTheme) } catch { /* Optional persistence. */ }
      }
    } catch {
      if (request === requestRef.current) setStyleError(true)
    }
  }, [])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return
      const nextTheme = event.key === null
        ? DEFAULT_THEME
        : normalizeTheme(event.newValue)
      void loadTheme(nextTheme)
    }

    window.addEventListener("storage", handleStorage)

    const initialTheme = readStoredTheme()
    void loadTheme(initialTheme)

    return () => {
      window.removeEventListener("storage", handleStorage)
      requestRef.current += 1
    }
  }, [loadTheme])

  const setTheme = useCallback((nextTheme: ThemeId) => {
    void loadTheme(nextTheme, true)
  }, [loadTheme])

  const value = useMemo(
    () => ({ theme, isResolved, styleError, setTheme }),
    [isResolved, styleError, theme, setTheme],
  )

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
