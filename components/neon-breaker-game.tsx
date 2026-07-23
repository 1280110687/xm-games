"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  BrickWall,
  ChevronRight,
  CircleGauge,
  Gamepad2,
  Heart,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { NeonBreakerCanvas } from "@/components/neon-breaker-canvas"
import { Button } from "@/components/ui/button"
import type {
  NeonBreakerController,
  NeonBreakerSnapshot,
} from "@/features/neon-breaker/pixi-scene"
import { useLocale } from "@/lib/locale-context"

const STORAGE_KEY = "xm-games-neon-breaker-best:v1"
const MAX_LEVEL_COUNT = 5

interface NeonBreakerRecord {
  highScore: number
  highestLevel: number
}

const EMPTY_RECORD: NeonBreakerRecord = {
  highScore: 0,
  highestLevel: 1,
}

function normalizeRecord(value: unknown): NeonBreakerRecord {
  if (!value || typeof value !== "object") return EMPTY_RECORD

  const record = value as Partial<NeonBreakerRecord>
  return {
    highScore: Number.isFinite(record.highScore)
      ? Math.max(0, Math.floor(record.highScore ?? 0))
      : 0,
    highestLevel: Number.isFinite(record.highestLevel)
      ? Math.min(
        MAX_LEVEL_COUNT,
        Math.max(1, Math.floor(record.highestLevel ?? 1)),
      )
      : 1,
  }
}

function readRecord(): NeonBreakerRecord {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? normalizeRecord(JSON.parse(stored) as unknown) : EMPTY_RECORD
  } catch {
    return EMPTY_RECORD
  }
}

function writeRecord(record: NeonBreakerRecord) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Persistence is optional; gameplay remains available in restricted contexts.
  }
}

export function NeonBreakerGame() {
  const { t } = useLocale()
  const controllerRef = useRef<NeonBreakerController | null>(null)
  const snapshotRef = useRef<NeonBreakerSnapshot | null>(null)
  const recordRef = useRef<NeonBreakerRecord>(EMPTY_RECORD)
  const resumeAfterRulesRef = useRef(false)
  const [storageReady, setStorageReady] = useState(false)
  const [record, setRecord] = useState<NeonBreakerRecord>(EMPTY_RECORD)
  const [snapshot, setSnapshot] = useState<NeonBreakerSnapshot | null>(null)
  const [sceneReady, setSceneReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const saved = readRecord()
    recordRef.current = saved
    setRecord(saved)
    setStorageReady(true)

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const latest = readRecord()
      recordRef.current = latest
      setRecord(latest)
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const handleControllerReady = useCallback((controller: NeonBreakerController | null) => {
    controllerRef.current = controller
    setSceneReady(Boolean(controller))
  }, [])

  const handleSnapshot = useCallback((nextSnapshot: NeonBreakerSnapshot) => {
    snapshotRef.current = nextSnapshot
    setSnapshot(nextSnapshot)

    const currentRecord = recordRef.current
    const highestLevel = nextSnapshot.levelIndex + 1
    if (
      nextSnapshot.highScore <= currentRecord.highScore
      && highestLevel <= currentRecord.highestLevel
    ) {
      return
    }

    const latestStored = readRecord()
    const nextRecord = {
      highScore: Math.max(
        currentRecord.highScore,
        latestStored.highScore,
        nextSnapshot.highScore,
      ),
      highestLevel: Math.max(
        currentRecord.highestLevel,
        latestStored.highestLevel,
        highestLevel,
      ),
    }
    recordRef.current = nextRecord
    setRecord(nextRecord)
    writeRecord(nextRecord)
  }, [])

  const handleLoadError = useCallback(() => {
    setSceneReady(false)
    setLoadError(true)
  }, [])

  const retryLoading = useCallback(() => {
    setLoadError(false)
    setSceneReady(false)
    setSnapshot(null)
    snapshotRef.current = null
    setRetryKey((current) => current + 1)
  }, [])

  const handleRulesOpenChange = useCallback((open: boolean) => {
    if (open) {
      resumeAfterRulesRef.current = snapshotRef.current?.phase === "playing"
      if (resumeAfterRulesRef.current) controllerRef.current?.pause()
      return
    }

    if (resumeAfterRulesRef.current) controllerRef.current?.resume()
    resumeAfterRulesRef.current = false
  }, [])

  const phase = snapshot?.phase
  const score = snapshot?.score ?? 0
  const highScore = Math.max(record.highScore, snapshot?.highScore ?? 0)
  const level = (snapshot?.levelIndex ?? 0) + 1
  const levelCount = snapshot?.levelCount ?? 5
  const lives = snapshot?.lives ?? 3
  const combo = snapshot?.combo ?? 0
  const bricksLeft = snapshot?.bricksLeft ?? 0

  const statusText = !storageReady || (!sceneReady && !loadError)
    ? t("neonBreakerLoading")
    : loadError
      ? t("neonBreakerLoadError")
      : phase === "paused"
        ? t("neonBreakerPaused")
        : phase === "level-cleared"
          ? t("neonBreakerLevelCleared")
          : phase === "won"
            ? t("neonBreakerVictory")
            : phase === "game-over"
              ? t("gameOver")
              : phase === "ready"
                ? t("neonBreakerReady")
                : ""
  const statusAnnouncement = `${statusText || t("neonBreakerInstructions")} ${t("neonBreakerLives")}: ${lives}. ${t("level")}: ${level}/${levelCount}.`

  const stats = [
    { label: t("score"), value: score, icon: CircleGauge, color: "text-cyan-200", tone: "cyan" },
    { label: t("highScore"), value: highScore, icon: Trophy, color: "text-amber-200", tone: "amber" },
    { label: t("neonBreakerLives"), value: lives, icon: Heart, color: "text-rose-200", tone: "rose" },
    { label: t("level"), value: `${level}/${levelCount}`, icon: Layers3, color: "text-violet-200", tone: "violet" },
    { label: t("neonBreakerCombo"), value: `×${combo}`, icon: Zap, color: "text-emerald-200", tone: "emerald" },
    { label: t("neonBreakerBricksLeft"), value: bricksLeft, icon: BrickWall, color: "text-fuchsia-200", tone: "fuchsia" },
  ]

  return (
    <div className="game-page" data-page="neon-breaker">
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        homeLabelMode="desktop"
        title={t("neonBreaker")}
        className="mb-4"
        homeButtonClassName="text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        titleClassName="text-base font-bold text-foreground sm:text-xl"
      />

      <main
        className="game-content mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 pb-7 lg:grid lg:grid-cols-[minmax(0,25rem)_minmax(17rem,1fr)] lg:items-start lg:gap-5"
        data-slot="game-content"
      >
        <p className="sr-only" role="status" aria-live="polite">
          {statusAnnouncement}
        </p>
        <section
          className="game-stage neon-stage surface-panel relative mx-auto w-full max-w-[25rem] overflow-hidden p-2.5 sm:p-3 lg:mx-0"
          data-slot="game-stage"
        >
          <div className="pointer-events-none absolute inset-x-12 top-0 h-28 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative aspect-[39/64] w-full overflow-hidden rounded-[1.35rem] border border-cyan-200/15 bg-[#050816] shadow-[0_22px_70px_rgba(3,7,24,0.58)]">
            {storageReady && (
              <NeonBreakerCanvas
                key={retryKey}
                ariaLabel={t("neonBreakerCanvasLabel")}
                initialHighScore={record.highScore}
                retryKey={retryKey}
                onReady={handleControllerReady}
                onSnapshot={handleSnapshot}
                onError={handleLoadError}
              />
            )}

            {statusText && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/20 p-5">
                <div className="pointer-events-auto max-w-[17rem] rounded-2xl border border-white/10 bg-slate-950/78 px-5 py-4 text-center shadow-2xl backdrop-blur-md">
                  {phase === "won" ? (
                    <Trophy className="mx-auto mb-2 size-8 text-amber-300" aria-hidden="true" />
                  ) : phase === "level-cleared" ? (
                    <Sparkles className="mx-auto mb-2 size-8 text-cyan-200" aria-hidden="true" />
                  ) : loadError ? (
                    <ShieldCheck className="mx-auto mb-2 size-8 text-rose-300" aria-hidden="true" />
                  ) : (
                    <Gamepad2 className="mx-auto mb-2 size-8 text-violet-200" aria-hidden="true" />
                  )}
                  <p className="text-sm font-semibold leading-6 text-slate-100">
                    {statusText}
                  </p>
                  {loadError && (
                    <Button type="button" size="sm" className="mt-3" onClick={retryLoading}>
                      <RotateCcw className="size-4" aria-hidden="true" />
                      {t("restart")}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="neon-dashboard flex min-w-0 flex-col gap-4">
          <div
            className="game-help surface-panel overflow-hidden p-4 sm:p-5"
            data-slot="game-help"
          >
            <div className="flex items-start gap-3">
              <span
                className="neon-breaker-accent flex size-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-400/10 text-cyan-200"
                data-tone="cyan"
              >
                <BrickWall className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {t("neonBreakerDescription")}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t("neonBreakerInstructions")}
                </p>
              </div>
            </div>
          </div>

          <div
            className="game-summary grid grid-cols-3 gap-2"
            data-slot="game-summary"
          >
            {stats.map(({ label, value, icon: Icon, color, tone }) => (
              <div key={label} className="surface-card min-w-0 px-2.5 py-3 sm:px-3">
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={`neon-breaker-accent size-3.5 shrink-0 ${color}`}
                    data-tone={tone}
                    aria-hidden="true"
                  />
                  <p className="truncate text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                </div>
                <p className="mt-1.5 font-mono text-lg font-bold tabular-nums text-foreground sm:text-xl">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {Boolean(snapshot?.widePaddleSeconds) && (
            <div className="neon-breaker-power-up flex items-center justify-between rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] px-3 py-2.5 text-sm text-emerald-100">
              <span className="flex items-center gap-2 font-semibold">
                <Zap className="size-4" aria-hidden="true" />
                {t("neonBreakerWidePaddle")}
              </span>
              <span className="font-mono tabular-nums">{snapshot?.widePaddleSeconds}s</span>
            </div>
          )}

          <div
            className="game-actions surface-panel flex flex-wrap items-center gap-2 p-3 sm:p-4"
            data-slot="game-actions"
          >
            {phase === "ready" && (
              <Button type="button" onClick={() => controllerRef.current?.launch()} disabled={!sceneReady}>
                <Play className="size-4" aria-hidden="true" />
                {t("neonBreakerLaunch")}
              </Button>
            )}
            {phase === "playing" && (
              <Button type="button" variant="secondary" onClick={() => controllerRef.current?.pause()}>
                <Pause className="size-4" aria-hidden="true" />
                {t("pause")}
              </Button>
            )}
            {phase === "paused" && (
              <Button type="button" onClick={() => controllerRef.current?.resume()}>
                <Play className="size-4" aria-hidden="true" />
                {t("resume")}
              </Button>
            )}
            {phase === "level-cleared" && (
              <Button type="button" onClick={() => controllerRef.current?.nextLevel()}>
                <ChevronRight className="size-4" aria-hidden="true" />
                {t("neonBreakerNextLevel")}
              </Button>
            )}
            {(phase === "won" || phase === "game-over" || phase === "paused") && (
              <Button type="button" variant="outline" onClick={() => controllerRef.current?.restart()}>
                <RotateCcw className="size-4" aria-hidden="true" />
                {t("restart")}
              </Button>
            )}

            <GameRulesDialog
              triggerLabel={t("howToPlay")}
              closeLabel={t("close")}
              title={t("neonBreaker")}
              onOpenChange={handleRulesOpenChange}
              triggerClassName="ml-auto"
            >
              <ol className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                {[
                  t("neonBreakerRule1"),
                  t("neonBreakerRule2"),
                  t("neonBreakerRule3"),
                  t("neonBreakerRule4"),
                ].map((rule, index) => (
                  <li key={rule} className="flex gap-3">
                    <span
                      className="neon-breaker-accent flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 font-mono text-xs font-bold text-cyan-200"
                      data-tone="cyan"
                    >
                      {index + 1}
                    </span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
            </GameRulesDialog>
          </div>

          <p className="text-center text-xs leading-5 text-muted-foreground lg:text-left">
            {t("neonBreakerInstructions")} · {t("highScore")}: {highScore} · {t("level")}: {record.highestLevel}/{levelCount}
          </p>
        </section>
      </main>
    </div>
  )
}
