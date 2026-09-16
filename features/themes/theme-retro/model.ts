import type { CatalogCategory } from "@/features/catalog/types"

export type RetroSection = "home" | "games" | "tools"
export const RETRO_NAVIGATION_EVENT = "retro:navigation"
export const RETRO_FEATURED = ["/gomoku", "/2048", "/snake"] as const
export const RETRO_ART: Record<string, string> = {
  "/gomoku": "gomoku-lcd", "/2048": "tiles-lcd", "/snake": "snake-lcd",
}

export function getRetroSection(pathname: string, hash: string, toolPaths: readonly string[]): RetroSection {
  const path = pathname.replace(/\/+$/, "")
  if (path) return toolPaths.includes(path) ? "tools" : "games"
  if (/(?:tools|toolbox)$/.test(hash)) return "tools"
  if (/(?:games|game-library)$/.test(hash)) return "games"
  return "home"
}

export function getRetroCatalog(categories: CatalogCategory[]) {
  return {
    games: categories.filter(category => category.titleKey !== "categoryTools").flatMap(category => category.games),
    tools: categories.filter(category => category.titleKey === "categoryTools").flatMap(category => category.games),
  }
}

export function wrapCartridge(index: number, length: number) {
  return length > 0 ? ((index % length) + length) % length : 0
}
