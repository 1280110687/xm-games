"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, Flag, RotateCcw, SlidersHorizontal, Undo2, Users } from "lucide-react"

import {
  ChineseChessAiSetup,
  type AiDifficulty,
} from "@/components/chinese-chess-ai-setup"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  generateLegalMoves,
  type Piece,
  type PieceColor,
  type PieceType,
  type Position,
} from "@/features/chinese-chess/engine"
import { useChineseChess } from "@/features/chinese-chess/use-chinese-chess"
import { useLocale } from "@/lib/locale-context"

const pieceNames: Record<PieceColor, Record<PieceType, Record<string, string>>> = {
  red: {
    king: { zh: "帅", en: "King", th: "จอม" },
    advisor: { zh: "仕", en: "Advisor", th: "ที่ปรึกษา" },
    elephant: { zh: "相", en: "Elephant", th: "ช้าง" },
    horse: { zh: "馬", en: "Horse", th: "ม้า" },
    chariot: { zh: "車", en: "Chariot", th: "รถ" },
    cannon: { zh: "炮", en: "Cannon", th: "ปืน" },
    pawn: { zh: "兵", en: "Pawn", th: "เบี้ย" },
  },
  black: {
    king: { zh: "将", en: "General", th: "จอม" },
    advisor: { zh: "士", en: "Advisor", th: "ที่ปรึกษา" },
    elephant: { zh: "象", en: "Elephant", th: "ช้าง" },
    horse: { zh: "馬", en: "Horse", th: "ม้า" },
    chariot: { zh: "車", en: "Chariot", th: "รถ" },
    cannon: { zh: "砲", en: "Cannon", th: "ปืน" },
    pawn: { zh: "卒", en: "Pawn", th: "เบี้ย" },
  },
}

const pieceGlyphs: Record<PieceColor, Record<PieceType, string>> = {
  red: {
    king: "帅",
    advisor: "仕",
    elephant: "相",
    horse: "馬",
    chariot: "車",
    cannon: "炮",
    pawn: "兵",
  },
  black: {
    king: "将",
    advisor: "士",
    elephant: "象",
    horse: "馬",
    chariot: "車",
    cannon: "砲",
    pawn: "卒",
  },
}

const difficultyKeys: Record<AiDifficulty, "chineseChessDifficultyEasy" | "chineseChessDifficultyMedium" | "chineseChessDifficultyHard"> = {
  easy: "chineseChessDifficultyEasy",
  medium: "chineseChessDifficultyMedium",
  hard: "chineseChessDifficultyHard",
}

function isSamePosition(left: Position | null, right: Position): boolean {
  return left?.row === right.row && left.col === right.col
}

export function ChineseChessGame() {
  const { t, locale } = useLocale()
  const game = useChineseChess()
  const [selectedPos, setSelectedPos] = useState<Position | null>(null)
  const [aiSetupOpen, setAiSetupOpen] = useState(false)
  const [draftPlayerColor, setDraftPlayerColor] = useState<PieceColor>(game.playerColor)
  const [draftDifficulty, setDraftDifficulty] = useState<AiDifficulty>(game.difficulty)

  const legalMovesFromSelection = useMemo(
    () => selectedPos ? generateLegalMoves(game.state, selectedPos) : [],
    [game.state, selectedPos],
  )
  const validTargetKeys = useMemo(
    () => new Set(legalMovesFromSelection.map((move) => `${move.to.row}:${move.to.col}`)),
    [legalMovesFromSelection],
  )
  const lastMove = game.state.moveHistory.at(-1)
  const isBoardFlipped = game.mode === "ai" && game.playerColor === "black"
  const canInteractWithBoard = !game.gameResult.over
    && game.aiStatus !== "thinking"
    && game.isHumanTurn

  useEffect(() => {
    setSelectedPos(null)
  }, [game.state])

  const getPieceName = (piece: Piece) => {
    const language = locale === "zh" ? "zh" : locale === "th" ? "th" : "en"
    return pieceNames[piece.color][piece.type][language]
  }

  const getSideLabel = (color: PieceColor) =>
    color === "red" ? t("chineseChessRedSide") : t("chineseChessBlackSide")

  const getSideOwner = (color: PieceColor) => {
    if (game.mode !== "ai") return null
    return color === game.playerColor ? t("chineseChessHuman") : t("chineseChessComputer")
  }

  const openAiSetup = () => {
    setDraftPlayerColor(game.playerColor)
    setDraftDifficulty(game.difficulty)
    setAiSetupOpen(true)
  }

  const handleLocalMode = () => {
    if (game.mode === "local") return
    if (game.hasMoves && !window.confirm(t("chineseChessRestartDescription"))) return
    game.startLocalGame()
  }

  const handleStartAiGame = () => {
    game.startAiGame(draftPlayerColor, draftDifficulty)
  }

  const handleCellClick = (row: number, col: number) => {
    if (!canInteractWithBoard) return

    const clickedPiece = game.state.board[row][col]

    if (!selectedPos) {
      if (clickedPiece?.color === game.state.currentTurn) {
        setSelectedPos({ row, col })
      }
      return
    }

    if (clickedPiece?.color === game.state.currentTurn) {
      setSelectedPos({ row, col })
      return
    }

    const move = legalMovesFromSelection.find(
      (candidate) => candidate.to.row === row && candidate.to.col === col,
    )
    if (move) game.makeMove(move)
    setSelectedPos(null)
  }

  const renderStatusMessage = () => {
    if (game.aiStatus === "thinking") {
      return (
        <div className="game-message flex justify-center" data-slot="game-message">
          <span className="chinese-chess-ai-thinking" role="status">
            {t("chineseChessAiThinking")}
          </span>
        </div>
      )
    }

    if (game.aiStatus === "error") {
      return (
        <div className="game-message flex justify-center" data-slot="game-message">
          <span
            className="game-status-banner rounded-full bg-red-500/15 px-3 py-1 text-center text-xs font-bold text-red-400 sm:text-sm"
            data-tone="danger"
          >
            {t("chineseChessAiError")}
          </span>
        </div>
      )
    }

    if (game.gameResult.over && game.gameResult.winner === null) {
      return (
        <div className="game-message flex justify-center" data-slot="game-message">
          <span
            className="game-status-banner rounded-full bg-sky-500/15 px-3 py-1 text-sm font-bold text-sky-400"
            data-tone="info"
          >
            {game.gameResult.reason === "repetition"
              ? t("chineseChessRepetitionDraw")
              : t("chineseChessDraw")}
          </span>
        </div>
      )
    }

    if (game.gameResult.over && game.gameResult.winner) {
      return (
        <div className="game-message flex flex-col items-center justify-center gap-1" data-slot="game-message">
          <span
            className="game-status-banner rounded-full bg-red-500/20 px-3 py-1 text-sm font-bold text-red-400"
            data-tone="danger"
          >
            {game.gameResult.winner === "red" ? t("redWins") : t("blackWins")}
          </span>
          {game.gameResult.reason === "no-legal-move" && (
            <span className="text-xs text-muted-foreground">{t("chineseChessStalemate")}</span>
          )}
        </div>
      )
    }

    if (game.gameResult.inCheck) {
      return (
        <div className="game-message flex justify-center" data-slot="game-message">
          <span
            className="game-status-banner animate-pulse rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-bold text-yellow-400"
            data-tone="warning"
          >
            {t("check")}
          </span>
        </div>
      )
    }

    return null
  }

  return (
    <div
      className="game-page"
      data-page="chinese-chess"
      data-game-mode={game.mode}
      data-player-color={game.mode === "ai" ? game.playerColor : undefined}
      data-ai-state={game.aiStatus}
      data-difficulty={game.mode === "ai" ? game.difficulty : undefined}
    >
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        homeLabelMode="desktop"
        title={t("chineseChess")}
        className="mb-3 sm:mb-4"
        homeButtonClassName="text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        titleClassName="text-base font-bold text-foreground sm:text-2xl"
      />

      <main
        className="game-content flex flex-1 flex-col items-center gap-4 py-1 sm:py-3"
        data-slot="game-content"
      >
        <div className="chinese-chess-mode-bar" data-slot="game-mode" role="group" aria-label={t("chineseChessAiSetupTitle")}>
          <Button
            type="button"
            variant="ghost"
            className="chinese-chess-mode-option"
            aria-pressed={game.mode === "local"}
            data-active={game.mode === "local" ? "true" : "false"}
            onClick={handleLocalMode}
          >
            <Users aria-hidden="true" />
            {t("chineseChessLocalMode")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="chinese-chess-mode-option"
            aria-pressed={game.mode === "ai"}
            data-active={game.mode === "ai" ? "true" : "false"}
            onClick={openAiSetup}
          >
            <Bot aria-hidden="true" />
            {t("chineseChessAiMode")}
          </Button>
          {game.mode === "ai" && (
            <Button
              type="button"
              variant="ghost"
              className="chinese-chess-ai-summary"
              aria-label={`${t("chineseChessAiSettingsSummary")}: ${getSideLabel(game.playerColor)}, ${t(difficultyKeys[game.difficulty])}`}
              onClick={openAiSetup}
            >
              <SlidersHorizontal aria-hidden="true" />
              <span>{getSideLabel(game.playerColor)} · {t(difficultyKeys[game.difficulty])}</span>
            </Button>
          )}
        </div>

        <Card className="game-summary surface-panel border-white/10 bg-card/70 p-3 sm:p-4" role="status" aria-live="polite">
          <span className="sr-only">
            {game.mode === "ai"
              ? game.isHumanTurn ? t("chineseChessYourTurn") : t("chineseChessAiTurn")
              : game.state.currentTurn === "red" ? t("redTurn") : t("blackTurn")}
          </span>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-4">
              {(["red", "black"] as const).map((color, index) => {
                const active = game.state.currentTurn === color
                const owner = getSideOwner(color)

                return (
                  <div key={color} className="contents">
                    {index > 0 && <div className="h-4 w-px bg-border" aria-hidden="true" />}
                    <div className="flex items-center gap-2" aria-current={active ? "true" : undefined}>
                      <div
                        className={`h-4 w-4 rounded-full ${color === "red"
                          ? active ? "bg-red-500 ring-2 ring-red-300" : "bg-red-950/70"
                          : active ? "bg-slate-800 ring-2 ring-slate-400" : "bg-slate-600"
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm font-medium sm:text-base ${active ? "text-foreground" : "text-muted-foreground"}`}>
                        {getSideLabel(color)}{owner ? ` · ${owner}` : ""}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {renderStatusMessage()}

            {game.mode === "local" ? (
              <div className="game-undo-status flex items-center justify-center gap-4 text-xs" data-slot="undo-status">
                <span className="game-status-copy text-red-400" data-tone="danger">
                  {game.localUndoUsage.red ? t("undoUsed") : `${t("undoRemaining")}: 1`}
                </span>
                <div className="h-3 w-px bg-border" aria-hidden="true" />
                <span className="game-status-copy text-slate-400" data-tone="neutral">
                  {game.localUndoUsage.black ? t("undoUsed") : `${t("undoRemaining")}: 1`}
                </span>
              </div>
            ) : (
              <div className="game-undo-status text-center text-xs text-muted-foreground" data-slot="undo-status">
                {t("chineseChessAiUndoRound")}: {game.aiUndoUsed ? t("undoUsed") : "1"}
              </div>
            )}
          </div>
        </Card>

        <div
          className="game-stage relative aspect-[80/89] w-full max-w-80 rounded-xl border-4 border-amber-800 bg-[#d4a574] p-4 shadow-2xl shadow-black/30"
          data-slot="game-stage"
          aria-busy={game.aiStatus === "thinking"}
        >
          <div className="relative h-full w-full">
            <svg
              className="absolute inset-0 h-full w-full"
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 288 324"
              preserveAspectRatio="none"
            >
              {Array.from({ length: 10 }).map((_, index) => (
                <line key={`h-${index}`} x1={0} y1={index * 36} x2={288} y2={index * 36} stroke="#8b6914" strokeWidth="1.5" />
              ))}
              {Array.from({ length: 9 }).map((_, index) => (
                <line key={`vt-${index}`} x1={index * 36} y1={0} x2={index * 36} y2={144} stroke="#8b6914" strokeWidth="1.5" />
              ))}
              {Array.from({ length: 9 }).map((_, index) => (
                <line key={`vb-${index}`} x1={index * 36} y1={180} x2={index * 36} y2={324} stroke="#8b6914" strokeWidth="1.5" />
              ))}
              <line x1={0} y1={144} x2={0} y2={180} stroke="#8b6914" strokeWidth="1.5" />
              <line x1={288} y1={144} x2={288} y2={180} stroke="#8b6914" strokeWidth="1.5" />
              <line x1={108} y1={0} x2={180} y2={72} stroke="#8b6914" strokeWidth="1.5" />
              <line x1={180} y1={0} x2={108} y2={72} stroke="#8b6914" strokeWidth="1.5" />
              <line x1={108} y1={252} x2={180} y2={324} stroke="#8b6914" strokeWidth="1.5" />
              <line x1={180} y1={252} x2={108} y2={324} stroke="#8b6914" strokeWidth="1.5" />
            </svg>

            <div
              className="pointer-events-none absolute flex items-center justify-center"
              style={{ left: 0, right: 0, top: "44.444%", height: "11.111%" }}
            >
              <span className="text-[clamp(0.7rem,3.6vw,1rem)] font-bold tracking-[0.24em] text-amber-900/55 sm:tracking-[0.5em]">
                {locale === "zh" ? "楚河      汉界" : locale === "th" ? "แม่น้ำ" : "RIVER"}
              </span>
            </div>

            <div className="relative h-full w-full" role="group" aria-label={t("chineseChess")}>
              {Array.from({ length: 10 }).map((_, displayRow) =>
                Array.from({ length: 9 }).map((__, displayCol) => {
                  const row = isBoardFlipped ? 9 - displayRow : displayRow
                  const col = isBoardFlipped ? 8 - displayCol : displayCol
                  const piece = game.state.board[row][col]
                  const position = { row, col }
                  const isSelected = isSamePosition(selectedPos, position)
                  const isValidTarget = validTargetKeys.has(`${row}:${col}`)
                  const isLastMoveFrom = isSamePosition(lastMove?.from ?? null, position)
                  const isLastMoveTo = isSamePosition(lastMove?.to ?? null, position)
                  const sideName = piece ? getSideLabel(piece.color) : ""
                  const targetLabel = isValidTarget ? `, ${t("chineseChessValidDestination")}` : ""

                  return (
                    <button
                      key={`${row}-${col}`}
                      type="button"
                      disabled={!canInteractWithBoard}
                      onClick={() => handleCellClick(row, col)}
                      aria-label={`${displayRow + 1}, ${displayCol + 1}, ${piece ? `${sideName} ${getPieceName(piece)}` : t("chineseChessEmptyIntersection")}${targetLabel}`}
                      aria-pressed={isSelected}
                      className="absolute flex h-[11.111%] w-[12.5%] -translate-x-1/2 -translate-y-1/2 items-center justify-center touch-manipulation transition-all disabled:cursor-default"
                      style={{
                        left: `${(displayCol / 8) * 100}%`,
                        top: `${(displayRow / 9) * 100}%`,
                        zIndex: isSelected ? 10 : 1,
                      }}
                    >
                      {(isLastMoveFrom || isLastMoveTo) && (
                        <span className="absolute h-[88%] w-[88%] rounded bg-yellow-400/40" aria-hidden="true" />
                      )}
                      {isValidTarget && !piece && (
                        <span className="absolute h-[44%] w-[44%] rounded-full bg-green-500/70 shadow" aria-hidden="true" />
                      )}
                      {piece && (
                        <span
                          aria-hidden="true"
                          className={`flex aspect-square w-[88%] items-center justify-center rounded-full border-2 text-[clamp(0.65rem,3.5vw,0.875rem)] font-bold shadow-lg transition-transform ${piece.color === "red"
                            ? "border-red-700 bg-gradient-to-br from-amber-50 to-amber-100 text-red-600"
                            : "border-slate-600 bg-gradient-to-br from-slate-50 to-slate-200 text-slate-800"
                          } ${isSelected ? "scale-110 ring-2 ring-yellow-400" : ""} ${isValidTarget ? "ring-2 ring-green-400" : ""}`}
                        >
                          {pieceGlyphs[piece.color][piece.type]}
                        </span>
                      )}
                    </button>
                  )
                }),
              )}
            </div>
          </div>
        </div>

        <div className="game-actions flex flex-wrap justify-center gap-2" data-slot="game-actions">
          <Button onClick={game.undo} variant="outline" disabled={!game.canUndo}>
            <Undo2 className="mr-1 h-4 w-4 sm:mr-2" aria-hidden="true" />
            {game.mode === "ai" ? t("chineseChessAiUndoRound") : t("undo")}
          </Button>
          <Button onClick={game.resetGame} variant="outline">
            <RotateCcw className="mr-1 h-4 w-4 sm:mr-2" aria-hidden="true" />
            {t("restart")}
          </Button>
          {game.aiStatus === "error" && (
            <Button onClick={game.retryAi} variant="outline">
              <Bot className="mr-1 h-4 w-4 sm:mr-2" aria-hidden="true" />
              {t("chineseChessAiRetry")}
            </Button>
          )}
          <GameRulesDialog
            triggerLabel={t("howToPlay")}
            closeLabel={t("close")}
            triggerIconClassName="mr-1 sm:mr-2"
            titleClassName="text-lg font-bold text-foreground sm:text-xl"
          >
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-foreground">{t("pieceRules")}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {([
                    ["帅", "kingRule"],
                    ["仕", "advisorRule"],
                    ["相", "elephantRule"],
                    ["馬", "horseRule"],
                    ["車", "chariotRule"],
                    ["炮", "cannonRule"],
                    ["兵", "pawnRule"],
                  ] as const).map(([glyph, ruleKey]) => (
                    <li key={ruleKey} className="flex gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-600 bg-amber-50 text-xs font-bold text-red-600">
                        {glyph}
                      </span>
                      <span>{t(ruleKey)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border pt-4">
                <h3 className="mb-2 font-semibold text-foreground">{t("winCondition")}</h3>
                <p className="text-sm text-muted-foreground">{t("chineseChessRepetitionDraw")}</p>
              </div>
            </div>
          </GameRulesDialog>
          {game.gameResult.over && (
            <Button onClick={game.resetGame}>
              <Flag className="mr-1 h-4 w-4 sm:mr-2" aria-hidden="true" />
              {t("newGame")}
            </Button>
          )}
        </div>

        <p className="game-help max-w-md text-center text-xs text-muted-foreground sm:text-sm" data-slot="game-help">
          {game.mode === "ai" ? t("chineseChessAiUndoHint") : t("chessInstructions")}
        </p>
      </main>

      <ChineseChessAiSetup
        open={aiSetupOpen}
        onOpenChange={setAiSetupOpen}
        playerColor={draftPlayerColor}
        difficulty={draftDifficulty}
        onPlayerColorChange={setDraftPlayerColor}
        onDifficultyChange={setDraftDifficulty}
        onStart={handleStartAiGame}
        hasMoves={game.hasMoves}
      />
    </div>
  )
}
