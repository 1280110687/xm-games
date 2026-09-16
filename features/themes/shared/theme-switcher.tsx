"use client"

import {
  Layers3,
  LayoutGrid,
  Gamepad2,
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
    themes: Record<ThemeId, ThemeOptionCopy>
  }
> = {
  zh: {
    appearance: "主题风格",
    trigger: "切换主题风格",
    themes: {
      "theme-retro": { name: "主题五 · 复古掌机", description: "LCD 屏幕、游戏卡带与实体感按键" },
      "theme-arcade": { name: "主题一 · 街机编辑部", description: "珊瑚色块、硬朗线条与编辑式排版" },
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
    themes: {
      "theme-retro": { name: "Theme Five · Retro", description: "LCD screens, cartridges and tactile controls" },
      "theme-arcade": { name: "Theme One · Arcade", description: "Coral accents and bold editorial layouts" },
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
    themes: {
      "theme-retro": { name: "ธีม 5 · เรโทร", description: "จอ LCD ตลับเกม และปุ่มสไตล์เครื่องเกมพกพา" },
      "theme-arcade": { name: "ธีม 1 · อาร์เคด", description: "สีคอรัล เส้นคมชัด และเลย์เอาต์แบบนิตยสาร" },
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
  "theme-arcade": Gamepad2,
  "theme-three": PanelsTopLeft,
  "theme-four": PencilRuler,
}

export function ThemeSwitcher({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const { locale } = useLocale()
  const { theme, styleError, setTheme } = useTheme()
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
          title={styleError ? (locale === "zh" ? "主题加载失败，请重试" : locale === "th" ? "โหลดธีมไม่สำเร็จ ลองอีกครั้ง" : "Theme failed to load. Please retry.") : undefined}
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
