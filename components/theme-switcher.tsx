"use client"

import { Layers3, MoonStar, Palette, Smartphone } from "lucide-react"

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
import type { ThemeId } from "@/lib/theme"
import { cn } from "@/lib/utils"

const THEME_COPY: Record<
  Locale,
  {
    appearance: string
    trigger: string
    themeOne: string
    themeOneDescription: string
    themeTwo: string
    themeTwoDescription: string
  }
> = {
  zh: {
    appearance: "主题风格",
    trigger: "切换主题风格",
    themeOne: "主题一",
    themeOneDescription: "现有霓虹深色布局",
    themeTwo: "主题二",
    themeTwoDescription: "iOS 灵感浅色布局",
  },
  en: {
    appearance: "Appearance",
    trigger: "Switch appearance",
    themeOne: "Theme One",
    themeOneDescription: "Current neon dark layout",
    themeTwo: "Theme Two",
    themeTwoDescription: "iOS-inspired light layout",
  },
  th: {
    appearance: "ธีม",
    trigger: "เปลี่ยนธีม",
    themeOne: "ธีม 1",
    themeOneDescription: "เลย์เอาต์นีออนโหมดมืด",
    themeTwo: "ธีม 2",
    themeTwoDescription: "เลย์เอาต์สว่างสไตล์ iOS",
  },
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
          aria-label={`${copy.trigger}: ${theme === "theme-one" ? copy.themeOne : copy.themeTwo}`}
        >
          <Palette className="size-4" aria-hidden="true" />
          {!compact && (
            <span className="theme-current-label hidden sm:inline" aria-hidden="true">
              <span data-theme-label="theme-one">{copy.themeOne}</span>
              <span data-theme-label="theme-two">{copy.themeTwo}</span>
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
          onValueChange={(value) => setTheme(value as ThemeId)}
          className="space-y-1"
        >
          <DropdownMenuRadioItem
            value="theme-one"
            className="min-h-14 items-start rounded-xl py-2.5"
          >
            <MoonStar className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-semibold text-foreground">
                {copy.themeOne}
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                {copy.themeOneDescription}
              </span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="theme-two"
            className="min-h-14 items-start rounded-xl py-2.5"
          >
            <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-semibold text-foreground">
                {copy.themeTwo}
              </span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                {copy.themeTwoDescription}
              </span>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
