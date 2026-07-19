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
    <div className="game-page">
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        homeLabelMode="desktop"
        title={t("go")}
        className="mb-4"
        homeButtonClassName="text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        titleClassName="text-base font-bold text-foreground sm:text-2xl"
      />

      <main className="flex flex-1 flex-col items-center gap-4 py-2 sm:py-4">
        {/* Game Status */}
        <Card className="surface-panel w-full max-w-lg border-white/10 bg-card/70 p-3" role="status" aria-live="polite">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`h-5 w-5 rounded-full border-2 ${currentTurn === "black" ? "border-primary bg-slate-950" : "border-transparent bg-slate-800"}`} />
                <span className={`text-sm ${currentTurn === "black" ? "text-foreground" : "text-muted-foreground"}`}>
                  {t("blackStone")} ({captures.black})
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className={`h-5 w-5 rounded-full border-2 ${currentTurn === "white" ? "border-primary bg-stone-50" : "border-transparent bg-stone-300"}`} />
                <span className={`text-sm ${currentTurn === "white" ? "text-foreground" : "text-muted-foreground"}`}>
                  {t("whiteStone")} ({captures.white})
                </span>
              </div>
            </div>

            {gameStatus === "ended" && (
              <div className="mt-2 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("blackStone")}: {blackTotal.toFixed(1)} | {t("whiteStone")}: {whiteTotal.toFixed(1)}
                </p>
                <p className="text-lg font-bold text-foreground">
                  {blackTotal > whiteTotal ? t("blackWinsGo") : t("whiteWinsGo")}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>{blackUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
              <div className="h-3 w-px bg-border" />
              <span>{whiteUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
            </div>
          </div>
        </Card>

        {/* Board */}
        <div className="relative aspect-square w-full max-w-[19.5rem] rounded-xl border-4 border-amber-800 bg-[#dcb35c] p-3 shadow-2xl shadow-black/30">
        {/* Grid lines */}
        <svg
          className="absolute"
          aria-hidden="true"
          focusable="false"
          style={{
            left: "12px",
            top: "12px",
            width: "calc(100% - 24px)",
            height: "calc(100% - 24px)",
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
          className="relative h-full w-full"
          role="group"
          aria-label={t("go")}
        >
          {board.map((row, rowIndex) =>
            row.map((stone, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                aria-label={`${rowIndex + 1}, ${colIndex + 1}, ${stone === "black" ? t("blackStone") : stone === "white" ? t("whiteStone") : "empty"}`}
                aria-current={lastMove?.row === rowIndex && lastMove?.col === colIndex ? "true" : undefined}
                className="absolute flex aspect-square w-[11.111%] -translate-x-1/2 -translate-y-1/2 items-center justify-center touch-manipulation"
                style={{
                  left: `${(colIndex / (BOARD_SIZE - 1)) * 100}%`,
                  top: `${(rowIndex / (BOARD_SIZE - 1)) * 100}%`,
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
                    className={`h-[87.5%] w-[87.5%] rounded-full shadow-lg ${
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
        <div className="flex flex-wrap justify-center gap-2">
        <Button
          onClick={handlePass}
          disabled={gameStatus === "ended"}
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
        >
          <Undo2 className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("undo")}
        </Button>
        <Button
          onClick={resetGame}
          variant="outline"
        >
          <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("restart")}
        </Button>
        <GameRulesDialog
          triggerLabel={t("howToPlay")}
          closeLabel={t("close")}
          triggerIconClassName="mr-1"
          titleClassName="text-lg font-bold text-foreground"
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>{t("goRule1")}</p>
            <p>{t("goRule2")}</p>
            <p>{t("goRule3")}</p>
            <p>{t("goRule4")}</p>
            <p>{t("goRule5")}</p>
          </div>
        </GameRulesDialog>
        </div>

        {/* Instructions */}
        <p className="max-w-md text-center text-xs text-muted-foreground">
          {t("goInstructions")}
        </p>
      </main>

    </div>
  )
}
