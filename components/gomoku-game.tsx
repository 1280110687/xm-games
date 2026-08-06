"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLocale } from "@/lib/locale-context"
import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { Gamepad2, RotateCcw, Undo2, Wifi } from "lucide-react"
import {
  GOMOKU_LAN_COPY,
  GomokuLanPanel,
  getGomokuLanError,
} from "@/components/multiplayer/gomoku-lan-panel"
import {
  GOMOKU_BOARD_SIZE,
  createGomokuState,
  placeGomokuStone,
  undoLastGomokuMove,
} from "@/features/gomoku/engine"
import { useLanGomoku } from "@/features/gomoku/use-lan-gomoku"

type GomokuMode = "local" | "lan"

export function GomokuGame() {
  const { t, locale } = useLocale()
  const emptyLabel = locale === "zh" ? "空位" : locale === "th" ? "ช่องว่าง" : "empty"
  const [mode, setMode] = useState<GomokuMode>("local")
  const [localGame, setLocalGame] = useState(createGomokuState)
  const lan = useLanGomoku()
  const lanCopy = GOMOKU_LAN_COPY[locale]
  const game = mode === "local" ? localGame : lan.game
  const { board, currentPlayer, winner, moveHistory } = game
  const blackUndoUsed = game.undoUsed.black
  const whiteUndoUsed = game.undoUsed.white
  const showBoard = mode === "local" || lan.phase === "playing"
  const canPlaceLanStone = (
    mode === "lan" &&
    lan.connected &&
    lan.localStone === currentPlayer &&
    !winner &&
    !game.isDraw
  )
  const drawLabel = locale === "zh" ? "棋盘已满，本局和棋" : locale === "th" ? "กระดานเต็ม เกมเสมอ" : "Board full — draw"
  const lanInstructions = locale === "zh"
    ? "双方准备后共同掷骰，胜者执黑；每一步都由两台手机共同校验。"
    : locale === "th"
      ? "เมื่อพร้อมแล้ว ทั้งสองฝ่ายทอยลูกเต๋าร่วมกัน ผู้ชนะเล่นหมากดำ และทั้งสองเครื่องตรวจสอบทุกตา"
      : "Both players roll after ready. The winner takes black, and both phones verify every move."
  const lanRule = locale === "zh"
    ? "联机模式不提供单方悔棋；终局后双方确认即可保留比分再来一局，并重新掷骰决定先手。"
    : locale === "th"
      ? "โหมด LAN ไม่ให้ถอยฝ่ายเดียว หลังจบเกมทั้งสองฝ่ายยืนยันเพื่อเล่นอีกครั้งพร้อมเก็บคะแนนและทอยลูกเต๋าใหม่"
      : "LAN disables unilateral undo. After the game, both players can confirm a rematch, keep score, and roll again."

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("room")) setMode("lan")
  }, [])

  useEffect(() => {
    if (lan.roomId) setMode("lan")
  }, [lan.roomId])

  const changeMode = (nextMode: GomokuMode) => {
    if (nextMode === "local" && mode === "lan" && lan.phase !== "idle") {
      lan.leaveRoom()
    }
    setMode(nextMode)
  }

  const resetGame = useCallback(() => {
    setLocalGame(createGomokuState())
  }, [])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (mode === "lan") {
      void lan.placeStone(row, col)
      return
    }

    setLocalGame((current) => {
      const result = placeGomokuStone(current, row, col)
      return result.ok ? result.state : current
    })
  }, [lan, mode])

  const handleUndo = useCallback(() => {
    setLocalGame((current) => {
      const result = undoLastGomokuMove(current)
      return result.ok ? result.state : current
    })
  }, [])

  return (
    <div
      className="game-page"
      data-page="gomoku"
      data-game-mode={mode}
      data-lan-phase={mode === "lan" ? lan.phase : undefined}
      data-lan-finished={mode === "lan" && lan.series.outcome !== "playing" ? "true" : undefined}
    >
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        homeLabelMode="desktop"
        title={t("gomoku")}
        className="mb-4"
        homeButtonClassName="text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        titleClassName="text-base font-bold text-foreground sm:text-2xl"
      />

      <main
        className="game-content flex flex-1 flex-col items-center gap-4 py-2 sm:py-4"
        data-slot="game-content"
      >
        <div className="gomoku-mode-switch" role="tablist" aria-label={t("gomoku")}>
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
          <GomokuLanPanel
            locale={locale}
            phase={lan.phase}
            roomId={lan.roomId}
            role={lan.role}
            connected={lan.connected}
            localReady={lan.localReady}
            remoteReady={lan.remoteReady}
            localStone={lan.localStone}
            currentPlayer={lan.game.winner || lan.game.isDraw ? null : lan.game.currentPlayer}
            dice={lan.dice}
            series={lan.series}
            error={getGomokuLanError(locale, lan.errorCode)}
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
            {/* Game status */}
            <Card className="game-summary surface-panel border-white/10 bg-card/70 px-4 py-2" role="status" aria-live="polite">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`h-5 w-5 rounded-full bg-slate-950 ${currentPlayer === "black" ? "ring-2 ring-primary" : ""}`} />
                  <span className={`text-sm ${currentPlayer === "black" ? "text-foreground" : "text-muted-foreground"}`}>
                    {t("blackStone")}
                  </span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div className={`h-5 w-5 rounded-full bg-white ${currentPlayer === "white" ? "ring-2 ring-primary" : ""}`} />
                  <span className={`text-sm ${currentPlayer === "white" ? "text-foreground" : "text-muted-foreground"}`}>
                    {t("whiteStone")}
                  </span>
                </div>
              </div>
            </Card>

            {(winner || game.isDraw) && (
              <div
                className="game-message game-status-banner rounded-lg bg-yellow-500/20 px-4 py-2 text-lg font-bold text-yellow-300"
                data-tone="success"
                data-slot="game-message"
                role="status"
                aria-live="assertive"
              >
                {game.isDraw ? drawLabel : winner === "black" ? t("blackWinsGo") : t("whiteWinsGo")}
              </div>
            )}

            {/* Undo status */}
            {mode === "local" && (
              <div
                className="gomoku-undo-status flex items-center gap-4 text-xs text-muted-foreground"
                data-slot="gomoku-undo-status"
              >
                <span>{t("blackStone")}: {blackUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
                <span>{t("whiteStone")}: {whiteUndoUsed ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
              </div>
            )}

            {/* Game board */}
            <div
              className="game-stage relative aspect-square w-full max-w-[23.5rem] rounded-xl border-4 border-amber-800 bg-amber-600 p-2 shadow-2xl shadow-black/30"
              data-slot="game-stage"
            >
              <div className="relative h-full w-full">
              {/* Grid lines */}
              <svg
                className="pointer-events-none absolute left-[3.333%] top-[3.333%] h-[93.333%] w-[93.333%]"
                aria-hidden="true"
                focusable="false"
                viewBox={`0 0 ${(GOMOKU_BOARD_SIZE - 1) * 24} ${(GOMOKU_BOARD_SIZE - 1) * 24}`}
                preserveAspectRatio="none"
              >
                {Array.from({ length: GOMOKU_BOARD_SIZE }).map((_, i) => (
                  <g key={i}>
                    <line
                      x1={0}
                      y1={i * 24}
                      x2={(GOMOKU_BOARD_SIZE - 1) * 24}
                      y2={i * 24}
                      stroke="#8B4513"
                      strokeWidth="1"
                    />
                    <line
                      x1={i * 24}
                      y1={0}
                      x2={i * 24}
                      y2={(GOMOKU_BOARD_SIZE - 1) * 24}
                      stroke="#8B4513"
                      strokeWidth="1"
                    />
                  </g>
                ))}
                {/* Star points */}
                {[[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]].map(([r, c]) => (
                  <circle key={`${r}-${c}`} cx={c * 24} cy={r * 24} r={3} fill="#8B4513" />
                ))}
              </svg>

              {/* Stones */}
              <div
                className="relative grid h-full w-full"
                role="group"
                aria-label={t("gomoku")}
                style={{ gridTemplateColumns: `repeat(${GOMOKU_BOARD_SIZE}, minmax(0, 1fr))` }}
              >
                {board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <button
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      className="flex aspect-square w-full touch-manipulation items-center justify-center"
                      disabled={
                        !!winner ||
                        game.isDraw ||
                        cell !== null ||
                        (mode === "lan" && !canPlaceLanStone)
                      }
                      aria-label={`${rowIndex + 1}, ${colIndex + 1}, ${cell === "black" ? t("blackStone") : cell === "white" ? t("whiteStone") : emptyLabel}`}
                    >
                      {cell && (
                        <div
                          aria-hidden="true"
                          className={`aspect-square w-[82%] rounded-full shadow-md ${
                            cell === "black"
                              ? "bg-gradient-to-br from-slate-700 to-slate-900"
                              : "bg-gradient-to-br from-white to-slate-200"
                          }`}
                        />
                      )}
                    </button>
                  ))
                )}
              </div>
              </div>
            </div>

            {/* Controls */}
            <div className="game-actions flex flex-wrap justify-center gap-2" data-slot="game-actions">
              {mode === "local" && (
                <>
                  <Button
                    onClick={handleUndo}
                    variant="outline"
                    disabled={
                      moveHistory.length === 0 ||
                      !!winner ||
                      (moveHistory.length > 0 && moveHistory[moveHistory.length - 1].stone === "black" && blackUndoUsed) ||
                      (moveHistory.length > 0 && moveHistory[moveHistory.length - 1].stone === "white" && whiteUndoUsed)
                    }
                  >
                    <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t("undo")}
                  </Button>
                  <Button onClick={resetGame} variant="outline">
                    <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t("restart")}
                  </Button>
                </>
              )}
              <GameRulesDialog
                triggerLabel={t("howToPlay")}
                closeLabel={t("close")}
                titleClassName="text-lg font-bold text-foreground"
              >
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>{t("gomokuRule1")}</li>
                  <li>{t("gomokuRule2")}</li>
                  <li>{mode === "lan" ? lanRule : t("gomokuRule3")}</li>
                </ul>
              </GameRulesDialog>
            </div>

            <p className="game-help max-w-md text-center text-xs text-muted-foreground" data-slot="game-help">
              {mode === "lan" ? lanInstructions : t("gomokuInstructions")}
            </p>
          </>
        )}

      </main>
    </div>
  )
}
