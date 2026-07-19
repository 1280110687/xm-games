"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  Blocks,
  Bomb,
  BrainCircuit,
  Castle,
  CircleDot,
  Crown,
  Dices,
  Gamepad2,
  Grid3X3,
  Layers3,
  RefreshCw,
  Route,
  Sparkles,
  TicketCheck,
  Tv,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { useLocale } from "@/lib/locale-context"
import type { Locale, TranslationKey } from "@/lib/i18n"

const HOME_COPY: Record<
  Locale,
  {
    eyebrow: string
    brandSubline: string
    experiences: string
    categories: string
    instantPlay: string
    openGame: string
    featuredTool: string
  }
> = {
  zh: {
    eyebrow: "随时开一局",
    brandSubline: "轻量游戏空间",
    experiences: "个游戏与工具",
    categories: "个清晰分类",
    instantPlay: "无需安装 · 即开即玩",
    openGame: "进入",
    featuredTool: "精选工具",
  },
  en: {
    eyebrow: "Ready when you are",
    brandSubline: "A lightweight play space",
    experiences: "games & tools",
    categories: "curated categories",
    instantPlay: "No install · Play instantly",
    openGame: "Open",
    featuredTool: "Featured tool",
  },
  th: {
    eyebrow: "พร้อมเล่นได้ทุกเมื่อ",
    brandSubline: "พื้นที่เกมที่เบาและเรียบง่าย",
    experiences: "เกมและเครื่องมือ",
    categories: "หมวดหมู่ที่คัดสรร",
    instantPlay: "ไม่ต้องติดตั้ง · เล่นได้ทันที",
    openGame: "เปิด",
    featuredTool: "เครื่องมือแนะนำ",
  },
}

const TONE_CLASSES = {
  primary: {
    icon: "border-primary/20 bg-primary/10 text-violet-200",
    hover: "group-hover:border-primary/35 group-hover:bg-primary/15",
  },
  cyan: {
    icon: "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
    hover: "group-hover:border-cyan-300/35 group-hover:bg-cyan-400/15",
  },
  emerald: {
    icon: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
    hover:
      "group-hover:border-emerald-300/35 group-hover:bg-emerald-400/15",
  },
  amber: {
    icon: "border-amber-300/20 bg-amber-400/10 text-amber-200",
    hover: "group-hover:border-amber-300/35 group-hover:bg-amber-400/15",
  },
  rose: {
    icon: "border-rose-300/20 bg-rose-400/10 text-rose-200",
    hover: "group-hover:border-rose-300/35 group-hover:bg-rose-400/15",
  },
} as const

type GameTone = keyof typeof TONE_CLASSES

type GameItem = {
  href: string
  titleKey: TranslationKey
  descKey: TranslationKey
  icon: LucideIcon
  tone: GameTone
  featured?: boolean
}

type Category = {
  titleKey: TranslationKey
  games: GameItem[]
}

const CATEGORIES: Category[] = [
  {
    titleKey: "categoryBoard",
    games: [
      {
        href: "/chinese-chess",
        titleKey: "chineseChess",
        descKey: "chineseChessDescription",
        icon: Crown,
        tone: "primary",
      },
      {
        href: "/chess",
        titleKey: "chess",
        descKey: "chessDescription",
        icon: Castle,
        tone: "primary",
      },
      {
        href: "/go",
        titleKey: "go",
        descKey: "goDescription",
        icon: CircleDot,
        tone: "primary",
      },
      {
        href: "/gomoku",
        titleKey: "gomoku",
        descKey: "gomokuDescription",
        icon: Grid3X3,
        tone: "primary",
      },
      {
        href: "/reversi",
        titleKey: "reversi",
        descKey: "reversiDescription",
        icon: RefreshCw,
        tone: "primary",
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
        tone: "cyan",
      },
      {
        href: "/2048",
        titleKey: "game2048",
        descKey: "game2048Description",
        icon: Blocks,
        tone: "cyan",
      },
      {
        href: "/sudoku",
        titleKey: "sudoku",
        descKey: "sudokuDescription",
        icon: Grid3X3,
        tone: "cyan",
      },
      {
        href: "/memory-match",
        titleKey: "memoryMatch",
        descKey: "memoryMatchDescription",
        icon: BrainCircuit,
        tone: "cyan",
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
        tone: "emerald",
      },
      {
        href: "/snake",
        titleKey: "snake",
        descKey: "snakeDescription",
        icon: Route,
        tone: "emerald",
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
        tone: "amber",
      },
      {
        href: "/bingo-cards",
        titleKey: "bingoCardsGame",
        descKey: "bingoCardsDescription",
        icon: TicketCheck,
        tone: "amber",
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
        tone: "rose",
        featured: true,
      },
    ],
  },
]

const TOTAL_EXPERIENCES = CATEGORIES.reduce(
  (total, category) => total + category.games.length,
  0,
)

function GameCard({
  game,
  title,
  description,
  openLabel,
  featuredLabel,
}: {
  game: GameItem
  title: string
  description: string
  openLabel: string
  featuredLabel: string
}) {
  const Icon = game.icon
  const tone = TONE_CLASSES[game.tone]

  if (game.featured) {
    return (
      <Link
        href={game.href}
        aria-label={`${title} — ${description}`}
        className="surface-card group col-span-2 flex min-h-36 items-center gap-4 overflow-hidden p-4 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_64px_oklch(0.08_0.06_278_/_0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none sm:col-span-2 sm:min-h-40 sm:gap-6 sm:p-6 md:col-span-3 lg:col-span-4"
      >
        <span
          className={`flex size-14 shrink-0 items-center justify-center rounded-2xl border transition-colors sm:size-16 ${tone.icon} ${tone.hover}`}
        >
          <Icon className="size-7 sm:size-8" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="mb-2 block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-rose-200/80">
            {featuredLabel}
          </span>
          <span className="block text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </span>
          <span className="mt-1.5 block max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </span>
        </span>

        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-[background-color,color,transform] group-hover:translate-x-0.5 group-hover:bg-primary group-hover:text-primary-foreground sm:size-12">
          <ArrowUpRight className="size-5" aria-hidden="true" />
          <span className="sr-only">{openLabel}</span>
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={game.href}
      aria-label={`${title} — ${description}`}
      className="surface-card group flex min-h-36 flex-col overflow-hidden p-3.5 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_22px_56px_oklch(0.08_0.05_278_/_0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none sm:min-h-44 sm:p-5"
    >
      <span className="flex items-start justify-between gap-3">
        <span
          className={`flex size-10 items-center justify-center rounded-xl border transition-colors sm:size-12 sm:rounded-2xl ${tone.icon} ${tone.hover}`}
        >
          <Icon className="size-5 sm:size-6" aria-hidden="true" />
        </span>
        <ArrowUpRight
          className="size-4 text-muted-foreground/60 transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground sm:size-5"
          aria-hidden="true"
        />
      </span>

      <span className="mt-auto block pt-4">
        <span className="block text-sm font-bold tracking-tight text-foreground sm:text-lg">
          {title}
        </span>
        <span className="mt-1.5 line-clamp-2 block text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-5">
          {description}
        </span>
      </span>
    </Link>
  )
}

export default function Home() {
  const { locale, t } = useLocale()
  const copy = HOME_COPY[locale]

  return (
    <div className="app-shell py-4 sm:py-6 lg:py-8">
      <div className="app-container">
        <header className="mb-4 flex items-center justify-between gap-4 px-1 sm:mb-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/12 text-violet-100 shadow-[0_12px_34px_oklch(0.53_0.2_278_/_0.22)] sm:size-11">
              <Gamepad2 className="size-5 sm:size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold tracking-tight text-foreground">
                {t("appName")}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {copy.brandSubline}
              </p>
            </div>
          </div>
          <LanguageSwitcher />
        </header>

        <main>
          <section className="surface-panel grid gap-6 overflow-hidden px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-10">
            <div>
              <span className="eyebrow">
                <Sparkles className="size-3.5" aria-hidden="true" />
                {copy.eyebrow}
              </span>
              <h1 className="mt-5 text-4xl font-black tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
                {t("appName")}
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                {t("selectGame")}
              </p>
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-cyan-200/75 sm:text-sm">
                <Zap className="size-4" aria-hidden="true" />
                {copy.instantPlay}
              </p>
            </div>

            <div className="surface-card grid grid-cols-2 divide-x divide-white/10 p-4 sm:min-w-72 sm:p-5">
              <div className="pr-4">
                <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  {TOTAL_EXPERIENCES}
                </p>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">
                  {copy.experiences}
                </p>
              </div>
              <div className="pl-4">
                <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  {CATEGORIES.length}
                </p>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">
                  {copy.categories}
                </p>
              </div>
            </div>
          </section>

          <div className="mt-8 space-y-9 pb-8 sm:mt-10 sm:space-y-11 sm:pb-12">
            {CATEGORIES.map((category) => {
              const headingId = `category-${category.titleKey}`

              return (
                <section key={category.titleKey} aria-labelledby={headingId}>
                  <div className="mb-4 flex items-end justify-between gap-4 px-1">
                    <h2
                      id={headingId}
                      className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
                    >
                      {t(category.titleKey)}
                    </h2>
                    <span
                      className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground"
                      aria-hidden="true"
                    >
                      {String(category.games.length).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {category.games.map((game) => (
                      <GameCard
                        key={game.href}
                        game={game}
                        title={t(game.titleKey)}
                        description={t(game.descKey)}
                        openLabel={copy.openGame}
                        featuredLabel={copy.featuredTool}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
