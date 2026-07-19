"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import {
  countFlags,
  createEmptyBoard,
  hasWon,
  populateMines,
  revealAllMines,
  revealCells,
  toggleFlag,
  type MinesweeperBoard,
} from "@/features/minesweeper/engine"
import { RotateCcw, Flag, Bomb, Eye } from "lucide-react"

type GameStatus = "playing" | "won" | "lost"
type Difficulty = "easy" | "medium" | "hard"
type InputMode = "reveal" | "flag"

const DIFFICULTIES = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
}

const accessibleText = {
  zh: {
    revealMode: "翻开模式",
    flagMode: "插旗模式",
    modeHelp: "触屏操作：先选择翻开或插旗模式，再点击格子。电脑仍可右键插旗。",
    row: "行",
    column: "列",
    hidden: "未翻开",
    flagged: "已插旗",
    mine: "地雷",
    empty: "空白",
    adjacent: "相邻地雷",
  },
  en: {
    revealMode: "Reveal mode",
    flagMode: "Flag mode",
    modeHelp: "Touch controls: choose reveal or flag mode, then tap a cell. Right-click still places a flag.",
    row: "row",
    column: "column",
    hidden: "hidden",
    flagged: "flagged",
    mine: "mine",
    empty: "empty",
    adjacent: "adjacent mines",
  },
  th: {
    revealMode: "โหมดเปิดช่อง",
    flagMode: "โหมดปักธง",
    modeHelp: "บนหน้าจอสัมผัส ให้เลือกโหมดเปิดช่องหรือปักธงแล้วแตะช่อง และยังคลิกขวาเพื่อปักธงได้",
    row: "แถว",
    column: "คอลัมน์",
    hidden: "ยังไม่เปิด",
    flagged: "ปักธงแล้ว",
    mine: "กับระเบิด",
    empty: "ว่าง",
    adjacent: "กับระเบิดรอบข้าง",
  },
} as const

export function MinesweeperGame() {
  const { t, locale } = useLocale()
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")
  const [board, setBoard] = useState<MinesweeperBoard>([])
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing")
  const [firstClick, setFirstClick] = useState(true)
  const [timer, setTimer] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>("reveal")

  const a11y = accessibleText[locale]

  const { rows, cols, mines } = DIFFICULTIES[difficulty]
  const flagCount = countFlags(board)

  const initGame = useCallback(() => {
    setBoard(createEmptyBoard(rows, cols))
    setGameStatus("playing")
    setFirstClick(true)
    setTimer(0)
    setTimerActive(false)
    setInputMode("reveal")
  }, [rows, cols])

  useEffect(() => {
    initGame()
  }, [initGame])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerActive && gameStatus === "playing") {
      interval = setInterval(() => {
        setTimer(t => t + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerActive, gameStatus])

  const revealCell = useCallback((row: number, col: number) => {
    if (gameStatus !== "playing") return
    if (board[row]?.[col]?.isFlagged) return

    let currentBoard = board

    if (firstClick) {
      currentBoard = populateMines(board, mines, { row, col })
      setFirstClick(false)
      setTimerActive(true)
    }

    if (currentBoard[row][col].isMine) {
      // Game over - reveal all mines
      const newBoard = revealAllMines(currentBoard)
      setBoard(newBoard)
      setGameStatus("lost")
      setTimerActive(false)
      return
    }

    const newBoard = revealCells(currentBoard, row, col)
    setBoard(newBoard)

    // Check win condition
    if (hasWon(newBoard)) {
      setGameStatus("won")
      setTimerActive(false)
    }
  }, [board, gameStatus, firstClick, mines])

  const flagCell = useCallback((row: number, col: number) => {
    if (gameStatus !== "playing" || board[row][col].isRevealed) return
    setBoard(toggleFlag(board, row, col))
  }, [board, gameStatus])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (inputMode === "flag") {
      flagCell(row, col)
      return
    }
    revealCell(row, col)
  }, [flagCell, inputMode, revealCell])

  const handleRightClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault()
    flagCell(row, col)
  }, [flagCell])

  const getCellLabel = (row: number, col: number) => {
    const cell = board[row][col]
    const position = `${a11y.row} ${row + 1}, ${a11y.column} ${col + 1}`
    if (!cell.isRevealed) {
      return `${position}, ${cell.isFlagged ? a11y.flagged : a11y.hidden}`
    }
    if (cell.isMine) return `${position}, ${a11y.mine}`
    if (cell.adjacentMines === 0) return `${position}, ${a11y.empty}`
    return `${position}, ${a11y.adjacent}: ${cell.adjacentMines}`
  }

  const getNumberColor = (num: number) => {
    const colors = [
      "", "text-blue-600", "text-green-600", "text-red-600",
      "text-purple-800", "text-red-800", "text-cyan-600",
      "text-black", "text-gray-600"
    ]
    return colors[num] || ""
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <GameHeader
        homeLabel={t("appName")}
        homeButtonClassName="text-slate-400 hover:text-white"
      />

      <main className="flex flex-1 flex-col items-center gap-4 py-4">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{t("minesweeper")}</h1>

        {/* Difficulty selector */}
        <div className="flex gap-2">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <Button
              key={d}
              variant={difficulty === d ? "default" : "outline"}
              size="sm"
              onClick={() => { setDifficulty(d) }}
              aria-pressed={difficulty === d}
              className={difficulty === d 
                ? "bg-slate-600" 
                : "border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700"
              }
            >
              {t(d === "easy" ? "easy" : d === "medium" ? "medium" : "hard")}
            </Button>
          ))}
        </div>

        {/* Game stats */}
        <Card
          className="flex items-center gap-6 border-slate-700 bg-slate-800/50 px-4 py-2"
          aria-label={`${t("minesweeper")}: ${mines - flagCount}; ${formatTime(timer)}; ${flagCount}`}
        >
          <div className="flex items-center gap-2">
            <Bomb className="h-4 w-4 text-red-400" aria-hidden="true" />
            <span className="font-mono text-lg text-white">{mines - flagCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg text-white">{formatTime(timer)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-yellow-400" aria-hidden="true" />
            <span className="font-mono text-lg text-white">{flagCount}</span>
          </div>
        </Card>

        {/* Game status */}
        {gameStatus !== "playing" && (
          <div role="status" aria-live="polite" className={`rounded-lg px-4 py-2 text-lg font-bold ${
            gameStatus === "won" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          }`}>
            {gameStatus === "won" ? t("youWin") : t("gameOver")}
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2" role="group" aria-label={a11y.modeHelp}>
            <Button
              type="button"
              size="sm"
              variant={inputMode === "reveal" ? "default" : "outline"}
              aria-pressed={inputMode === "reveal"}
              onClick={() => setInputMode("reveal")}
              className={inputMode === "reveal" ? "bg-slate-600" : "border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700"}
            >
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              {a11y.revealMode}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={inputMode === "flag" ? "default" : "outline"}
              aria-pressed={inputMode === "flag"}
              onClick={() => setInputMode("flag")}
              className={inputMode === "flag" ? "bg-slate-600" : "border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700"}
            >
              <Flag className="mr-2 h-4 w-4" aria-hidden="true" />
              {a11y.flagMode}
            </Button>
          </div>
          <p className="max-w-md text-center text-xs text-slate-400">{a11y.modeHelp}</p>
        </div>

        {/* Game board */}
        <div 
          className="overflow-auto rounded-lg border-2 border-slate-600 bg-slate-300 p-1"
          style={{ maxWidth: "100%", maxHeight: "60vh" }}
        >
          <div 
            className="grid gap-px"
            role="group"
            aria-label={`${t("minesweeper")}, ${rows} × ${cols}`}
            style={{ 
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            }}
          >
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  onContextMenu={(e) => handleRightClick(e, rowIndex, colIndex)}
                  disabled={gameStatus !== "playing"}
                  aria-label={getCellLabel(rowIndex, colIndex)}
                  aria-pressed={cell.isFlagged}
                  className={`
                    flex items-center justify-center font-bold transition-all
                    ${difficulty === "hard" ? "h-5 w-5 text-xs sm:h-6 sm:w-6" : "h-7 w-7 text-sm sm:h-8 sm:w-8"}
                    ${cell.isRevealed
                      ? cell.isMine
                        ? "bg-red-500"
                        : "bg-slate-200"
                      : "bg-slate-400 hover:bg-slate-350 active:bg-slate-300 shadow-[inset_2px_2px_0_#94a3b8,inset_-2px_-2px_0_#475569]"
                    }
                  `}
                >
                  {cell.isRevealed ? (
                    cell.isMine ? (
                      <Bomb className="h-4 w-4 text-black" aria-hidden="true" />
                    ) : cell.adjacentMines > 0 ? (
                      <span className={getNumberColor(cell.adjacentMines)}>{cell.adjacentMines}</span>
                    ) : null
                  ) : cell.isFlagged ? (
                    <Flag className="h-4 w-4 text-red-600" aria-hidden="true" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={initGame}
            variant="outline"
            className="border-slate-600 bg-slate-800/50 text-slate-100 hover:bg-slate-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("restart")}
          </Button>
          <GameRulesDialog
            triggerLabel={t("howToPlay")}
            closeLabel={t("close")}
            triggerClassName="border-slate-600 bg-slate-800/50 text-slate-100 hover:bg-slate-700"
            contentClassName="border-slate-600 bg-slate-800 p-4 text-white sm:p-6"
            titleClassName="text-lg font-bold text-white"
            closeButtonClassName="text-slate-400 hover:text-white"
          >
            <ul className="space-y-2 text-sm text-slate-300">
              <li>{t("minesweeperRule1")}</li>
              <li>{t("minesweeperRule2")}</li>
              <li>{t("minesweeperRule3")}</li>
              <li>{t("minesweeperRule4")}</li>
            </ul>
          </GameRulesDialog>
        </div>

        <p className="max-w-md text-center text-xs text-slate-400">
          {t("minesweeperInstructions")}
        </p>

      </main>
    </div>
  )
}
