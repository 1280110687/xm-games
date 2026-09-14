import type { CatalogCategory } from "../../catalog/types"

export type ArcadeSection = "home" | "games" | "tools"
export type ArcadeFilter = "featured" | "board" | "puzzle" | "arcade"
export const ARCADE_NAVIGATION_EVENT = "arcade:home-navigation"

export const ARCADE_NAV_ITEMS = [
  { key: "home", href: "/", hash: "" },
  { key: "games", href: "/#arcade-games", hash: "#arcade-games" },
  { key: "tools", href: "/#arcade-tools", hash: "#arcade-tools" },
] as const

// Small route-only map: navigation must not pull the catalog's icon bundle.
const TOOL_PATHS = ["/anime-tracker", "/text-crypto", "/qr-code", "/json-tool", "/base64-tool", "/text-tool"]
const GAME_PATHS = ["/chinese-chess", "/chess", "/go", "/gomoku", "/reversi", "/schulte-grid", "/alternating-trail", "/minesweeper", "/2048", "/sudoku", "/memory-match", "/tetris", "/snake", "/neon-breaker", "/bingo", "/bingo-cards"]

export function getArcadeRouteSection(pathname: string, hash = ""): ArcadeSection | null {
  const path = pathname.replace(/\/+$/, "") || "/"
  if (path === "/") return getArcadeSection(hash)
  if (TOOL_PATHS.includes(path)) return "tools"
  if (GAME_PATHS.includes(path)) return "games"
  return null
}

export function getArcadeSection(hash: string): ArcadeSection {
  if (["#arcade-games", "#theme-three-game-library"].includes(hash)) return "games"
  if (["#arcade-tools", "#theme-three-tools"].includes(hash)) return "tools"
  return "home"
}

export function getArcadeEntries(categories: CatalogCategory[], section: ArcadeSection, filter: ArcadeFilter) {
  const keys = { board: "categoryBoard", puzzle: "categoryPuzzle", arcade: "categoryArcade" }
  return categories.filter(category => {
    if (section === "tools") return category.titleKey === "categoryTools"
    if (filter !== "featured") return category.titleKey === keys[filter]
    return category.titleKey !== "categoryTools"
  }).flatMap(category => category.games)
}
