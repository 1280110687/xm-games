"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { useLocale } from "@/lib/locale-context"
import {
  INITIAL_CASTLING_RIGHTS,
  applyMove,
  createInitialBoard,
  getValidMoves,
  hasLegalMoves,
  isInCheck,
  type CastlingRights,
  type ChessBoard,
  type Color,
  type PieceType,
  type Position,
} from "@/features/chess/engine"
import { RotateCcw, Undo2 } from "lucide-react"

const pieceSymbols: Record<Color, Record<PieceType, string>> = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" }
}

export function ChessGame() {
  const { t } = useLocale()

  const [board, setBoard] = useState<ChessBoard>(() => createInitialBoard())
  const [currentTurn, setCurrentTurn] = useState<Color>("white")
  const [selectedPos, setSelectedPos] = useState<Position | null>(null)
  const [validMoves, setValidMoves] = useState<Position[]>([])
  const [gameStatus, setGameStatus] = useState<"playing" | "check" | "checkmate" | "stalemate">("playing")
  const [winner, setWinner] = useState<Color | null>(null)
  const [history, setHistory] = useState<{
    board: ChessBoard
    turn: Color
    castling: CastlingRights
    enPassant: Position | null
  }[]>([])
  const [enPassantTarget, setEnPassantTarget] = useState<Position | null>(null)
  const [castlingRights, setCastlingRights] = useState<CastlingRights>(() => ({ ...INITIAL_CASTLING_RIGHTS }))
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null)
  const [whiteUndoUsed, setWhiteUndoUsed] = useState(false)
  const [blackUndoUsed, setBlackUndoUsed] = useState(false)

  const resetGame = useCallback(() => {
    setBoard(createInitialBoard())
    setCurrentTurn("white")
    setSelectedPos(null)
    setValidMoves([])
    setGameStatus("playing")
    setWinner(null)
    setHistory([])
    setEnPassantTarget(null)
    setCastlingRights({ ...INITIAL_CASTLING_RIGHTS })
    setLastMove(null)
    setWhiteUndoUsed(false)
    setBlackUndoUsed(false)
  }, [])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameStatus === "checkmate" || gameStatus === "stalemate") return

    const clickedPiece = board[row][col]

    // Select own piece
    if (clickedPiece && clickedPiece.color === currentTurn) {
      setSelectedPos({ row, col })
      setValidMoves(getValidMoves({ board, enPassantTarget, castlingRights }, { row, col }))
      return
    }

    // Try to move
    if (selectedPos) {
      const movingPiece = board[selectedPos.row][selectedPos.col]
      if (!movingPiece) return

      const isValid = validMoves.some(m => m.row === row && m.col === col)
      if (!isValid) {
        setSelectedPos(null)
        setValidMoves([])
        return
      }

      // Save history
      setHistory(prev => [...prev, {
        board: board.map(r => [...r]),
        turn: currentTurn,
        castling: { ...castlingRights },
        enPassant: enPassantTarget
      }])

      const {
        board: newBoard,
        castlingRights: newCastling,
        enPassantTarget: newEnPassant,
      } = applyMove(
        { board, castlingRights, enPassantTarget },
        selectedPos,
        { row, col },
      )

      setBoard(newBoard)
      setCastlingRights(newCastling)
      setEnPassantTarget(newEnPassant)
      setLastMove({ from: selectedPos, to: { row, col } })
      setSelectedPos(null)
      setValidMoves([])

      // Check game status
      const opponent = currentTurn === "white" ? "black" : "white"
      const inCheck = isInCheck(newBoard, opponent)
      const hasLegal = hasLegalMoves({
        board: newBoard,
        castlingRights: newCastling,
        enPassantTarget: newEnPassant,
      }, opponent)

      if (!hasLegal) {
        if (inCheck) {
          setGameStatus("checkmate")
          setWinner(currentTurn)
        } else {
          setGameStatus("stalemate")
        }
      } else if (inCheck) {
        setGameStatus("check")
      } else {
        setGameStatus("playing")
      }

      setCurrentTurn(opponent)
    }
  }, [board, selectedPos, currentTurn, validMoves, gameStatus, enPassantTarget, castlingRights])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    if (gameStatus === "checkmate" || gameStatus === "stalemate") return

    const undoingPlayer = currentTurn === "white" ? "black" : "white"
    if (undoingPlayer === "white" && whiteUndoUsed) return
    if (undoingPlayer === "black" && blackUndoUsed) return

    const lastState = history[history.length - 1]
    setBoard(lastState.board)
    setCurrentTurn(lastState.turn)
    setCastlingRights(lastState.castling)
    setEnPassantTarget(lastState.enPassant)
    setHistory(prev => prev.slice(0, -1))
    setSelectedPos(null)
    setValidMoves([])
    setGameStatus(isInCheck(lastState.board, lastState.turn) ? "check" : "playing")
    setWinner(null)
    setLastMove(null)

    if (undoingPlayer === "white") {
      setWhiteUndoUsed(true)
    } else {
      setBlackUndoUsed(true)
    }
  }, [history, gameStatus, currentTurn, whiteUndoUsed, blackUndoUsed])

  const isValidTarget = (row: number, col: number) => validMoves.some(m => m.row === row && m.col === col)

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        title={t("chess")}
        className="mb-4 w-full max-w-lg"
        homeButtonClassName="text-slate-100 hover:bg-slate-700"
        titleClassName="text-xl font-bold text-slate-100 sm:text-2xl"
      />

      {/* Game Status */}
      <Card
        className="mb-4 w-full max-w-lg border-slate-600 bg-slate-800/50 p-3"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-2xl ${currentTurn === "white" ? "opacity-100" : "opacity-40"}`}>♔</span>
              <span className={`text-sm ${currentTurn === "white" ? "text-slate-100" : "text-slate-100/50"}`}>
                {t("whiteTurn")}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-600" />
            <div className="flex items-center gap-2">
              <span className={`text-2xl ${currentTurn === "black" ? "opacity-100" : "opacity-40"}`}>♚</span>
              <span className={`text-sm ${currentTurn === "black" ? "text-slate-100" : "text-slate-100/50"}`}>
                {t("blackTurnChess")}
              </span>
            </div>
          </div>

          {gameStatus === "check" && (
            <div className="flex justify-center">
              <span className="animate-pulse rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-bold text-yellow-400">
                {t("checkChess")}
              </span>
            </div>
          )}
          {gameStatus === "checkmate" && (
            <div className="flex justify-center">
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-bold text-red-400">
                {winner === "white" ? t("whiteWinsChess") : t("blackWinsChess")}
              </span>
            </div>
          )}
          {gameStatus === "stalemate" && (
            <div className="flex justify-center">
              <span className="rounded-full bg-slate-500/20 px-3 py-1 text-sm font-bold text-slate-400">
                {t("stalemate")}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="text-amber-200">
              {whiteUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}
            </span>
            <div className="h-3 w-px bg-slate-600/50" />
            <span className="text-slate-400">
              {blackUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}
            </span>
          </div>
        </div>
      </Card>

      {/* Board */}
      <div className="rounded-lg border-4 border-amber-900 shadow-xl">
        <div className="grid grid-cols-8" role="group" aria-label={t("chess")}>
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0
              const isSelected = selectedPos?.row === rowIndex && selectedPos?.col === colIndex
              const isValid = isValidTarget(rowIndex, colIndex)
              const isLastFrom = lastMove?.from.row === rowIndex && lastMove?.from.col === colIndex
              const isLastTo = lastMove?.to.row === rowIndex && lastMove?.to.col === colIndex
              const square = `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`
              const cellContent = piece ? `${piece.color} ${piece.type}` : "empty"

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  aria-label={`${square}, ${cellContent}${isValid ? ", valid move" : ""}`}
                  aria-pressed={isSelected}
                  className={`
                    relative flex h-9 w-9 items-center justify-center text-2xl transition-all
                    sm:h-11 sm:w-11 sm:text-3xl
                    ${isLight ? "bg-amber-200" : "bg-amber-700"}
                    ${isSelected ? "ring-2 ring-yellow-400 ring-inset" : ""}
                    ${isLastFrom || isLastTo ? "bg-yellow-400/50" : ""}
                  `}
                >
                  {isValid && !piece && (
                    <div className="absolute h-3 w-3 rounded-full bg-green-500/50" aria-hidden="true" />
                  )}
                  {piece && (
                    <span aria-hidden="true" className={`${isValid ? "ring-2 ring-green-400 rounded-full" : ""} ${piece.color === "white" ? "text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : "text-slate-900"}`}>
                      {pieceSymbols[piece.color][piece.type]}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          onClick={handleUndo}
          disabled={history.length === 0 || gameStatus === "checkmate" || gameStatus === "stalemate" ||
            (currentTurn === "white" && blackUndoUsed) ||
            (currentTurn === "black" && whiteUndoUsed)
          }
          variant="outline"
          className="border-slate-600 bg-slate-800/50 text-slate-100 hover:bg-slate-700"
        >
          <Undo2 className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("undo")}
        </Button>
        <Button
          onClick={resetGame}
          variant="outline"
          className="border-slate-600 bg-slate-800/50 text-slate-100 hover:bg-slate-700"
        >
          <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("restart")}
        </Button>
        <GameRulesDialog
          triggerLabel={t("howToPlay")}
          closeLabel={t("close")}
          triggerClassName="border-slate-600 bg-slate-800/50 text-slate-100 hover:bg-slate-700"
          triggerIconClassName="mr-1"
          contentClassName="border-slate-600 bg-slate-900/95 p-4 text-slate-100"
          titleClassName="text-lg font-bold text-slate-100"
          closeButtonClassName="text-slate-100 hover:bg-slate-800"
        >
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-xl">♔</span>
              <span>{t("kingRuleInt")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">♕</span>
              <span>{t("queenRule")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">♖</span>
              <span>{t("rookRule")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">♗</span>
              <span>{t("bishopRule")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">♘</span>
              <span>{t("knightRule")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">♙</span>
              <span>{t("pawnRuleInt")}</span>
            </div>
            <div className="mt-4 border-t border-slate-700 pt-4">
              <p>{t("chessSpecialRules")}</p>
            </div>
          </div>
        </GameRulesDialog>
      </div>

      {/* Instructions */}
      <p className="mt-4 max-w-md text-center text-xs text-slate-400">
        {t("chessInstructionsInt")}
      </p>

    </div>
  )
}
