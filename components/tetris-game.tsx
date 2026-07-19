"use client"

import { useCallback, useEffect, useReducer } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"
import { Play, Pause, RotateCcw, ChevronDown, ChevronLeft, ChevronRight, ChevronsDown } from "lucide-react"
import {
  BOARD_WIDTH,
  TETROMINO_SHAPES,
  createInitialState,
  getDisplayBoard,
  pickTetromino,
  tetrisReducer,
  type TetrominoType,
} from "@/features/tetris/engine"

const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: "bg-cyan-500",
  O: "bg-yellow-500",
  T: "bg-purple-500",
  S: "bg-green-500",
  Z: "bg-red-500",
  J: "bg-blue-500",
  L: "bg-orange-500",
}

const TETROMINO_TYPES = Object.keys(TETROMINO_SHAPES) as TetrominoType[]

export function TetrisGame() {
  const { t, locale } = useLocale()
  const mobileLabels = locale === "zh"
    ? { rotate: "旋转方块", left: "向左移动", right: "向右移动", down: "向下移动", drop: "直接落下" }
    : locale === "th"
      ? { rotate: "หมุนบล็อก", left: "เลื่อนไปซ้าย", right: "เลื่อนไปขวา", down: "เลื่อนลง", drop: "วางลงทันที" }
      : { rotate: "Rotate piece", left: "Move piece left", right: "Move piece right", down: "Move piece down", drop: "Hard drop piece" }
  const [state, dispatch] = useReducer(
    tetrisReducer,
    undefined,
    createInitialState
  )
  const { nextPiece, score, lines, level, phase } = state

  const randomPiece = useCallback(
    () => pickTetromino(Math.random()),
    []
  )
  const movePiece = useCallback(
    (dx: number, dy: number) => dispatch({ type: "move", dx, dy }),
    []
  )
  const rotatePiece = useCallback(() => dispatch({ type: "rotate" }), [])
  const hardDrop = useCallback(
    () => dispatch({ type: "hardDrop", nextPiece: randomPiece() }),
    [randomPiece]
  )

  useEffect(() => {
    if (phase !== "playing") return

    const speed = Math.max(100, 1000 - (level - 1) * 100)
    const gameLoop = window.setInterval(() => {
      dispatch({ type: "tick", nextPiece: randomPiece() })
    }, speed)

    return () => window.clearInterval(gameLoop)
  }, [level, phase, randomPiece])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== "playing") return

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          movePiece(-1, 0)
          break
        case "ArrowRight":
          e.preventDefault()
          movePiece(1, 0)
          break
        case "ArrowDown":
          e.preventDefault()
          movePiece(0, 1)
          break
        case "ArrowUp":
          e.preventDefault()
          rotatePiece()
          break
        case " ":
          e.preventDefault()
          hardDrop()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [phase, movePiece, rotatePiece, hardDrop])

  const startGame = () => {
    dispatch({
      type: "start",
      firstPiece: randomPiece(),
      nextPiece: randomPiece(),
    })
  }

  const getCellColor = (value: number): string => {
    if (value === 0) return "bg-slate-800"
    const type = TETROMINO_TYPES[value - 1]
    return TETROMINO_COLORS[type] ?? "bg-slate-800"
  }

  const displayBoard = getDisplayBoard(state)

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <GameHeader
        homeIcon="back"
        homeLabel={t("appName")}
        homeButtonClassName="text-slate-400 hover:text-white"
      />

      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-4">
        <h1 className="text-3xl font-bold text-white">{t("tetris")}</h1>

        <div className="flex gap-4">
          {/* Game Board */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardContent className="p-2">
              <div
                className="grid gap-[1px] rounded bg-slate-900 p-1"
                role="img"
                aria-label={`${t("tetris")}. ${t("score")}: ${score}. ${t("lines")}: ${lines}. ${t("level")}: ${level}.`}
                style={{
                  gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
                }}
              >
                {displayBoard.map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`${y}-${x}`}
                      className={`h-5 w-5 rounded-sm ${getCellColor(cell)} sm:h-6 sm:w-6`}
                      aria-hidden="true"
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Side Panel */}
          <div className="flex flex-col gap-4">
            {/* Next Piece */}
            <Card className="border-slate-700 bg-slate-800/50">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm text-slate-400">{t("nextPiece")}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <div className="grid h-16 w-16 place-items-center rounded bg-slate-900 p-2" role="img" aria-label={`${t("nextPiece")}: ${nextPiece}`}>
                  <div className="grid gap-[1px]">
                    {TETROMINO_SHAPES[nextPiece].map((row, y) => (
                      <div key={y} className="flex gap-[1px]">
                        {row.map((cell, x) => (
                          <div
                            key={x}
                            aria-hidden="true"
                            className={`h-3 w-3 rounded-sm ${
                              cell ? TETROMINO_COLORS[nextPiece] : "bg-transparent"
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="border-slate-700 bg-slate-800/50" role="status" aria-live="polite">
              <CardContent className="space-y-2 p-3">
                <div className="text-center">
                  <div className="text-xs text-slate-400">{t("score")}</div>
                  <div className="text-xl font-bold text-white">{score}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400">{t("lines")}</div>
                  <div className="text-lg font-semibold text-cyan-400">{lines}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-400">{t("level")}</div>
                  <div className="text-lg font-semibold text-green-400">{level}</div>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex flex-col gap-2">
              {phase === "idle" && (
                <Button onClick={startGame} className="gap-2 bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {t("start")}
                </Button>
              )}
              {phase === "playing" && (
                <Button
                  onClick={() => dispatch({ type: "pause" })}
                  variant="secondary"
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  {t("pause")}
                </Button>
              )}
              {phase === "paused" && (
                <Button
                  onClick={() => dispatch({ type: "resume" })}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  {t("resume")}
                </Button>
              )}
              {phase === "gameOver" && (
                <Button onClick={startGame} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {t("restart")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Game Over */}
        {phase === "gameOver" && (
          <div className="text-center" role="status" aria-live="assertive">
            <div className="text-2xl font-bold text-red-500">{t("gameOver")}</div>
            <div className="text-slate-400">
              {t("finalScore")}: {score}
            </div>
          </div>
        )}

        {/* Mobile Controls */}
        <div className="flex flex-col items-center gap-2 md:hidden">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={rotatePiece}
            aria-label={mobileLabels.rotate}
            disabled={phase !== "playing"}
          >
            <RotateCcw className="h-6 w-6" aria-hidden="true" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() => movePiece(-1, 0)}
              aria-label={mobileLabels.left}
              disabled={phase !== "playing"}
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={hardDrop}
              aria-label={mobileLabels.drop}
              disabled={phase !== "playing"}
            >
              <ChevronsDown className="h-6 w-6" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() => movePiece(1, 0)}
              aria-label={mobileLabels.right}
              disabled={phase !== "playing"}
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={() => movePiece(0, 1)}
            aria-label={mobileLabels.down}
            disabled={phase !== "playing"}
          >
            <ChevronDown className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-slate-500">
          <span className="hidden md:inline">{t("tetrisControls")}</span>
          <span className="md:hidden">{t("tetrisControlsMobile")}</span>
        </div>
      </main>
    </div>
  )
}
