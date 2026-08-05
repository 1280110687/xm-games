"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Gamepad2, RotateCcw, Wifi } from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import {
  GOMOKU_LAN_COPY,
} from "@/components/multiplayer/gomoku-lan-panel"
import { LanGamePanel } from "@/components/multiplayer/lan-game-panel"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  countReversiStones,
  createReversiState,
  getReversiValidMoves,
  placeReversiStone,
} from "@/features/reversi/engine"
import { reversiLanAdapter } from "@/features/reversi/lan"
import {
  canPlaceLanReversiStone,
  getReversiLanError,
  shouldShowReversiBoard,
  type ReversiGameMode,
} from "@/features/reversi/lan-view"
import { useLanTurnGame } from "@/features/multiplayer/use-lan-turn-game"
import { useLocale } from "@/lib/locale-context"

const LAN_INSTRUCTIONS = {
  zh: "双方准备后共同掷骰，胜者执黑；每一步都由两台设备共同校验。",
  en: "Both players roll after ready. The winner takes black, and both devices verify every move.",
  th: "เมื่อพร้อมแล้ว ทั้งสองฝ่ายทอยลูกเต๋า ผู้ชนะเล่นหมากดำ และทั้งสองเครื่องตรวจสอบทุกตา",
} as const

const LAN_RULE = {
  zh: "联机模式不提供单方重开，避免两台设备的棋盘状态不一致。",
  en: "LAN matches disable unilateral restart so both boards stay in sync.",
  th: "โหมด LAN ไม่ให้เริ่มใหม่ฝ่ายเดียว เพื่อให้กระดานของทั้งสองเครื่องตรงกัน",
} as const

export function ReversiGame() {
  const { t, locale } = useLocale()
  const emptyLabel = locale === "zh" ? "空位" : locale === "th" ? "ช่องว่าง" : "empty"
  const validLabel = locale === "zh" ? "可落子" : locale === "th" ? "ลงหมากได้" : "valid move"
  const [mode, setMode] = useState<ReversiGameMode>("local")
  const [localGame, setLocalGame] = useState(createReversiState)
  const lan = useLanTurnGame(reversiLanAdapter)
  const lanCopy = GOMOKU_LAN_COPY[locale]
  const game = mode === "local" ? localGame : lan.game
  const { board, currentPlayer, gameOver, winner } = game
  const validMoves = useMemo(
    () => gameOver ? [] : getReversiValidMoves(board, currentPlayer),
    [board, currentPlayer, gameOver],
  )
  const showBoard = shouldShowReversiBoard(mode, lan.phase)
  const canPlayLan = mode === "lan" && canPlaceLanReversiStone({
    connected: lan.connected,
    localSide: lan.localSide,
    currentPlayer,
    gameOver,
  })
  const { black: blackCount, white: whiteCount } = countReversiStones(board)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("room")) setMode("lan")
  }, [])

  useEffect(() => {
    if (lan.roomId) setMode("lan")
  }, [lan.roomId])

  const changeMode = (nextMode: ReversiGameMode) => {
    if (nextMode === "local" && mode === "lan" && lan.phase !== "idle") {
      lan.leaveRoom()
    }
    setMode(nextMode)
  }

  const resetGame = useCallback(() => {
    setLocalGame(createReversiState())
  }, [])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (mode === "lan") {
      if (canPlayLan) void lan.playAction({ type: "place", row, col })
      return
    }

    setLocalGame((current) => {
      const result = placeReversiStone(current, row, col)
      return result.ok ? result.state : current
    })
  }, [canPlayLan, lan, mode])

  const isValidMove = (row: number, col: number) => (
    validMoves.some((move) => move.row === row && move.col === col)
  )

  return (
    <div
      className="game-page"
      data-page="reversi"
      data-game-mode={mode}
      data-lan-phase={mode === "lan" ? lan.phase : undefined}
    >
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        homeLabelMode="desktop"
        title={t("reversi")}
        className="mb-4"
        homeButtonClassName="text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        titleClassName="text-base font-bold text-foreground sm:text-2xl"
      />

      <main
        className="game-content flex flex-1 flex-col items-center gap-4 py-2 sm:py-4"
        data-slot="game-content"
      >
        <div className="gomoku-mode-switch" role="tablist" aria-label={t("reversi")}>
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
          <LanGamePanel
            idPrefix="reversi"
            gameTitle={t("reversi")}
            phase={lan.phase}
            roomId={lan.roomId}
            role={lan.role}
            connected={lan.connected}
            localReady={lan.localReady}
            remoteReady={lan.remoteReady}
            localSide={lan.localSide}
            currentSide={lan.currentSide}
            sides={[
              { value: "black", label: lanCopy.black, color: "#111827" },
              { value: "white", label: lanCopy.white, color: "#f8fafc" },
            ]}
            dice={lan.dice}
            error={getReversiLanError(locale, lan.errorCode, lanCopy.errors)}
            copy={lanCopy}
            onCreateRoom={() => void lan.createRoom()}
            onJoinRoom={(roomId) => void lan.joinRoom(roomId)}
            onReady={lan.markReady}
            onLeave={lan.leaveRoom}
            onRetry={lan.retryConnection}
          />
        )}

        {showBoard && (
          <>
            <Card
              className="game-summary surface-panel border-white/10 bg-card/70 px-4 py-2"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 ${!gameOver && currentPlayer === "black" ? "ring-2 ring-primary" : ""}`}>
                    <span className="text-xs font-bold text-white">{blackCount}</span>
                  </div>
                  <span className={`text-sm ${!gameOver && currentPlayer === "black" ? "text-foreground" : "text-muted-foreground"}`}>
                    {t("blackStone")}
                  </span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-white ${!gameOver && currentPlayer === "white" ? "ring-2 ring-primary" : ""}`}>
                    <span className="text-xs font-bold text-slate-900">{whiteCount}</span>
                  </div>
                  <span className={`text-sm ${!gameOver && currentPlayer === "white" ? "text-foreground" : "text-muted-foreground"}`}>
                    {t("whiteStone")}
                  </span>
                </div>
              </div>
            </Card>

            {gameOver && (
              <div
                className="game-message game-status-banner rounded-lg bg-yellow-500/20 px-4 py-2 text-lg font-bold text-yellow-300"
                data-tone="success"
                data-slot="game-message"
                role="status"
                aria-live="assertive"
              >
                {winner === "tie"
                  ? t("tie")
                  : winner === "black"
                    ? t("blackWinsGo")
                    : t("whiteWinsGo")}
              </div>
            )}

            <div
              className={`game-stage rounded-xl border-4 border-green-800 bg-green-600 p-1 shadow-2xl shadow-black/30 ${
                mode === "lan"
                  ? "w-[min(calc(100vw-1rem),calc(100svh-19rem),22.875rem)]"
                  : "w-full max-w-[22.875rem]"
              }`}
              data-slot="game-stage"
            >
              <div className="grid w-full grid-cols-8 gap-px bg-green-800" role="group" aria-label={t("reversi")}>
                {board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const isValid = isValidMove(rowIndex, colIndex)
                    const isEnabled = isValid && !gameOver && (mode === "local" || canPlayLan)
                    return (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        disabled={!isEnabled}
                        aria-label={`${rowIndex + 1}, ${colIndex + 1}, ${cell === "black" ? t("blackStone") : cell === "white" ? t("whiteStone") : emptyLabel}${isValid ? `, ${validLabel}` : ""}`}
                        className={`flex aspect-square w-full touch-manipulation items-center justify-center bg-green-600 ${isEnabled ? "cursor-pointer" : "cursor-default"}`}
                      >
                        {cell ? (
                          <div
                            aria-hidden="true"
                            className={`h-[78%] w-[78%] rounded-full shadow-md transition-all ${
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
                  }),
                )}
              </div>
            </div>

            <div className="game-actions flex gap-2" data-slot="game-actions">
              {mode === "local" && (
                <Button onClick={resetGame} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("restart")}
                </Button>
              )}
              <GameRulesDialog
                triggerLabel={t("howToPlay")}
                closeLabel={t("close")}
                titleClassName="text-lg font-bold text-foreground"
              >
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>{t("reversiRule1")}</li>
                  <li>{t("reversiRule2")}</li>
                  <li>{t("reversiRule3")}</li>
                  <li>{mode === "lan" ? LAN_RULE[locale] : t("reversiRule4")}</li>
                </ul>
              </GameRulesDialog>
            </div>

            <p className="game-help max-w-md text-center text-xs text-muted-foreground" data-slot="game-help">
              {mode === "lan" ? LAN_INSTRUCTIONS[locale] : t("reversiInstructions")}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
