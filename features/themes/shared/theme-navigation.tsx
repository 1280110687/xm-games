"use client"

import { ThemeFourNavigation } from "@/features/themes/theme-four/navigation"
import { ThemeThreeNavigation } from "@/features/themes/theme-three/theme-three-navigation"
import { useTheme } from "@/features/themes/shared/theme-provider"
import { ThemeTwoTabBar } from "@/features/themes/theme-two/theme-two-tab-bar"

export function ThemeNavigation() {
  const { theme, isResolved } = useTheme()

  if (!isResolved) return null
  if (theme === "theme-two") return <ThemeTwoTabBar />
  if (theme === "theme-three") return <ThemeThreeNavigation />
  if (theme === "theme-four") return <ThemeFourNavigation />
  return null
}
