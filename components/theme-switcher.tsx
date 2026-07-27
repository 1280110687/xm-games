"use client"

import {
  Layers3,
  MoonStar,
  Palette,
  PanelsTopLeft,
  Smartphone,
  type LucideIcon,
} from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/lib/locale-context"
import type { Locale } from "@/lib/i18n"
import { isThemeId, themes, type ThemeId } from "@/lib/theme"
import { cn } from "@/lib/utils"

type ThemeOptionCopy = {
  name: string
  description: string
}

const THEME_COPY: Record<
  Locale,
  {
    appearance: string
    trigger: string
    themes: Record<ThemeId, ThemeOptionCopy>
  }
> = {
  zh: {
    appearance: "主题风格",
    trigger: "切换主题风格",
    themes: {
      "theme-one": {
        name: "主题一",
        description: "霓虹深色游戏大厅",
      },
      "theme-two": {
        name: "主题二",
        description: "iOS 灵感浅色应用",
      },
      "theme-three": {
        name: "主题三",
        description: "黑曜玻璃控制台",
      },
    },
  },
  en: {
    appearance: "Appearance",
    trigger: "Switch appearance",
    themes: {
      "theme-one": {
        name: "Theme One",
        description: "Neon dark game hall",
      },
      "theme-two": {
        name: "Theme Two",
        description: "iOS-inspired light app",
      },
      "theme-three": {
        name: "Theme Three",
        description: "Obsidian glass console",
      },
    },
  },
  th: {
    appearance: "ธีม",
    trigger: "เปลี่ยนธีม",
    themes: {
      "theme-one": {
        name: "ธีม 1",
        description: "โถงเกมนีออนโหมดมืด",
      },
      "theme-two": {
        name: "ธีม 2",
        description: "แอปสว่างสไตล์ iOS",
      },
      "theme-three": {
        name: "ธีม 3",
        description: "คอนโซลกระจกออบซิเดียน",
      },
    },
  },
}

const THEME_ICONS: Record<ThemeId, LucideIcon> = {
  "theme-one": MoonStar,
  "theme-two": Smartphone,
  "theme-three": PanelsTopLeft,
}

export function ThemeSwitcher({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const { locale } = useLocale()
  const { theme, setTheme } = useTheme()
  const copy = THEME_COPY[locale]
  const currentTheme = copy.themes[theme]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "default"}
          className={cn(
            "theme-switcher-trigger rounded-full",
            !compact && "px-3",
            className,
          )}
          aria-label={`${copy.trigger}: ${currentTheme.name}`}
        >
          <Palette className="size-4" aria-hidden="true" />
          {!compact && (
            <span className="theme-current-label hidden sm:inline" aria-hidden="true">
              {currentTheme.name}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="theme-switcher-content w-72 p-2"
      >
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Layers3 className="size-4" aria-hidden="true" />
          {copy.appearance}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (isThemeId(value)) setTheme(value)
          }}
          className="space-y-1"
        >
          {themes.map((themeId) => {
            const Icon = THEME_ICONS[themeId]
            const option = copy.themes[themeId]

            return (
              <DropdownMenuRadioItem
                key={themeId}
                value={themeId}
                className="min-h-14 items-start rounded-xl py-2.5"
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block font-semibold text-foreground">
                    {option.name}
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
