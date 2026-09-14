"use client"
import { useEffect, useState, type ReactNode } from "react"
import { ArrowLeft, Gamepad2 } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/features/themes/shared/theme-switcher"
import { useLocale } from "@/lib/locale-context"
import { THEME_THREE_HOME_COPY } from "./home-copy"
import { THEME_THREE_LIBRARY_HASH, THEME_THREE_TOOLS_HASH } from "./navigation-model"
import { navigateThemeThree, useThemeThreeSection } from "./use-section"

export function ThemeThreeHeader({ title, description, actions, homeLabel }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; homeLabel?: string
}) {
  const { locale, t } = useLocale()
  const section = useThemeThreeSection()
  const [scrolled, setScrolled] = useState(false)
  const copy = THEME_THREE_HOME_COPY[locale]
  const isPage = homeLabel !== undefined
  const hash = section === "tools" ? THEME_THREE_TOOLS_HASH : THEME_THREE_LIBRARY_HASH
  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 12)
    sync()
    window.addEventListener("scroll", sync, { passive: true })
    return () => window.removeEventListener("scroll", sync)
  }, [])
  return <>
    <header className={`t3-topbar${isPage ? " t3-page-header" : ""}`} data-scrolled={scrolled}>
      {isPage ? <>
        <Link href={`/${hash}`} scroll={false} className="t3-back" aria-label={section === "tools" ? copy.tools : copy.games}
          onNavigate={() => navigateThemeThree(hash)}><ArrowLeft aria-hidden="true" /></Link>
        <h1>{title || homeLabel}</h1>
      </> : <Link href="/" className="t3-wordmark" onNavigate={() => navigateThemeThree("")}>
        <Gamepad2 aria-hidden="true" /><span>{t("appName")}</span>
      </Link>}
      <div className="t3-topbar-controls"><LanguageSwitcher compact /><ThemeSwitcher compact /></div>
    </header>
    {isPage && (description || actions) && <div className="t3-page-context">
      {description && <p>{description}</p>}{actions && <div className="t3-page-actions">{actions}</div>}
    </div>}
  </>
}
