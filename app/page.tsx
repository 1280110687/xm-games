"use client"

import { HOME_CATEGORIES } from "@/features/catalog/catalog"
import { useTheme } from "@/features/themes/shared/theme-provider"
import { ThemeThreeHome } from "@/features/themes/theme-three/home"
import { ThemeFourHome } from "@/features/themes/theme-four/home"
import { ArcadeHome } from "@/features/themes/theme-arcade/home"
import { PocketHome } from "@/features/themes/theme-pocket/home"
import { RetroHome } from "@/features/themes/theme-retro/home"

export default function Home() {
  const { theme, isResolved } = useTheme()
  if (isResolved && theme === "theme-retro") return <RetroHome categories={HOME_CATEGORIES} />
  if (isResolved && theme === "theme-pocket") return <PocketHome categories={HOME_CATEGORIES} />
  if (isResolved && theme === "theme-arcade") return <ArcadeHome categories={HOME_CATEGORIES} />

  if (isResolved && theme === "theme-four") {
    return <ThemeFourHome rooms={HOME_CATEGORIES} />
  }

  return <ThemeThreeHome categories={HOME_CATEGORIES} />
}
