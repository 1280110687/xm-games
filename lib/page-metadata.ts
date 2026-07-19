import {
  getTranslation,
  type Locale,
  type TranslationKey,
} from "./i18n"

interface PageMetadataKeys {
  titleKey: TranslationKey
  descriptionKey: TranslationKey
  includeAppName: boolean
}

export const PAGE_METADATA_KEYS = {
  "/": {
    titleKey: "appName",
    descriptionKey: "selectGame",
    includeAppName: false,
  },
  "/bingo": {
    titleKey: "bingoGame",
    descriptionKey: "bingoDescription",
    includeAppName: true,
  },
  "/bingo-cards": {
    titleKey: "bingoCardsGame",
    descriptionKey: "bingoCardsDescription",
    includeAppName: true,
  },
  "/tetris": {
    titleKey: "tetris",
    descriptionKey: "tetrisDescription",
    includeAppName: true,
  },
  "/snake": {
    titleKey: "snake",
    descriptionKey: "snakeDescription",
    includeAppName: true,
  },
  "/anime-tracker": {
    titleKey: "animeTracker",
    descriptionKey: "animeTrackerDescription",
    includeAppName: true,
  },
  "/chinese-chess": {
    titleKey: "chineseChess",
    descriptionKey: "chineseChessDescription",
    includeAppName: true,
  },
  "/go": {
    titleKey: "go",
    descriptionKey: "goDescription",
    includeAppName: true,
  },
  "/chess": {
    titleKey: "chess",
    descriptionKey: "chessDescription",
    includeAppName: true,
  },
  "/minesweeper": {
    titleKey: "minesweeper",
    descriptionKey: "minesweeperDescription",
    includeAppName: true,
  },
  "/2048": {
    titleKey: "game2048",
    descriptionKey: "game2048Description",
    includeAppName: true,
  },
  "/sudoku": {
    titleKey: "sudoku",
    descriptionKey: "sudokuDescription",
    includeAppName: true,
  },
  "/gomoku": {
    titleKey: "gomoku",
    descriptionKey: "gomokuDescription",
    includeAppName: true,
  },
  "/reversi": {
    titleKey: "reversi",
    descriptionKey: "reversiDescription",
    includeAppName: true,
  },
} as const satisfies Record<string, PageMetadataKeys>

export type AppPath = keyof typeof PAGE_METADATA_KEYS

export interface PageMetadata {
  title: string
  description: string
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/"
  return pathname.replace(/\/+$/, "") || "/"
}

export function getPageMetadata(pathname: string, locale: Locale): PageMetadata {
  const normalizedPath = normalizePathname(pathname)
  const keys =
    PAGE_METADATA_KEYS[normalizedPath as AppPath] ?? PAGE_METADATA_KEYS["/"]
  const pageTitle = getTranslation(locale, keys.titleKey)
  const appName = getTranslation(locale, "appName")

  return {
    title: keys.includeAppName ? `${pageTitle} - ${appName}` : pageTitle,
    description: getTranslation(locale, keys.descriptionKey),
  }
}
