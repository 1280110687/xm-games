"use client"

import { Gamepad2, House, Wrench } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { useLocale } from "@/lib/locale-context"
import { ARCADE_COPY } from "./copy"
import { ARCADE_NAV_ITEMS } from "./home-model"
import { navigateArcade, useArcadeSection } from "./use-home-section"

export function ArcadeNavigation() {
  const { locale } = useLocale()
  const copy = ARCADE_COPY[locale]
  const section = useArcadeSection()
  return <nav className="arcade-navigation" aria-label={copy.navigation}>
    {ARCADE_NAV_ITEMS.map(({ key, href, hash }) => {
      const Icon = { home: House, games: Gamepad2, tools: Wrench }[key]
      return <Link key={key} href={href}
      aria-current={section === key ? "page" : undefined}
      onNavigate={() => navigateArcade(hash)}>
      <Icon aria-hidden="true" strokeWidth={2.4} /><span>{copy[key]}</span>
    </Link>})}
  </nav>
}
