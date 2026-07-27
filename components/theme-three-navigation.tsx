"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Gamepad2,
  Grid2X2,
  House,
  Settings2,
  Sparkles,
  Tv,
} from "lucide-react"

import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const NAVIGATION_COPY: Record<
  Locale,
  {
    navigation: string
    home: string
    games: string
    tracker: string
    settings: string
    workspace: string
    workspaceDescription: string
    ready: string
  }
> = {
  zh: {
    navigation: "主题三主导航",
    home: "控制台",
    games: "游戏库",
    tracker: "追番",
    settings: "设置中心",
    workspace: "娱乐工作区",
    workspaceDescription: "本地优先 · 即开即玩",
    ready: "系统就绪",
  },
  en: {
    navigation: "Theme Three navigation",
    home: "Console",
    games: "Library",
    tracker: "Tracker",
    settings: "Settings",
    workspace: "Play workspace",
    workspaceDescription: "Local first · Instant play",
    ready: "System ready",
  },
  th: {
    navigation: "การนำทางธีม 3",
    home: "คอนโซล",
    games: "คลังเกม",
    tracker: "อนิเมะ",
    settings: "ตั้งค่า",
    workspace: "พื้นที่ความบันเทิง",
    workspaceDescription: "เน้นในเครื่อง · เล่นทันที",
    ready: "ระบบพร้อม",
  },
}

const GAME_ROUTES = new Set([
  "/2048",
  "/bingo",
  "/bingo-cards",
  "/chess",
  "/chinese-chess",
  "/go",
  "/gomoku",
  "/memory-match",
  "/minesweeper",
  "/neon-breaker",
  "/reversi",
  "/snake",
  "/sudoku",
  "/tetris",
])

type NavigationItem = {
  href: string
  label: string
  icon: typeof House
  active: boolean
  current?: "page" | "location"
  onClick?: () => void
}

function NavigationItems({
  items,
  itemClassName,
}: {
  items: NavigationItem[]
  itemClassName: string
}) {
  return items.map(({ href, label, icon: Icon, active, current, onClick }) => (
    <Link
      key={href}
      href={href}
      onClick={onClick}
      className={cn(itemClassName, active && "is-active")}
      aria-current={current}
    >
      <span className="theme-three-nav-icon">
        <Icon aria-hidden="true" />
      </span>
      <span>{label}</span>
    </Link>
  ))
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
    return () => window.removeEventListener("hashchange", syncHash)
  }, [pathname])

  const isGameLibrary =
    pathname === "/" && hash === "#theme-three-game-library"
  const isHome = pathname === "/" && !isGameLibrary
  const isTracker =
    pathname === "/anime-tracker" || pathname.startsWith("/anime-tracker/")
  const isSettings =
    pathname === "/settings" || pathname.startsWith("/settings/")
  const isGame = isGameLibrary || GAME_ROUTES.has(pathname)

  const items: NavigationItem[] = [
    {
      href: "/",
      label: copy.home,
      icon: House,
      active: isHome,
      current: isHome ? "page" : undefined,
      onClick: () => setHash(""),
    },
    {
      href: "/#theme-three-game-library",
      label: copy.games,
      icon: Gamepad2,
      active: isGame,
      current: isGameLibrary
        ? "page"
        : GAME_ROUTES.has(pathname)
          ? "location"
          : undefined,
      onClick: () => setHash("#theme-three-game-library"),
    },
    {
      href: "/anime-tracker",
      label: copy.tracker,
      icon: Tv,
      active: isTracker,
      current: isTracker
        ? pathname === "/anime-tracker"
          ? "page"
          : "location"
        : undefined,
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
        <Link href="/" className="theme-three-sidebar-brand">
          <span className="theme-three-brand-mark">
            <Sparkles aria-hidden="true" />
          </span>
          <span>
            <strong>{t("appName")}</strong>
            <small>PLAY OS</small>
          </span>
        </Link>

        <nav
          className="theme-three-sidebar-links"
          aria-label={copy.navigation}
        >
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
