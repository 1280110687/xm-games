"use client"
import { Gamepad2, House, Wrench } from "lucide-react"
import { usePathname } from "next/navigation"
import { useLocale } from "@/lib/locale-context"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { THEME_THREE_HOME_COPY } from "./home-copy"
import { THEME_THREE_NAV_ITEMS } from "./navigation-model"
import { navigateThemeThree, useThemeThreeSection } from "./use-section"
const ICONS = { home: House, games: Gamepad2, tools: Wrench }
export function ThemeThreeNavigation() {
  const { locale } = useLocale()
  const pathname = usePathname()
  const section = useThemeThreeSection()
  const copy = THEME_THREE_HOME_COPY[locale]
  return <nav className="theme-three-bottom-bar" data-t3-glass="dock" aria-label={copy.navigation}>
    {THEME_THREE_NAV_ITEMS.map(({ key, href, hash }) => {
      const Icon = ICONS[key]
      return <Link key={key} href={href} scroll={false} className="theme-three-bottom-item"
        aria-current={section === key ? (pathname === "/" ? "page" : "location") : undefined}
        onNavigate={() => navigateThemeThree(hash)}>
        <Icon aria-hidden="true" /><span>{copy[key]}</span>
      </Link>
    })}
  </nav>
}
