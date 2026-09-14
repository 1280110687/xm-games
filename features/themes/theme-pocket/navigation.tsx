"use client"

import { Gamepad2, House, Wrench } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { useLocale } from "@/lib/locale-context"
import { POCKET_COPY } from "./copy"
import { POCKET_NAV_ITEMS } from "./model"
import { navigatePocket, usePocketSection } from "./use-section"

export function PocketNavigation() {
  const { locale } = useLocale()
  const section = usePocketSection()
  return <nav className="pocket-navigation" aria-label={POCKET_COPY[locale].navigation}>
    {POCKET_NAV_ITEMS.map(({ key, href, hash }) => {
      const Icon = { home: House, games: Gamepad2, tools: Wrench }[key]
      return <Link key={key} href={href} aria-current={section === key ? "page" : undefined} onNavigate={() => navigatePocket(hash)}>
        <Icon aria-hidden="true" /><span>{POCKET_COPY[locale][key]}</span>
      </Link>
    })}
  </nav>
}
