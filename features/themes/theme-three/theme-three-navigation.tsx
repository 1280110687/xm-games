"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  Activity,
  Gamepad2,
  Grid2X2,
  House,
  Settings2,
  Sparkles,
  Wrench,
} from "lucide-react"

import { useLocale } from "@/lib/locale-context"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import type { Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import {
  getThemeThreeNavigationSection,
  THEME_THREE_HOME_NAVIGATION,
  THEME_THREE_LIBRARY_HASH,
  THEME_THREE_TOOLS_HASH,
} from "./navigation-model"

const NAVIGATION_COPY: Record<
  Locale,
  {
    navigation: string
    home: string
    games: string
    tools: string
    settings: string
    workspace: string
    workspaceDescription: string
    ready: string
  }
> = {
  zh: {
    navigation: "主题三主导航",
    home: "首页",
    games: "游戏库",
    tools: "工具",
    settings: "设置中心",
    workspace: "娱乐工作区",
    workspaceDescription: "本地优先 · 即开即玩",
    ready: "系统就绪",
  },
  en: {
    navigation: "Theme Three navigation",
    home: "Home",
    games: "Library",
    tools: "Tools",
    settings: "Settings",
    workspace: "Play workspace",
    workspaceDescription: "Local first · Instant play",
    ready: "System ready",
  },
  th: {
    navigation: "การนำทางธีม 3",
    home: "หน้าแรก",
    games: "คลังเกม",
    tools: "เครื่องมือ",
    settings: "ตั้งค่า",
    workspace: "พื้นที่ความบันเทิง",
    workspaceDescription: "เน้นในเครื่อง · เล่นทันที",
    ready: "ระบบพร้อม",
  },
}

type NavigationItem = {
  href: string
  label: string
  icon: typeof House
  active: boolean
  current?: "page" | "location"
  onNavigate?: () => void
}

function NavigationItems({
  items,
  itemClassName,
}: {
  items: NavigationItem[]
  itemClassName: string
}) {
  return items.map(
    ({ href, label, icon: Icon, active, current, onNavigate }) => (
      <Link
        key={href}
        href={href}
        onNavigate={onNavigate}
        className={cn(itemClassName, active && "is-active")}
        aria-current={current}
      >
        <span className="theme-three-nav-icon">
          <Icon aria-hidden="true" />
        </span>
        <span>{label}</span>
      </Link>
    ),
  )
}

export function ThemeThreeNavigation() {
  const pathname = usePathname()
  const [hash, setHash] = useState("")
  const { locale, t } = useLocale()
  const copy = NAVIGATION_COPY[locale]

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash)

    syncHash()
    window.addEventListener("hashchange", syncHash)
    window.addEventListener("popstate", syncHash)
    return () => {
      window.removeEventListener("hashchange", syncHash)
      window.removeEventListener("popstate", syncHash)
    }
  }, [pathname])

  const section = getThemeThreeNavigationSection(pathname, hash)
  const isHome = section === "home"
  const isGame = section === "games"
  const isTools = section === "tools"
  const isSettings = section === "settings"
  const navigateHome = (nextHash: string) => {
    setHash(nextHash)
    // Also reset an existing home search, including a repeated tap on Tools.
    window.dispatchEvent(
      new CustomEvent(THEME_THREE_HOME_NAVIGATION, { detail: nextHash }),
    )
  }

  const items: NavigationItem[] = [
    {
      href: "/",
      label: copy.home,
      icon: House,
      active: isHome,
      current: isHome ? "page" : undefined,
      onNavigate: () => navigateHome(""),
    },
    {
      href: `/${THEME_THREE_LIBRARY_HASH}`,
      label: copy.games,
      icon: Gamepad2,
      active: isGame,
      current: isGame ? (pathname === "/" ? "page" : "location") : undefined,
      onNavigate: () => navigateHome(THEME_THREE_LIBRARY_HASH),
    },
    {
      href: `/${THEME_THREE_TOOLS_HASH}`,
      label: copy.tools,
      icon: Wrench,
      active: isTools,
      current: isTools ? (pathname === "/" ? "page" : "location") : undefined,
      onNavigate: () => navigateHome(THEME_THREE_TOOLS_HASH),
    },
    {
      href: "/settings",
      label: copy.settings,
      icon: Settings2,
      active: isSettings,
      current: isSettings
        ? pathname === "/settings"
          ? "page"
          : "location"
        : undefined,
    },
  ]

  return (
    <>
      <aside className="theme-three-sidebar" aria-label={copy.workspace}>
        <Link
          href="/"
          className="theme-three-sidebar-brand"
          onNavigate={() => navigateHome("")}
        >
          <span className="theme-three-brand-mark">
            <Sparkles aria-hidden="true" />
          </span>
          <span>
            <strong>{t("appName")}</strong>
            <small>PLAY OS</small>
          </span>
        </Link>

        <nav className="theme-three-sidebar-links" aria-label={copy.navigation}>
          <NavigationItems
            items={items}
            itemClassName="theme-three-sidebar-link"
          />
        </nav>

        <div className="theme-three-sidebar-workspace">
          <div className="theme-three-workspace-heading">
            <span>{copy.workspace}</span>
            <Grid2X2 aria-hidden="true" />
          </div>
          <p>{copy.workspaceDescription}</p>
          <div className="theme-three-system-status">
            <Activity aria-hidden="true" />
            <span>{copy.ready}</span>
            <i aria-hidden="true" />
          </div>
        </div>
      </aside>

      <nav className="theme-three-bottom-bar" aria-label={copy.navigation}>
        <NavigationItems
          items={items}
          itemClassName="theme-three-bottom-item"
        />
      </nav>
    </>
  )
}
