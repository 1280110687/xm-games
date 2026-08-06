"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import {
  GOMOKU_LAN_COPY,
} from "@/components/multiplayer/gomoku-lan-panel"
import { LanGamePanel } from "@/components/multiplayer/lan-game-panel"
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
import {
  chessLanAdapter,
  type LanChessAction,
} from "@/features/chess/lan"
import { getChessLanError } from "@/features/chess/lan-view"
import {
  useLanTurnGame,
} from "@/features/multiplayer/use-lan-turn-game"
import type { Locale } from "@/lib/i18n"
import { Gamepad2, RotateCcw, Undo2, Wifi } from "lucide-react"

const pieceSymbols: Record<Color, Record<PieceType, string>> = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" }
}

type ChessMode = "local" | "lan"

const CHESS_LAN_GAME_TITLES: Record<Locale, string> = {
  zh: "国际象棋",
  en: "Chess",
  th: "หมากรุกสากล",
}

export function ChessGame() {
  const { t, locale } = useLocale()
  const [mode, setMode] = useState<ChessMode>("local")
  const lan = useLanTurnGame(chessLanAdapter)
  const lanCopy = GOMOKU_LAN_COPY[locale]

  const [localBoard, setLocalBoard] = useState<ChessBoard>(() => createInitialBoard())
  const [localCurrentTurn, setLocalCurrentTurn] = useState<Color>("white")
  const [selectedPos, setSelectedPos] = useState<Position | null>(null)
  const [validMoves, setValidMoves] = useState<Position[]>([])
  const [localGameStatus, setLocalGameStatus] = useState<"playing" | "check" | "checkmate" | "stalemate">("playing")
  const [localWinner, setLocalWinner] = useState<Color | null>(null)
  const [localHistory, setLocalHistory] = useState<{
    board: ChessBoard
    turn: Color
    castling: CastlingRights
    enPassant: Position | null
  }[]>([])
  const [localEnPassantTarget, setLocalEnPassantTarget] = useState<Position | null>(null)
  const [localCastlingRights, setLocalCastlingRights] = useState<CastlingRights>(() => ({ ...INITIAL_CASTLING_RIGHTS }))
  const [localLastMove, setLocalLastMove] = useState<{ from: Position; to: Position } | null>(null)
  const [whiteUndoUsed, setWhiteUndoUsed] = useState(false)
  const [blackUndoUsed, setBlackUndoUsed] = useState(false)

  const isLanMode = mode === "lan"
  const board = isLanMode ? lan.game.board : localBoard
  const currentTurn = isLanMode ? lan.game.currentTurn : localCurrentTurn
  const gameStatus = isLanMode ? lan.game.status : localGameStatus
  const winner = isLanMode ? lan.game.winner : localWinner
  const enPassantTarget = isLanMode ? lan.game.enPassantTarget : localEnPassantTarget
  const castlingRights = isLanMode ? lan.game.castlingRights : localCastlingRights
  const lastMove = isLanMode
    ? (lan.game.moveHistory.at(-1) ?? null)
    : localLastMove
  const showBoard = mode === "local" || lan.phase === "playing"
  const canPlayLan = (
    isLanMode
    && lan.connected
    && lan.localSide === currentTurn
    && gameStatus !== "checkmate"
    && gameStatus !== "stalemate"
  )

  const resetGame = useCallback(() => {
    setLocalBoard(createInitialBoard())
    setLocalCurrentTurn("white")
    setSelectedPos(null)
    setValidMoves([])
    setLocalGameStatus("playing")
    setLocalWinner(null)
    setLocalHistory([])
    setLocalEnPassantTarget(null)
    setLocalCastlingRights({ ...INITIAL_CASTLING_RIGHTS })
    setLocalLastMove(null)
    setWhiteUndoUsed(false)
    setBlackUndoUsed(false)
  }, [])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("room")) setMode("lan")
  }, [])

  useEffect(() => {
    if (lan.roomId) setMode("lan")
  }, [lan.roomId])

  useEffect(() => {
    if (mode !== "lan") return
    setSelectedPos(null)
    setValidMoves([])
  }, [lan.game.moveHistory.length, mode])

  const changeMode = (nextMode: ChessMode) => {
    if (nextMode === "local" && mode === "lan" && lan.phase !== "idle") {
      lan.leaveRoom()
    }
    setSelectedPos(null)
    setValidMoves([])
    setMode(nextMode)
  }

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameStatus === "checkmate" || gameStatus === "stalemate") return

    if (mode === "lan" && !canPlayLan) {
      setSelectedPos(null)
      setValidMoves([])
      return
    }

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

      if (mode === "lan") {
        const action: LanChessAction = {
          type: "move",
          from: selectedPos,
          to: { row, col },
        }
        setSelectedPos(null)
        setValidMoves([])
        void lan.playAction(action)
        return
      }

      // Save history
      setLocalHistory(prev => [...prev, {
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

      setLocalBoard(newBoard)
      setLocalCastlingRights(newCastling)
      setLocalEnPassantTarget(newEnPassant)
      setLocalLastMove({ from: selectedPos, to: { row, col } })
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
          setLocalGameStatus("checkmate")
          setLocalWinner(currentTurn)
        } else {
          setLocalGameStatus("stalemate")
        }
      } else if (inCheck) {
        setLocalGameStatus("check")
      } else {
        setLocalGameStatus("playing")
      }

      setLocalCurrentTurn(opponent)
    }
  }, [
    board,
    canPlayLan,
    castlingRights,
    currentTurn,
    enPassantTarget,
    gameStatus,
    lan,
    mode,
    selectedPos,
    validMoves,
  ])

  const handleUndo = useCallback(() => {
    if (localHistory.length === 0) return
    if (localGameStatus === "checkmate" || localGameStatus === "stalemate") return

    const undoingPlayer = localCurrentTurn === "white" ? "black" : "white"
    if (undoingPlayer === "white" && whiteUndoUsed) return
    if (undoingPlayer === "black" && blackUndoUsed) return

    const lastState = localHistory[localHistory.length - 1]
    setLocalBoard(lastState.board)
    setLocalCurrentTurn(lastState.turn)
    setLocalCastlingRights(lastState.castling)
    setLocalEnPassantTarget(lastState.enPassant)
    setLocalHistory(prev => prev.slice(0, -1))
    setSelectedPos(null)
    setValidMoves([])
    setLocalGameStatus(isInCheck(lastState.board, lastState.turn) ? "check" : "playing")
    setLocalWinner(null)
    setLocalLastMove(null)

    if (undoingPlayer === "white") {
      setWhiteUndoUsed(true)
    } else {
      setBlackUndoUsed(true)
    }
  }, [
    blackUndoUsed,
    localCurrentTurn,
    localGameStatus,
    localHistory,
    whiteUndoUsed,
  ])

  const isValidTarget = (row: number, col: number) => validMoves.some(m => m.row === row && m.col === col)
  const lanInstructions = locale === "zh"
    ? "双方准备后共同掷骰，胜者执白；每一步都由两台设备共同校验。"
    : locale === "th"
      ? "เมื่อพร้อมแล้ว ทั้งสองฝ่ายทอยลูกเต๋าร่วมกัน ผู้ชนะเล่นฝ่ายขาว และทั้งสองเครื่องตรวจสอบทุกตา"
      : "Both players roll after ready. The winner takes white, and both devices verify every move."
  const lanRule = locale === "zh"
    ? "联机模式不提供单方悔棋；终局后双方确认即可保留比分再来一局，并重新掷骰决定先手。"
    : locale === "th"
      ? "โหมด LAN ไม่ให้ถอยฝ่ายเดียว หลังจบเกมทั้งสองฝ่ายยืนยันเพื่อเล่นอีกครั้งพร้อมเก็บคะแนนและทอยลูกเต๋าใหม่"
      : "LAN disables unilateral undo. After the game, both players can confirm a rematch, keep score, and roll again."

  return (
    <div
      className="game-page"
      data-page="chess"
      data-game-mode={mode}
      data-lan-phase={mode === "lan" ? lan.phase : undefined}
      data-lan-finished={mode === "lan" && lan.series.outcome !== "playing" ? "true" : undefined}
    >
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        homeLabelMode="desktop"
        title={t("chess")}
        className="mb-4"
        homeButtonClassName="text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        titleClassName="text-base font-bold text-foreground sm:text-2xl"
      />

      <main
        className="game-content flex flex-1 flex-col items-center gap-4 py-2 sm:py-4"
        data-slot="game-content"
      >
        <div className="gomoku-mode-switch" role="tablist" aria-label={t("chess")}>
          <Button
            type="button"
            role="tab"
            variant="ghost"
            aria-selected={mode === "local"}
            onClick={() => changeMode("local")}
          >
            <Gamepad2 aria-hidden="true" />
            {lanCopy.localMode}
          </Button>
          <Button
            type="button"
            role="tab"
            variant="ghost"
            aria-selected={mode === "lan"}
            onClick={() => changeMode("lan")}
          >
            <Wifi aria-hidden="true" />
            {lanCopy.lanMode}
          </Button>
        </div>

        {mode === "lan" && (
          <LanGamePanel<Color>
            idPrefix="chess"
            gameTitle={CHESS_LAN_GAME_TITLES[locale]}
            phase={lan.phase}
            roomId={lan.roomId}
            role={lan.role}
            connected={lan.connected}
            localReady={lan.localReady}
            remoteReady={lan.remoteReady}
            localSide={lan.localSide}
            currentSide={lan.currentSide}
            sides={[
              { value: "white", label: lanCopy.white, color: "#f8fafc" },
              { value: "black", label: lanCopy.black, color: "#111827" },
            ]}
            dice={lan.dice}
            series={lan.series}
            error={getChessLanError(locale, lan.errorCode, lanCopy.errors)}
            copy={lanCopy}
            onCreateRoom={() => void lan.createRoom()}
            onJoinRoom={(roomId) => void lan.joinRoom(roomId)}
            onReady={lan.markReady}
            onLeave={lan.leaveRoom}
            onRetry={lan.retryConnection}
            onRematch={() => void lan.requestRematch()}
          />
        )}

        {showBoard && (
          <>
        {/* Game Status */}
        <Card
          className="game-summary surface-panel w-full max-w-lg border-white/10 bg-card/70 p-3"
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
            <div className="game-message flex justify-center" data-slot="game-message">
              <span
                className="game-status-banner animate-pulse rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-bold text-yellow-400"
                data-tone="warning"
              >
                {t("checkChess")}
              </span>
            </div>
          )}
          {gameStatus === "checkmate" && (
            <div className="game-message flex justify-center" data-slot="game-message">
              <span
                className="game-status-banner rounded-full bg-red-500/20 px-3 py-1 text-sm font-bold text-red-400"
                data-tone="danger"
              >
                {winner === "white" ? t("whiteWinsChess") : t("blackWinsChess")}
              </span>
            </div>
          )}
          {gameStatus === "stalemate" && (
            <div className="game-message flex justify-center" data-slot="game-message">
              <span
                className="game-status-banner rounded-full bg-slate-500/20 px-3 py-1 text-sm font-bold text-slate-400"
                data-tone="neutral"
              >
                {t("stalemate")}
              </span>
            </div>
          )}

            {mode === "local" && (
              <div
                className="game-undo-status flex items-center justify-center gap-4 text-xs text-muted-foreground"
                data-slot="undo-status"
              >
                <span>{whiteUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
                <div className="h-3 w-px bg-border" />
                <span>{blackUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Board */}
        <div
          className="game-stage w-full max-w-[22.5rem] overflow-hidden rounded-xl border-4 border-amber-950 shadow-2xl shadow-black/30"
          data-slot="game-stage"
        >
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
                  disabled={mode === "lan" && !canPlayLan}
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
        <div className="game-actions flex flex-wrap justify-center gap-2" data-slot="game-actions">
        {mode === "local" && (
          <>
            <Button
              onClick={handleUndo}
              disabled={localHistory.length === 0 || localGameStatus === "checkmate" || localGameStatus === "stalemate" ||
                (localCurrentTurn === "white" && blackUndoUsed) ||
                (localCurrentTurn === "black" && whiteUndoUsed)
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
          </>
        )}
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
              {mode === "lan" && <p className="mt-2">{lanRule}</p>}
            </div>
          </div>
        </GameRulesDialog>
        </div>

        {/* Instructions */}
        <p className="game-help max-w-md text-center text-xs text-muted-foreground" data-slot="game-help">
          {mode === "lan" ? lanInstructions : t("chessInstructionsInt")}
        </p>
          </>
        )}
      </main>

    </div>
  )
}
