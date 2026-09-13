export const THEME_THREE_LIBRARY_HASH = "#theme-three-game-library"
export const THEME_THREE_TOOLS_HASH = "#theme-three-tools"
export const THEME_THREE_HOME_NAVIGATION = "theme-three:home-navigation"

const TOOL_ROUTES = new Set([
  "/anime-tracker",
  "/base64-tool",
  "/json-tool",
  "/qr-code",
  "/text-crypto",
  "/text-tool",
])

const GAME_ROUTES = new Set([
  "/2048",
  "/alternating-trail",
  "/bingo",
  "/bingo-cards",
  "/chess",
  "/chinese-chess",
  "/go",
  "/gomoku",
  "/memory-match",
  "/minesweeper",
  "/neon-breaker",
  "/reversi",
  "/schulte-grid",
  "/snake",
  "/sudoku",
  "/tetris",
])

export function getThemeThreeNavigationSection(pathname: string, hash: string) {
  if (pathname === "/") {
    if (hash === THEME_THREE_LIBRARY_HASH) return "games"
    if (hash === THEME_THREE_TOOLS_HASH) return "tools"
    return "home"
  }
  if (TOOL_ROUTES.has(pathname) || pathname.startsWith("/anime-tracker/")) {
    return "tools"
  }
  if (GAME_ROUTES.has(pathname)) return "games"
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "settings"
  }
  return undefined
}
