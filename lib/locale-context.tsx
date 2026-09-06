"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import {
  localeHtmlLang,
  resolveInitialLocale,
  translations,
  type Locale,
  type TranslationKey,
} from "./i18n"
import { getPageMetadata } from "./page-metadata"

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

const LOCALE_STORAGE_KEY = "xm-games-locale"

export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // Server HTML and the first hydration render must agree. Do not mount page
  // content with a fallback language before browser preferences are available.
  const [locale, setLocaleState] = useState<Locale | null>(null)

  useEffect(() => {
    let savedLocale: string | null = null
    try {
      savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }

    const systemLanguageTags = navigator.languages?.length > 0
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : []
    setLocaleState(resolveInitialLocale(savedLocale, systemLanguageTags))
  }, [])

  useEffect(() => {
    if (locale === null) return
    document.documentElement.lang = localeHtmlLang[locale]

    const pageMetadata = getPageMetadata(pathname, locale)
    document.title = pageMetadata.title

    let description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    )
    if (!description) {
      description = document.createElement("meta")
      description.name = "description"
      document.head.append(description)
    }
    description.content = pageMetadata.description
  }, [locale, pathname])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    } catch {
      // Keep language switching functional even when persistence is blocked.
    }
  }

  if (locale === null) {
    return (
      <div className="locale-startup" data-locale-pending="true" role="status" aria-busy="true" aria-label="XM-Games">
        <span className="locale-startup-placeholder" aria-hidden="true">
          <span /><span /><span /><span />
        </span>
        <span className="locale-startup-brand" aria-hidden="true">
          <span className="locale-startup-brand-accent">XM</span>-GAMES
        </span>
      </div>
    )
  }

  const t = (key: TranslationKey): string => {
    return translations[locale][key]
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider")
  }
  return context
}
