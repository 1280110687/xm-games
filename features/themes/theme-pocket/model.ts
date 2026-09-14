import type { CatalogCategory } from "@/features/catalog/types"

export type PocketSection = "home" | "games" | "tools"
export type PocketFilter = "featured" | "board" | "puzzle" | "arcade"
export const POCKET_NAVIGATION_EVENT = "pocket:navigation"
export const POCKET_NAV_ITEMS = [
  { key: "home", href: "/", hash: "" },
  { key: "games", href: "/#pocket-games", hash: "#pocket-games" },
  { key: "tools", href: "/#pocket-tools", hash: "#pocket-tools" },
] as const
export const POCKET_FEATURED = ["/bingo", "/2048", "/snake", "/gomoku", "/chess", "/tetris"] as const
export const POCKET_ART: Record<string, string> = {
  "/bingo": "bingo", "/2048": "tiles", "/snake": "snake",
  "/gomoku": "gomoku", "/chess": "chess", "/tetris": "tetris",
  "/bingo-cards": "bingo-cards", "/chinese-chess": "chinese-chess",
  "/go": "go", "/reversi": "reversi",
  "/schulte-grid": "schulte-grid", "/alternating-trail": "alternating-trail",
  "/minesweeper": "minesweeper", "/sudoku": "sudoku",
  "/memory-match": "memory-match", "/neon-breaker": "neon-breaker",
}
export const POCKET_TOOL_ART: Record<string, string> = {
  "/anime-tracker": "anime-tracker", "/text-crypto": "text-crypto",
  "/qr-code": "qr-code", "/json-tool": "json-tool",
  "/base64-tool": "base64-tool", "/text-tool": "documents",
}
const TOOL_PATHS = ["/anime-tracker", "/text-crypto", "/qr-code", "/json-tool", "/base64-tool", "/text-tool"]

export function getPocketSection(pathname: string, hash: string): PocketSection {
  if (pathname.replace(/\/+$/, "")) return TOOL_PATHS.includes(pathname.replace(/\/+$/, "")) ? "tools" : "games"
  // Preserve the selected destination when switching from another theme.
  if (/(?:tools|toolbox)$/.test(hash)) return "tools"
  if (/(?:games|game-library)$/.test(hash)) return "games"
  return "home"
}

export function getPocketEntries(categories: CatalogCategory[], section: PocketSection, filter: PocketFilter) {
  const games = categories.filter(category => category.titleKey !== "categoryTools").flatMap(category => category.games)
  if (section === "tools") return categories.filter(category => category.titleKey === "categoryTools").flatMap(category => category.games)
  if (filter === "featured") return section === "home" ? POCKET_FEATURED.flatMap(path => games.filter(game => game.href === path)) : games
  const categoryKeys = { board: ["categoryBoard"], puzzle: ["categoryPuzzle", "categoryFocus"], arcade: ["categoryArcade", "categoryBingo"] }
  return categories.filter(category => categoryKeys[filter].includes(category.titleKey)).flatMap(category => category.games)
}
