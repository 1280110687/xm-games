"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { shouldIgnoreGameKeyboardEvent } from "@/lib/game-keyboard"
import { RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

type Board = (number | null)[][]

function createEmptyBoard(): Board {
  return Array(4).fill(null).map(() => Array(4).fill(null))
}

function addRandomTile(board: Board): Board {
  const newBoard = board.map(row => [...row])
  const emptyCells: [number, number][] = []
  
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (newBoard[r][c] === null) {
        emptyCells.push([r, c])
      }
    }
  }
  
  if (emptyCells.length === 0) return newBoard
  
  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  newBoard[row][col] = Math.random() < 0.9 ? 2 : 4
  
  return newBoard
}

function createRandomBoard(): Board {
  let board = createEmptyBoard()
  board = addRandomTile(board)
  board = addRandomTile(board)
  return board
}

function createInitialBoard(): Board {
  const board = createEmptyBoard()
  board[1][1] = 2
  board[2][2] = 2
  return board
}

function slideRow(row: (number | null)[]): { newRow: (number | null)[]; score: number } {
  // Remove nulls
  const tiles = row.filter(x => x !== null) as number[]
  const newRow: (number | null)[] = []
  let score = 0
  
  let i = 0
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const merged = tiles[i] * 2
      newRow.push(merged)
      score += merged
      i += 2
    } else {
      newRow.push(tiles[i])
      i++
    }
  }
  
  while (newRow.length < 4) {
    newRow.push(null)
  }
  
  return { newRow, score }
}

function moveLeft(board: Board): { newBoard: Board; score: number; moved: boolean } {
  const newBoard: Board = []
  let totalScore = 0
  let moved = false
  
  for (let r = 0; r < 4; r++) {
    const { newRow, score } = slideRow(board[r])
    newBoard.push(newRow)
    totalScore += score
    if (JSON.stringify(newRow) !== JSON.stringify(board[r])) {
      moved = true
    }
  }
  
  return { newBoard, score: totalScore, moved }
}

function rotateBoard(board: Board): Board {
  const newBoard: Board = createEmptyBoard()
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      newBoard[c][3 - r] = board[r][c]
    }
  }
  return newBoard
}

function moveInDirection(board: Board, direction: "left" | "right" | "up" | "down"): { newBoard: Board; score: number; moved: boolean } {
  let rotated = board
  const rotations = { left: 0, up: 1, right: 2, down: 3 }
  
  for (let i = 0; i < rotations[direction]; i++) {
    rotated = rotateBoard(rotated)
  }
  
  const { newBoard, score, moved } = moveLeft(rotated)
  
  let result = newBoard
  for (let i = 0; i < (4 - rotations[direction]) % 4; i++) {
    result = rotateBoard(result)
  }
  
  return { newBoard: result, score, moved }
}

function canMove(board: Board): boolean {
  // Check for empty cells
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === null) return true
    }
  }
  
  // Check for adjacent equal cells
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const val = board[r][c]
      if (c < 3 && board[r][c + 1] === val) return true
      if (r < 3 && board[r + 1][c] === val) return true
    }
  }
  
  return false
}

function hasWon(board: Board): boolean {
  return board.some(row => row.some(cell => cell === 2048))
}

const TILE_COLORS: Record<number, string> = {
  2: "bg-amber-100 text-amber-900",
  4: "bg-amber-200 text-amber-900",
  8: "bg-orange-300 text-white",
  16: "bg-orange-400 text-white",
  32: "bg-orange-500 text-white",
  64: "bg-orange-600 text-white",
  128: "bg-yellow-400 text-white",
  256: "bg-yellow-500 text-white",
  512: "bg-yellow-600 text-white",
  1024: "bg-yellow-700 text-white",
  2048: "bg-yellow-500 text-white",
  4096: "bg-red-500 text-white",
  8192: "bg-red-600 text-white",
}

export function Game2048() {
  const { t, locale } = useLocale()
  const directionLabels = locale === "zh"
    ? { up: "向上移动", down: "向下移动", left: "向左移动", right: "向右移动", empty: "空白" }
    : locale === "th"
      ? { up: "เลื่อนขึ้น", down: "เลื่อนลง", left: "เลื่อนไปซ้าย", right: "เลื่อนไปขวา", empty: "ว่าง" }
      : { up: "Move up", down: "Move down", left: "Move left", right: "Move right", empty: "empty" }
  const [board, setBoard] = useState<Board>(createInitialBoard)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("2048-best")
    if (saved) setBestScore(parseInt(saved))
  }, [])

  const handleMove = useCallback((direction: "left" | "right" | "up" | "down") => {
    if (gameOver) return

    const { newBoard, score: addedScore, moved } = moveInDirection(board, direction)
    
    if (!moved) return
    
    const boardWithNewTile = addRandomTile(newBoard)
    setBoard(boardWithNewTile)
    
    const newScore = score + addedScore
    setScore(newScore)
    
    if (newScore > bestScore) {
      setBestScore(newScore)
      localStorage.setItem("2048-best", String(newScore))
    }
    
    if (hasWon(boardWithNewTile) && !won) {
      setWon(true)
    }
    
    if (!canMove(boardWithNewTile)) {
      setGameOver(true)
    }
  }, [board, score, bestScore, gameOver, won])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || shouldIgnoreGameKeyboardEvent(e)) return

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "W", "a", "A", "s", "S", "d", "D"].includes(e.key)) {
        e.preventDefault()
        const directionMap: Record<string, "left" | "right" | "up" | "down"> = {
          ArrowUp: "up", w: "up", W: "up",
          ArrowDown: "down", s: "down", S: "down",
          ArrowLeft: "left", a: "left", A: "left",
          ArrowRight: "right", d: "right", D: "right",
        }
        const direction = directionMap[e.key]
        if (direction) handleMove(direction)
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameOver, handleMove])

  const resetGame = () => {
    setBoard(createRandomBoard())
    setScore(0)
    setGameOver(false)
    setWon(false)
  }

  return (
    <div className="game-page" data-page="2048">
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        homeLabelMode="sr-only"
        title="2048"
        titleClassName="text-xl font-bold text-foreground sm:text-2xl"
        homeButtonClassName="text-muted-foreground hover:text-foreground"
      />

      <main
        className="game-content flex flex-1 flex-col items-center gap-4 py-4"
        data-slot="game-content"
      >
        {/* Score cards */}
        <div
          className="game-summary flex gap-4"
          data-slot="game-summary"
          role="status"
          aria-live="polite"
        >
          <Card className="border-white/10 bg-card/70 px-5 py-2 text-center">
            <div className="text-xs text-muted-foreground">{t("score")}</div>
            <div className="text-2xl font-bold text-foreground">{score}</div>
          </Card>
          <Card className="border-white/10 bg-card/70 px-5 py-2 text-center">
            <div className="text-xs text-muted-foreground">{t("highScore")}</div>
            <div className="text-2xl font-bold text-foreground">{bestScore}</div>
          </Card>
        </div>

        {/* Game status */}
        {(gameOver || won) && (
          <div
            role="status"
            aria-live="assertive"
            data-tone={won ? "success" : "danger"}
            className={`game-status-banner rounded-lg px-4 py-2 text-lg font-bold ${
            won ? "bg-yellow-500/20 text-yellow-300" : "bg-red-500/20 text-red-300"
          }`}
          >
            {won ? t("youWin") : t("gameOver")}
          </div>
        )}

        {/* Game board */}
        <div
          className="game-stage rounded-lg bg-amber-700 p-3"
          data-slot="game-stage"
        >
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="2048">
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  role="img"
                  aria-label={`${rowIndex + 1}, ${colIndex + 1}, ${cell || directionLabels.empty}`}
                  className={`
                    flex size-[clamp(3.35rem,18vw,5rem)] items-center justify-center rounded-md font-bold transition-all
                    ${cell ? TILE_COLORS[cell] || "bg-amber-800 text-white" : "bg-amber-600/50"}
                    ${cell && cell >= 100 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}
                    ${cell && cell >= 1000 ? "text-lg sm:text-xl" : ""}
                  `}
                >
                  {cell}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mobile controls */}
        <div
          className="mobile-controls grid grid-cols-3 gap-2 sm:hidden"
          data-slot="mobile-controls"
        >
          <div />
          <Button
            onClick={() => handleMove("up")}
            aria-label={directionLabels.up}
            variant="outline"
            size="lg"
            className="border-white/10 bg-white/[0.04] text-foreground"
          >
            <ChevronUp className="h-6 w-6" aria-hidden="true" />
          </Button>
          <div />
          <Button
            onClick={() => handleMove("left")}
            aria-label={directionLabels.left}
            variant="outline"
            size="lg"
            className="border-white/10 bg-white/[0.04] text-foreground"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Button>
          <Button
            onClick={() => handleMove("down")}
            aria-label={directionLabels.down}
            variant="outline"
            size="lg"
            className="border-white/10 bg-white/[0.04] text-foreground"
          >
            <ChevronDown className="h-6 w-6" aria-hidden="true" />
          </Button>
          <Button
            onClick={() => handleMove("right")}
            aria-label={directionLabels.right}
            variant="outline"
            size="lg"
            className="border-white/10 bg-white/[0.04] text-foreground"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>

        {/* Controls */}
        <div
          className="game-actions flex gap-2"
          data-slot="game-actions"
        >
          <Button
            onClick={resetGame}
            variant="outline"
            className="border-white/10 bg-white/[0.04] text-foreground"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
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

        <p
          className="game-help max-w-md text-center text-xs text-muted-foreground"
          data-slot="game-help"
        >
          {t("game2048Instructions")}
        </p>

      </main>
    </div>
  )
}
