"use client"

import { useState } from "react"
import Image from "next/image"
import { ArrowRight, ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { useLocale } from "@/lib/locale-context"
import type { CatalogCategory, CatalogEntry } from "@/features/catalog/types"
import { RetroHeader } from "./header"
import { RETRO_COPY } from "./copy"
import { getRetroCatalog, RETRO_ART, RETRO_FEATURED, wrapCartridge } from "./model"
import { navigateRetro, useRetroSection } from "./use-section"

function GameArt({ entry }: { entry: CatalogEntry }) {
  return RETRO_ART[entry.href]
    ? <Image className="retro-game-art" src={`/images/theme-retro/${RETRO_ART[entry.href]}.webp`} width={400} height={400} alt="" unoptimized />
    : <entry.icon className="retro-game-art retro-game-symbol" aria-hidden="true" />
}
function Cartridge({ entry, title }: { entry: CatalogEntry; title: string }) {
  return <><span className="retro-cartridge-label"><GameArt entry={entry} /><strong>{title}</strong></span></>
}

export function RetroHome({ categories }: { categories: CatalogCategory[] }) {
  const { locale, t } = useLocale()
  const copy = RETRO_COPY[locale]
  const section = useRetroSection()
  const { games, tools } = getRetroCatalog(categories)
  const featured = RETRO_FEATURED.flatMap(path => games.filter(entry => entry.href === path))
  const [selectedIndex, setSelectedIndex] = useState(1)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const selected = featured[wrapCartridge(selectedIndex, featured.length)]
  const selectedCategory = categories.find(group => group.games.some(entry => entry.href === selected.href))!
  const description = selected.href === "/2048" ? copy.tiles : selected.href === "/gomoku" ? copy.gomoku : copy.snake
  const visibleGames = games.filter(entry => (category === "all" || categories.find(group => group.titleKey === category)?.games.includes(entry))
    && `${t(entry.titleKey)} ${t(entry.descKey)}`.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)))
  const handy = ["/text-tool", "/anime-tracker"].flatMap(path => tools.filter(entry => entry.href === path))

  return <div className="retro-page" data-page="retro-home">
    <RetroHeader />
    <nav className="retro-mode" aria-label={copy.home}>
      <Link href="/" aria-current={section !== "tools" ? "page" : undefined} onNavigate={() => navigateRetro("")}>{copy.games}</Link>
      <Link href="/#retro-tools" aria-current={section === "tools" ? "page" : undefined} onNavigate={() => navigateRetro("#retro-tools")}>{copy.tools}</Link>
    </nav>
    <main>
      {section === "home" && <>
        <div className="retro-console">
          <section className="retro-lcd" aria-label={t(selected.titleKey)}>
            <div className="retro-lcd-content">
              <span className="retro-lcd-category">{t(selectedCategory.titleKey)}</span>
              <span className="retro-lcd-motto" aria-hidden="true">GOOD GAMES<br />BETTER DAYS</span>
              <h1 className={selected.href === "/2048" ? "retro-pixel-title" : ""}>{t(selected.titleKey)}</h1>
              <p>{description}</p><GameArt entry={selected} />
              <span className="retro-lcd-indicator" aria-hidden="true">▸ ▸ ▸</span>
            </div>
            <div className="retro-lcd-brand"><b>XM-GAMES</b><span>{copy.tagline}</span></div>
          </section>
          <div className="retro-console-controls">
            <section className="retro-rack" aria-label={copy.select}>
              <button type="button" className="retro-rack-arrow" aria-label={copy.previous} onClick={() => setSelectedIndex(index => wrapCartridge(index - 1, featured.length))}><ChevronLeft aria-hidden="true" /></button>
              {[-1, 0, 1].map(offset => {
                const index = wrapCartridge(selectedIndex + offset, featured.length)
                const entry = featured[index]
                return <button type="button" className="retro-cartridge" key={entry.href} aria-pressed={offset === 0}
                  aria-label={t(entry.titleKey)} onClick={() => setSelectedIndex(index)}>
                  <Cartridge entry={entry} title={t(entry.titleKey)} />
                </button>
              })}
              <button type="button" className="retro-rack-arrow" aria-label={copy.next} onClick={() => setSelectedIndex(index => wrapCartridge(index + 1, featured.length))}><ChevronRight aria-hidden="true" /></button>
            </section>
            <Link className="retro-start" href={selected.href}>{copy.start}<ArrowRight aria-hidden="true" /></Link>
            <Link className="retro-all" href="/#retro-games" onNavigate={() => navigateRetro("#retro-games")}>{copy.all}<ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
        <section className="retro-handy" aria-labelledby="retro-handy-title">
          <h2 id="retro-handy-title">{copy.handy}</h2>
          <div>{handy.map(entry => <Link key={entry.href} href={entry.href}><entry.icon aria-hidden="true" /><strong>{entry.href === "/text-tool" ? copy.text : t(entry.titleKey)}</strong><ChevronRight aria-hidden="true" /></Link>)}</div>
        </section>
      </>}
      {section === "games" && <section className="retro-library" aria-labelledby="retro-library-title">
        <div className="retro-section-heading"><h1 id="retro-library-title">{copy.library}</h1><span>{games.length}</span></div>
        <div className="retro-search"><Search aria-hidden="true" /><input aria-label={copy.search} placeholder={copy.search} value={query} onChange={event => setQuery(event.target.value)} />
          {query && <button type="button" aria-label={copy.clear} onClick={() => setQuery("")}><X aria-hidden="true" /></button>}
        </div>
        <div className="retro-filters" role="group" aria-label={copy.games}>
          <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>{copy.all}</button>
          {categories.filter(group => group.titleKey !== "categoryTools").map(group => <button key={group.titleKey} type="button" aria-pressed={category === group.titleKey} onClick={() => setCategory(group.titleKey)}>{t(group.titleKey)}</button>)}
        </div>
        <div className="retro-library-grid">{visibleGames.map(entry => <Link className="retro-library-game" key={entry.href} href={entry.href}>
          <span className="retro-cartridge" aria-hidden="true"><Cartridge entry={entry} title={t(entry.titleKey)} /></span><span>{t(entry.titleKey)}</span>
        </Link>)}</div>
        {!visibleGames.length && <p className="retro-empty" role="status">{copy.empty}</p>}
      </section>}
      {section === "tools" && <section className="retro-toolbox" aria-labelledby="retro-toolbox-title">
        <div className="retro-section-heading"><h1 id="retro-toolbox-title">{copy.handy}</h1><span>{tools.length}</span></div>
        {tools.map((entry, index) => <Link href={entry.href} key={entry.href} className="retro-tool-entry">
          <span className="retro-tool-symbol"><entry.icon aria-hidden="true" /></span><span><small>0{index + 1}</small><h2>{t(entry.titleKey)}</h2><p>{t(entry.descKey)}</p></span><ChevronRight aria-hidden="true" />
        </Link>)}
      </section>}
    </main>
    <footer className="retro-footer"><Image src="/images/theme-retro/vent-grille.webp" width={300} height={60} alt="" unoptimized /><b>XM-GAMES</b></footer>
  </div>
}
