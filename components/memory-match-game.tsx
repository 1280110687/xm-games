"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  BrainCircuit,
  Clock3,
  Crown,
  Gem,
  Heart,
  Leaf,
  Medal,
  Moon,
  MousePointerClick,
  Music2,
  Palette,
  Rocket,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { Button } from "@/components/ui/button"
import {
  createMemoryMatchState,
  restartMemoryMatch,
  selectMemoryMatchCard,
  settleMemoryMatchTurn,
  type MemoryMatchDifficulty,
} from "@/features/memory-match/engine"
import { useLocale } from "@/lib/locale-context"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "xm-games-memory-match-best:v1"
const HYDRATION_SAFE_RANDOM = () => 0

type BestRecord = {
  moves: number
  seconds: number
}

type BestRecords = Partial<Record<MemoryMatchDifficulty, BestRecord>>
type MemoryAccentTone =
  | "amber"
  | "rose"
  | "cyan"
  | "violet"
  | "blue"
  | "emerald"
  | "indigo"
  | "fuchsia"
  | "orange"
  | "yellow"

const SYMBOLS: Array<{
  icon: LucideIcon
  className: string
  tone: MemoryAccentTone
}> = [
  { icon: Star, className: "border-amber-300/25 bg-amber-400/15 text-amber-200", tone: "amber" },
  { icon: Heart, className: "border-rose-300/25 bg-rose-400/15 text-rose-200", tone: "rose" },
  { icon: Rocket, className: "border-cyan-300/25 bg-cyan-400/15 text-cyan-200", tone: "cyan" },
  { icon: Crown, className: "border-violet-300/25 bg-violet-400/15 text-violet-200", tone: "violet" },
  { icon: Gem, className: "border-blue-300/25 bg-blue-400/15 text-blue-200", tone: "blue" },
  { icon: Leaf, className: "border-emerald-300/25 bg-emerald-400/15 text-emerald-200", tone: "emerald" },
  { icon: Moon, className: "border-indigo-300/25 bg-indigo-400/15 text-indigo-200", tone: "indigo" },
  { icon: Music2, className: "border-fuchsia-300/25 bg-fuchsia-400/15 text-fuchsia-200", tone: "fuchsia" },
  { icon: Palette, className: "border-orange-300/25 bg-orange-400/15 text-orange-200", tone: "orange" },
  { icon: Zap, className: "border-yellow-300/25 bg-yellow-400/15 text-yellow-200", tone: "yellow" },
]

const A11Y_COPY = {
  zh: {
    board: "记忆翻牌棋盘",
    card: "卡片",
    hidden: "未翻开",
    revealed: "已翻开，图案",
    matched: "已配对，图案",
    resolving: "正在比较两张卡片",
  },
  en: {
    board: "Memory match board",
    card: "Card",
    hidden: "face down",
    revealed: "revealed, symbol",
    matched: "matched, symbol",
    resolving: "Comparing the two cards",
  },
  th: {
    board: "กระดานเกมจับคู่ความจำ",
    card: "การ์ด",
    hidden: "คว่ำอยู่",
    revealed: "เปิดแล้ว ลาย",
    matched: "จับคู่แล้ว ลาย",
    resolving: "กำลังเปรียบเทียบการ์ดสองใบ",
  },
} as const

function isBestRecord(value: unknown): value is BestRecord {
  if (!value || typeof value !== "object") return false

  const record = value as Partial<BestRecord>
  return (
    Number.isInteger(record.moves)
    && Number.isInteger(record.seconds)
    && (record.moves ?? 0) > 0
    && (record.seconds ?? -1) >= 0
  )
}

function readBestRecords(): BestRecords {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}

    const stored = parsed as Record<string, unknown>
    const records: BestRecords = {}

    for (const difficulty of ["easy", "medium", "hard"] as const) {
      if (isBestRecord(stored[difficulty])) {
        records[difficulty] = stored[difficulty]
      }
    }

    return records
  } catch {
    return {}
  }
}

function writeBestRecords(records: BestRecords) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // The game remains fully playable when storage is unavailable.
  }
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

function isBetterRecord(candidate: BestRecord, current?: BestRecord) {
  if (!current) return true
  if (candidate.moves !== current.moves) return candidate.moves < current.moves
  return candidate.seconds < current.seconds
}

export function MemoryMatchGame() {
  const { locale, t } = useLocale()
  const a11y = A11Y_COPY[locale]
  const [game, setGame] = useState(() => (
    createMemoryMatchState("easy", HYDRATION_SAFE_RANDOM)
  ))
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [bestRecords, setBestRecords] = useState<BestRecords>({})
  const [isNewBest, setIsNewBest] = useState(false)
  const completedRoundRef = useRef<number | null>(null)

  useEffect(() => {
    // Card backs are visually identical, so reshuffling after hydration avoids
    // a server/client mismatch without exposing the deterministic first deck.
    setGame(createMemoryMatchState("easy"))
    setBestRecords(readBestRecords())

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setBestRecords(readBestRecords())
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  useEffect(() => {
    if (!game.isLocked || game.pendingResult === null) return

    const delay = game.pendingResult === "match" ? 480 : 820
    const timeout = window.setTimeout(() => {
      setGame((current) => settleMemoryMatchTurn(current))
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [game.isLocked, game.pendingResult])

  useEffect(() => {
    if (startedAt === null || game.phase === "complete") return

    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }

    updateElapsed()
    const interval = window.setInterval(updateElapsed, 250)
    return () => window.clearInterval(interval)
  }, [game.phase, startedAt])

  useEffect(() => {
    if (
      game.phase !== "complete"
      || startedAt === null
      || completedRoundRef.current === startedAt
    ) {
      return
    }

    completedRoundRef.current = startedAt
    const seconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000))
    const candidate = { moves: game.moves, seconds }
    const latestRecords = {
      ...bestRecords,
      ...readBestRecords(),
    }
    const currentBest = latestRecords[game.difficulty]
    const newBest = isBetterRecord(candidate, currentBest)

    setElapsedSeconds(seconds)
    setIsNewBest(newBest)

    if (newBest) {
      const nextRecords = { ...latestRecords, [game.difficulty]: candidate }
      setBestRecords(nextRecords)
      writeBestRecords(nextRecords)
    } else {
      setBestRecords(latestRecords)
    }
  }, [bestRecords, game.difficulty, game.moves, game.phase, startedAt])

  const startNewRound = useCallback((difficulty: MemoryMatchDifficulty) => {
    setGame((current) => restartMemoryMatch(current, { difficulty }))
    setStartedAt(null)
    setElapsedSeconds(0)
    setIsNewBest(false)
    completedRoundRef.current = null
  }, [])

  const handleCardSelect = useCallback((cardId: string) => {
    if (startedAt === null) setStartedAt(Date.now())
    setGame((current) => selectMemoryMatchCard(current, cardId))
  }, [startedAt])

  const currentBest = bestRecords[game.difficulty]
  const progress = (game.matchedPairs / game.totalPairs) * 100
  const boardStatus = game.phase === "complete"
    ? t("memoryCompleted")
    : game.isLocked
      ? a11y.resolving
      : `${t("memoryPairs")} ${game.matchedPairs} / ${game.totalPairs}`

  const bestValue = useMemo(() => {
    if (!currentBest) return t("memoryNoRecord")
    return `${currentBest.moves} ${t("memoryMoveUnit")} · ${formatTime(currentBest.seconds)}`
  }, [currentBest, t])

  return (
    <div className="game-page" data-page="memory-match">
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        homeLabelMode="desktop"
        title={t("memoryMatch")}
        className="mb-4"
        homeButtonClassName="text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        titleClassName="text-base font-bold text-foreground sm:text-2xl"
      />

      <main
        className="game-content flex flex-1 flex-col items-center gap-4 pb-8 pt-1 sm:gap-5 sm:pt-4"
        data-slot="game-content"
      >
        <section className="game-summary memory-dashboard surface-panel w-full max-w-3xl overflow-hidden p-3 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="memory-kicker text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/75">
                  {t("memoryMatchDescription")}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <BrainCircuit
                    className="memory-accent size-5 text-violet-200"
                    data-tone="violet"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("memoryInstructions")}
                  </p>
                </div>
              </div>

              <div
                className="game-settings memory-difficulty-control grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/10 p-1"
                data-slot="game-settings"
                role="group"
                aria-label={t("level")}
              >
                {(["easy", "medium", "hard"] as const).map((difficulty) => (
                  <Button
                    key={difficulty}
                    type="button"
                    size="sm"
                    variant={game.difficulty === difficulty ? "default" : "ghost"}
                    aria-pressed={game.difficulty === difficulty}
                    onClick={() => startNewRound(difficulty)}
                    className="min-w-0 px-2 sm:px-3"
                  >
                    {t(difficulty)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="surface-card flex min-h-16 items-center gap-3 px-3 py-2.5">
                <span
                  className="memory-accent flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-200"
                  data-tone="cyan"
                >
                  <Medal className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("memoryPairs")}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">
                    {game.matchedPairs}<span className="text-sm text-muted-foreground">/{game.totalPairs}</span>
                  </p>
                </div>
              </div>

              <div className="surface-card flex min-h-16 items-center gap-3 px-3 py-2.5">
                <span
                  className="memory-accent flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200"
                  data-tone="violet"
                >
                  <MousePointerClick className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("memoryMoves")}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">
                    {game.moves}
                  </p>
                </div>
              </div>

              <div className="surface-card flex min-h-16 items-center gap-3 px-3 py-2.5">
                <span
                  className="memory-accent flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-200"
                  data-tone="emerald"
                >
                  <Clock3 className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("memoryTime")}
                  </p>
                  <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">
                    {formatTime(elapsedSeconds)}
                  </p>
                </div>
              </div>

              <div className="surface-card flex min-h-16 items-center gap-3 px-3 py-2.5">
                <span
                  className="memory-accent flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-200"
                  data-tone="amber"
                >
                  <Trophy className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("memoryBest")}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-foreground sm:text-sm">
                    {bestValue}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                <span>{boardStatus}</span>
                {game.streak >= 2 && game.phase === "playing" && (
                  <span
                    className="memory-accent-pill rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-amber-200"
                    data-tone="amber"
                  >
                    {t("memoryStreak")} × {game.streak}
                  </span>
                )}
              </div>
              <div
                className="memory-progress-track h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
                role="progressbar"
                aria-label={t("memoryPairs")}
                aria-valuemin={0}
                aria-valuemax={game.totalPairs}
                aria-valuenow={game.matchedPairs}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 via-primary to-cyan-300 transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {game.phase === "complete" && (
          <div
            role="status"
            aria-live="assertive"
            className="memory-complete-panel surface-card flex w-full max-w-xl items-center gap-3 border-emerald-300/20 bg-emerald-400/[0.08] px-4 py-3"
          >
            <span
              className="memory-accent flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200"
              data-tone="emerald"
            >
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-foreground">{t("memoryCompleted")}</p>
              <p className="text-sm text-muted-foreground">
                {game.moves} {t("memoryMoveUnit")} · {formatTime(elapsedSeconds)}
                {isNewBest ? ` · ${t("memoryNewBest")}` : ""}
              </p>
            </div>
          </div>
        )}

        <section
          className="game-stage memory-board surface-panel w-full max-w-xl p-2.5 sm:p-3"
          data-slot="game-stage"
          aria-label={a11y.board}
          aria-busy={game.isLocked}
        >
          <p className="sr-only" aria-live="polite">{boardStatus}</p>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${game.columns}, minmax(0, 1fr))` }}
          >
            {game.cards.map((card, index) => {
              const symbol = SYMBOLS[card.pairId % SYMBOLS.length]
              const Icon = symbol.icon
              const isFaceUp = card.status !== "hidden"
              const isUnavailable = (
                game.isLocked
                || card.status !== "hidden"
                || game.phase === "complete"
              )
              const stateLabel = card.status === "hidden"
                ? a11y.hidden
                : card.status === "matched"
                  ? `${a11y.matched} ${card.pairId + 1}`
                  : `${a11y.revealed} ${card.pairId + 1}`

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    if (!isUnavailable) handleCardSelect(card.id)
                  }}
                  aria-disabled={isUnavailable}
                  aria-label={`${a11y.card} ${index + 1}, ${stateLabel}`}
                  aria-pressed={isFaceUp}
                  className={cn(
                    "group relative aspect-square min-h-11 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:rounded-2xl",
                    isUnavailable && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-0 block transition-transform duration-500 [transform-style:preserve-3d]",
                      isFaceUp && "[transform:rotateY(180deg)]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-0 flex items-center justify-center rounded-xl border border-violet-300/18 bg-[linear-gradient(145deg,oklch(0.3_0.09_278_/_0.96),oklch(0.19_0.045_267_/_0.98))] text-violet-100 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.1),0_10px_24px_oklch(0.08_0.04_275_/_0.3)] transition-[border-color,filter,transform] [backface-visibility:hidden] sm:rounded-2xl",
                        !isUnavailable && "group-hover:-translate-y-0.5 group-hover:border-violet-200/35 group-hover:brightness-110",
                      )}
                    >
                      <BrainCircuit className="size-[36%] opacity-65" aria-hidden="true" />
                      <span className="absolute inset-1 rounded-lg border border-white/[0.045] sm:rounded-xl" />
                    </span>

                    <span
                      data-tone={symbol.tone}
                      className={cn(
                        "memory-symbol absolute inset-0 flex items-center justify-center rounded-xl border shadow-[inset_0_1px_0_oklch(1_0_0_/_0.12),0_10px_24px_oklch(0.08_0.04_275_/_0.24)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:rounded-2xl",
                        symbol.className,
                        card.status === "matched" && "ring-1 ring-emerald-300/35",
                      )}
                    >
                      <Icon className="size-[46%]" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <div
          className="game-actions flex flex-wrap justify-center gap-2"
          data-slot="game-actions"
        >
          <Button
            type="button"
            variant={game.phase === "complete" ? "default" : "outline"}
            onClick={() => startNewRound(game.difficulty)}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {t("restart")}
          </Button>
          <GameRulesDialog
            triggerLabel={t("howToPlay")}
            closeLabel={t("close")}
            title={t("memoryMatch")}
            titleClassName="text-lg font-bold text-foreground"
          >
            <ul
              className="game-help space-y-3 text-sm leading-6 text-muted-foreground"
              data-slot="game-help"
            >
              <li>{t("memoryRule1")}</li>
              <li>{t("memoryRule2")}</li>
              <li>{t("memoryRule3")}</li>
              <li>{t("memoryRule4")}</li>
            </ul>
          </GameRulesDialog>
        </div>
      </main>
    </div>
  )
}
