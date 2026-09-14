"use client"

import type { ReactNode } from "react"
import { ArrowLeft, Gamepad2 } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/features/themes/shared/theme-switcher"
import { useLocale } from "@/lib/locale-context"
import { POCKET_COPY } from "./copy"
import { navigatePocket, usePocketSection } from "./use-section"

function PocketControls() {
  return <div className="pocket-header-controls"><LanguageSwitcher compact /><ThemeSwitcher compact /></div>
}

export function PocketHeader() {
  return <header className="pocket-header">
    <Link href="/" className="pocket-brand" onNavigate={() => navigatePocket("")}>
      <span><Gamepad2 aria-hidden="true" /></span><strong>XM-Games</strong>
    </Link>
    <PocketControls />
  </header>
}

export function PocketPageHeader({ title, description, actions, homeLabel }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; homeLabel: string
}) {
  const { locale } = useLocale()
  const section = usePocketSection()
  const hash = section === "tools" ? "#pocket-tools" : "#pocket-games"
  return <>
    <header className="pocket-header pocket-page-header">
      <Link className="pocket-back" href={`/${hash}`} aria-label={POCKET_COPY[locale][section] || homeLabel}
        onNavigate={() => navigatePocket(hash)}><ArrowLeft aria-hidden="true" /></Link>
      <h1>{title || homeLabel}</h1><PocketControls />
    </header>
    {(description || actions) && <div className="pocket-page-context">
      {description && <p>{description}</p>}{actions && <div className="pocket-page-actions">{actions}</div>}
    </div>}
  </>
}
