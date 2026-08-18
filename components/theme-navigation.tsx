"use client"

import { ThemeFourNavigation } from "@/components/theme-four-navigation"
import { ThemeThreeNavigation } from "@/components/theme-three-navigation"
import { useTheme } from "@/components/theme-provider"
import { ThemeTwoTabBar } from "@/components/theme-two-tab-bar"

export function ThemeNavigation() {
  const { theme, isResolved } = useTheme()

  if (!isResolved) return null
  if (theme === "theme-two") return <ThemeTwoTabBar />
  if (theme === "theme-three") return <ThemeThreeNavigation />
  if (theme === "theme-four") return <ThemeFourNavigation />
  return null
}
