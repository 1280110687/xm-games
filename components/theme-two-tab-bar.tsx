"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gamepad2, House, Settings2, Tv } from "lucide-react"

import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const TAB_BAR_COPY: Record<
  Locale,
  {
    navigation: string
    home: string
    games: string
    tracker: string
    settings: string
  }
> = {
  zh: {
    navigation: "主题二主导航",
    home: "首页",
    games: "游戏",
    tracker: "追番",
    settings: "设置",
  },
  en: {
    navigation: "Theme Two navigation",
    home: "Home",
    games: "Games",
    tracker: "Tracker",
    settings: "Settings",
  },
  th: {
    navigation: "การนำทางธีม 2",
    home: "หน้าแรก",
    games: "เกม",
    tracker: "อนิเมะ",
    settings: "ตั้งค่า",
  },
}

export function ThemeTwoTabBar() {
  const pathname = usePathname()
  const [hash, setHash] = useState("")
  const { locale } = useLocale()
  const copy = TAB_BAR_COPY[locale]

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash)

    syncHash()
    window.addEventListener("hashchange", syncHash)
    return () => window.removeEventListener("hashchange", syncHash)
  }, [pathname])

  const isGameLibrary = pathname === "/" && hash === "#game-library"
  const isHome = pathname === "/" && !isGameLibrary
  const isTracker = pathname === "/anime-tracker"
  const isSettings = pathname === "/settings"
  const isGame =
    isGameLibrary || (pathname !== "/" && !isTracker && !isSettings)

  return (
    <nav className="theme-two-tab-bar" aria-label={copy.navigation}>
      <Link
        href="/"
        onClick={() => setHash("")}
        className={cn("theme-two-tab-item", isHome && "is-active")}
        aria-current={isHome ? "page" : undefined}
      >
        <House aria-hidden="true" />
        <span>{copy.home}</span>
      </Link>
      <Link
        href="/#game-library"
        onClick={() => setHash("#game-library")}
        className={cn("theme-two-tab-item", isGame && "is-active")}
        aria-current={isGame ? "page" : undefined}
      >
        <Gamepad2 aria-hidden="true" />
        <span>{copy.games}</span>
      </Link>
      <Link
        href="/anime-tracker"
        className={cn("theme-two-tab-item", isTracker && "is-active")}
        aria-current={isTracker ? "page" : undefined}
      >
        <Tv aria-hidden="true" />
        <span>{copy.tracker}</span>
      </Link>
      <Link
        href="/settings"
        className={cn("theme-two-tab-item", isSettings && "is-active")}
        aria-current={isSettings ? "page" : undefined}
      >
        <Settings2 aria-hidden="true" />
        <span>{copy.settings}</span>
      </Link>
    </nav>
  )
}
