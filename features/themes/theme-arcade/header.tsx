"use client"

import { ArrowLeft, Gamepad2 } from "lucide-react"
import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/features/themes/shared/theme-switcher"
import { useLocale } from "@/lib/locale-context"
import { ARCADE_COPY } from "./copy"
import { navigateArcade } from "./use-home-section"
import { getArcadeRouteSection } from "./home-model"

export function ArcadeHeader({ tool = false }: { tool?: boolean }) {
  const { locale } = useLocale()
  const copy = ARCADE_COPY[locale]
  return <header className="arcade-header">
    {tool ? <><Link href="/#arcade-tools" className="arcade-back" aria-label={copy.tools}
      onNavigate={() => navigateArcade("#arcade-tools")}><ArrowLeft /></Link><h1>{copy.text}</h1></>
      : <Link href="/" className="arcade-brand" onNavigate={() => navigateArcade("")}>
        <span><Gamepad2 aria-hidden="true" strokeWidth={2.6} /></span><strong>XM-Games</strong>
      </Link>}
    <div className="arcade-header-controls">
      <LanguageSwitcher compact />
      <ThemeSwitcher compact className="arcade-theme-switch" />
    </div>
  </header>
}

/** Theme-owned page chrome. Domain views retain their title and action slots. */
export function ArcadePageHeader({ title, description, actions, homeLabel }: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  homeLabel: string
}) {
  const { locale } = useLocale()
  const copy = ARCADE_COPY[locale]
  const section = getArcadeRouteSection(usePathname())
  const hash = section === "tools" ? "#arcade-tools" : section === "games" ? "#arcade-games" : ""
  return <>
    <header className="arcade-header arcade-page-header" data-has-context={Boolean(description || actions)}>
      <Link href={`/${hash}`} className="arcade-back" aria-label={section ? copy[section] : homeLabel}
        onNavigate={() => navigateArcade(hash)}><ArrowLeft aria-hidden="true" /></Link>
      <h1>{title || homeLabel}</h1>
      <div className="arcade-header-controls">
        <LanguageSwitcher compact />
        <ThemeSwitcher compact className="arcade-theme-switch" />
      </div>
    </header>
    {(description || actions) && <div className="arcade-page-context">
      {description && <p>{description}</p>}
      {actions && <div className="arcade-page-actions">{actions}</div>}
    </div>}
  </>
}
