"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"
import { Play, Pause, RotateCcw, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import {
  createInitialSnakeState,
  DEFAULT_BOARD_SIZE,
  snakeReducer,
  type Position,
} from "@/features/snake/engine"
import { shouldIgnoreGameKeyboardEvent } from "@/lib/game-keyboard"

export function SnakeGame() {
  const { locale, t } = useLocale()
  const [game, dispatch] = useReducer(snakeReducer, undefined, createInitialSnakeState)
  const persistedHighScoreRef = useRef<number | null>(null)
  const { food, highScore, phase, score, snake, speed } = game
  const isPlaying = phase === "playing"
  const isPaused = phase === "paused"
  const isGameOver = phase === "gameOver"
  const isWon = phase === "won"

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("snakeHighScore")
    const parsed = saved ? Number.parseInt(saved, 10) : 0
    const highScore = Number.isFinite(parsed) ? Math.max(0, parsed) : 0

    persistedHighScoreRef.current = highScore
    dispatch({ type: "hydrateHighScore", highScore })
  }, [])

  // Keep persistence outside the reducer so state transitions stay pure.
  useEffect(() => {
    if (
      persistedHighScoreRef.current === null ||
      highScore <= persistedHighScoreRef.current
    ) {
      return
    }

    localStorage.setItem("snakeHighScore", highScore.toString())
    persistedHighScoreRef.current = highScore
  }, [highScore])

  // Game loop
  useEffect(() => {
    if (!isPlaying) return

    const gameLoop = window.setInterval(() => {
      dispatch({ type: "tick", foodRoll: Math.random() })
    }, speed)

    return () => window.clearInterval(gameLoop)
  }, [isPlaying, speed])

  const changeDirection = useCallback((newDir: Position) => {
    dispatch({ type: "changeDirection", direction: newDir })
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || shouldIgnoreGameKeyboardEvent(e)) return

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault()
          changeDirection({ x: 0, y: -1 })
          break
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault()
          changeDirection({ x: 0, y: 1 })
          break
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault()
          changeDirection({ x: -1, y: 0 })
          break
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault()
          changeDirection({ x: 1, y: 0 })
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPlaying, changeDirection])

  const startGame = () => {
    dispatch({ type: "start", foodRoll: Math.random() })
  }

  const togglePause = () => {
    dispatch({ type: "togglePause" })
  }

  const boardLabels = {
    zh: { head: "蛇头", food: "食物", none: "无" },
    en: { head: "Head", food: "Food", none: "none" },
    th: { head: "หัวงู", food: "อาหาร", none: "ไม่มี" },
  }[locale]

  return (
    <div className="game-page">
      <GameHeader
        layout="centered"
        homeIcon="back"
        homeLabel={t("appName")}
        homeLabelMode="sr-only"
        title={t("snake")}
        titleClassName="text-lg font-bold text-foreground sm:text-xl"
        homeButtonClassName="text-muted-foreground hover:text-foreground"
      />

      <main className="flex flex-1 flex-col items-center justify-center gap-5 py-5 sm:gap-6">
        {/* Score Display */}
        <div className="flex gap-8 text-center" role="status" aria-live="polite">
          <div>
            <div className="text-sm text-slate-400">{t("score")}</div>
            <div className="text-2xl font-bold text-green-400">{score}</div>
          </div>
          <div>
            <div className="text-sm text-slate-400">{t("highScore")}</div>
            <div className="text-2xl font-bold text-yellow-400">{highScore}</div>
          </div>
        </div>

        {/* Game Board */}
        <Card className="border-white/10 bg-card/70">
          <CardContent className="p-2">
            <div
              className="grid gap-[1px] rounded bg-slate-900 p-1"
              role="img"
              aria-label={`${t("snake")}. ${t("score")}: ${score}. ${boardLabels.head}: ${snake[0] ? `${snake[0].x + 1}, ${snake[0].y + 1}` : boardLabels.none}. ${boardLabels.food}: ${food ? `${food.x + 1}, ${food.y + 1}` : boardLabels.none}.`}
              style={{
                gridTemplateColumns: `repeat(${DEFAULT_BOARD_SIZE}, 1fr)`,
              }}
            >
              {Array(DEFAULT_BOARD_SIZE)
                .fill(null)
                .map((_, y) =>
                  Array(DEFAULT_BOARD_SIZE)
                    .fill(null)
                    .map((_, x) => {
                      const isSnakeHead = snake[0]?.x === x && snake[0]?.y === y
                      const isSnakeBody = snake.slice(1).some((s) => s.x === x && s.y === y)
                      const isFood = food?.x === x && food.y === y

                      let cellClass = "bg-slate-800"
                      if (isSnakeHead) cellClass = "bg-green-400 rounded-sm"
                      else if (isSnakeBody) cellClass = "bg-green-600 rounded-sm"
                      else if (isFood) cellClass = "bg-red-500 rounded-full"

                      return (
                        <div
                          key={`${y}-${x}`}
                          className={`h-[clamp(0.65rem,3.25vw,1rem)] w-[clamp(0.65rem,3.25vw,1rem)] ${cellClass}`}
                          aria-hidden="true"
                        />
                      )
                    })
                )}
            </div>
          </CardContent>
        </Card>

        {/* Game Over */}
        {(isGameOver || isWon) && (
          <div className="text-center" role="status" aria-live="assertive">
            <div
              className={`text-2xl font-bold ${isWon ? "text-green-400" : "text-red-500"}`}
            >
              {isWon ? t("youWin") : t("gameOver")}
            </div>
            <div className="text-slate-400">
              {t("finalScore")}: {score}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {phase === "idle" && (
            <Button onClick={startGame} className="gap-2">
              <Play className="h-4 w-4" aria-hidden="true" />
              {t("start")}
            </Button>
          )}
          {isPlaying && (
            <Button onClick={togglePause} variant="secondary" className="gap-2">
              <Pause className="h-4 w-4" aria-hidden="true" />
              {t("pause")}
            </Button>
          )}
          {isPaused && (
            <Button onClick={togglePause} className="gap-2">
              <Play className="h-4 w-4" aria-hidden="true" />
              {t("resume")}
            </Button>
          )}
          {(isGameOver || isWon || (isPaused && score > 0)) && (
            <Button onClick={startGame} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t("restart")}
            </Button>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex flex-col items-center gap-2 md:hidden">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            aria-label={`${t("snakeControlsMobile")} ↑`}
            disabled={!isPlaying}
            onClick={() => changeDirection({ x: 0, y: -1 })}
          >
            <ChevronUp className="h-6 w-6" aria-hidden="true" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              aria-label={`${t("snakeControlsMobile")} ←`}
              disabled={!isPlaying}
              onClick={() => changeDirection({ x: -1, y: 0 })}
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </Button>
            <div className="h-12 w-12" />
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              aria-label={`${t("snakeControlsMobile")} →`}
              disabled={!isPlaying}
              onClick={() => changeDirection({ x: 1, y: 0 })}
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            aria-label={`${t("snakeControlsMobile")} ↓`}
            disabled={!isPlaying}
            onClick={() => changeDirection({ x: 0, y: 1 })}
          >
            <ChevronDown className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-slate-500">
          <span className="hidden md:inline">{t("snakeControls")}</span>
          <span className="md:hidden">{t("snakeControlsMobile")}</span>
        </div>
      </main>
    </div>
  )
}
