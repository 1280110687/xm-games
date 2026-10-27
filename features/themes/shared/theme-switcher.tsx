"use client"

import { useRef, useState } from "react"
import {
  Layers3,
  LoaderCircle,
  LayoutGrid,
  Joystick,
  Palette,
  PanelsTopLeft,
  PencilRuler,
  type LucideIcon,
} from "lucide-react"

import { useTheme } from "@/features/themes/shared/theme-provider"
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
    loading: string
    error: string
    themes: Record<ThemeId, ThemeOptionCopy>
  }
> = {
  zh: {
    appearance: "主题风格",
    trigger: "切换主题风格",
    loading: "正在切换",
    error: "主题加载失败，请再次选择主题重试。",
    themes: {
      "theme-retro": { name: "主题五 · 复古掌机", description: "LCD 屏幕、游戏卡带与实体感按键" },
      "theme-pocket": { name: "主题二 · 口袋启动器", description: "蓝白轻界面与立体游戏图标" },
      "theme-three": {
        name: "主题三 · 夜色游廊",
        description: "月光湖景、清透玻璃与悬浮导航",
      },
      "theme-four": {
        name: "主题四 · 游戏会馆",
        description: "推门进入，自由探索 3D 房间",
      },
    },
  },
  en: {
    appearance: "Appearance",
    trigger: "Switch appearance",
    loading: "Switching to",
    error: "Could not load the theme. Select a theme to retry.",
    themes: {
      "theme-retro": { name: "Theme Five · Retro", description: "LCD screens, cartridges and tactile controls" },
      "theme-pocket": { name: "Theme Two · Pocket", description: "A blue-and-white launcher with playful game icons" },
      "theme-three": {
        name: "Theme Three · Night Gallery",
        description: "Moonlit scenery, crystal glass and a floating dock",
      },
      "theme-four": {
        name: "Theme Four · Clubhouse",
        description: "Push the door and explore 3D rooms",
      },
    },
  },
  th: {
    appearance: "ธีม",
    trigger: "เปลี่ยนธีม",
    loading: "กำลังเปลี่ยนเป็น",
    error: "โหลดธีมไม่สำเร็จ เลือกธีมเพื่อลองอีกครั้ง",
    themes: {
      "theme-retro": { name: "ธีม 5 · เรโทร", description: "จอ LCD ตลับเกม และปุ่มสไตล์เครื่องเกมพกพา" },
      "theme-pocket": { name: "ธีม 2 · พ็อกเก็ต", description: "หน้าจอขาวฟ้า พร้อมไอคอนเกมสามมิติ" },
      "theme-three": {
        name: "ธีม 3 · ไนต์แกลเลอรี",
        description: "วิวทะเลสาบใต้แสงจันทร์ กระจกใส และแถบนำทางลอย",
      },
      "theme-four": {
        name: "ธีม 4 · คลับเกม",
        description: "ผลักประตูและสำรวจห้องสามมิติ",
      },
    },
  },
}

const THEME_ICONS: Record<ThemeId, LucideIcon> = {
  "theme-retro": Joystick,
  "theme-pocket": LayoutGrid,
  "theme-three": PanelsTopLeft,
  "theme-four": PencilRuler,
}

export function ThemeSwitcher({
  compact = false,
  modal = true,
  className,
}: {
  compact?: boolean
  modal?: boolean
  className?: string
}) {
  const { locale } = useLocale()
  const { theme, styleError, pendingTheme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const choosingRef = useRef(false)
  const copy = THEME_COPY[locale]
  const currentTheme = copy.themes[theme]
  const changeOpen = (next: boolean) => {
    openRef.current = next
    setOpen(next)
  }
  const chooseTheme = async (nextTheme: ThemeId) => {
    if (choosingRef.current || pendingTheme) return
    choosingRef.current = true
    const applied = await setTheme(nextTheme)
    choosingRef.current = false
    const restoreFocus = openRef.current || document.activeElement?.matches(".theme-switcher-trigger")
    if (!applied || !restoreFocus) return
    changeOpen(false)
    // Applying a theme can replace the entire header, including this trigger.
    // Restore keyboard position to the newly mounted, visible control.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const trigger = [...document.querySelectorAll<HTMLElement>(
        ".theme-switcher-trigger, .theme-four-menu-trigger",
      )].find((element) => element.getClientRects().length > 0)
      trigger?.focus({ preventScroll: true })
    }))
  }
  const status = pendingTheme
    ? `${copy.loading}: ${copy.themes[pendingTheme].name}`
    : styleError ? copy.error : ""

  return (
    <DropdownMenu modal={modal} open={open} onOpenChange={changeOpen}>
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
          aria-busy={pendingTheme ? true : undefined}
          title={styleError ? copy.error : undefined}
        >
          {pendingTheme
            ? <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
            : <Palette className="size-4" aria-hidden="true" />}
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
        className="theme-switcher-content w-72 max-w-[calc(100vw-1rem)] p-2"
        aria-busy={pendingTheme ? true : undefined}
        onCloseAutoFocus={(event) => {
          if (document.documentElement.dataset.theme !== theme) event.preventDefault()
        }}
      >
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Layers3 className="size-4" aria-hidden="true" />
          {copy.appearance}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (isThemeId(value) && (value !== theme || styleError)) void chooseTheme(value)
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
                disabled={pendingTheme !== null}
                onSelect={(event) => {
                  // Keep the options and recovery message visible until CSS is ready.
                  if (themeId !== theme || styleError) event.preventDefault()
                }}
              >
                {pendingTheme === themeId
                  ? <LoaderCircle className="mt-0.5 size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
                  : <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
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
        <p role="status" aria-atomic="true" className={cn(
          "theme-switcher-status px-2 text-xs leading-5 text-muted-foreground",
          status ? "pt-2 pb-1" : "sr-only",
        )}>{status}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
