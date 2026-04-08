"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { RotateCcw, Home, Flag } from "lucide-react"
import Link from "next/link"

// Piece types
type PieceType = "king" | "advisor" | "elephant" | "horse" | "chariot" | "cannon" | "pawn"
type PieceColor = "red" | "black"

interface Piece {
  type: PieceType
  color: PieceColor
}

interface Position {
  row: number
  col: number
}

// Piece names in different languages
const pieceNames: Record<PieceColor, Record<PieceType, Record<string, string>>> = {
  red: {
    king: { zh: "帅", en: "K", th: "จอม" },
    advisor: { zh: "仕", en: "A", th: "ที่" },
    elephant: { zh: "相", en: "E", th: "ช้าง" },
    horse: { zh: "馬", en: "H", th: "ม้า" },
    chariot: { zh: "車", en: "R", th: "รถ" },
    cannon: { zh: "炮", en: "C", th: "ปืน" },
    pawn: { zh: "兵", en: "P", th: "เบี้ย" },
  },
  black: {
    king: { zh: "将", en: "K", th: "จอม" },
    advisor: { zh: "士", en: "A", th: "ที่" },
    elephant: { zh: "象", en: "E", th: "ช้าง" },
    horse: { zh: "馬", en: "H", th: "ม้า" },
    chariot: { zh: "車", en: "R", th: "รถ" },
    cannon: { zh: "砲", en: "C", th: "ปืน" },
    pawn: { zh: "卒", en: "P", th: "เบี้ย" },
  },
}

// Initial board setup
function createInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(10).fill(null).map(() => Array(9).fill(null))
  
  // Black pieces (top)
  board[0][0] = { type: "chariot", color: "black" }
  board[0][1] = { type: "horse", color: "black" }
  board[0][2] = { type: "elephant", color: "black" }
  board[0][3] = { type: "advisor", color: "black" }
  board[0][4] = { type: "king", color: "black" }
  board[0][5] = { type: "advisor", color: "black" }
  board[0][6] = { type: "elephant", color: "black" }
  board[0][7] = { type: "horse", color: "black" }
  board[0][8] = { type: "chariot", color: "black" }
  board[2][1] = { type: "cannon", color: "black" }
  board[2][7] = { type: "cannon", color: "black" }
  board[3][0] = { type: "pawn", color: "black" }
  board[3][2] = { type: "pawn", color: "black" }
  board[3][4] = { type: "pawn", color: "black" }
  board[3][6] = { type: "pawn", color: "black" }
  board[3][8] = { type: "pawn", color: "black" }

  // Red pieces (bottom)
  board[9][0] = { type: "chariot", color: "red" }
  board[9][1] = { type: "horse", color: "red" }
  board[9][2] = { type: "elephant", color: "red" }
  board[9][3] = { type: "advisor", color: "red" }
  board[9][4] = { type: "king", color: "red" }
  board[9][5] = { type: "advisor", color: "red" }
  board[9][6] = { type: "elephant", color: "red" }
  board[9][7] = { type: "horse", color: "red" }
  board[9][8] = { type: "chariot", color: "red" }
  board[7][1] = { type: "cannon", color: "red" }
  board[7][7] = { type: "cannon", color: "red" }
  board[6][0] = { type: "pawn", color: "red" }
  board[6][2] = { type: "pawn", color: "red" }
  board[6][4] = { type: "pawn", color: "red" }
  board[6][6] = { type: "pawn", color: "red" }
  board[6][8] = { type: "pawn", color: "red" }

  return board
}

// Check if position is within palace
function isInPalace(row: number, col: number, color: PieceColor): boolean {
  if (col < 3 || col > 5) return false
  if (color === "red") return row >= 7 && row <= 9
  return row >= 0 && row <= 2
}

// Check if position is on own side
function isOnOwnSide(row: number, color: PieceColor): boolean {
  if (color === "red") return row >= 5
  return row <= 4
}

// Count pieces between two positions
function countPiecesBetween(
  board: (Piece | null)[][],
  from: Position,
  to: Position
): number {
  let count = 0
  if (from.row === to.row) {
    const minCol = Math.min(from.col, to.col)
    const maxCol = Math.max(from.col, to.col)
    for (let c = minCol + 1; c < maxCol; c++) {
      if (board[from.row][c]) count++
    }
  } else if (from.col === to.col) {
    const minRow = Math.min(from.row, to.row)
    const maxRow = Math.max(from.row, to.row)
    for (let r = minRow + 1; r < maxRow; r++) {
      if (board[r][from.col]) count++
    }
  }
  return count
}

// Check if a move is valid
function isValidMove(
  board: (Piece | null)[][],
  from: Position,
  to: Position,
  piece: Piece
): boolean {
  const targetPiece = board[to.row][to.col]
  
  // Cannot capture own piece
  if (targetPiece && targetPiece.color === piece.color) return false
  
  const rowDiff = to.row - from.row
  const colDiff = to.col - from.col
  const absRowDiff = Math.abs(rowDiff)
  const absColDiff = Math.abs(colDiff)

  switch (piece.type) {
    case "king":
      // Must stay in palace, move one step
      if (!isInPalace(to.row, to.col, piece.color)) return false
      return (absRowDiff === 1 && absColDiff === 0) || (absRowDiff === 0 && absColDiff === 1)

    case "advisor":
      // Must stay in palace, move diagonally one step
      if (!isInPalace(to.row, to.col, piece.color)) return false
      return absRowDiff === 1 && absColDiff === 1

    case "elephant":
      // Cannot cross river, move diagonally two steps
      if (!isOnOwnSide(to.row, piece.color)) return false
      if (absRowDiff !== 2 || absColDiff !== 2) return false
      // Check blocking piece at center
      const elephantBlockRow = from.row + rowDiff / 2
      const elephantBlockCol = from.col + colDiff / 2
      return !board[elephantBlockRow][elephantBlockCol]

    case "horse":
      // Move in L shape, can be blocked
      if (!((absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2))) return false
      // Check blocking piece
      if (absRowDiff === 2) {
        const blockRow = from.row + (rowDiff > 0 ? 1 : -1)
        return !board[blockRow][from.col]
      } else {
        const blockCol = from.col + (colDiff > 0 ? 1 : -1)
        return !board[from.row][blockCol]
      }

    case "chariot":
      // Move in straight line
      if (from.row !== to.row && from.col !== to.col) return false
      return countPiecesBetween(board, from, to) === 0

    case "cannon":
      // Move in straight line, capture by jumping over one piece
      if (from.row !== to.row && from.col !== to.col) return false
      const piecesBetween = countPiecesBetween(board, from, to)
      if (targetPiece) {
        return piecesBetween === 1
      }
      return piecesBetween === 0

    case "pawn":
      // Before crossing river: only forward
      // After crossing river: forward or sideways
      const forward = piece.color === "red" ? -1 : 1
      if (isOnOwnSide(from.row, piece.color)) {
        return rowDiff === forward && colDiff === 0
      } else {
        return (rowDiff === forward && colDiff === 0) || (rowDiff === 0 && absColDiff === 1)
      }

    default:
      return false
  }
}

// Get all valid moves for a piece
function getValidMoves(board: (Piece | null)[][], from: Position): Position[] {
  const piece = board[from.row][from.col]
  if (!piece) return []

  const validMoves: Position[] = []
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      if (isValidMove(board, from, { row, col }, piece)) {
        validMoves.push({ row, col })
      }
    }
  }
  return validMoves
}

// Check if king is in check
function isKingInCheck(board: (Piece | null)[][], color: PieceColor): boolean {
  // Find king position
  let kingPos: Position | null = null
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col]
      if (piece && piece.type === "king" && piece.color === color) {
        kingPos = { row, col }
        break
      }
    }
    if (kingPos) break
  }
  if (!kingPos) return true // King captured

  // Check if any opponent piece can capture king
  const opponentColor = color === "red" ? "black" : "red"
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col]
      if (piece && piece.color === opponentColor) {
        if (isValidMove(board, { row, col }, kingPos, piece)) {
          return true
        }
      }
    }
  }

  // Check flying general (kings facing each other)
  let redKingPos: Position | null = null
  let blackKingPos: Position | null = null
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col]
      if (piece && piece.type === "king") {
        if (piece.color === "red") redKingPos = { row, col }
        else blackKingPos = { row, col }
      }
    }
  }
  if (redKingPos && blackKingPos && redKingPos.col === blackKingPos.col) {
    if (countPiecesBetween(board, redKingPos, blackKingPos) === 0) {
      return true
    }
  }

  return false
}

// Check if game is over (checkmate or stalemate)
function isGameOver(board: (Piece | null)[][], currentTurn: PieceColor): { over: boolean; winner: PieceColor | null } {
  // Check if current player has any valid moves
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col]
      if (piece && piece.color === currentTurn) {
        const moves = getValidMoves(board, { row, col })
        for (const move of moves) {
          // Try the move
          const newBoard = board.map(r => [...r])
          newBoard[move.row][move.col] = piece
          newBoard[row][col] = null
          // Check if king is still in check after move
          if (!isKingInCheck(newBoard, currentTurn)) {
            return { over: false, winner: null }
          }
        }
      }
    }
  }
  // No valid moves - game over
  const winner = currentTurn === "red" ? "black" : "red"
  return { over: true, winner }
}

export function ChineseChessGame() {
  const { t, locale } = useLocale()
  const [board, setBoard] = useState<(Piece | null)[][]>(createInitialBoard)
  const [selectedPos, setSelectedPos] = useState<Position | null>(null)
  const [validMoves, setValidMoves] = useState<Position[]>([])
  const [currentTurn, setCurrentTurn] = useState<PieceColor>("red")
  const [gameStatus, setGameStatus] = useState<"playing" | "check" | "checkmate" | "stalemate">("playing")
  const [winner, setWinner] = useState<PieceColor | null>(null)
  const [moveHistory, setMoveHistory] = useState<{ from: Position; to: Position; piece: Piece }[]>([])

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard())
    setSelectedPos(null)
    setValidMoves([])
    setCurrentTurn("red")
    setGameStatus("playing")
    setWinner(null)
    setMoveHistory([])
  }, [])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameStatus === "checkmate" || gameStatus === "stalemate") return

    const clickedPiece = board[row][col]

    if (selectedPos) {
      // Check if clicking on own piece to reselect
      if (clickedPiece && clickedPiece.color === currentTurn) {
        setSelectedPos({ row, col })
        setValidMoves(getValidMoves(board, { row, col }))
        return
      }

      // Try to move
      const movingPiece = board[selectedPos.row][selectedPos.col]
      if (movingPiece && isValidMove(board, selectedPos, { row, col }, movingPiece)) {
        // Create new board with move
        const newBoard = board.map(r => [...r])
        newBoard[row][col] = movingPiece
        newBoard[selectedPos.row][selectedPos.col] = null

        // Check if this move puts own king in check
        if (isKingInCheck(newBoard, currentTurn)) {
          // Invalid move - would put king in check
          setSelectedPos(null)
          setValidMoves([])
          return
        }

        // Valid move
        setBoard(newBoard)
        setMoveHistory(prev => [...prev, { from: selectedPos, to: { row, col }, piece: movingPiece }])
        
        const nextTurn = currentTurn === "red" ? "black" : "red"
        setCurrentTurn(nextTurn)
        setSelectedPos(null)
        setValidMoves([])

        // Check game state
        const gameResult = isGameOver(newBoard, nextTurn)
        if (gameResult.over) {
          setGameStatus("checkmate")
          setWinner(gameResult.winner)
        } else if (isKingInCheck(newBoard, nextTurn)) {
          setGameStatus("check")
        } else {
          setGameStatus("playing")
        }
      } else {
        // Invalid move, deselect
        setSelectedPos(null)
        setValidMoves([])
      }
    } else {
      // Select piece
      if (clickedPiece && clickedPiece.color === currentTurn) {
        setSelectedPos({ row, col })
        setValidMoves(getValidMoves(board, { row, col }))
      }
    }
  }, [board, selectedPos, currentTurn, gameStatus])

  const isValidMoveTarget = (row: number, col: number) => {
    return validMoves.some(m => m.row === row && m.col === col)
  }

  const getPieceName = (piece: Piece) => {
    const lang = locale === "zh" ? "zh" : locale === "th" ? "th" : "en"
    return pieceNames[piece.color][piece.type][lang]
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 p-2 sm:p-4">
      <div className="mb-2 flex items-center justify-between sm:mb-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-amber-100 hover:bg-amber-700 hover:text-white">
            <Home className="mr-1 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("appName")}</span>
          </Button>
        </Link>
        <h1 className="text-lg font-bold text-amber-100 sm:text-2xl">{t("chineseChess")}</h1>
        <LanguageSwitcher />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        {/* Game Status */}
        <Card className="border-amber-600 bg-amber-800/50 p-3 text-center sm:p-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded-full ${currentTurn === "red" ? "bg-red-500" : "bg-slate-800"}`} />
              <span className="text-sm font-medium text-amber-100 sm:text-base">
                {currentTurn === "red" ? t("redTurn") : t("blackTurn")}
              </span>
            </div>
            {gameStatus === "check" && (
              <span className="animate-pulse text-sm font-bold text-yellow-400 sm:text-base">{t("check")}</span>
            )}
            {gameStatus === "checkmate" && (
              <span className="text-sm font-bold text-red-400 sm:text-base">
                {winner === "red" ? t("redWins") : t("blackWins")}
              </span>
            )}
          </div>
        </Card>

        {/* Chess Board */}
        <div className="relative">
          {/* Board background */}
          <div 
            className="rounded-lg border-4 border-amber-700 p-2 sm:p-4"
            style={{ 
              backgroundColor: "#d4a574",
              backgroundImage: `
                linear-gradient(to right, #8b6914 1px, transparent 1px),
                linear-gradient(to bottom, #8b6914 1px, transparent 1px)
              `,
              backgroundSize: "calc(100% / 8) calc(100% / 9)",
            }}
          >
            {/* River */}
            <div 
              className="absolute left-2 right-2 flex items-center justify-center sm:left-4 sm:right-4"
              style={{ 
                top: "calc(50% - 2px)",
                height: "calc(100% / 10)",
                backgroundColor: "#b8956e",
              }}
            >
              <span className="text-xs font-bold text-amber-800 sm:text-sm">
                {locale === "zh" ? "楚河  汉界" : locale === "th" ? "แม่น้ำ" : "River"}
              </span>
            </div>

            {/* Board grid */}
            <div className="relative grid" style={{ gridTemplateRows: "repeat(10, 1fr)", gap: "0" }}>
              {board.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((piece, colIndex) => {
                    const isSelected = selectedPos?.row === rowIndex && selectedPos?.col === colIndex
                    const isValidTarget = isValidMoveTarget(rowIndex, colIndex)
                    const lastMove = moveHistory[moveHistory.length - 1]
                    const isLastMoveFrom = lastMove?.from.row === rowIndex && lastMove?.from.col === colIndex
                    const isLastMoveTo = lastMove?.to.row === rowIndex && lastMove?.to.col === colIndex

                    return (
                      <button
                        key={colIndex}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        className={`
                          relative flex items-center justify-center
                          h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12
                          transition-all
                          ${isSelected ? "z-10" : ""}
                          ${isLastMoveFrom || isLastMoveTo ? "bg-yellow-300/30" : ""}
                        `}
                      >
                        {/* Valid move indicator */}
                        {isValidTarget && !piece && (
                          <div className="absolute h-3 w-3 rounded-full bg-green-500/50 sm:h-4 sm:w-4" />
                        )}
                        
                        {/* Piece */}
                        {piece && (
                          <div
                            className={`
                              flex items-center justify-center rounded-full border-2
                              h-7 w-7 sm:h-9 sm:w-9 md:h-11 md:w-11
                              text-sm font-bold sm:text-base md:text-lg
                              shadow-md transition-transform
                              ${piece.color === "red" 
                                ? "border-red-800 bg-gradient-to-br from-red-100 to-red-200 text-red-600" 
                                : "border-slate-700 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800"
                              }
                              ${isSelected ? "scale-110 ring-2 ring-yellow-400 ring-offset-1" : ""}
                              ${isValidTarget ? "ring-2 ring-green-500" : ""}
                            `}
                          >
                            {getPieceName(piece)}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={resetGame}
            variant="outline"
            className="border-amber-600 bg-amber-800/50 text-amber-100 hover:bg-amber-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("restart")}
          </Button>
          {gameStatus === "checkmate" && (
            <Button
              onClick={resetGame}
              className="bg-amber-600 text-white hover:bg-amber-500"
            >
              <Flag className="mr-2 h-4 w-4" />
              {t("newGame")}
            </Button>
          )}
        </div>

        {/* Instructions */}
        <p className="max-w-md text-center text-xs text-amber-200/70 sm:text-sm">
          {t("chessInstructions")}
        </p>
      </div>
    </div>
  )
}
