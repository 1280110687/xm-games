import {
  Binary,
  Blocks,
  Bomb,
  Braces,
  BrainCircuit,
  BrickWall,
  Castle,
  CircleDot,
  Crown,
  Dices,
  Focus,
  Grid3X3,
  Layers3,
  LockKeyhole,
  QrCode,
  RefreshCw,
  Route,
  TextCursorInput,
  TicketCheck,
  Tv,
  Waypoints,
} from "lucide-react"

import { orderHomeCategories } from "../../lib/home-catalog"
import type { CatalogCategory } from "./types"

const CATEGORIES: CatalogCategory[] = [
  {
    titleKey: "categoryBoard",
    games: [
      {
        href: "/chinese-chess",
        titleKey: "chineseChess",
        descKey: "chineseChessDescription",
        icon: Crown,
      },
      {
        href: "/chess",
        titleKey: "chess",
        descKey: "chessDescription",
        icon: Castle,
      },
      {
        href: "/go",
        titleKey: "go",
        descKey: "goDescription",
        icon: CircleDot,
      },
      {
        href: "/gomoku",
        titleKey: "gomoku",
        descKey: "gomokuDescription",
        icon: Grid3X3,
      },
      {
        href: "/reversi",
        titleKey: "reversi",
        descKey: "reversiDescription",
        icon: RefreshCw,
      },
    ],
  },
  {
    titleKey: "categoryFocus",
    games: [
      {
        href: "/schulte-grid",
        titleKey: "schulteGrid",
        descKey: "schulteGridDescription",
        icon: Focus,
      },
      {
        href: "/alternating-trail",
        titleKey: "alternatingTrail",
        descKey: "alternatingTrailDescription",
        icon: Waypoints,
      },
    ],
  },
  {
    titleKey: "categoryPuzzle",
    games: [
      {
        href: "/minesweeper",
        titleKey: "minesweeper",
        descKey: "minesweeperDescription",
        icon: Bomb,
      },
      {
        href: "/2048",
        titleKey: "game2048",
        descKey: "game2048Description",
        icon: Blocks,
      },
      {
        href: "/sudoku",
        titleKey: "sudoku",
        descKey: "sudokuDescription",
        icon: Grid3X3,
      },
      {
        href: "/memory-match",
        titleKey: "memoryMatch",
        descKey: "memoryMatchDescription",
        icon: BrainCircuit,
      },
    ],
  },
  {
    titleKey: "categoryArcade",
    games: [
      {
        href: "/tetris",
        titleKey: "tetris",
        descKey: "tetrisDescription",
        icon: Layers3,
      },
      {
        href: "/snake",
        titleKey: "snake",
        descKey: "snakeDescription",
        icon: Route,
      },
      {
        href: "/neon-breaker",
        titleKey: "neonBreaker",
        descKey: "neonBreakerDescription",
        icon: BrickWall,
      },
    ],
  },
  {
    titleKey: "categoryBingo",
    games: [
      {
        href: "/bingo",
        titleKey: "bingo",
        descKey: "bingoDescription",
        icon: Dices,
      },
      {
        href: "/bingo-cards",
        titleKey: "bingoCardsGame",
        descKey: "bingoCardsDescription",
        icon: TicketCheck,
      },
    ],
  },
  {
    titleKey: "categoryTools",
    games: [
      {
        href: "/anime-tracker",
        titleKey: "animeTracker",
        descKey: "animeTrackerDescription",
        icon: Tv,
      },
      {
        href: "/text-crypto",
        titleKey: "textCrypto",
        descKey: "textCryptoDescription",
        icon: LockKeyhole,
      },
      {
        href: "/qr-code",
        titleKey: "qrCodeTool",
        descKey: "qrCodeToolDescription",
        icon: QrCode,
      },
      {
        href: "/json-tool",
        titleKey: "jsonTool",
        descKey: "jsonToolDescription",
        icon: Braces,
      },
      {
        href: "/base64-tool",
        titleKey: "base64Tool",
        descKey: "base64ToolDescription",
        icon: Binary,
      },
      {
        href: "/text-tool",
        titleKey: "textTool",
        descKey: "textToolDescription",
        icon: TextCursorInput,
      },
    ],
  },
]

export const HOME_CATEGORIES = orderHomeCategories(CATEGORIES)
