"use client"

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import {
  Blocks,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react"

import { GameHeader } from "@/components/game-header"
import {
  BOARD_WIDTH,
  TETROMINO_SHAPES,
  createInitialState,
  getDisplayBoard,
  tetrisReducer,
  type TetrominoType,
} from "@/features/tetris/engine"
import { shouldIgnoreGameKeyboardEvent } from "@/lib/game-keyboard"
import type { Locale } from "@/lib/i18n"
import { useLocale } from "@/lib/locale-context"

const TETROMINO_TYPES = Object.keys(TETROMINO_SHAPES) as TetrominoType[]
const TETRIS_BEST_KEY = "xm-games:tetris-best:v1"

const COPY: Record<
  Locale,
  {
    down: string
    drop: string
    left: string
    muted: string
    pause: string
    paused: string
    play: string
    reset: string
    right: string
    rotate: string
    sound: string
    start: string
  }
> = {
  zh: {
    down: "下移",
    drop: "落下",
    left: "左移",
    muted: "静音",
    pause: "暂停",
    paused: "已暂停",
    play: "继续",
    reset: "重玩",
    right: "右移",
    rotate: "旋转",
    sound: "音效",
    start: "开始",
  },
  en: {
    down: "Down",
    drop: "Drop",
    left: "Left",
    muted: "Muted",
    pause: "Pause",
    paused: "Paused",
    play: "Resume",
    reset: "Reset",
    right: "Right",
    rotate: "Rotate",
    sound: "Sound",
    start: "Start",
  },
  th: {
    down: "ลง",
    drop: "วาง",
    left: "ซ้าย",
    muted: "ปิดเสียง",
    pause: "หยุด",
    paused: "หยุดชั่วคราว",
    play: "เล่นต่อ",
    reset: "เริ่มใหม่",
    right: "ขวา",
    rotate: "หมุน",
    sound: "เสียง",
    start: "เริ่ม",
  },
}

function readBestScore(): number {
  try {
    const parsed = Number(window.localStorage.getItem(TETRIS_BEST_KEY))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

function writeBestScore(score: number) {
  try {
    window.localStorage.setItem(TETRIS_BEST_KEY, String(score))
  } catch {
    // High scores are optional when storage is unavailable.
  }
}

function shuffleBag(): TetrominoType[] {
  const bag = [...TETROMINO_TYPES]
  for (let index = bag.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = bag[index]
    bag[index] = bag[swapIndex]
    bag[swapIndex] = current
  }
  return bag
}

export function TetrisGame() {
  const { t, locale } = useLocale()
  const copy = COPY[locale]
  const [state, dispatch] = useReducer(
    tetrisReducer,
    undefined,
    createInitialState
  )
  const [bestScore, setBestScore] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const bagRef = useRef<TetrominoType[]>([])
  const followingPieceRef = useRef<TetrominoType>("I")
  const lastPiecesPlacedRef = useRef(0)
  const previousLinesRef = useRef(0)
  const previousPhaseRef = useRef(state.phase)
  const audioContextRef = useRef<AudioContext | null>(null)
  const { nextPiece, score, lines, level, phase } = state

  const drawPiece = useCallback((): TetrominoType => {
    if (bagRef.current.length === 0) bagRef.current = shuffleBag()
    return bagRef.current.pop() ?? "I"
  }, [])

  const playTone = useCallback(
    (frequency: number, duration = 0.055) => {
      if (!soundEnabled || typeof window === "undefined") return

      const AudioContextClass =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext
          }
        ).webkitAudioContext
      if (!AudioContextClass) return

      const context =
        audioContextRef.current ?? new AudioContextClass()
      audioContextRef.current = context
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime

      oscillator.type = "square"
      oscillator.frequency.setValueAtTime(frequency, now)
      gain.gain.setValueAtTime(0.035, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + duration)
    },
    [soundEnabled]
  )

  const startGame = useCallback(() => {
    bagRef.current = shuffleBag()
    const firstPiece = drawPiece()
    const next = drawPiece()
    followingPieceRef.current = drawPiece()
    lastPiecesPlacedRef.current = 0
    previousLinesRef.current = 0
    dispatch({ type: "start", firstPiece, nextPiece: next })
    playTone(196, 0.08)
  }, [drawPiece, playTone])

  const moveHorizontal = useCallback(
    (dx: -1 | 1) => {
      dispatch({ type: "move", dx, dy: 0 })
      playTone(120)
    },
    [playTone]
  )

  const rotatePiece = useCallback(() => {
    dispatch({ type: "rotate" })
    playTone(164)
  }, [playTone])

  const softDrop = useCallback(() => {
    dispatch({
      type: "softDrop",
      nextPiece: followingPieceRef.current,
    })
    playTone(105, 0.035)
  }, [playTone])

  const hardDrop = useCallback(() => {
    dispatch({
      type: "hardDrop",
      nextPiece: followingPieceRef.current,
    })
    playTone(82, 0.09)
  }, [playTone])

  const togglePause = useCallback(() => {
    if (phase === "playing") {
      dispatch({ type: "pause" })
    } else if (phase === "paused") {
      dispatch({ type: "resume" })
    }
    playTone(220, 0.07)
  }, [phase, playTone])

  useEffect(() => {
    setBestScore(readBestScore())
  }, [])

  useEffect(() => {
    if (score <= bestScore) return
    setBestScore(score)
    writeBestScore(score)
  }, [bestScore, score])

  useEffect(() => {
    if (state.piecesPlaced === lastPiecesPlacedRef.current) return
    lastPiecesPlacedRef.current = state.piecesPlaced
    followingPieceRef.current = drawPiece()
  }, [drawPiece, state.piecesPlaced])

  useEffect(() => {
    if (lines > previousLinesRef.current) {
      playTone(lines - previousLinesRef.current >= 4 ? 660 : 440, 0.14)
    }
    previousLinesRef.current = lines
  }, [lines, playTone])

  useEffect(() => {
    if (
      previousPhaseRef.current !== "gameOver" &&
      phase === "gameOver"
    ) {
      playTone(74, 0.25)
    }
    previousPhaseRef.current = phase
  }, [phase, playTone])

  useEffect(() => {
    if (phase !== "playing") return

    const speed = Math.max(90, Math.round(820 * 0.82 ** (level - 1)))
    const gameLoop = window.setInterval(() => {
      dispatch({
        type: "tick",
        nextPiece: followingPieceRef.current,
      })
    }, speed)

    return () => window.clearInterval(gameLoop)
  }, [level, phase])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreGameKeyboardEvent(event)) return

      if (event.key === "r" || event.key === "R") {
        event.preventDefault()
        startGame()
        return
      }
      if (event.key === "p" || event.key === "P") {
        event.preventDefault()
        togglePause()
        return
      }
      if (event.key === "s" || event.key === "S") {
        event.preventDefault()
        setSoundEnabled((enabled) => !enabled)
        return
      }
      if (
        (event.key === " " || event.key === "Enter") &&
        (phase === "idle" || phase === "gameOver")
      ) {
        event.preventDefault()
        startGame()
        return
      }
      if (phase !== "playing") return

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault()
          moveHorizontal(-1)
          break
        case "ArrowRight":
          event.preventDefault()
          moveHorizontal(1)
          break
        case "ArrowDown":
          event.preventDefault()
          softDrop()
          break
        case "ArrowUp":
          event.preventDefault()
          rotatePiece()
          break
        case " ":
          event.preventDefault()
          hardDrop()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    hardDrop,
    moveHorizontal,
    phase,
    rotatePiece,
    softDrop,
    startGame,
    togglePause,
  ])

  const displayBoard = getDisplayBoard(state)
  const nextShape = TETROMINO_SHAPES[nextPiece]
  const primaryLabel =
    phase === "idle" || phase === "gameOver"
      ? copy.start
      : phase === "paused"
        ? copy.play
        : copy.drop

  const handlePrimaryAction = () => {
    if (phase === "idle" || phase === "gameOver") {
      startGame()
    } else if (phase === "paused") {
      togglePause()
    } else {
      hardDrop()
    }
  }

  return (
    <div className="game-page classic-tetris-page" data-page="tetris">
      <GameHeader
        layout="centered"
        homeIcon="back"
        homeLabel={t("appName")}
        homeLabelMode="sr-only"
        title={t("tetris")}
        titleClassName="text-lg font-bold text-foreground sm:text-xl"
        homeButtonClassName="text-muted-foreground hover:text-foreground"
      />

      <main
        className="game-content classic-tetris-content"
        data-slot="game-content"
      >
        <section className="tetris-handheld" aria-label={t("tetris")}>
          <div className="tetris-brand" aria-hidden="true">
            <Blocks className="tetris-brand-blocks" />
            <strong>{t("tetris")}</strong>
          </div>

          <div className="tetris-screen-frame">
            <div className="tetris-lcd">
              <div
                className="tetris-board"
                role="img"
                aria-label={`${t("tetris")}. ${t("score")}: ${score}. ${t("lines")}: ${lines}. ${t("level")}: ${level}.`}
                style={{
                  gridTemplateColumns: `repeat(${BOARD_WIDTH}, var(--tetris-cell))`,
                }}
              >
                {displayBoard.map((row, rowIndex) =>
                  row.map((cell, columnIndex) => (
                    <span
                      key={`${rowIndex}-${columnIndex}`}
                      className={`tetris-cell ${cell ? "is-filled" : ""}`}
                      data-piece={
                        cell ? TETROMINO_TYPES[cell - 1] : undefined
                      }
                      aria-hidden="true"
                    />
                  ))
                )}

                {phase !== "playing" && (
                  <span className={`tetris-screen-message is-${phase}`}>
                    <strong>
                      {phase === "idle"
                        ? "TETRIS"
                        : phase === "paused"
                          ? copy.paused
                          : t("gameOver")}
                    </strong>
                    {phase !== "paused" && <small>{copy.start}</small>}
                  </span>
                )}
              </div>

              <aside className="tetris-lcd-panel" aria-label={t("score")}>
                <div className="tetris-lcd-stat">
                  <span>{t("highScore")}</span>
                  <strong>{bestScore}</strong>
                </div>
                <div className="tetris-lcd-stat">
                  <span>{t("score")}</span>
                  <strong>{score}</strong>
                </div>
                <div className="tetris-lcd-stat-row">
                  <div className="tetris-lcd-stat">
                    <span>{t("lines")}</span>
                    <strong>{lines}</strong>
                  </div>
                  <div className="tetris-lcd-stat">
                    <span>{t("level")}</span>
                    <strong>{level}</strong>
                  </div>
                </div>
                <div className="tetris-next">
                  <span>{t("nextPiece")}</span>
                  <div
                    className="tetris-preview-shape"
                    role="img"
                    aria-label={`${t("nextPiece")}: ${nextPiece}`}
                    style={
                      {
                        gridTemplateColumns: `repeat(${nextShape[0].length}, 1fr)`,
                      } as CSSProperties
                    }
                  >
                    {nextShape.flatMap((row, rowIndex) =>
                      row.map((cell, columnIndex) => (
                        <i
                          key={`${rowIndex}-${columnIndex}`}
                          className={`tetris-preview-cell ${
                            cell ? "is-filled" : ""
                          }`}
                          data-piece={cell ? nextPiece : undefined}
                          aria-hidden="true"
                        />
                      ))
                    )}
                  </div>
                </div>
                <div className="tetris-lcd-sound" aria-hidden="true">
                  {soundEnabled ? <Volume2 /> : <VolumeX />} XM-01
                </div>
              </aside>
            </div>
          </div>

          <div className="tetris-control-deck">
            <div className="tetris-left-controls">
              <div className="tetris-function-row">
                <button
                  type="button"
                  className="tetris-function-button is-green"
                  onClick={togglePause}
                  disabled={phase === "idle" || phase === "gameOver"}
                  aria-label={phase === "paused" ? copy.play : copy.pause}
                >
                  <span>
                    {phase === "paused" ? (
                      <Play aria-hidden="true" />
                    ) : (
                      <Pause aria-hidden="true" />
                    )}
                  </span>
                  <small>{phase === "paused" ? copy.play : copy.pause}</small>
                </button>
                <button
                  type="button"
                  className="tetris-function-button is-green"
                  onClick={() => setSoundEnabled((enabled) => !enabled)}
                  aria-pressed={soundEnabled}
                  aria-label={soundEnabled ? copy.sound : copy.muted}
                >
                  <span>
                    {soundEnabled ? (
                      <Volume2 aria-hidden="true" />
                    ) : (
                      <VolumeX aria-hidden="true" />
                    )}
                  </span>
                  <small>{soundEnabled ? copy.sound : copy.muted}</small>
                </button>
                <button
                  type="button"
                  className="tetris-function-button is-red"
                  onClick={startGame}
                  aria-label={copy.reset}
                >
                  <span>
                    <RefreshCw aria-hidden="true" />
                  </span>
                  <small>{copy.reset}</small>
                </button>
              </div>

              <button
                type="button"
                className="tetris-drop-button"
                onClick={handlePrimaryAction}
                aria-label={primaryLabel}
              >
                {phase === "idle" ||
                phase === "gameOver" ||
                phase === "paused" ? (
                  <Play aria-hidden="true" />
                ) : (
                  <ChevronsDown aria-hidden="true" />
                )}
                <span>{primaryLabel}</span>
              </button>
            </div>

            <div className="tetris-dpad" aria-label={t("tetrisControlsMobile")}>
              <button
                type="button"
                className="tetris-dpad-button is-rotate"
                onClick={rotatePiece}
                disabled={phase !== "playing"}
                aria-label={copy.rotate}
              >
                <RotateCw aria-hidden="true" />
                <small>{copy.rotate}</small>
              </button>
              <button
                type="button"
                className="tetris-dpad-button is-left"
                onClick={() => moveHorizontal(-1)}
                disabled={phase !== "playing"}
                aria-label={copy.left}
              >
                <ChevronLeft aria-hidden="true" />
                <small>{copy.left}</small>
              </button>
              <button
                type="button"
                className="tetris-dpad-button is-down"
                onClick={softDrop}
                disabled={phase !== "playing"}
                aria-label={copy.down}
              >
                <ChevronDown aria-hidden="true" />
                <small>{copy.down}</small>
              </button>
              <button
                type="button"
                className="tetris-dpad-button is-right"
                onClick={() => moveHorizontal(1)}
                disabled={phase !== "playing"}
                aria-label={copy.right}
              >
                <ChevronRight aria-hidden="true" />
                <small>{copy.right}</small>
              </button>
            </div>
          </div>
        </section>

        <p className="game-help classic-tetris-help" data-slot="game-help">
          {t("tetrisControls")}
        </p>
      </main>
    </div>
  )
}
