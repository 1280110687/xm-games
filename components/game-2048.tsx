"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
} from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { Button } from "@/components/ui/button"
import {
  addRandomTile,
  canMove,
  createInitialBoard,
  createRandomBoard,
  hasWon,
  moveBoard,
  type Board2048,
  type MoveDirection,
} from "@/features/game-2048/engine"
import { shouldIgnoreGameKeyboardEvent } from "@/lib/game-keyboard"
import type { Locale } from "@/lib/i18n"
import { useLocale } from "@/lib/locale-context"

type GameStatus = "playing" | "won" | "gameOver"

interface PointerOrigin {
  id: number
  x: number
  y: number
}

const COPY: Record<
  Locale,
  {
    board: string
    continue: string
    empty: string
    join: string
    keepGoing: string
    move: Record<MoveDirection, string>
    swipe: string
    tryAgain: string
  }
> = {
  zh: {
    board: "2048 棋盘",
    continue: "继续挑战",
    empty: "空白",
    join: "合并相同数字，获得 2048 方块！",
    keepGoing: "你已获得 2048！",
    move: {
      up: "向上移动",
      down: "向下移动",
      left: "向左移动",
      right: "向右移动",
    },
    swipe: "滑动棋盘或使用方向键",
    tryAgain: "再来一局",
  },
  en: {
    board: "2048 board",
    continue: "Keep going",
    empty: "empty",
    join: "Join the numbers and get to the 2048 tile!",
    keepGoing: "You reached 2048!",
    move: {
      up: "Move up",
      down: "Move down",
      left: "Move left",
      right: "Move right",
    },
    swipe: "Swipe the board or use the arrow keys",
    tryAgain: "Try again",
  },
  th: {
    board: "กระดาน 2048",
    continue: "เล่นต่อ",
    empty: "ว่าง",
    join: "รวมตัวเลขเพื่อสร้างแผ่น 2048!",
    keepGoing: "คุณสร้าง 2048 ได้แล้ว!",
    move: {
      up: "เลื่อนขึ้น",
      down: "เลื่อนลง",
      left: "เลื่อนไปซ้าย",
      right: "เลื่อนไปขวา",
    },
    swipe: "ปัดกระดานหรือใช้ปุ่มลูกศร",
    tryAgain: "ลองอีกครั้ง",
  },
}

function tileClass(value: number): string {
  return value > 2048 ? "tile-super" : `tile-${value}`
}

function readBestScore(): number {
  try {
    const saved = window.localStorage.getItem("2048-best")
    if (saved === null) return 0
    const parsed = Number(saved)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

function writeBestScore(score: number) {
  try {
    window.localStorage.setItem("2048-best", String(score))
  } catch {
    // The game remains playable when storage is unavailable.
  }
}

export function Game2048() {
  const { t, locale } = useLocale()
  const copy = COPY[locale]
  const [board, setBoard] = useState<Board2048>(createInitialBoard)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [status, setStatus] = useState<GameStatus>("playing")
  const [keepPlaying, setKeepPlaying] = useState(false)
  const [newTile, setNewTile] = useState<[number, number] | null>(null)
  const pointerOrigin = useRef<PointerOrigin | null>(null)

  useEffect(() => {
    setBestScore(readBestScore())
  }, [])

  const updateBestScore = useCallback((nextScore: number) => {
    setBestScore((currentBest) => {
      if (nextScore <= currentBest) return currentBest
      writeBestScore(nextScore)
      return nextScore
    })
  }, [])

  const handleMove = useCallback(
    (direction: MoveDirection) => {
      if (status !== "playing") return

      const move = moveBoard(board, direction)
      if (!move.moved) return

      const placement = addRandomTile(move.board)
      const nextScore = score + move.score
      setBoard(placement.board)
      setNewTile(placement.position)
      setScore(nextScore)
      updateBestScore(nextScore)

      if (!keepPlaying && hasWon(placement.board)) {
        setStatus("won")
      } else if (!canMove(placement.board)) {
        setStatus("gameOver")
      }
    },
    [board, keepPlaying, score, status, updateBestScore]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreGameKeyboardEvent(event)) return

      const directionMap: Partial<Record<string, MoveDirection>> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        W: "up",
        s: "down",
        S: "down",
        a: "left",
        A: "left",
        d: "right",
        D: "right",
      }
      const direction = directionMap[event.key]
      if (!direction) return

      event.preventDefault()
      handleMove(direction)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleMove])

  const resetGame = useCallback(() => {
    setBoard(createRandomBoard())
    setScore(0)
    setStatus("playing")
    setKeepPlaying(false)
    setNewTile(null)
  }, [])

  const continueGame = () => {
    setKeepPlaying(true)
    setStatus("playing")
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    pointerOrigin.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = pointerOrigin.current
    pointerOrigin.current = null
    if (!origin || origin.id !== event.pointerId) return

    const deltaX = event.clientX - origin.x
    const deltaY = event.clientY - origin.y
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      handleMove(deltaX > 0 ? "right" : "left")
    } else {
      handleMove(deltaY > 0 ? "down" : "up")
    }
  }

  const clearPointer = () => {
    pointerOrigin.current = null
  }

  return (
    <div className="game-page classic-2048-page" data-page="2048">
      <GameHeader
        layout="centered"
        homeIcon="back"
        homeLabel={t("appName")}
        homeLabelMode="sr-only"
        title={t("game2048")}
        titleClassName="text-xl font-bold text-foreground sm:text-2xl"
        homeButtonClassName="text-muted-foreground hover:text-foreground"
      />

      <main
        className="game-content classic-2048-content"
        data-slot="game-content"
      >
        <section className="classic-2048-shell" aria-label={copy.board}>
          <div className="classic-2048-heading">
            <div className="classic-2048-logo" aria-hidden="true">
              2048
            </div>
            <div
              className="classic-2048-scores"
              role="status"
              aria-live="polite"
            >
              <div className="classic-2048-score">
                <span>{t("score")}</span>
                <strong>{score}</strong>
              </div>
              <div className="classic-2048-score">
                <span>{t("highScore")}</span>
                <strong>{bestScore}</strong>
              </div>
            </div>
          </div>

          <div className="classic-2048-intro">
            <p>{copy.join}</p>
            <Button
              type="button"
              className="classic-2048-new-game"
              onClick={resetGame}
            >
              {t("newGame")}
            </Button>
          </div>

          <div
            className="classic-2048-board"
            role="group"
            aria-label={`${copy.board}. ${t("score")}: ${score}.`}
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={clearPointer}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") clearPointer()
            }}
          >
            <div className="classic-2048-grid" aria-hidden="true">
              {board.map((row, rowIndex) =>
                row.map((cell, columnIndex) => (
                  <div
                    key={`${rowIndex}-${columnIndex}`}
                    className={`classic-2048-cell ${
                      cell ? `classic-2048-tile ${tileClass(cell)}` : ""
                    } ${
                      newTile?.[0] === rowIndex &&
                      newTile?.[1] === columnIndex
                        ? "is-new"
                        : ""
                    }`}
                    data-value={cell ?? undefined}
                  >
                    {cell}
                  </div>
                ))
              )}
            </div>

            {status !== "playing" && (
              <div
                className={`game-message classic-2048-message is-${status}`}
                role="status"
                aria-live="assertive"
              >
                <strong>
                  {status === "won" ? copy.keepGoing : t("gameOver")}
                </strong>
                <div className="classic-2048-message-actions">
                  {status === "won" && (
                    <Button type="button" onClick={continueGame}>
                      {copy.continue}
                    </Button>
                  )}
                  <Button type="button" onClick={resetGame}>
                    {copy.tryAgain}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div
            className="mobile-controls classic-2048-controls"
            data-slot="mobile-controls"
            aria-label={copy.swipe}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleMove("left")}
              aria-label={copy.move.left}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleMove("up")}
              aria-label={copy.move.up}
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleMove("down")}
              aria-label={copy.move.down}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleMove("right")}
              aria-label={copy.move.right}
            >
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>

          <div className="game-actions classic-2048-actions" data-slot="game-actions">
            <Button type="button" variant="outline" onClick={resetGame}>
              <RotateCcw aria-hidden="true" />
              {t("restart")}
            </Button>
            <GameRulesDialog
              triggerLabel={t("howToPlay")}
              closeLabel={t("close")}
              titleClassName="text-lg font-bold"
            >
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t("game2048Rule1")}</li>
                <li>{t("game2048Rule2")}</li>
                <li>{t("game2048Rule3")}</li>
              </ul>
            </GameRulesDialog>
          </div>

          <p className="game-help classic-2048-help" data-slot="game-help">
            {copy.swipe}
          </p>
        </section>
      </main>
    </div>
  )
}
