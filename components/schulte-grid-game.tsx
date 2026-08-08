"use client"

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react"
import {
  Clock3,
  Focus,
  Play,
  RotateCcw,
  Square,
  Target,
  TimerReset,
  Trophy,
} from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  formatAlternatingTrailTarget,
  getAlternatingTrailTarget,
} from "@/features/alternating-trail/sequence"
import {
  SCHULTE_LEVELS,
  createEmptySchulteRecords,
  createSchulteGridState,
  getSchulteElapsedMs,
  getSchulteFinalResult,
  parseSchulteRecords,
  restartSchulteRound,
  selectSchulteNumber,
  startSchulteRound,
  stopSchulteRound,
  updateSchulteRecords,
  type SchulteGridState,
  type SchulteLevel,
  type SchulteRecord,
  type SchulteRecords,
} from "@/features/schulte-grid/engine"
import {
  SCHULTE_LAYOUT_TEMPLATES,
  createSchulteLayout,
  type SchulteLayout,
} from "@/features/schulte-grid/layouts"
import { useLocale } from "@/lib/locale-context"
import type { TranslationKey } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const subscribeToHydration = () => () => {}

type Translate = (key: TranslationKey) => string
type FocusSequenceMode = "schulte" | "alternating"

interface FocusSequenceConfig {
  dataPage: "schulte-grid" | "alternating-trail"
  focusExercise: FocusSequenceMode
  recordsStorageKey: string
  initialLayoutSeed: number
  titleKey: TranslationKey
  descriptionKey: TranslationKey
  instructionsKey: TranslationKey
  nextTargetKey: TranslationKey
  wrongTargetKey: TranslationKey
  boardLabelKey: TranslationKey
  difficultyKey: TranslationKey
  levelKeys: Record<SchulteLevel, TranslationKey>
  startHintKey: TranslationKey
}

const FOCUS_SEQUENCE_CONFIGS: Record<FocusSequenceMode, FocusSequenceConfig> = {
  schulte: {
    dataPage: "schulte-grid",
    focusExercise: "schulte",
    recordsStorageKey: "xm-games-schulte-records:v1",
    initialLayoutSeed: 0x53_43_48_55,
    titleKey: "schulteGrid",
    descriptionKey: "schulteGridDescription",
    instructionsKey: "schulteGridInstructions",
    nextTargetKey: "schulteNextNumber",
    wrongTargetKey: "schulteWrongNumber",
    boardLabelKey: "schulteBoardLabel",
    difficultyKey: "schulteDifficulty",
    levelKeys: {
      easy: "schulteLevel25",
      medium: "schulteLevel36",
      hard: "schulteLevel49",
    },
    startHintKey: "schulteStartHint",
  },
  alternating: {
    dataPage: "alternating-trail",
    focusExercise: "alternating",
    recordsStorageKey: "xm-games-alternating-trail-records:v1",
    initialLayoutSeed: 0x41_4c_54_52,
    titleKey: "alternatingTrailShortTitle",
    descriptionKey: "alternatingTrailDescription",
    instructionsKey: "alternatingTrailInstructions",
    nextTargetKey: "alternatingTrailNextTarget",
    wrongTargetKey: "alternatingTrailWrongTarget",
    boardLabelKey: "alternatingTrailBoardLabel",
    difficultyKey: "alternatingTrailDifficulty",
    levelKeys: {
      easy: "alternatingTrailLevel25",
      medium: "alternatingTrailLevel36",
      hard: "alternatingTrailLevel49",
    },
    startHintKey: "alternatingTrailStartHint",
  },
}

function formatDuration(milliseconds: number) {
  const safeMilliseconds = Math.max(0, Math.floor(milliseconds))
  const minutes = Math.floor(safeMilliseconds / 60_000)
  const seconds = Math.floor((safeMilliseconds % 60_000) / 1_000)
  const centiseconds = Math.floor((safeMilliseconds % 1_000) / 10)

  return [minutes, seconds, centiseconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

function roundSvgCoordinate(value: number) {
  return Math.round(value * 1_000) / 1_000
}

function readMonotonicNow() {
  return performance.now()
}

function useHasHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )
}

function levelLabel(
  t: Translate,
  level: SchulteLevel,
  config: FocusSequenceConfig,
) {
  return t(config.levelKeys[level])
}

function formatTarget(mode: FocusSequenceMode, ordinal: number) {
  return mode === "alternating"
    ? formatAlternatingTrailTarget(ordinal)
    : String(ordinal)
}

function targetKind(mode: FocusSequenceMode, ordinal: number) {
  return mode === "alternating"
    ? getAlternatingTrailTarget(ordinal).kind
    : "number"
}

function targetAriaLabel(
  mode: FocusSequenceMode,
  ordinal: number,
  t: Translate,
) {
  const label = formatTarget(mode, ordinal)
  if (mode !== "alternating") return label

  return targetKind(mode, ordinal) === "letter"
    ? `${t("alternatingTrailLetterLabel")} ${label}`
    : `${t("alternatingTrailNumberLabel")} ${label}`
}

function readStoredRecords(storageKey: string) {
  try {
    return parseSchulteRecords(window.localStorage.getItem(storageKey))
  } catch {
    return createEmptySchulteRecords()
  }
}

function writeStoredRecords(storageKey: string, records: SchulteRecords) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(records))
  } catch {
    // Private browsing and full storage should not block a local test.
  }
}

function createRoundSeed() {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0]
  }
  return Math.floor(Math.random() * 0x1_0000_0000)
}

function getRoundLayout(cellCount: 25 | 36 | 49, seed: number) {
  const template = SCHULTE_LAYOUT_TEMPLATES[
    seed % SCHULTE_LAYOUT_TEMPLATES.length
  ]

  return createSchulteLayout({
    count: cellCount,
    template,
    seed,
    deformation: 0.94,
    minimumCellDimension: 72,
  })
}

function SchulteBoard({
  game,
  layout,
  config,
  onSelect,
  t,
}: {
  game: SchulteGridState
  layout: SchulteLayout
  config: FocusSequenceConfig
  onSelect: (number: number) => void
  t: Translate
}) {
  const clipId = `schulte-board-${useId().replaceAll(":", "")}`
  const isRunning = game.phase === "running"

  const handleKeyDown = (
    event: ReactKeyboardEvent<SVGGElement>,
    number: number,
  ) => {
    if (!isRunning || (event.key !== "Enter" && event.key !== " ")) return
    event.preventDefault()
    onSelect(number)
  }

  return (
    <div className="schulte-board-shell">
      <svg
        className="schulte-board"
        viewBox={`${layout.viewBox.x} ${layout.viewBox.y} ${layout.viewBox.width} ${layout.viewBox.height}`}
        role="group"
        aria-label={t(config.boardLabelKey)}
      >
        <defs>
          <clipPath id={clipId}>
            <circle
              cx={layout.clipCircle.cx}
              cy={layout.clipCircle.cy}
              r={layout.clipCircle.r}
            />
          </clipPath>
        </defs>

        <path className="schulte-board-backdrop" d={layout.boardPath} />
        <g clipPath={`url(#${clipId})`}>
          {layout.cells.map((cell, index) => {
            const number = game.numbers[index]
            const label = formatTarget(config.focusExercise, number)
            const fontSize = Math.min(
              cell.safeDiameter * 0.5,
              58 * cell.fontScale,
            )
            const centerX = roundSvgCoordinate(cell.center.x)
            const centerY = roundSvgCoordinate(cell.center.y)

            return (
              <g
                key={cell.id}
                className="schulte-cell"
                data-value-kind={targetKind(config.focusExercise, number)}
                role="button"
                tabIndex={isRunning ? 0 : -1}
                aria-disabled={!isRunning}
                aria-label={targetAriaLabel(config.focusExercise, number, t)}
                onClick={() => {
                  if (isRunning) onSelect(number)
                }}
                onKeyDown={(event) => handleKeyDown(event, number)}
              >
                <path className="schulte-cell-hit" d={cell.hitPath} />
                <path className="schulte-cell-shape" d={cell.path} />
                <text
                  className="schulte-cell-number"
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={roundSvgCoordinate(fontSize)}
                >
                  {label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

function SchulteDifficultyPicker({
  level,
  disabled,
  config,
  onChange,
  t,
}: {
  level: SchulteLevel
  disabled: boolean
  config: FocusSequenceConfig
  onChange: (level: SchulteLevel) => void
  t: Translate
}) {
  return (
    <div
      className="schulte-level-picker"
      role="group"
      aria-label={t(config.difficultyKey)}
    >
      {(Object.keys(SCHULTE_LEVELS) as SchulteLevel[]).map((option) => (
        <button
          key={option}
          type="button"
          className={cn("schulte-level-option", option === level && "is-active")}
          aria-pressed={option === level}
          disabled={disabled}
          onClick={() => onChange(option)}
        >
          {levelLabel(t, option, config)}
        </button>
      ))}
    </div>
  )
}

function SchulteActions({
  phase,
  onStart,
  onStop,
  onRestart,
  t,
}: {
  phase: SchulteGridState["phase"]
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  t: Translate
}) {
  return (
    <div className="schulte-actions">
      {phase === "idle" && (
        <Button type="button" size="lg" onClick={onStart}>
          <Play aria-hidden="true" />
          {t("schulteStart")}
        </Button>
      )}
      {phase === "running" && (
        <Button type="button" size="lg" variant="secondary" onClick={onStop}>
          <Square aria-hidden="true" />
          {t("schulteStop")}
        </Button>
      )}
      {phase !== "idle" && (
        <Button type="button" size="lg" variant="outline" onClick={onRestart}>
          <RotateCcw aria-hidden="true" />
          {t("schulteRestart")}
        </Button>
      )}
    </div>
  )
}

function SchulteNotice({
  game,
  elapsedMs,
  penaltyVisible,
  config,
  t,
}: {
  game: SchulteGridState
  elapsedMs: number
  penaltyVisible: boolean
  config: FocusSequenceConfig
  t: Translate
}) {
  let content: ReactNode = t(config.startHintKey)

  if (game.phase === "running") {
    content = penaltyVisible
      ? t("schultePenaltyNotice")
      : t(config.instructionsKey)
  } else if (game.phase === "completed") {
    content = game.completionReason === "solved"
      ? `${t("schulteCompleted")} ${formatDuration(elapsedMs)}`
      : `${t("schulteStopped")} · ${game.correctCount}/${game.cellCount}`
  }

  return (
    <div
      className={cn("schulte-notice-slot", penaltyVisible && "is-penalty")}
    >
      {content}
    </div>
  )
}

function SchulteLiveStatus({
  game,
  penaltyVisible,
  config,
  t,
}: {
  game: SchulteGridState
  penaltyVisible: boolean
  config: FocusSequenceConfig
  t: Translate
}) {
  let message = t(config.startHintKey)

  if (game.phase === "running") {
    const progress = `${t("schulteProgress")}: ${game.correctCount}/${game.cellCount}`
    const target = `${t(config.nextTargetKey)}: ${formatTarget(config.focusExercise, game.expectedNumber)}`
    message = penaltyVisible
      ? `${t(config.wrongTargetKey)} ${game.wrongCount}. ${t("schultePenaltyNotice")} ${target}. ${progress}`
      : `${target}. ${progress}`
  } else if (game.phase === "completed") {
    message = game.completionReason === "solved"
      ? t("schulteCompleted")
      : `${t("schulteStopped")}. ${t("schulteProgress")}: ${game.correctCount}/${game.cellCount}`
  }

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </p>
  )
}

function SchulteMetric({
  className,
  icon,
  label,
  value,
}: {
  className?: string
  icon: ReactNode
  label: string
  value: ReactNode
}) {
  return (
    <div className={cn("schulte-metric", className)}>
      <span className="schulte-metric-icon">{icon}</span>
      <span className="schulte-metric-copy">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

function SchulteRecentResults({
  level,
  records,
  config,
  t,
}: {
  level: SchulteLevel
  records: SchulteRecords
  config: FocusSequenceConfig
  t: Translate
}) {
  const recent = records.recent[level] ?? []

  return (
    <section className="schulte-recent" aria-label={t("schulteRecentResults")}>
      <header>
        <span>{t("schulteRecentResults")}</span>
        <small>{levelLabel(t, level, config)}</small>
      </header>
      <div className="schulte-recent-track">
        {recent.length === 0 ? (
          <p className="schulte-recent-empty">{t("schulteNoRecentResults")}</p>
        ) : (
          recent.map((record, index) => (
            <SchulteRecentItem
              key={`${record.recordedAtMs}-${index}`}
              index={index}
              record={record}
              t={t}
            />
          ))
        )}
      </div>
    </section>
  )
}

function SchulteRecentItem({
  index,
  record,
  t,
}: {
  index: number
  record: SchulteRecord
  t: Translate
}) {
  return (
    <article className="schulte-recent-item" data-outcome={record.outcome}>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <strong>{formatDuration(record.elapsedMs)}</strong>
      <small>
        {record.solved ? t("schulteCompleted") : t("schulteStopped")}
        {" · "}{record.progress}/{record.total}
      </small>
    </article>
  )
}

interface SchulteViewProps {
  game: SchulteGridState
  selectedLevel: SchulteLevel
  layout: SchulteLayout
  config: FocusSequenceConfig
  elapsedMs: number
  records: SchulteRecords
  penaltyVisible: boolean
  t: Translate
  onSelect: (number: number) => void
  onLevelChange: (level: SchulteLevel) => void
  onStart: () => void
  onStop: () => void
  onRestart: () => void
}

function SchulteProgress({ game, t }: { game: SchulteGridState; t: Translate }) {
  const progress = (game.correctCount / game.cellCount) * 100
  return (
    <div className="schulte-progress-block">
      <span>
        {t("schulteProgress")}
        <strong>{game.correctCount}/{game.cellCount}</strong>
      </span>
      <div
        className="schulte-progress-track"
        role="progressbar"
        aria-label={t("schulteProgress")}
        aria-valuemin={0}
        aria-valuemax={game.cellCount}
        aria-valuenow={game.correctCount}
      >
        <i style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function SchulteTargetValue({
  game,
  config,
}: {
  game: SchulteGridState
  config: FocusSequenceConfig
}) {
  if (game.phase !== "completed") {
    return formatTarget(config.focusExercise, game.expectedNumber)
  }
  return game.completionReason === "solved" ? "✓" : "—"
}

function SchulteThemeOneView(props: SchulteViewProps) {
  const best = props.records.best[props.selectedLevel]
  return (
    <main className="schulte-one-console">
      <section className="schulte-one-status-rail">
        <SchulteMetric
          className="schulte-timer"
          icon={<Clock3 aria-hidden="true" />}
          label={props.t("schulteElapsedTime")}
          value={formatDuration(props.elapsedMs)}
        />
        <SchulteMetric
          className="schulte-target"
          icon={<Target aria-hidden="true" />}
          label={props.t(props.config.nextTargetKey)}
          value={(
            <SchulteTargetValue game={props.game} config={props.config} />
          )}
        />
        <SchulteMetric
          className="schulte-best"
          icon={<Trophy aria-hidden="true" />}
          label={props.t("schulteBestTime")}
          value={best ? formatDuration(best.elapsedMs) : "—"}
        />
      </section>

      <section className="schulte-one-stage">
        <SchulteBoard
          game={props.game}
          layout={props.layout}
          config={props.config}
          onSelect={props.onSelect}
          t={props.t}
        />
      </section>

      <section className="schulte-one-controls">
        <SchulteDifficultyPicker
          level={props.selectedLevel}
          disabled={props.game.phase === "running"}
          config={props.config}
          onChange={props.onLevelChange}
          t={props.t}
        />
        <SchulteActions
          phase={props.game.phase}
          onStart={props.onStart}
          onStop={props.onStop}
          onRestart={props.onRestart}
          t={props.t}
        />
      </section>

      <SchulteProgress game={props.game} t={props.t} />
      <SchulteNotice
        game={props.game}
        elapsedMs={props.elapsedMs}
        penaltyVisible={props.penaltyVisible}
        config={props.config}
        t={props.t}
      />
      <SchulteRecentResults
        level={props.selectedLevel}
        records={props.records}
        config={props.config}
        t={props.t}
      />
    </main>
  )
}

function SchulteThemeTwoView(props: SchulteViewProps) {
  const best = props.records.best[props.selectedLevel]
  return (
    <main className="schulte-two-stack">
      <article className="schulte-two-stage-card">
        <header className="schulte-two-card-head">
          <div>
            <span>{props.t(props.config.nextTargetKey)}</span>
            <strong>
              <SchulteTargetValue game={props.game} config={props.config} />
            </strong>
          </div>
          <div className="schulte-two-time">
            <span>{props.t("schulteElapsedTime")}</span>
            <strong>{formatDuration(props.elapsedMs)}</strong>
          </div>
        </header>
        <SchulteBoard
          game={props.game}
          layout={props.layout}
          config={props.config}
          onSelect={props.onSelect}
          t={props.t}
        />
        <SchulteProgress game={props.game} t={props.t} />
      </article>

      <div className="schulte-two-control-dock">
        <SchulteDifficultyPicker
          level={props.selectedLevel}
          disabled={props.game.phase === "running"}
          config={props.config}
          onChange={props.onLevelChange}
          t={props.t}
        />
        <SchulteActions
          phase={props.game.phase}
          onStart={props.onStart}
          onStop={props.onStop}
          onRestart={props.onRestart}
          t={props.t}
        />
        <div className="schulte-two-best">
          <Trophy aria-hidden="true" />
          <span>{props.t("schulteBestTime")}</span>
          <strong>{best ? formatDuration(best.elapsedMs) : props.t("schulteNoRecord")}</strong>
        </div>
      </div>

      <SchulteNotice
        game={props.game}
        elapsedMs={props.elapsedMs}
        penaltyVisible={props.penaltyVisible}
        config={props.config}
        t={props.t}
      />
      <SchulteRecentResults
        level={props.selectedLevel}
        records={props.records}
        config={props.config}
        t={props.t}
      />
    </main>
  )
}

function SchulteThemeThreeView(props: SchulteViewProps) {
  const best = props.records.best[props.selectedLevel]
  return (
    <main className="schulte-three-console">
      <section className="schulte-three-stage">
        <div className="schulte-three-hud">
          <span>
            <small>{props.t("schulteElapsedTime")}</small>
            <strong>{formatDuration(props.elapsedMs)}</strong>
          </span>
          <span>
            <small>{props.t(props.config.nextTargetKey)}</small>
            <strong>
              <SchulteTargetValue game={props.game} config={props.config} />
            </strong>
          </span>
        </div>
        <SchulteBoard
          game={props.game}
          layout={props.layout}
          config={props.config}
          onSelect={props.onSelect}
          t={props.t}
        />
      </section>

      <aside className="schulte-three-telemetry">
        <header>
          <Focus aria-hidden="true" />
          <span>{props.t(props.config.titleKey)}</span>
          <i aria-hidden="true" />
        </header>
        <SchulteProgress game={props.game} t={props.t} />
        <SchulteDifficultyPicker
          level={props.selectedLevel}
          disabled={props.game.phase === "running"}
          config={props.config}
          onChange={props.onLevelChange}
          t={props.t}
        />
        <SchulteActions
          phase={props.game.phase}
          onStart={props.onStart}
          onStop={props.onStop}
          onRestart={props.onRestart}
          t={props.t}
        />
        <div className="schulte-three-best">
          <TimerReset aria-hidden="true" />
          <span>{props.t("schulteBestTime")}</span>
          <strong>{best ? formatDuration(best.elapsedMs) : "--:--:--"}</strong>
        </div>
        <SchulteNotice
          game={props.game}
          elapsedMs={props.elapsedMs}
          penaltyVisible={props.penaltyVisible}
          config={props.config}
          t={props.t}
        />
      </aside>

      <SchulteRecentResults
        level={props.selectedLevel}
        records={props.records}
        config={props.config}
        t={props.t}
      />
    </main>
  )
}

function FocusSequenceGame({
  mode = "schulte",
}: {
  mode?: FocusSequenceMode
}) {
  const { theme } = useTheme()
  const { t } = useLocale()
  const hasHydrated = useHasHydrated()
  const config = FOCUS_SEQUENCE_CONFIGS[mode]
  const [selectedLevel, setSelectedLevel] = useState<SchulteLevel>("easy")
  const [game, setGame] = useState(() => createSchulteGridState("easy"))
  const [records, setRecords] = useState<SchulteRecords>(() => (
    createEmptySchulteRecords()
  ))
  const [roundSeed, setRoundSeed] = useState(config.initialLayoutSeed)
  const [clockNow, setClockNow] = useState(0)
  const [penaltyVisible, setPenaltyVisible] = useState(false)
  const [recordsLoaded, setRecordsLoaded] = useState(false)
  const previousWrongCountRef = useRef(0)
  const recordedRoundRef = useRef<string | null>(null)
  const recordsDirtyRef = useRef(false)

  const layout = useMemo(
    () => getRoundLayout(game.cellCount, roundSeed),
    [game.cellCount, roundSeed],
  )

  useEffect(() => {
    setRecords(readStoredRecords(config.recordsStorageKey))
    setRecordsLoaded(true)
  }, [config.recordsStorageKey])

  useEffect(() => {
    if (!recordsLoaded || !recordsDirtyRef.current) return
    recordsDirtyRef.current = false
    writeStoredRecords(config.recordsStorageKey, records)
  }, [config.recordsStorageKey, records, recordsLoaded])

  useEffect(() => {
    if (game.phase !== "running") {
      setClockNow(game.completedAtMs ?? 0)
      return
    }

    let animationFrame = 0
    let lastPaint = 0
    const update = (frameTime: number) => {
      if (frameTime - lastPaint >= 50) {
        lastPaint = frameTime
        setClockNow(frameTime)
      }
      animationFrame = window.requestAnimationFrame(update)
    }

    setClockNow(readMonotonicNow())
    animationFrame = window.requestAnimationFrame(update)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [game.completedAtMs, game.phase])

  useEffect(() => {
    if (game.wrongCount < previousWrongCountRef.current) {
      previousWrongCountRef.current = game.wrongCount
      setPenaltyVisible(false)
      return
    }
    if (game.wrongCount === previousWrongCountRef.current) return

    previousWrongCountRef.current = game.wrongCount
    setPenaltyVisible(true)
    const timeout = window.setTimeout(() => setPenaltyVisible(false), 900)
    return () => window.clearTimeout(timeout)
  }, [game.wrongCount])

  useEffect(() => {
    const result = getSchulteFinalResult(game)
    if (!result || game.completedAtMs === null) return

    const roundKey = `${config.dataPage}:${roundSeed}:${game.level}:${game.completedAtMs}`
    if (recordedRoundRef.current === roundKey) return
    recordedRoundRef.current = roundKey
    const recordedAtMs = Date.now()
    recordsDirtyRef.current = true

    setRecords((current) => {
      return updateSchulteRecords(current, result, {
        now: () => recordedAtMs,
      })
    })
  }, [config.dataPage, game, roundSeed])

  const elapsedMs = getSchulteElapsedMs(
    game,
    () => clockNow,
  )

  const changeLevel = useCallback((level: SchulteLevel) => {
    setSelectedLevel(level)
    setGame(createSchulteGridState(level))
    setRoundSeed(createRoundSeed())
    recordedRoundRef.current = null
  }, [])

  const start = useCallback(() => {
    setRoundSeed(createRoundSeed())
    setGame((current) => startSchulteRound(current, {
      level: selectedLevel,
      random: Math.random,
      now: readMonotonicNow,
    }))
    recordedRoundRef.current = null
  }, [selectedLevel])

  const stop = useCallback(() => {
    setGame((current) => stopSchulteRound(current, readMonotonicNow))
  }, [])

  const restart = useCallback(() => {
    setRoundSeed(createRoundSeed())
    setGame((current) => restartSchulteRound(current, {
      level: selectedLevel,
      random: Math.random,
      now: readMonotonicNow,
    }))
    recordedRoundRef.current = null
  }, [selectedLevel])

  const selectNumber = useCallback((number: number) => {
    setGame((current) => selectSchulteNumber(current, number, {
      now: readMonotonicNow,
    }))
  }, [])

  const viewProps: SchulteViewProps = {
    game,
    selectedLevel,
    layout,
    config,
    elapsedMs,
    records,
    penaltyVisible,
    t,
    onSelect: selectNumber,
    onLevelChange: changeLevel,
    onStart: start,
    onStop: stop,
    onRestart: restart,
  }

  if (!hasHydrated) {
    return (
      <div
        className="game-page schulte-page"
        data-page={config.dataPage}
        data-focus-exercise={config.focusExercise}
        data-phase="idle"
        data-outcome="none"
        aria-busy="true"
      >
        <span className="sr-only">{t(config.titleKey)}</span>
      </div>
    )
  }

  return (
    <div
      className="game-page schulte-page"
      data-page={config.dataPage}
      data-focus-exercise={config.focusExercise}
      data-phase={game.phase}
      data-outcome={game.completionReason ?? "none"}
    >
      <GameHeader
        layout={theme === "theme-two" ? "tool" : "centered"}
        homeLabel={t("appName")}
        homeLabelMode="desktop"
        title={t(config.titleKey)}
        description={theme === "theme-two" ? t(config.descriptionKey) : undefined}
        className="schulte-header"
        titleClassName="schulte-header-title"
        descriptionClassName="schulte-header-description"
      />
      {theme === "theme-two" ? (
        <SchulteThemeTwoView {...viewProps} />
      ) : theme === "theme-three" ? (
        <SchulteThemeThreeView {...viewProps} />
      ) : (
        <SchulteThemeOneView {...viewProps} />
      )}
      <SchulteLiveStatus
        game={game}
        penaltyVisible={penaltyVisible}
        config={config}
        t={t}
      />
    </div>
  )
}

export function SchulteGridGame() {
  return <FocusSequenceGame mode="schulte" />
}

export function AlternatingTrailSequenceGame() {
  return <FocusSequenceGame mode="alternating" />
}
