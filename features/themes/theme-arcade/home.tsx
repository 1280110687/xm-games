"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ArrowRight, FileText } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { useLocale } from "@/lib/locale-context"
import type { CatalogCategory } from "@/features/catalog/types"
import { ArcadeHeader } from "./header"
import { ARCADE_COPY } from "./copy"
import { ARCADE_NAVIGATION_EVENT, getArcadeEntries, type ArcadeFilter } from "./home-model"
import { navigateArcade, useArcadeSection } from "./use-home-section"

const ART = "/images/theme-arcade/"

export function ArcadeHome({ categories }: { categories: CatalogCategory[] }) {
  const { locale, t } = useLocale()
  const copy = ARCADE_COPY[locale]
  const section = useArcadeSection() ?? "home"
  const [filter, setFilter] = useState<ArcadeFilter>("featured")
  useEffect(() => {
    const resetFilter = () => setFilter("featured")
    window.addEventListener(ARCADE_NAVIGATION_EVENT, resetFilter)
    window.addEventListener("hashchange", resetFilter)
    return () => {
      window.removeEventListener(ARCADE_NAVIGATION_EVENT, resetFilter)
      window.removeEventListener("hashchange", resetFilter)
    }
  }, [])
  const featured = section === "home" && filter === "featured"
  const entries = getArcadeEntries(categories, section, filter)

  return <div className="arcade-page" data-page="arcade-home">
    <ArcadeHeader />
    <main className="arcade-main">
      <div className="arcade-intro">
        <h1>{section === "home" ? copy.headline : copy[section]}</h1>
        <p>{section === "home" ? copy.subtitle : section === "games" ? copy.libraryDescription : copy.toolsDescription}</p>
      </div>
      {section !== "tools" && <div className="arcade-tabs" role="group" aria-label={copy.games}>
        {(["featured", "board", "puzzle", "arcade"] as const).map(key => <button type="button" key={key}
          aria-pressed={filter === key} onClick={() => setFilter(key)}>{copy[key]}</button>)}
      </div>}
      {featured ? <>
        <section className="arcade-featured" aria-label={copy.featured}>
          <Link href="/bingo" className="arcade-feature arcade-feature-bingo">
            <h2>BINGO</h2><p>{copy.bingo}</p>
            <Image src={`${ART}bingo.webp`} alt="" width={400} height={425} unoptimized priority className="arcade-bingo-art" />
            <span className="arcade-play">{copy.play}<ArrowRight aria-hidden="true" /></span>
          </Link>
          <Link href="/2048" className="arcade-feature arcade-feature-tiles">
            <h2>2048</h2><p>{copy.tiles}</p>
            <Image src={`${ART}tiles.webp`} alt="" width={320} height={320} unoptimized priority />
            <ArrowRight className="arcade-feature-arrow" aria-hidden="true" />
          </Link>
          <Link href="/snake" className="arcade-feature arcade-feature-snake">
            <h2>{t("snake")}</h2><p>{copy.snake}</p>
            <Image src={`${ART}snake.webp`} alt="" width={320} height={320} unoptimized priority />
            <ArrowRight className="arcade-feature-arrow" aria-hidden="true" />
          </Link>
        </section>
        <section className="arcade-more" aria-labelledby="arcade-more-title">
          <div className="arcade-section-heading"><h2 id="arcade-more-title">{copy.more}</h2>
            <Link href="/#arcade-games" onNavigate={() => { setFilter("featured"); navigateArcade("#arcade-games") }}>{copy.all}<ArrowRight aria-hidden="true" /></Link>
          </div>
          <div className="arcade-more-grid">
            {(["tetris", "gomoku"] as const).map(game => <Link href={`/${game}`} key={game}>
              <Image src={`${ART}${game}.webp`} alt="" width={48} height={48} unoptimized />
              <span><strong>{t(game)}</strong><small>{copy[game]}</small></span>
            </Link>)}
          </div>
        </section>
        <Link href="/text-tool" className="arcade-text-entry"><FileText aria-hidden="true" />
          <span><strong>{copy.text}</strong><small>{copy.textDescription}</small></span><ArrowRight aria-hidden="true" />
        </Link>
      </> : <section className="arcade-catalog" aria-label={section === "tools" ? copy.tools : copy.games}>
        {entries.map(entry => <Link href={entry.href} key={entry.href}>
          <entry.icon aria-hidden="true" /><span><h2>{t(entry.titleKey)}</h2><p>{t(entry.descKey)}</p></span><ArrowRight aria-hidden="true" />
        </Link>)}
      </section>}
    </main>
  </div>
}
