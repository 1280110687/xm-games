"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

import {
  isLocale,
  localeHtmlLang,
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
  const [locale, setLocaleState] = useState<Locale>("zh")

  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)
      if (isLocale(savedLocale)) {
        setLocaleState(savedLocale)
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, [])

  useEffect(() => {
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
