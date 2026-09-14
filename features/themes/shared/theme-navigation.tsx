"use client"

import { ThemeFourNavigation } from "@/features/themes/theme-four/navigation"
import { ThemeThreeNavigation } from "@/features/themes/theme-three/theme-three-navigation"
import { useTheme } from "@/features/themes/shared/theme-provider"
import { ArcadeNavigation } from "@/features/themes/theme-arcade/navigation"
import { PocketNavigation } from "@/features/themes/theme-pocket/navigation"

export function ThemeNavigation() {
  const { theme, isResolved } = useTheme()

  if (!isResolved) return null
  if (theme === "theme-pocket") return <PocketNavigation />
  if (theme === "theme-arcade") return <ArcadeNavigation />
  if (theme === "theme-three") return <ThemeThreeNavigation />
  if (theme === "theme-four") return <ThemeFourNavigation />
  return null
}
