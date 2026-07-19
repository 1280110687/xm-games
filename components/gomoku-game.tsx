"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { RotateCcw, Undo2 } from "lucide-react"

type Stone = "black" | "white" | null
type Board = Stone[][]

const BOARD_SIZE = 15

function createEmptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
}

function checkWin(board: Board, row: number, col: number, stone: Stone): boolean {
  if (!stone) return false

  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1],  // diagonal /
  ]

  for (const [dr, dc] of directions) {
    let count = 1

    // Count in positive direction
    for (let i = 1; i < 5; i++) {
      const nr = row + dr * i
      const nc = col + dc * i
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break
      if (board[nr][nc] !== stone) break
      count++
    }

    // Count in negative direction
    for (let i = 1; i < 5; i++) {
      const nr = row - dr * i
      const nc = col - dc * i
      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break
      if (board[nr][nc] !== stone) break
      count++
    }

    if (count >= 5) return true
  }

  return false
}

export function GomokuGame() {
  const { t, locale } = useLocale()
  const emptyLabel = locale === "zh" ? "空位" : locale === "th" ? "ช่องว่าง" : "empty"
  const [board, setBoard] = useState<Board>(createEmptyBoard)
  const [currentPlayer, setCurrentPlayer] = useState<"black" | "white">("black")
  const [winner, setWinner] = useState<"black" | "white" | null>(null)
  const [moveHistory, setMoveHistory] = useState<{ row: number; col: number; stone: Stone }[]>([])
  const [blackUndoUsed, setBlackUndoUsed] = useState(false)
  const [whiteUndoUsed, setWhiteUndoUsed] = useState(false)

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard())
    setCurrentPlayer("black")
    setWinner(null)
    setMoveHistory([])
    setBlackUndoUsed(false)
    setWhiteUndoUsed(false)
  }, [])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (winner) return
    if (board[row][col] !== null) return

    const newBoard = board.map(r => [...r])
    newBoard[row][col] = currentPlayer
    setBoard(newBoard)
    setMoveHistory(prev => [...prev, { row, col, stone: currentPlayer }])

    if (checkWin(newBoard, row, col, currentPlayer)) {
      setWinner(currentPlayer)
    } else {
      setCurrentPlayer(currentPlayer === "black" ? "white" : "black")
    }
  }, [board, currentPlayer, winner])

  const handleUndo = useCallback(() => {
    if (moveHistory.length === 0) return
    if (winner) return

    const lastMove = moveHistory[moveHistory.length - 1]
    const undoingPlayer = lastMove.stone

    if (undoingPlayer === "black" && blackUndoUsed) return
    if (undoingPlayer === "white" && whiteUndoUsed) return

    const newBoard = board.map(r => [...r])
    newBoard[lastMove.row][lastMove.col] = null
    setBoard(newBoard)
    setMoveHistory(prev => prev.slice(0, -1))
    setCurrentPlayer(undoingPlayer!)

    if (undoingPlayer === "black") setBlackUndoUsed(true)
    else setWhiteUndoUsed(true)
  }, [moveHistory, board, winner, blackUndoUsed, whiteUndoUsed])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900 p-4">
      <GameHeader
        homeLabel={t("appName")}
        homeButtonClassName="text-amber-200 hover:text-white"
      />

      <main className="flex flex-1 flex-col items-center gap-4 py-4">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{t("gomoku")}</h1>

        {/* Game status */}
        <Card className="border-amber-600 bg-amber-800/50 px-4 py-2" role="status" aria-live="polite">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-5 w-5 rounded-full ${currentPlayer === "black" ? "bg-slate-900 ring-2 ring-yellow-400" : "bg-slate-900"}`} />
              <span className={`text-sm ${currentPlayer === "black" ? "text-yellow-300" : "text-amber-200/50"}`}>
                {t("blackStone")}
              </span>
            </div>
            <div className="h-4 w-px bg-amber-600" />
            <div className="flex items-center gap-2">
              <div className={`h-5 w-5 rounded-full ${currentPlayer === "white" ? "bg-white ring-2 ring-yellow-400" : "bg-white"}`} />
              <span className={`text-sm ${currentPlayer === "white" ? "text-yellow-300" : "text-amber-200/50"}`}>
                {t("whiteStone")}
              </span>
            </div>
          </div>
        </Card>

        {winner && (
          <div className="rounded-lg bg-yellow-500/20 px-4 py-2 text-lg font-bold text-yellow-300" role="status" aria-live="assertive">
            {winner === "black" ? t("blackWinsGo") : t("whiteWinsGo")}
          </div>
        )}

        {/* Undo status */}
        <div className="flex items-center gap-4 text-xs text-amber-200/70">
          <span>{t("blackStone")}: {blackUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
          <span>{t("whiteStone")}: {whiteUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
        </div>

        {/* Game board */}
        <div 
          className="relative rounded-lg bg-amber-600 p-2"
          style={{ 
            width: `${BOARD_SIZE * 24 + 16}px`,
            height: `${BOARD_SIZE * 24 + 16}px`,
          }}
        >
          {/* Grid lines */}
          <svg 
            className="absolute inset-2"
            aria-hidden="true"
            focusable="false"
            width={BOARD_SIZE * 24 - 24}
            height={BOARD_SIZE * 24 - 24}
            style={{ left: "20px", top: "20px" }}
          >
            {Array.from({ length: BOARD_SIZE }).map((_, i) => (
              <g key={i}>
                <line
                  x1={0}
                  y1={i * 24}
                  x2={(BOARD_SIZE - 1) * 24}
                  y2={i * 24}
                  stroke="#8B4513"
                  strokeWidth="1"
                />
                <line
                  x1={i * 24}
                  y1={0}
                  x2={i * 24}
                  y2={(BOARD_SIZE - 1) * 24}
                  stroke="#8B4513"
                  strokeWidth="1"
                />
              </g>
            ))}
            {/* Star points */}
            {[[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]].map(([r, c]) => (
              <circle key={`${r}-${c}`} cx={c * 24} cy={r * 24} r={3} fill="#8B4513" />
            ))}
          </svg>

          {/* Stones */}
          <div 
            className="relative grid"
            role="group"
            aria-label={t("gomoku")}
            style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 24px)` }}
          >
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  className="flex h-6 w-6 items-center justify-center"
                  disabled={!!winner || cell !== null}
                  aria-label={`${rowIndex + 1}, ${colIndex + 1}, ${cell === "black" ? t("blackStone") : cell === "white" ? t("whiteStone") : emptyLabel}`}
                >
                  {cell && (
                    <div
                      aria-hidden="true"
                      className={`h-5 w-5 rounded-full shadow-md ${
                        cell === "black"
                          ? "bg-gradient-to-br from-slate-700 to-slate-900"
                          : "bg-gradient-to-br from-white to-slate-200"
                      }`}
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            onClick={handleUndo}
            variant="outline"
            disabled={
              moveHistory.length === 0 ||
              !!winner ||
              (moveHistory.length > 0 && moveHistory[moveHistory.length - 1].stone === "black" && blackUndoUsed) ||
              (moveHistory.length > 0 && moveHistory[moveHistory.length - 1].stone === "white" && whiteUndoUsed)
            }
            className="border-amber-600 bg-amber-800/50 text-amber-100 hover:bg-amber-700 disabled:opacity-50"
          >
            <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("undo")}
          </Button>
          <Button
            onClick={resetGame}
            variant="outline"
            className="border-amber-600 bg-amber-800/50 text-amber-100 hover:bg-amber-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("restart")}
          </Button>
          <GameRulesDialog
            triggerLabel={t("howToPlay")}
            closeLabel={t("close")}
            triggerClassName="border-amber-600 bg-amber-800/50 text-amber-100 hover:bg-amber-700"
            contentClassName="border-amber-600 bg-amber-800 p-4 text-white sm:p-6"
            titleClassName="text-lg font-bold text-white"
            closeButtonClassName="text-amber-200 hover:text-white"
          >
            <ul className="space-y-2 text-sm text-amber-100">
              <li>{t("gomokuRule1")}</li>
              <li>{t("gomokuRule2")}</li>
              <li>{t("gomokuRule3")}</li>
            </ul>
          </GameRulesDialog>
        </div>

        <p className="max-w-md text-center text-xs text-amber-200/70">
          {t("gomokuInstructions")}
        </p>

      </main>
    </div>
  )
}
