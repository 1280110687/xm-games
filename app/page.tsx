"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import Link from "next/link"
import {
  Activity,
  ArrowUpRight,
  Binary,
  Blocks,
  Bomb,
  BrainCircuit,
  Braces,
  BrickWall,
  Castle,
  ChevronRight,
  CircleDot,
  Command,
  Crown,
  Dices,
  Gamepad2,
  Gauge,
  Grid3X3,
  Layers3,
  LibraryBig,
  LockKeyhole,
  QrCode,
  RefreshCw,
  Route,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  TextCursorInput,
  Tv,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale-context"
import { orderHomeCategories } from "@/lib/home-catalog"
import type { Locale, TranslationKey } from "@/lib/i18n"
import { cn } from "@/lib/utils"

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

const THEME_THREE_HOME_COPY: Record<
  Locale,
  {
    title: string
    subtitle: string
    searchPlaceholder: string
    searchHint: string
    systemOnline: string
    overview: string
    experiences: string
    categories: string
    offlineReady: string
    featuredTools: string
    library: string
    libraryDescription: string
    deck: string
    deckDescription: string
    inspector: string
    inspectorDescription: string
    openTracker: string
    quickLaunch: string
    empty: string
    ready: string
  }
> = {
  zh: {
    title: "游戏控制台",
    subtitle: "沉浸娱乐 · 本地优先 · 即开即玩",
    searchPlaceholder: "筛选任务板中的游戏或分类…",
    searchHint: "筛选游戏任务板",
    systemOnline: "系统就绪",
    overview: "运行概览",
    experiences: "游戏与工具",
    categories: "内容分类",
    offlineReady: "本地运行",
    featuredTools: "精选工具",
    library: "游戏任务板",
    libraryDescription: "按类型快速进入你的下一局",
    deck: "体验堆栈",
    deckDescription: "从控制台直接启动",
    inspector: "智能详情",
    inspectorDescription: "记录进度、管理片单，并缓存封面供离线使用。",
    openTracker: "打开追番助手",
    quickLaunch: "快速启动时间线",
    empty: "没有匹配的游戏或工具",
    ready: "已就绪",
  },
  en: {
    title: "Game Console",
    subtitle: "Immersive play · Local first · Instant launch",
    searchPlaceholder: "Filter games or categories on the board…",
    searchHint: "Filter the game board",
    systemOnline: "System ready",
    overview: "Runtime overview",
    experiences: "Games & tools",
    categories: "Collections",
    offlineReady: "Local runtime",
    featuredTools: "Featured tools",
    library: "Game task board",
    libraryDescription: "Jump into the next session by category",
    deck: "Experience stack",
    deckDescription: "Launch directly from the console",
    inspector: "Smart details",
    inspectorDescription:
      "Track progress, manage your watchlist and keep covers available offline.",
    openTracker: "Open anime tracker",
    quickLaunch: "Quick-launch timeline",
    empty: "No matching games or tools",
    ready: "Ready",
  },
  th: {
    title: "คอนโซลเกม",
    subtitle: "เล่นเต็มอารมณ์ · เน้นในเครื่อง · เปิดได้ทันที",
    searchPlaceholder: "กรองเกมหรือหมวดหมู่บนบอร์ด…",
    searchHint: "กรองบอร์ดเกม",
    systemOnline: "ระบบพร้อม",
    overview: "ภาพรวมการทำงาน",
    experiences: "เกมและเครื่องมือ",
    categories: "หมวดหมู่",
    offlineReady: "ทำงานในเครื่อง",
    featuredTools: "เครื่องมือแนะนำ",
    library: "บอร์ดเกม",
    libraryDescription: "เข้าเกมถัดไปอย่างรวดเร็วตามหมวดหมู่",
    deck: "ชุดประสบการณ์",
    deckDescription: "เปิดจากคอนโซลได้ทันที",
    inspector: "รายละเอียดอัจฉริยะ",
    inspectorDescription:
      "บันทึกความคืบหน้า จัดการรายการ และเก็บปกไว้ใช้แบบออฟไลน์",
    openTracker: "เปิดตัวช่วยติดตามอนิเมะ",
    quickLaunch: "ไทม์ไลน์เปิดด่วน",
    empty: "ไม่พบเกมหรือเครื่องมือที่ตรงกัน",
    ready: "พร้อม",
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
      {
        href: "/neon-breaker",
        titleKey: "neonBreaker",
        descKey: "neonBreakerDescription",
        icon: BrickWall,
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
      {
        href: "/text-crypto",
        titleKey: "textCrypto",
        descKey: "textCryptoDescription",
        icon: LockKeyhole,
        tone: "amber",
      },
      {
        href: "/qr-code",
        titleKey: "qrCodeTool",
        descKey: "qrCodeToolDescription",
        icon: QrCode,
        tone: "cyan",
      },
      {
        href: "/json-tool",
        titleKey: "jsonTool",
        descKey: "jsonToolDescription",
        icon: Braces,
        tone: "emerald",
      },
      {
        href: "/base64-tool",
        titleKey: "base64Tool",
        descKey: "base64ToolDescription",
        icon: Binary,
        tone: "primary",
      },
      {
        href: "/text-tool",
        titleKey: "textTool",
        descKey: "textToolDescription",
        icon: TextCursorInput,
        tone: "rose",
        featured: true,
      },
    ],
  },
]

const HOME_CATEGORIES = orderHomeCategories(CATEGORIES)

const TOOL_CATEGORY = CATEGORIES.find(
  (category) => category.titleKey === "categoryTools",
)

const ARCADE_CATEGORY = CATEGORIES.find(
  (category) => category.titleKey === "categoryArcade",
)

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
        className="home-game-card home-game-card--featured surface-card group col-span-2 flex min-h-36 items-center gap-4 overflow-hidden p-4 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_64px_oklch(0.08_0.06_278_/_0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none sm:col-span-2 sm:min-h-40 sm:gap-6 sm:p-6 md:col-span-3 lg:col-span-4"
      >
        <span
          className={`home-game-card-icon flex size-14 shrink-0 items-center justify-center rounded-2xl border transition-colors sm:size-16 ${tone.icon} ${tone.hover}`}
        >
          <Icon className="size-7 sm:size-8" aria-hidden="true" />
        </span>

        <span className="home-game-card-copy min-w-0 flex-1">
          <span className="home-game-card-featured-label mb-2 block text-[0.68rem] font-bold uppercase tracking-[0.16em] text-rose-200/80">
            {featuredLabel}
          </span>
          <span className="home-game-card-title block text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {title}
          </span>
          <span className="home-game-card-description mt-1.5 block max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </span>
        </span>

        <span className="home-game-card-arrow flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition-[background-color,color,transform] group-hover:translate-x-0.5 group-hover:bg-primary group-hover:text-primary-foreground sm:size-12">
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
      className="home-game-card surface-card group flex min-h-36 flex-col overflow-hidden p-3.5 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_22px_56px_oklch(0.08_0.05_278_/_0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none sm:min-h-44 sm:p-5"
    >
      <span className="home-game-card-top flex items-start justify-between gap-3">
        <span
          className={`home-game-card-icon flex size-10 items-center justify-center rounded-xl border transition-colors sm:size-12 sm:rounded-2xl ${tone.icon} ${tone.hover}`}
        >
          <Icon className="size-5 sm:size-6" aria-hidden="true" />
        </span>
        <ArrowUpRight
          className="home-game-card-arrow size-4 text-muted-foreground/60 transition-[color,transform] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground sm:size-5"
          aria-hidden="true"
        />
      </span>

      <span className="home-game-card-copy mt-auto block pt-4">
        <span className="home-game-card-title block text-sm font-bold tracking-tight text-foreground sm:text-lg">
          {title}
        </span>
        <span className="home-game-card-description mt-1.5 line-clamp-2 block text-xs leading-4 text-muted-foreground sm:text-sm sm:leading-5">
          {description}
        </span>
      </span>
    </Link>
  )
}

function ThemeThreeHome() {
  const { locale, t } = useLocale()
  const copy = THEME_THREE_HOME_COPY[locale]
  const [query, setQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const normalizedQuery = query.trim().toLocaleLowerCase()

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (
        document.documentElement.dataset.theme !== "theme-three" ||
        (!event.metaKey && !event.ctrlKey) ||
        event.key.toLocaleLowerCase() !== "k"
      ) {
        return
      }

      event.preventDefault()
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }

    window.addEventListener("keydown", focusSearch)
    return () => window.removeEventListener("keydown", focusSearch)
  }, [])

  const filteredCategories = useMemo(
    () =>
      HOME_CATEGORIES.map((category) => ({
        ...category,
        games: category.games.filter((game) => {
          if (!normalizedQuery) return true
          const haystack = [
            t(category.titleKey),
            t(game.titleKey),
            t(game.descKey),
          ]
            .join(" ")
            .toLocaleLowerCase()
          return haystack.includes(normalizedQuery)
        }),
      })).filter((category) => category.games.length > 0),
    [normalizedQuery, t],
  )

  const deckGames = CATEGORIES.flatMap((category) => category.games).slice(0, 9)
  const timelineGames = CATEGORIES.flatMap((category) => category.games).slice(
    2,
    9,
  )
  const featuredTool = TOOL_CATEGORY?.games.find((game) => game.featured)

  return (
    <div
      data-page="home"
      className="theme-three-home app-shell"
    >
      <div className="theme-three-dashboard">
        <header className="theme-three-command-bar">
          <div className="theme-three-command-title">
            <span className="theme-three-command-mark">
              <Gauge aria-hidden="true" />
            </span>
            <span>
              <strong>{copy.title}</strong>
              <small>{copy.subtitle}</small>
            </span>
          </div>

          <label className="theme-three-search">
            <Search aria-hidden="true" />
            <span className="sr-only">{copy.searchHint}</span>
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-keyshortcuts="Meta+K Control+K"
            />
            <kbd>
              <Command aria-hidden="true" />
              K
            </kbd>
          </label>

          <div className="theme-three-command-status">
            <i aria-hidden="true" />
            <span>{copy.systemOnline}</span>
          </div>
        </header>

        <main>
          <section
            className="theme-three-overview"
            aria-labelledby="theme-three-overview-title"
          >
            <div className="theme-three-section-heading">
              <div>
                <p>{copy.overview}</p>
                <h1 id="theme-three-overview-title">{t("appName")}</h1>
              </div>
              <span>
                <Activity aria-hidden="true" />
                {copy.ready}
              </span>
            </div>

            <div className="theme-three-metrics">
              <article className="theme-three-metric-card">
                <span className="theme-three-metric-icon">
                  <Gamepad2 aria-hidden="true" />
                </span>
                <p>{copy.experiences}</p>
                <strong>{TOTAL_EXPERIENCES}</strong>
                <small>+ {ARCADE_CATEGORY?.games.length ?? 0}</small>
              </article>
              <article className="theme-three-metric-card">
                <span className="theme-three-metric-icon">
                  <LibraryBig aria-hidden="true" />
                </span>
                <p>{copy.categories}</p>
                <strong>{CATEGORIES.length}</strong>
                <small>100%</small>
              </article>
              <article className="theme-three-metric-card">
                <span className="theme-three-metric-icon">
                  <ShieldCheck aria-hidden="true" />
                </span>
                <p>{copy.offlineReady}</p>
                <strong>LOCAL</strong>
                <small>{copy.ready}</small>
              </article>
              <article className="theme-three-metric-card is-compact">
                <span className="theme-three-metric-icon">
                  <Sparkles aria-hidden="true" />
                </span>
                <p>{copy.featuredTools}</p>
                <strong>
                  {String(TOOL_CATEGORY?.games.length ?? 0).padStart(2, "0")}
                </strong>
                <small>{copy.ready}</small>
              </article>
            </div>
          </section>

          <section className="theme-three-workbench">
            <section
              id="theme-three-game-library"
              className="theme-three-board"
              aria-labelledby="theme-three-library-title"
            >
              <div className="theme-three-panel-heading">
                <div>
                  <p id="theme-three-library-title">{copy.library}</p>
                  <span>{copy.libraryDescription}</span>
                </div>
                <LibraryBig aria-hidden="true" />
              </div>

              <div className="theme-three-board-content">
                {filteredCategories.length === 0 ? (
                  <p className="theme-three-empty">{copy.empty}</p>
                ) : (
                  filteredCategories.map((category, categoryIndex) => (
                    <section
                      key={category.titleKey}
                      className="theme-three-board-group"
                      data-group={categoryIndex + 1}
                    >
                      <header>
                        <span aria-hidden="true" />
                        <strong>{t(category.titleKey)}</strong>
                        <small>
                          {String(category.games.length).padStart(2, "0")}
                        </small>
                      </header>
                      <div>
                        {category.games.map((game) => {
                          const Icon = game.icon
                          return (
                            <Link key={game.href} href={game.href}>
                              <span className="theme-three-board-game-icon">
                                <Icon aria-hidden="true" />
                              </span>
                              <span>
                                <strong>{t(game.titleKey)}</strong>
                                <small>{t(game.descKey)}</small>
                              </span>
                              <ChevronRight aria-hidden="true" />
                            </Link>
                          )
                        })}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </section>

            <section
              className="theme-three-deck-panel"
              aria-labelledby="theme-three-deck-title"
            >
              <div className="theme-three-panel-heading">
                <div>
                  <p id="theme-three-deck-title">{copy.deck}</p>
                  <span>{copy.deckDescription}</span>
                </div>
                <span className="theme-three-panel-tools" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </div>

              <div className="theme-three-card-stack">
                {deckGames.map((game, index) => {
                  const Icon = game.icon
                  const isActive = index === 4

                  return (
                    <Link
                      key={game.href}
                      href={game.href}
                      className={cn(
                        "theme-three-stack-card",
                        isActive && "is-active",
                      )}
                      style={{ "--deck-index": index } as CSSProperties}
                    >
                      <span className="theme-three-stack-card-icon">
                        <Icon aria-hidden="true" />
                      </span>
                      <span>
                        <small>XM-{String(index + 1).padStart(2, "0")}</small>
                        <strong>{t(game.titleKey)}</strong>
                      </span>
                    </Link>
                  )
                })}
              </div>

              <div className="theme-three-deck-progress">
                <span>XM · PLAY DECK</span>
                <strong>87%</strong>
                <div aria-hidden="true">
                  <i />
                </div>
              </div>
            </section>

            {featuredTool && (
              <aside
                className="theme-three-inspector"
                aria-labelledby="theme-three-inspector-title"
              >
                <div className="theme-three-panel-heading">
                  <div>
                    <p id="theme-three-inspector-title">{copy.inspector}</p>
                    <span>XM-TOOL-01</span>
                  </div>
                  <Sparkles aria-hidden="true" />
                </div>

                <div className="theme-three-inspector-body">
                  <span className="theme-three-inspector-badge">
                    <Tv aria-hidden="true" />
                    {copy.featuredTools}
                  </span>
                  <h2>{t(featuredTool.titleKey)}</h2>
                  <p>{copy.inspectorDescription}</p>

                  <dl>
                    <div>
                      <dt>{copy.offlineReady}</dt>
                      <dd>{copy.ready}</dd>
                    </div>
                    <div>
                      <dt>{copy.systemOnline}</dt>
                      <dd>{copy.ready}</dd>
                    </div>
                  </dl>

                  <div className="theme-three-assistant-note">
                    <Sparkles aria-hidden="true" />
                    <span>{t(featuredTool.descKey)}</span>
                  </div>
                </div>

                <Link
                  href={featuredTool.href}
                  className="theme-three-inspector-action"
                >
                  {copy.openTracker}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </aside>
            )}
          </section>

          <section
            className="theme-three-timeline"
            aria-labelledby="theme-three-timeline-title"
          >
            <header>
              <div>
                <Zap aria-hidden="true" />
                <strong id="theme-three-timeline-title">
                  {copy.quickLaunch}
                </strong>
              </div>
              <span>XM · 2026</span>
            </header>
            <div className="theme-three-timeline-track">
              {timelineGames.map((game, index) => {
                const Icon = game.icon
                return (
                  <Link
                    key={game.href}
                    href={game.href}
                    className={index === 3 ? "is-active" : undefined}
                  >
                    <Icon aria-hidden="true" />
                    <span>{t(game.titleKey)}</span>
                    <small>{String(index + 1).padStart(2, "0")}</small>
                  </Link>
                )
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default function Home() {
  const { locale, t } = useLocale()
  const copy = HOME_COPY[locale]

  return (
    <>
      <ThemeThreeHome />
      <div data-page="home" className="home-shell app-shell py-4 sm:py-6 lg:py-8">
      <div className="app-container">
        <header className="home-header mb-4 flex items-center justify-between gap-4 px-1 sm:mb-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="home-brand-icon flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/12 text-violet-100 shadow-[0_12px_34px_oklch(0.53_0.2_278_/_0.22)] sm:size-11">
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
          <div className="home-header-controls flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="theme-two-settings-shortcut"
            >
              <Link href="/settings">
                <Settings2 aria-hidden="true" />
                <span>{t("settings")}</span>
              </Link>
            </Button>
          </div>
        </header>

        <main>
          <section className="home-hero surface-panel grid gap-6 overflow-hidden px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-10">
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
              <p className="home-instant-play mt-4 flex items-center gap-2 text-xs font-semibold text-cyan-200/75 sm:text-sm">
                <Zap className="size-4" aria-hidden="true" />
                {copy.instantPlay}
              </p>
            </div>

            <div className="home-hero-stats surface-card grid grid-cols-2 divide-x divide-white/10 p-4 sm:min-w-72 sm:p-5">
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

          <div
            id="game-library"
            className="home-sections mt-8 space-y-9 pb-8 sm:mt-10 sm:space-y-11 sm:pb-12"
          >
            {HOME_CATEGORIES.map((category) => {
              const headingId = `category-${category.titleKey}`

              return (
                <section
                  className="home-category"
                  data-category={category.titleKey}
                  key={category.titleKey}
                  aria-labelledby={headingId}
                >
                  <div className="home-category-heading mb-4 flex items-end justify-between gap-4 px-1">
                    <h2
                      id={headingId}
                      className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
                    >
                      {t(category.titleKey)}
                    </h2>
                    <span
                      className="home-category-count rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground"
                      aria-hidden="true"
                    >
                      {String(category.games.length).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="home-game-grid grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
    </>
  )
}
