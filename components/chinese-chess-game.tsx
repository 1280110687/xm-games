"use client"

import { useEffect, useMemo, useState } from "react"
import { Bot, Flag, RotateCcw, SlidersHorizontal, Undo2, Users, Wifi } from "lucide-react"

import {
  ChineseChessAiSetup,
  type AiDifficulty,
} from "@/components/chinese-chess-ai-setup"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { GOMOKU_LAN_COPY } from "@/components/multiplayer/gomoku-lan-panel"
import { LanGamePanel } from "@/components/multiplayer/lan-game-panel"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  evaluateGameResult,
  generateLegalMoves,
  type Piece,
  type PieceColor,
  type PieceType,
  type Position,
} from "@/features/chinese-chess/engine"
import { chineseChessLanAdapter } from "@/features/chinese-chess/lan"
import { useChineseChess } from "@/features/chinese-chess/use-chinese-chess"
import {
  useLanTurnGame,
  type LanTurnGameErrorCode,
} from "@/features/multiplayer/use-lan-turn-game"
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

const lanGameMismatchCopy = {
  zh: "这个房间正在进行其他棋类，请进入对应游戏，或创建新的中国象棋房间。",
  en: "This room belongs to another board game. Open that game or create a new Chinese chess room.",
  th: "ห้องนี้เป็นเกมกระดานชนิดอื่น โปรดเปิดเกมนั้นหรือสร้างห้องหมากรุกจีนใหม่",
} as const

const chineseChessLanPanelCopy = {
  zh: {
    title: "和身边的朋友下象棋",
    description: "一台手机创建房间，另一台输入房间码或扫码加入。",
    yourSide: "你执{side}",
    yourTurn: "轮到你走棋",
    opponentTurn: "等待对方走棋",
    diceDescription: "双方设备共同生成并验证结果，点数高的一方执红先行。",
  },
  en: {
    title: "Play Chinese chess nearby",
    description: "Create on one phone, then join by room code or QR on the other.",
    yourSide: "You play {side}",
    yourTurn: "Your move",
    opponentTurn: "Waiting for opponent",
    diceDescription: "Both devices verify the roll. The higher roll takes red and moves first.",
  },
  th: {
    title: "เล่นหมากรุกจีนกับเพื่อนใกล้ตัว",
    description: "สร้างห้องบนมือถือหนึ่งเครื่อง แล้วเข้าด้วยรหัสหรือ QR",
    yourSide: "คุณเล่นฝ่าย{side}",
    yourTurn: "ตาของคุณ",
    opponentTurn: "รอคู่แข่งเดินหมาก",
    diceDescription: "ทั้งสองเครื่องตรวจสอบลูกเต๋าร่วมกัน ผู้ได้แต้มสูงเล่นฝ่ายแดงและเริ่มก่อน",
  },
} as const

const chineseChessLanHelpCopy = {
  zh: "双方准备后共同掷骰，点数高的一方执红先行；联机对局不提供单方悔棋或重开。",
  en: "Both players roll after ready; the higher roll takes red. LAN matches disable unilateral undo and restart.",
  th: "เมื่อพร้อมแล้วทั้งสองฝ่ายจะทอยลูกเต๋า ผู้ได้แต้มสูงเล่นฝ่ายแดง และไม่สามารถถอยหรือเริ่มใหม่ฝ่ายเดียวได้",
} as const

function getChineseChessLanError(
  locale: keyof typeof lanGameMismatchCopy,
  code: LanTurnGameErrorCode | null,
): string {
  if (!code) return ""
  if (code === "GAME_MISMATCH") return lanGameMismatchCopy[locale]
  return GOMOKU_LAN_COPY[locale].errors[code]
}

function isSamePosition(left: Position | null, right: Position): boolean {
  return left?.row === right.row && left.col === right.col
}

export function ChineseChessGame() {
  const { t, locale } = useLocale()
  const game = useChineseChess()
  const lan = useLanTurnGame(chineseChessLanAdapter)
  const { startLanGame } = game
  const [selectedPos, setSelectedPos] = useState<Position | null>(null)
  const [aiSetupOpen, setAiSetupOpen] = useState(false)
  const [draftPlayerColor, setDraftPlayerColor] = useState<PieceColor>(game.playerColor)
  const [draftDifficulty, setDraftDifficulty] = useState<AiDifficulty>(game.difficulty)

  const isLanMode = game.mode === "lan"
  const state = isLanMode ? lan.game : game.state
  const lanGameResult = useMemo(() => evaluateGameResult(lan.game), [lan.game])
  const gameResult = isLanMode ? lanGameResult : game.gameResult
  const showBoard = !isLanMode || lan.phase === "playing"
  const activeHasMoves = state.moveHistory.length > 0
  const baseLanCopy = GOMOKU_LAN_COPY[locale]
  const lanPanelCopy = {
    ...baseLanCopy,
    ...chineseChessLanPanelCopy[locale],
  }

  const legalMovesFromSelection = useMemo(
    () => selectedPos ? generateLegalMoves(state, selectedPos) : [],
    [selectedPos, state],
  )
  const validTargetKeys = useMemo(
    () => new Set(legalMovesFromSelection.map((move) => `${move.to.row}:${move.to.col}`)),
    [legalMovesFromSelection],
  )
  const lastMove = state.moveHistory.at(-1)
  const isBoardFlipped = (
    (game.mode === "ai" && game.playerColor === "black")
    || (isLanMode && lan.localSide === "black")
  )
  const canInteractWithBoard = !gameResult.over && (
    isLanMode
      ? lan.phase === "playing"
        && lan.connected
        && lan.localSide === state.currentTurn
      : game.aiStatus !== "thinking" && game.isHumanTurn
  )

  useEffect(() => {
    setSelectedPos(null)
  }, [state])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("room")) {
      startLanGame()
    }
  }, [startLanGame])

  useEffect(() => {
    if (lan.roomId && game.mode !== "lan") startLanGame()
  }, [game.mode, lan.roomId, startLanGame])

  const getPieceName = (piece: Piece) => {
    const language = locale === "zh" ? "zh" : locale === "th" ? "th" : "en"
    return pieceNames[piece.color][piece.type][language]
  }

  const getSideLabel = (color: PieceColor) =>
    color === "red" ? t("chineseChessRedSide") : t("chineseChessBlackSide")

  const getSideOwner = (color: PieceColor) => {
    if (game.mode === "ai") {
      return color === game.playerColor ? t("chineseChessHuman") : t("chineseChessComputer")
    }
    if (isLanMode && lan.localSide) {
      return color === lan.localSide ? baseLanCopy.you : baseLanCopy.opponent
    }
    return null
  }

  const openAiSetup = () => {
    setDraftPlayerColor(game.playerColor)
    setDraftDifficulty(game.difficulty)
    setAiSetupOpen(true)
  }

  const handleLocalMode = () => {
    if (game.mode === "local") return
    if (activeHasMoves && !window.confirm(t("chineseChessRestartDescription"))) return
    if (isLanMode && lan.phase !== "idle") lan.leaveRoom()
    game.startLocalGame()
  }

  const handleStartAiGame = () => {
    if (isLanMode && lan.phase !== "idle") lan.leaveRoom()
    game.startAiGame(draftPlayerColor, draftDifficulty)
  }

  const handleLanMode = () => {
    if (isLanMode) return
    if (activeHasMoves && !window.confirm(t("chineseChessRestartDescription"))) return
    startLanGame()
  }

  const handleCellClick = (row: number, col: number) => {
    if (!canInteractWithBoard) return

    const clickedPiece = state.board[row][col]

    if (!selectedPos) {
      if (clickedPiece?.color === state.currentTurn) {
        setSelectedPos({ row, col })
      }
      return
    }

    if (clickedPiece?.color === state.currentTurn) {
      setSelectedPos({ row, col })
      return
    }

    const move = legalMovesFromSelection.find(
      (candidate) => candidate.to.row === row && candidate.to.col === col,
    )
    if (move) {
      if (isLanMode) {
        void lan.playAction({ type: "move", from: move.from, to: move.to })
      } else {
        game.makeMove(move)
      }
    }
    setSelectedPos(null)
  }

  const renderStatusMessage = () => {
    if (game.mode === "ai" && game.aiStatus === "thinking") {
      return (
        <div className="game-message flex justify-center" data-slot="game-message">
          <span className="chinese-chess-ai-thinking" role="status">
            {t("chineseChessAiThinking")}
          </span>
        </div>
      )
    }

    if (game.mode === "ai" && game.aiStatus === "error") {
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

    if (gameResult.over && gameResult.winner === null) {
      return (
        <div className="game-message flex justify-center" data-slot="game-message">
          <span
            className="game-status-banner rounded-full bg-sky-500/15 px-3 py-1 text-sm font-bold text-sky-400"
            data-tone="info"
          >
            {gameResult.reason === "repetition"
              ? t("chineseChessRepetitionDraw")
              : t("chineseChessDraw")}
          </span>
        </div>
      )
    }

    if (gameResult.over && gameResult.winner) {
      return (
        <div className="game-message flex flex-col items-center justify-center gap-1" data-slot="game-message">
          <span
            className="game-status-banner rounded-full bg-red-500/20 px-3 py-1 text-sm font-bold text-red-400"
            data-tone="danger"
          >
            {gameResult.winner === "red" ? t("redWins") : t("blackWins")}
          </span>
          {gameResult.reason === "no-legal-move" && (
            <span className="text-xs text-muted-foreground">{t("chineseChessStalemate")}</span>
          )}
        </div>
      )
    }

    if (gameResult.inCheck) {
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
      data-player-color={game.mode === "ai" ? game.playerColor : isLanMode ? lan.localSide ?? undefined : undefined}
      data-ai-state={game.mode === "ai" ? game.aiStatus : undefined}
      data-difficulty={game.mode === "ai" ? game.difficulty : undefined}
      data-lan-phase={isLanMode ? lan.phase : undefined}
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
        <div
          className="chinese-chess-mode-bar"
          data-slot="game-mode"
          data-has-summary={game.mode === "ai" ? "true" : "false"}
          role="group"
          aria-label={t("chineseChess")}
        >
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
          <Button
            type="button"
            variant="ghost"
            className="chinese-chess-mode-option"
            aria-pressed={isLanMode}
            data-active={isLanMode ? "true" : "false"}
            onClick={handleLanMode}
          >
            <Wifi aria-hidden="true" />
            {baseLanCopy.lanMode}
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

        {isLanMode && (
          <LanGamePanel<PieceColor>
            idPrefix="chinese-chess"
            gameTitle={t("chineseChess")}
            phase={lan.phase}
            roomId={lan.roomId}
            role={lan.role}
            connected={lan.connected}
            localReady={lan.localReady}
            remoteReady={lan.remoteReady}
            localSide={lan.localSide}
            currentSide={lan.currentSide}
            sides={[
              { value: "red", label: t("chineseChessRedSide"), color: "#ef4444" },
              { value: "black", label: t("chineseChessBlackSide"), color: "#1f2937" },
            ]}
            dice={lan.dice}
            error={getChineseChessLanError(locale, lan.errorCode)}
            copy={lanPanelCopy}
            onCreateRoom={() => void lan.createRoom()}
            onJoinRoom={(roomId) => void lan.joinRoom(roomId)}
            onReady={lan.markReady}
            onLeave={lan.leaveRoom}
            onRetry={lan.retryConnection}
          />
        )}

        {showBoard && <Card className="game-summary surface-panel border-white/10 bg-card/70 p-3 sm:p-4" role="status" aria-live="polite">
          <span className="sr-only">
            {game.mode === "ai"
              ? game.isHumanTurn ? t("chineseChessYourTurn") : t("chineseChessAiTurn")
              : isLanMode
                ? lan.localSide === state.currentTurn ? baseLanCopy.yourTurn : baseLanCopy.opponentTurn
                : state.currentTurn === "red" ? t("redTurn") : t("blackTurn")}
          </span>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-4">
              {(["red", "black"] as const).map((color, index) => {
                const active = state.currentTurn === color
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
            ) : game.mode === "ai" ? (
              <div className="game-undo-status text-center text-xs text-muted-foreground" data-slot="undo-status">
                {t("chineseChessAiUndoRound")}: {game.aiUndoUsed ? t("undoUsed") : "1"}
              </div>
            ) : null}
          </div>
        </Card>}

        {showBoard && <div
          className="game-stage relative aspect-[80/89] w-full max-w-80 rounded-xl border-4 border-amber-800 bg-[#d4a574] p-4 shadow-2xl shadow-black/30"
          data-slot="game-stage"
          aria-busy={game.mode === "ai" && game.aiStatus === "thinking"}
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
                  const piece = state.board[row][col]
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
        </div>}

        {showBoard && <div className="game-actions flex flex-wrap justify-center gap-2" data-slot="game-actions">
          {!isLanMode && (
            <>
              <Button onClick={game.undo} variant="outline" disabled={!game.canUndo}>
                <Undo2 className="mr-1 h-4 w-4 sm:mr-2" aria-hidden="true" />
                {game.mode === "ai" ? t("chineseChessAiUndoRound") : t("undo")}
              </Button>
              <Button onClick={game.resetGame} variant="outline">
                <RotateCcw className="mr-1 h-4 w-4 sm:mr-2" aria-hidden="true" />
                {t("restart")}
              </Button>
            </>
          )}
          {game.mode === "ai" && game.aiStatus === "error" && (
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
              {isLanMode && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">{chineseChessLanHelpCopy[locale]}</p>
                </div>
              )}
            </div>
          </GameRulesDialog>
          {!isLanMode && gameResult.over && (
            <Button onClick={game.resetGame}>
              <Flag className="mr-1 h-4 w-4 sm:mr-2" aria-hidden="true" />
              {t("newGame")}
            </Button>
          )}
        </div>}

        {showBoard && (
          <p className="game-help max-w-md text-center text-xs text-muted-foreground sm:text-sm" data-slot="game-help">
            {isLanMode
              ? chineseChessLanHelpCopy[locale]
              : game.mode === "ai" ? t("chineseChessAiUndoHint") : t("chessInstructions")}
          </p>
        )}
      </main>

      <ChineseChessAiSetup
        open={aiSetupOpen}
        onOpenChange={setAiSetupOpen}
        playerColor={draftPlayerColor}
        difficulty={draftDifficulty}
        onPlayerColorChange={setDraftPlayerColor}
        onDifficultyChange={setDraftDifficulty}
        onStart={handleStartAiGame}
        hasMoves={activeHasMoves}
      />
    </div>
  )
}
