"use client"

import { ThemeThreeNavigation } from "@/features/themes/theme-three/theme-three-navigation"
import { useTheme } from "@/features/themes/shared/theme-provider"
import { PocketNavigation } from "@/features/themes/theme-pocket/navigation"

export function ThemeNavigation() {
  const { theme, isResolved } = useTheme()

  if (!isResolved) return null
  if (theme === "theme-pocket") return <PocketNavigation />
  if (theme === "theme-three") return <ThemeThreeNavigation />
  return null
}
