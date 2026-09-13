"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowUpRight, Command, Gamepad2, Search, X } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/features/themes/shared/theme-switcher"
import { useLocale } from "@/lib/locale-context"
import { THEME_THREE_HOME_COPY } from "./home-copy"
import { filterThemeThreeCatalog, type ThemeThreeCategory } from "./home-model"
import {
  THEME_THREE_HOME_NAVIGATION,
  THEME_THREE_LIBRARY_HASH,
  THEME_THREE_TOOLS_HASH,
} from "./navigation-model"

export function ThemeThreeHome({
  categories,
}: {
  categories: readonly ThemeThreeCategory[]
}) {
  const { locale, t } = useLocale()
  const copy = THEME_THREE_HOME_COPY[locale]
  const [query, setQuery] = useState("")
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const filtered = useMemo(
    () => filterThemeThreeCatalog(categories, query, t),
    [categories, query, t],
  )
  const count = categories.reduce(
    (sum, category) => sum + category.games.length,
    0,
  )
  const resultCount = filtered.reduce(
    (sum, category) => sum + category.games.length,
    0,
  )

  useEffect(() => {
    const navigate = (hash: string) => {
      if (
        !["", THEME_THREE_LIBRARY_HASH, THEME_THREE_TOOLS_HASH].includes(hash)
      ) {
        return
      }
      setQuery("")
      setNavigationTarget(hash)
    }
    const onHomeNavigation = (event: Event) => {
      navigate((event as CustomEvent<string>).detail)
    }
    const onHashChange = () => navigate(window.location.hash)
    window.addEventListener(THEME_THREE_HOME_NAVIGATION, onHomeNavigation)
    window.addEventListener("hashchange", onHashChange)
    return () => {
      window.removeEventListener(THEME_THREE_HOME_NAVIGATION, onHomeNavigation)
      window.removeEventListener("hashchange", onHashChange)
    }
  }, [])

  useEffect(() => {
    if (navigationTarget === null) return
    // Wait until the cleared search has restored the target collection.
    if (navigationTarget) {
      document.getElementById(navigationTarget.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo({ top: 0 })
    }
    setNavigationTarget(null)
  }, [navigationTarget])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (
        document.documentElement.dataset.theme !== "theme-three" ||
        (!event.metaKey && !event.ctrlKey) ||
        event.key.toLowerCase() !== "k"
      )
        return
      event.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener("keydown", focusSearch)
    return () => window.removeEventListener("keydown", focusSearch)
  }, [])

  const clearSearch = () => {
    setQuery("")
    searchRef.current?.focus()
  }

  return (
    <div data-page="home" className="theme-three-home app-shell t3-home">
      <div className="t3-home-inner">
        <header className="t3-topbar">
          <div className="t3-wordmark">
            <Gamepad2 aria-hidden="true" />
            <span>{t("appName")}</span>
          </div>
          <div className="t3-topbar-controls">
            <ThemeSwitcher compact />
            <LanguageSwitcher compact />
          </div>
        </header>
        <main>
          <section className="t3-welcome" aria-labelledby="t3-welcome-title">
            <div>
              <h1 id="t3-welcome-title">{copy.title}</h1>
              <p>{copy.subtitle}</p>
            </div>
            <p className="t3-catalog-count">
              <strong>{count}</strong> {copy.experiences}
              <span />
              <strong>{categories.length}</strong> {copy.categories}
            </p>
          </section>
          <div className="t3-search" data-t3-glass="floating">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="t3-search-input">
              {copy.search}
            </label>
            <input
              id="t3-search-input"
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.placeholder}
              aria-keyshortcuts="Meta+K Control+K"
              aria-controls="theme-three-game-library"
            />
            {query ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={copy.clear}
              >
                <X aria-hidden="true" />
              </button>
            ) : (
              <kbd>
                <Command aria-hidden="true" /> K
              </kbd>
            )}
          </div>
          <section
            id="theme-three-game-library"
            className="t3-library"
            aria-labelledby="t3-library-title"
          >
            <div className="t3-library-heading">
              <h2 id="t3-library-title">{copy.library}</h2>
              {query.trim() && (
                <p role="status">
                  {resultCount} {copy.results}
                </p>
              )}
            </div>
            {filtered.length ? (
              <div className="t3-collections">
                {filtered.map((category) => (
                  <section
                    id={
                      category.titleKey === "categoryTools"
                        ? THEME_THREE_TOOLS_HASH.slice(1)
                        : undefined
                    }
                    className="t3-collection"
                    data-t3-glass="panel"
                    data-category={category.titleKey}
                    key={category.titleKey}
                    aria-labelledby={`t3-${category.titleKey}`}
                  >
                    <header>
                      <h3 id={`t3-${category.titleKey}`}>
                        {t(category.titleKey)}
                      </h3>
                      <span>{category.games.length}</span>
                    </header>
                    <div className="t3-game-list">
                      {category.games.map((game) => {
                        const Icon = game.icon
                        return (
                          <Link
                            href={game.href}
                            key={game.href}
                            className="t3-game"
                          >
                            <span className="t3-game-icon">
                              <Icon aria-hidden="true" />
                            </span>
                            <span className="t3-game-copy">
                              <strong>{t(game.titleKey)}</strong>
                              <small>{t(game.descKey)}</small>
                            </span>
                            <ArrowUpRight
                              className="t3-game-arrow"
                              aria-hidden="true"
                            />
                          </Link>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="t3-empty" data-t3-glass="panel">
                <Search aria-hidden="true" />
                <h3>{copy.empty}</h3>
                <p>{copy.emptyHint}</p>
                <button type="button" onClick={clearSearch}>
                  {copy.clear}
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
