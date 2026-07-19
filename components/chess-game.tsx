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
    <div className="game-page">
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        homeLabelMode="desktop"
        title={t("chess")}
        className="mb-4 [&_[data-slot=select-trigger]]:w-14 [&_[data-slot=select-trigger]]:px-1 sm:[&_[data-slot=select-trigger]]:w-[122px] sm:[&_[data-slot=select-trigger]]:px-3"
        homeButtonClassName="text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        titleClassName="text-base font-bold text-foreground sm:text-2xl"
      />

      <main className="flex flex-1 flex-col items-center gap-4 py-2 sm:py-4">
        {/* Game Status */}
        <Card
          className="surface-panel w-full max-w-lg border-white/10 bg-card/70 p-3"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-2xl ${currentTurn === "white" ? "opacity-100" : "opacity-35"}`}>♔</span>
                <span className={`text-sm ${currentTurn === "white" ? "text-foreground" : "text-muted-foreground"}`}>
                  {t("whiteTurn")}
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className={`text-2xl ${currentTurn === "black" ? "opacity-100" : "opacity-35"}`}>♚</span>
                <span className={`text-sm ${currentTurn === "black" ? "text-foreground" : "text-muted-foreground"}`}>
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

            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>{whiteUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
              <div className="h-3 w-px bg-border" />
              <span>{blackUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
            </div>
          </div>
        </Card>

        {/* Board */}
        <div className="w-full max-w-[22.5rem] overflow-hidden rounded-xl border-4 border-amber-950 shadow-2xl shadow-black/30">
          <div className="grid w-full grid-cols-8" role="group" aria-label={t("chess")}>
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
                    relative flex aspect-square w-full items-center justify-center text-[clamp(1.35rem,8vw,1.875rem)] transition-all
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
        <div className="flex flex-wrap justify-center gap-2">
        <Button
          onClick={handleUndo}
          disabled={history.length === 0 || gameStatus === "checkmate" || gameStatus === "stalemate" ||
            (currentTurn === "white" && blackUndoUsed) ||
            (currentTurn === "black" && whiteUndoUsed)
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
          <div className="space-y-2 text-sm text-muted-foreground">
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
            <div className="mt-4 border-t border-border pt-4">
              <p>{t("chessSpecialRules")}</p>
            </div>
          </div>
        </GameRulesDialog>
        </div>

        {/* Instructions */}
        <p className="max-w-md text-center text-xs text-muted-foreground">
          {t("chessInstructionsInt")}
        </p>
      </main>

    </div>
  )
}
