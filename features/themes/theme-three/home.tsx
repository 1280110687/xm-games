"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { ChevronRight, FileText, Search, TvMinimalPlay, X } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { useLocale } from "@/lib/locale-context"
import { THEME_THREE_HOME_COPY } from "./home-copy"
import { filterThemeThreeCatalog, getThemeThreeBrowseCategories, type ThemeThreeCategory } from "./home-model"
import { THEME_THREE_HOME_NAVIGATION } from "./navigation-model"
import { useThemeThreeSection } from "./use-section"
import { ThemeThreeHeader } from "./header"

export function ThemeThreeHome({ categories }: { categories: readonly ThemeThreeCategory[] }) {
  const { locale, t } = useLocale()
  const copy = THEME_THREE_HOME_COPY[locale]
  const section = useThemeThreeSection() || "home"
  const [query, setQuery] = useState("")
  const [categoryKey, setCategoryKey] = useState("all")
  const searchRef = useRef<HTMLInputElement>(null)
  const searching = Boolean(query.trim())
  const filtered = useMemo(() => {
    // Search is global; destination filters only apply while browsing.
    const entries = searching ? categories : getThemeThreeBrowseCategories(categories, section, categoryKey)
    return filterThemeThreeCatalog(entries, query, t)
  }, [categories, categoryKey, query, searching, section, t])
  const resultCount = filtered.reduce((sum, category) => sum + category.games.length, 0)
  useEffect(() => {
    const reset = () => { setQuery(""); setCategoryKey("all") }
    window.addEventListener(THEME_THREE_HOME_NAVIGATION, reset)
    window.addEventListener("hashchange", reset)
    window.addEventListener("popstate", reset)
    return () => {
      window.removeEventListener(THEME_THREE_HOME_NAVIGATION, reset)
      window.removeEventListener("hashchange", reset)
      window.removeEventListener("popstate", reset)
    }
  }, [])
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (document.documentElement.dataset.theme !== "theme-three" ||
          (!event.metaKey && !event.ctrlKey) || event.key.toLowerCase() !== "k") return
      event.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener("keydown", focusSearch)
    return () => window.removeEventListener("keydown", focusSearch)
  }, [])
  const clearSearch = () => { setQuery(""); searchRef.current?.focus() }
  return <div data-page="home" data-section={section} className="theme-three-home app-shell t3-home">
    <ThemeThreeHeader />
    <main className="t3-home-main">
      <section className="t3-welcome" aria-labelledby="t3-welcome-title">
        <h1 id="t3-welcome-title">{section === "games" ? copy.library : section === "tools" ? copy.toolsTitle : copy.title}</h1>
        <p>{section === "games" ? copy.libraryDescription : section === "tools" ? copy.toolsDescription : copy.subtitle}</p>
      </section>
      <div className="t3-search" data-t3-glass="floating">
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor="t3-search-input">{copy.search}</label>
        <input id="t3-search-input" ref={searchRef} type="search" value={query}
          onChange={event => setQuery(event.target.value)} placeholder={copy.placeholder}
          aria-keyshortcuts="Meta+K Control+K" aria-controls="t3-content" />
        {query && <button type="button" onClick={clearSearch} aria-label={copy.clear}><X aria-hidden="true" /></button>}
      </div>
      <div id="t3-content">
        {section === "home" && !searching ? <div className="t3-gallery">
          <Link href="/2048" className="t3-feature" data-t3-glass="feature" aria-label={`2048 · ${copy.start}`}>
            <Image className="t3-feature-art" src="/images/theme-three/crystal-2048.webp" width={600} height={600} alt="" unoptimized priority />
            <span className="t3-feature-eyebrow">{copy.featured}</span>
            <div className="t3-feature-copy"><h2>2048</h2><p>{copy.tilesDescription}</p></div>
            <span className="t3-play">{copy.start}<ChevronRight aria-hidden="true" /></span>
          </Link>
          <div className="t3-shortcuts">
            {([['/gomoku', 'gomoku', copy.gomokuDescription], ['/snake', 'snake', copy.snakeDescription]] as const).map(([href, game, description]) => <Link
              key={href} href={href} className="t3-shortcut" data-t3-glass="panel">
              <Image src={`/images/theme-three/${game}.webp`} width={320} height={260} alt="" unoptimized />
              <h2>{t(game)}</h2><p>{description}</p><ChevronRight aria-hidden="true" />
            </Link>)}
          </div>
          <section className="t3-handy" aria-labelledby="t3-handy-title">
            <h2 id="t3-handy-title">{copy.toolsTitle}</h2>
            <div className="t3-handy-links" data-t3-glass="panel">
              <Link href="/text-tool"><span className="t3-handy-icon"><FileText aria-hidden="true" /></span><span><strong>{copy.text}</strong><small>{copy.textDescription}</small></span><ChevronRight aria-hidden="true" /></Link>
              <Link href="/anime-tracker"><span className="t3-handy-icon"><TvMinimalPlay aria-hidden="true" /></span><span><strong>{copy.anime}</strong><small>{copy.animeDescription}</small></span><ChevronRight aria-hidden="true" /></Link>
            </div>
          </section>
        </div> : <section className="t3-library" id="t3-catalog" aria-label={searching ? copy.searchResults : section === "tools" ? copy.tools : copy.games}>
          {searching ? <p className="t3-results" role="status">{resultCount} {copy.results}</p> : section === "games" &&
            <div className="t3-category-filter" role="group" aria-label={copy.games}>
              <button type="button" aria-pressed={categoryKey === "all"} onClick={() => setCategoryKey("all")}>{copy.all}</button>
              {categories.filter(category => category.titleKey !== "categoryTools").map(category => <button key={category.titleKey} type="button"
                aria-pressed={categoryKey === category.titleKey} onClick={() => setCategoryKey(category.titleKey)}>{t(category.titleKey)}</button>)}
            </div>}
          {filtered.length ? <div className="t3-collections">{filtered.map(category => <section className="t3-collection" key={category.titleKey}>
            <h2>{t(category.titleKey)}</h2>
            <div className="t3-game-list" data-t3-glass="panel">{category.games.map(game => {
              const Icon = game.icon
              return <Link href={game.href} key={game.href} className="t3-game">
                <span className="t3-game-icon"><Icon aria-hidden="true" /></span>
                <span className="t3-game-copy"><strong>{t(game.titleKey)}</strong><small>{t(game.descKey)}</small></span>
                <ChevronRight aria-hidden="true" />
              </Link>
            })}</div>
          </section>)}</div> : <div className="t3-empty" data-t3-glass="panel">
            <Search aria-hidden="true" /><h2>{copy.empty}</h2><p>{copy.emptyHint}</p><button type="button" onClick={clearSearch}>{copy.clear}</button>
          </div>}
        </section>}
      </div>
    </main>
  </div>
}
