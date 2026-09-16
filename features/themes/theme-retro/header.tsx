"use client"

import type { ReactNode } from "react"
import { ArrowLeft, Gamepad2 } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/features/themes/shared/theme-switcher"
import { useLocale } from "@/lib/locale-context"
import { RETRO_COPY } from "./copy"
import { navigateRetro, useRetroSection } from "./use-section"

function RetroControls() {
  return <div className="retro-header-controls"><LanguageSwitcher compact /><ThemeSwitcher compact /></div>
}
export function RetroHeader() {
  return <header className="retro-header">
    <Link href="/" className="retro-brand" onNavigate={() => navigateRetro("")}>
      <span><Gamepad2 aria-hidden="true" /></span><strong>XM-Games</strong>
    </Link><RetroControls />
  </header>
}
export function RetroPageHeader({ title, description, actions, homeLabel }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; homeLabel: string
}) {
  const { locale } = useLocale()
  const section = useRetroSection()
  const hash = section === "tools" ? "#retro-tools" : "#retro-games"
  return <>
    <header className="retro-header retro-page-header">
      <Link href={`/${hash}`} className="retro-back" aria-label={RETRO_COPY[locale][section] || homeLabel}
        onNavigate={() => navigateRetro(hash)}><ArrowLeft aria-hidden="true" /></Link>
      <h1>{title || homeLabel}</h1><RetroControls />
    </header>
    {(description || actions) && <div className="retro-page-context">
      {description && <p>{description}</p>}{actions && <div className="retro-page-actions">{actions}</div>}
    </div>}
  </>
}
