"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ArrowRight, ChevronRight } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { useLocale } from "@/lib/locale-context"
import type { CatalogCategory } from "@/features/catalog/types"
import { PocketHeader } from "./header"
import { POCKET_COPY } from "./copy"
import { getPocketEntries, POCKET_ART, POCKET_TOOL_ART, POCKET_NAVIGATION_EVENT, type PocketFilter } from "./model"
import { navigatePocket, usePocketSection } from "./use-section"

export function PocketHome({ categories }: { categories: CatalogCategory[] }) {
  const { locale, t } = useLocale()
  const copy = POCKET_COPY[locale]
  const section = usePocketSection()
  const [filter, setFilter] = useState<PocketFilter>("featured")
  useEffect(() => {
    const reset = () => setFilter("featured")
    window.addEventListener(POCKET_NAVIGATION_EVENT, reset)
    window.addEventListener("hashchange", reset)
    return () => {
      window.removeEventListener(POCKET_NAVIGATION_EVENT, reset)
      window.removeEventListener("hashchange", reset)
    }
  }, [])
  const entries = getPocketEntries(categories, section, filter)
  return <div className="pocket-page" data-page="pocket-home">
    <PocketHeader />
    <main className="pocket-main">
      <h1 className="pocket-headline">{section === "home" ? copy.headline : copy[section]}</h1>
      {section !== "tools" && <div className="pocket-tabs" role="group" aria-label={copy.games}>
        {(["featured", "board", "puzzle", "arcade"] as const).map(key => <button type="button" key={key}
          aria-pressed={filter === key} onClick={() => setFilter(key)}>{key === "featured" && section === "games" ? copy.all : copy[key]}</button>)}
      </div>}
      {section === "tools" ? <section className="pocket-tool-list" aria-label={copy.tools}>
        {entries.map(entry => <Link key={entry.href} href={entry.href}>
          <Image className="pocket-tool-icon" src={`/images/theme-pocket/${POCKET_TOOL_ART[entry.href]}.webp`} alt="" width={320} height={320} unoptimized />
          <span><h2>{t(entry.titleKey)}</h2><p>{t(entry.descKey)}</p></span><ChevronRight aria-hidden="true" />
        </Link>)}
      </section> : <section className="pocket-game-grid" aria-label={copy.games}>
        {entries.map(entry => <Link href={entry.href} key={entry.href} className="pocket-game">
          {POCKET_ART[entry.href] ? <Image src={`/images/theme-pocket/${POCKET_ART[entry.href]}.webp`} alt="" width={320} height={320} unoptimized priority={section === "home"} />
            : <span className="pocket-game-symbol"><entry.icon aria-hidden="true" /></span>}
          <span>{entry.href === "/bingo" ? "BINGO" : t(entry.titleKey)}</span>
        </Link>)}
      </section>}
      {section === "home" && <>
        <Link className="pocket-all" href="/#pocket-games" onNavigate={() => navigatePocket("#pocket-games")}>{copy.all}<ChevronRight aria-hidden="true" /></Link>
        <section className="pocket-handy" aria-labelledby="pocket-handy-title">
          <h2 id="pocket-handy-title">{copy.handy}</h2>
          <Link className="pocket-text-entry" href="/text-tool">
            <Image src={`/images/theme-pocket/${POCKET_TOOL_ART["/text-tool"]}.webp`} alt="" width={320} height={320} unoptimized />
            <span><strong>{copy.text}</strong><small>{copy.textDescription}</small></span>
            <span className="pocket-entry-arrow"><ArrowRight aria-hidden="true" /></span>
          </Link>
          <Link className="pocket-anime-entry" href="/anime-tracker">
            <Image className="pocket-tool-icon" src={`/images/theme-pocket/${POCKET_TOOL_ART["/anime-tracker"]}.webp`} alt="" width={320} height={320} unoptimized />
            <strong>{t("animeTracker")}</strong><ChevronRight aria-hidden="true" />
          </Link>
        </section>
      </>}
    </main>
  </div>
}
