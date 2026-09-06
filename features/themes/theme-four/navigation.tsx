"use client"

import { usePathname } from "next/navigation"
import { Gamepad2, House, Map, Settings2, Tv } from "lucide-react"

import { useLocale } from "@/lib/locale-context"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import type { Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { getThemeFourActiveSection } from "./navigation-model"

const COPY: Record<
  Locale,
  { navigation: string; home: string; map: string; tracker: string; settings: string }
> = {
  zh: {
    navigation: "主题四主导航",
    home: "俱乐部",
    map: "房间",
    tracker: "追番",
    settings: "设置",
  },
  en: {
    navigation: "Theme Four navigation",
    home: "Club",
    map: "Rooms",
    tracker: "Tracker",
    settings: "Settings",
  },
  th: {
    navigation: "การนำทางธีม 4",
    home: "ชมรม",
    map: "ห้อง",
    tracker: "อนิเมะ",
    settings: "ตั้งค่า",
  },
}

export function ThemeFourNavigation() {
  const pathname = usePathname()
  const { locale } = useLocale()
  const copy = COPY[locale]
  const activeSection = getThemeFourActiveSection(pathname)

  if (pathname === "/") return null

  const items = [
    { href: "/", label: copy.home, icon: House, active: false },
    { href: "/#theme-four-map", label: copy.map, icon: Map, active: activeSection === "rooms" },
    {
      href: "/anime-tracker",
      label: copy.tracker,
      icon: Tv,
      active: activeSection === "tracker",
    },
    {
      href: "/settings",
      label: copy.settings,
      icon: Settings2,
      active: activeSection === "settings",
    },
  ]

  return (
    <nav className="theme-four-route-nav" aria-label={copy.navigation}>
      <Link
        href="/"
        className="theme-four-route-brand"
        aria-label={copy.home}
      >
        <Gamepad2 aria-hidden="true" />
        <span>XM</span>
      </Link>
      <div>
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={cn(active && "is-active")}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
