"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { RotateCcw } from "lucide-react"

type Stone = "black" | "white" | null
type Board = Stone[][]

const BOARD_SIZE = 8
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
]

function createInitialBoard(): Board {
  const board: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  // Initial 4 pieces in center
  board[3][3] = "white"
  board[3][4] = "black"
  board[4][3] = "black"
  board[4][4] = "white"
  return board
}

function getFlippableStones(board: Board, row: number, col: number, player: "black" | "white"): [number, number][] {
  if (board[row][col] !== null) return []

  const opponent = player === "black" ? "white" : "black"
  const allFlippable: [number, number][] = []

  for (const [dr, dc] of DIRECTIONS) {
    const flippable: [number, number][] = []
    let r = row + dr
    let c = col + dc

    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === opponent) {
      flippable.push([r, c])
      r += dr
      c += dc
    }

    if (flippable.length > 0 && r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
      allFlippable.push(...flippable)
    }
  }

  return allFlippable
}

function getValidMoves(board: Board, player: "black" | "white"): [number, number][] {
  const moves: [number, number][] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (getFlippableStones(board, r, c, player).length > 0) {
        moves.push([r, c])
      }
    }
  }
  return moves
}

function countStones(board: Board): { black: number; white: number } {
  let black = 0
  let white = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell === "black") black++
      else if (cell === "white") white++
    }
  }
  return { black, white }
}

export function ReversiGame() {
  const { t, locale } = useLocale()
  const emptyLabel = locale === "zh" ? "空位" : locale === "th" ? "ช่องว่าง" : "empty"
  const validLabel = locale === "zh" ? "可落子" : locale === "th" ? "ลงหมากได้" : "valid move"
  const [board, setBoard] = useState<Board>(createInitialBoard)
  const [currentPlayer, setCurrentPlayer] = useState<"black" | "white">("black")
  const [validMoves, setValidMoves] = useState<[number, number][]>([])
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState<"black" | "white" | "tie" | null>(null)
  const [passCount, setPassCount] = useState(0)

  useEffect(() => {
    const moves = getValidMoves(board, currentPlayer)
    setValidMoves(moves)

    if (moves.length === 0) {
      // Check if opponent can move
      const opponentMoves = getValidMoves(board, currentPlayer === "black" ? "white" : "black")
      if (opponentMoves.length === 0 || passCount >= 1) {
        // Game over
        const { black, white } = countStones(board)
        setGameOver(true)
        if (black > white) setWinner("black")
        else if (white > black) setWinner("white")
        else setWinner("tie")
      } else {
        // Pass turn
        setCurrentPlayer(currentPlayer === "black" ? "white" : "black")
        setPassCount(p => p + 1)
      }
    } else {
      setPassCount(0)
    }
  }, [board, currentPlayer, passCount])

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard())
    setCurrentPlayer("black")
    setValidMoves([])
    setGameOver(false)
    setWinner(null)
    setPassCount(0)
  }, [])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameOver) return
    
    const flippable = getFlippableStones(board, row, col, currentPlayer)
    if (flippable.length === 0) return

    const newBoard = board.map(r => [...r])
    newBoard[row][col] = currentPlayer
    for (const [r, c] of flippable) {
      newBoard[r][c] = currentPlayer
    }
    setBoard(newBoard)
    setCurrentPlayer(currentPlayer === "black" ? "white" : "black")
  }, [board, currentPlayer, gameOver])

  const isValidMove = (row: number, col: number) => {
    return validMoves.some(([r, c]) => r === row && c === col)
  }

  const { black: blackCount, white: whiteCount } = countStones(board)

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 p-4">
      <GameHeader
        homeLabel={t("appName")}
        homeButtonClassName="text-green-200 hover:text-white"
      />

      <main className="flex flex-1 flex-col items-center gap-4 py-4">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{t("reversi")}</h1>

        {/* Game status */}
        <Card className="border-green-600 bg-green-800/50 px-4 py-2" role="status" aria-live="polite">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${currentPlayer === "black" ? "ring-2 ring-yellow-400" : ""} bg-slate-900`}>
                <span className="text-xs font-bold text-white">{blackCount}</span>
              </div>
              <span className={`text-sm ${currentPlayer === "black" ? "text-yellow-300" : "text-green-200/50"}`}>
                {t("blackStone")}
              </span>
            </div>
            <div className="h-4 w-px bg-green-600" />
            <div className="flex items-center gap-2">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${currentPlayer === "white" ? "ring-2 ring-yellow-400" : ""} bg-white`}>
                <span className="text-xs font-bold text-slate-900">{whiteCount}</span>
              </div>
              <span className={`text-sm ${currentPlayer === "white" ? "text-yellow-300" : "text-green-200/50"}`}>
                {t("whiteStone")}
              </span>
            </div>
          </div>
        </Card>

        {gameOver && (
          <div className="rounded-lg bg-yellow-500/20 px-4 py-2 text-lg font-bold text-yellow-300" role="status" aria-live="assertive">
            {winner === "tie" 
              ? t("tie") 
              : winner === "black" 
                ? t("blackWinsGo") 
                : t("whiteWinsGo")
            }
          </div>
        )}

        {/* Game board */}
        <div className="rounded-lg border-4 border-green-700 bg-green-600 p-1">
          <div className="grid grid-cols-8 gap-px bg-green-800" role="group" aria-label={t("reversi")}>
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isValid = isValidMove(rowIndex, colIndex)
                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    disabled={gameOver || !isValid}
                    aria-label={`${rowIndex + 1}, ${colIndex + 1}, ${cell === "black" ? t("blackStone") : cell === "white" ? t("whiteStone") : emptyLabel}${isValid ? `, ${validLabel}` : ""}`}
                    className={`
                      flex h-9 w-9 items-center justify-center bg-green-600
                      sm:h-11 sm:w-11
                      ${isValid ? "cursor-pointer" : "cursor-default"}
                    `}
                  >
                    {cell ? (
                      <div
                        aria-hidden="true"
                        className={`h-7 w-7 rounded-full shadow-md transition-all sm:h-9 sm:w-9 ${
                          cell === "black"
                            ? "bg-gradient-to-br from-slate-700 to-slate-900"
                            : "bg-gradient-to-br from-white to-slate-200"
                        }`}
                      />
                    ) : isValid ? (
                      <div className="h-3 w-3 rounded-full bg-green-400/50" aria-hidden="true" />
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={resetGame}
            variant="outline"
            className="border-green-600 bg-green-800/50 text-green-100 hover:bg-green-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("restart")}
          </Button>
          <GameRulesDialog
            triggerLabel={t("howToPlay")}
            closeLabel={t("close")}
            triggerClassName="border-green-600 bg-green-800/50 text-green-100 hover:bg-green-700"
            contentClassName="border-green-600 bg-green-800 p-4 text-white sm:p-6"
            titleClassName="text-lg font-bold text-white"
            closeButtonClassName="text-green-200 hover:text-white"
          >
            <ul className="space-y-2 text-sm text-green-100">
              <li>{t("reversiRule1")}</li>
              <li>{t("reversiRule2")}</li>
              <li>{t("reversiRule3")}</li>
              <li>{t("reversiRule4")}</li>
            </ul>
          </GameRulesDialog>
        </div>

        <p className="max-w-md text-center text-xs text-green-200/70">
          {t("reversiInstructions")}
        </p>

      </main>
    </div>
  )
}
