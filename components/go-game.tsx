"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import {
  calculateTerritory,
  countLiberties,
  createEmptyBoard,
  getAdjacentPositions,
  getGroup,
  isBoardSame,
  removeGroup,
  type Position,
  type Stone,
} from "@/features/go/engine"
import { useLocale } from "@/lib/locale-context"
import { RotateCcw, Undo2, Flag } from "lucide-react"

const BOARD_SIZE = 9 // 9x9 for beginners, can be 13x13 or 19x19

type GoHistoryEntry = {
  board: Stone[][]
  captures: { black: number; white: number }
  previousBoard: Stone[][] | null
  passCount: number
  lastMove: Position | null
}

function cloneBoard(board: Stone[][]): Stone[][] {
  return board.map((row) => [...row])
}

export function GoGame() {
  const { t } = useLocale()

  const [board, setBoard] = useState<Stone[][]>(() => createEmptyBoard(BOARD_SIZE))
  const [currentTurn, setCurrentTurn] = useState<"black" | "white">("black")
  const [history, setHistory] = useState<GoHistoryEntry[]>([])
  const [captures, setCaptures] = useState({ black: 0, white: 0 })
  const [previousBoard, setPreviousBoard] = useState<Stone[][] | null>(null)
  const [gameStatus, setGameStatus] = useState<"playing" | "ended">("playing")
  const [passCount, setPassCount] = useState(0)
  const [lastMove, setLastMove] = useState<Position | null>(null)
  const [blackUndoUsed, setBlackUndoUsed] = useState(false)
  const [whiteUndoUsed, setWhiteUndoUsed] = useState(false)

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard(BOARD_SIZE))
    setCurrentTurn("black")
    setHistory([])
    setCaptures({ black: 0, white: 0 })
    setPreviousBoard(null)
    setGameStatus("playing")
    setPassCount(0)
    setLastMove(null)
    setBlackUndoUsed(false)
    setWhiteUndoUsed(false)
  }, [])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameStatus !== "playing") return
    if (board[row][col] !== null) return

    // Try placing the stone
    const newBoard = board.map(r => [...r])
    newBoard[row][col] = currentTurn

    // Check for captures
    const newCaptures = { ...captures }
    const opponent = currentTurn === "black" ? "white" : "black"
    
    // Check adjacent opponent groups for capture
    for (const adj of getAdjacentPositions(newBoard, row, col)) {
      if (newBoard[adj.row][adj.col] === opponent) {
        const group = getGroup(newBoard, adj.row, adj.col)
        if (countLiberties(newBoard, group) === 0) {
          newBoard[row][col] = currentTurn
          const capturedBoard = removeGroup(newBoard, group)
          newCaptures[currentTurn] += group.length
          for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
              newBoard[i][j] = capturedBoard[i][j]
            }
          }
        }
      }
    }

    // Check if our own group has liberties (suicide rule)
    const ownGroup = getGroup(newBoard, row, col)
    if (countLiberties(newBoard, ownGroup) === 0) {
      return // Suicide not allowed
    }

    // Check Ko rule
    if (previousBoard && isBoardSame(newBoard, previousBoard)) {
      return // Ko violation
    }

    // Save history for undo
    setHistory((previous) => [...previous, {
      board: cloneBoard(board),
      captures: { ...captures },
      previousBoard: previousBoard ? cloneBoard(previousBoard) : null,
      passCount,
      lastMove,
    }])
    setPreviousBoard(cloneBoard(board))
    setBoard(newBoard)
    setCaptures(newCaptures)
    setCurrentTurn(opponent)
    setPassCount(0)
    setLastMove({ row, col })
  }, [board, currentTurn, gameStatus, captures, previousBoard, passCount, lastMove])

  const handlePass = useCallback(() => {
    if (gameStatus !== "playing") return

    setHistory((previous) => [...previous, {
      board: cloneBoard(board),
      captures: { ...captures },
      previousBoard: previousBoard ? cloneBoard(previousBoard) : null,
      passCount,
      lastMove,
    }])
    // A pass is an intervening move, so the simple-ko comparison advances to
    // the current position and no longer blocks a later recapture.
    setPreviousBoard(cloneBoard(board))
    
    const newPassCount = passCount + 1
    setPassCount(newPassCount)
    setCurrentTurn(currentTurn === "black" ? "white" : "black")
    setLastMove(null)

    // Two consecutive passes end the game
    if (newPassCount >= 2) {
      setGameStatus("ended")
    }
  }, [gameStatus, passCount, currentTurn, board, captures, previousBoard, lastMove])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    if (gameStatus === "ended") return

    // Check who made the last move
    const undoingPlayer = currentTurn === "black" ? "white" : "black"
    if (undoingPlayer === "black" && blackUndoUsed) return
    if (undoingPlayer === "white" && whiteUndoUsed) return

    const lastState = history[history.length - 1]
    setBoard(lastState.board)
    setCaptures(lastState.captures)
    setPreviousBoard(lastState.previousBoard)
    setHistory(prev => prev.slice(0, -1))
    setCurrentTurn(undoingPlayer)
    setPassCount(lastState.passCount)
    setLastMove(lastState.lastMove)

    if (undoingPlayer === "black") {
      setBlackUndoUsed(true)
    } else {
      setWhiteUndoUsed(true)
    }
  }, [history, gameStatus, currentTurn, blackUndoUsed, whiteUndoUsed])

  // Calculate final score
  const territory = gameStatus === "ended" ? calculateTerritory(board) : { black: 0, white: 0 }
  const blackTotal = captures.black + territory.black
  const whiteTotal = captures.white + territory.white + 6.5 // Komi (compensation for white)

  // Star points for 9x9 board
  const starPoints = [
    { row: 2, col: 2 }, { row: 2, col: 6 },
    { row: 4, col: 4 },
    { row: 6, col: 2 }, { row: 6, col: 6 }
  ]

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 p-4">
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        title={t("go")}
        className="mb-4 w-full max-w-lg"
        homeButtonClassName="text-amber-100 hover:bg-amber-700"
        titleClassName="text-xl font-bold text-amber-100 sm:text-2xl"
      />

      {/* Game Status */}
      <Card className="mb-4 w-full max-w-lg border-amber-600 bg-amber-800/50 p-3" role="status" aria-live="polite">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-5 w-5 rounded-full border-2 ${currentTurn === "black" ? "border-amber-300 bg-slate-900" : "border-transparent bg-slate-800"}`} />
              <span className={`text-sm ${currentTurn === "black" ? "text-amber-100" : "text-amber-100/50"}`}>
                {t("blackStone")} ({captures.black})
              </span>
            </div>
            <div className="h-4 w-px bg-amber-600" />
            <div className="flex items-center gap-2">
              <div className={`h-5 w-5 rounded-full border-2 ${currentTurn === "white" ? "border-amber-300 bg-amber-50" : "border-transparent bg-amber-100/70"}`} />
              <span className={`text-sm ${currentTurn === "white" ? "text-amber-100" : "text-amber-100/50"}`}>
                {t("whiteStone")} ({captures.white})
              </span>
            </div>
          </div>

          {gameStatus === "ended" && (
            <div className="mt-2 text-center">
              <p className="text-sm text-amber-200">
                {t("blackStone")}: {blackTotal.toFixed(1)} | {t("whiteStone")}: {whiteTotal.toFixed(1)}
              </p>
              <p className="text-lg font-bold text-amber-100">
                {blackTotal > whiteTotal ? t("blackWinsGo") : t("whiteWinsGo")}
              </p>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="text-slate-300">
              {blackUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}
            </span>
            <div className="h-3 w-px bg-amber-600/50" />
            <span className="text-amber-200">
              {whiteUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}
            </span>
          </div>
        </div>
      </Card>

      {/* Board */}
      <div 
        className="relative rounded-lg border-4 border-amber-700 bg-[#dcb35c] p-3 shadow-xl"
        style={{
          width: `${BOARD_SIZE * 32 + 24}px`,
          height: `${BOARD_SIZE * 32 + 24}px`,
        }}
      >
        {/* Grid lines */}
        <svg
          className="absolute"
          aria-hidden="true"
          focusable="false"
          style={{
            left: "12px",
            top: "12px",
            width: `${(BOARD_SIZE - 1) * 32}px`,
            height: `${(BOARD_SIZE - 1) * 32}px`,
          }}
          viewBox={`0 0 ${(BOARD_SIZE - 1) * 32} ${(BOARD_SIZE - 1) * 32}`}
        >
          {/* Horizontal lines */}
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i * 32}
              x2={(BOARD_SIZE - 1) * 32}
              y2={i * 32}
              stroke="#5a4a2a"
              strokeWidth="1"
            />
          ))}
          {/* Vertical lines */}
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <line
              key={`v-${i}`}
              x1={i * 32}
              y1={0}
              x2={i * 32}
              y2={(BOARD_SIZE - 1) * 32}
              stroke="#5a4a2a"
              strokeWidth="1"
            />
          ))}
          {/* Star points */}
          {starPoints.map((point, i) => (
            <circle
              key={`star-${i}`}
              cx={point.col * 32}
              cy={point.row * 32}
              r={4}
              fill="#5a4a2a"
            />
          ))}
        </svg>

        {/* Stones */}
        <div
          className="relative"
          role="group"
          aria-label={t("go")}
          style={{ width: `${(BOARD_SIZE - 1) * 32}px`, height: `${(BOARD_SIZE - 1) * 32}px` }}
        >
          {board.map((row, rowIndex) =>
            row.map((stone, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                aria-label={`${rowIndex + 1}, ${colIndex + 1}, ${stone === "black" ? t("blackStone") : stone === "white" ? t("whiteStone") : "empty"}`}
                aria-current={lastMove?.row === rowIndex && lastMove?.col === colIndex ? "true" : undefined}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${colIndex * 32 - 16}px`,
                  top: `${rowIndex * 32 - 16}px`,
                  width: "32px",
                  height: "32px",
                }}
              >
                {/* Last move indicator */}
                {lastMove?.row === rowIndex && lastMove?.col === colIndex && (
                  <div className="absolute h-3 w-3 rounded-full bg-red-500/70" style={{ zIndex: 10 }} aria-hidden="true" />
                )}
                
                {/* Stone */}
                {stone && (
                  <div
                    aria-hidden="true"
                    className={`h-7 w-7 rounded-full shadow-lg ${
                      stone === "black"
                        ? "bg-gradient-to-br from-slate-700 to-slate-900"
                        : "bg-gradient-to-br from-amber-50 to-amber-200 border border-amber-300"
                    }`}
                  />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          onClick={handlePass}
          disabled={gameStatus === "ended"}
          className="bg-amber-600 text-white hover:bg-amber-500"
        >
          <Flag className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("pass")}
        </Button>
        <Button
          onClick={handleUndo}
          disabled={history.length === 0 || gameStatus === "ended" ||
            (currentTurn === "black" && whiteUndoUsed) ||
            (currentTurn === "white" && blackUndoUsed)
          }
          variant="outline"
          className="border-amber-600 bg-amber-800/50 text-amber-100 hover:bg-amber-700"
        >
          <Undo2 className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("undo")}
        </Button>
        <Button
          onClick={resetGame}
          variant="outline"
          className="border-amber-600 bg-amber-800/50 text-amber-100 hover:bg-amber-700"
        >
          <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("restart")}
        </Button>
        <GameRulesDialog
          triggerLabel={t("howToPlay")}
          closeLabel={t("close")}
          triggerClassName="border-amber-600 bg-amber-800/50 text-amber-100 hover:bg-amber-700"
          triggerIconClassName="mr-1"
          contentClassName="border-amber-600 bg-amber-900/95 p-4 text-amber-100"
          titleClassName="text-lg font-bold text-amber-100"
          closeButtonClassName="text-amber-100 hover:bg-amber-800"
        >
          <div className="space-y-3 text-sm text-amber-100/90">
            <p>{t("goRule1")}</p>
            <p>{t("goRule2")}</p>
            <p>{t("goRule3")}</p>
            <p>{t("goRule4")}</p>
            <p>{t("goRule5")}</p>
          </div>
        </GameRulesDialog>
      </div>

      {/* Instructions */}
      <p className="mt-4 max-w-md text-center text-xs text-amber-200/70">
        {t("goInstructions")}
      </p>

    </div>
  )
}
