"use client"

import { useCallback, useEffect, useState } from "react"
import { Flag, Gamepad2, RotateCcw, Undo2, Wifi } from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { GOMOKU_LAN_COPY } from "@/components/multiplayer/gomoku-lan-panel"
import { LanGamePanel } from "@/components/multiplayer/lan-game-panel"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  GO_BOARD_SIZE,
  applyGoAction,
  createGoState,
  oppositeGoPlayer,
  type GoAction,
  type GoPlayer,
  type GoState,
} from "@/features/go/engine"
import { goLanAdapter } from "@/features/go/lan"
import { useLanTurnGame } from "@/features/multiplayer/use-lan-turn-game"
import { useLocale } from "@/lib/locale-context"

type GoGameMode = "local" | "lan"

const LAN_INSTRUCTIONS = {
  zh: "双方准备后共同掷骰，胜者执黑；落子、提子、劫与停一手都由两台设备共同校验。",
  en: "Both players roll after ready. The winner takes black, and both devices verify moves, captures, ko, and passes.",
  th: "เมื่อพร้อมแล้วทั้งสองฝ่ายทอยลูกเต๋า ผู้ชนะเล่นหมากดำ และทั้งสองเครื่องตรวจสอบการลงหมาก การจับ โคะ และการผ่าน",
} as const

const LAN_RULE = {
  zh: "联机模式不提供单方悔棋或重开；连续两次停一手后自动结束并计分。",
  en: "LAN matches disable unilateral undo and restart. Two consecutive passes end and score the game.",
  th: "โหมด LAN ไม่ให้ย้อนหรือเริ่มใหม่ฝ่ายเดียว การผ่านสองครั้งติดกันจะจบเกมและนับคะแนน",
} as const

const GAME_MISMATCH = {
  zh: "这个房间属于其他棋类，请核对邀请链接或重新创建围棋房间。",
  en: "This room belongs to another board game. Check the invite or create a new Go room.",
  th: "ห้องนี้เป็นของเกมกระดานชนิดอื่น โปรดตรวจสอบลิงก์เชิญหรือสร้างห้องโกะใหม่",
} as const

export function GoGame() {
  const { t, locale } = useLocale()
  const [mode, setMode] = useState<GoGameMode>("local")
  const [localGame, setLocalGame] = useState<GoState>(createGoState)
  const [history, setHistory] = useState<GoState[]>([])
  const [undoUsed, setUndoUsed] = useState<Record<GoPlayer, boolean>>({
    black: false,
    white: false,
  })
  const lan = useLanTurnGame(goLanAdapter)
  const lanCopy = GOMOKU_LAN_COPY[locale]
  const game = mode === "local" ? localGame : lan.game
  const { board, currentPlayer, captures, status, lastMove, result } = game
  const showBoard = mode === "local" || lan.phase === "playing"
  const canPlayLan = mode === "lan"
    && lan.connected
    && lan.localSide === currentPlayer
    && status === "playing"

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("room")) setMode("lan")
  }, [])

  useEffect(() => {
    if (lan.roomId) setMode("lan")
  }, [lan.roomId])

  const changeMode = (nextMode: GoGameMode) => {
    if (nextMode === "local" && mode === "lan" && lan.phase !== "idle") {
      lan.leaveRoom()
    }
    setMode(nextMode)
  }

  const resetGame = useCallback(() => {
    setLocalGame(createGoState())
    setHistory([])
    setUndoUsed({ black: false, white: false })
  }, [])

  const playLocalAction = useCallback((action: GoAction) => {
    if (localGame.status !== "playing") return
    const applied = applyGoAction(localGame, action, localGame.currentPlayer)
    if (!applied.ok) return
    setHistory((previous) => [...previous, localGame])
    setLocalGame(applied.state)
  }, [localGame])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (mode === "lan") {
      if (canPlayLan) void lan.playAction({ type: "place", row, col })
      return
    }
    playLocalAction({ type: "place", row, col })
  }, [canPlayLan, lan, mode, playLocalAction])

  const handlePass = useCallback(() => {
    if (mode === "lan") {
      if (canPlayLan) void lan.playAction({ type: "pass" })
      return
    }
    playLocalAction({ type: "pass" })
  }, [canPlayLan, lan, mode, playLocalAction])

  const handleUndo = useCallback(() => {
    if (mode !== "local" || history.length === 0 || localGame.status === "ended") return
    const undoingPlayer = oppositeGoPlayer(localGame.currentPlayer)
    if (undoUsed[undoingPlayer]) return

    const previous = history.at(-1)
    if (!previous) return
    setLocalGame(previous)
    setHistory((entries) => entries.slice(0, -1))
    setUndoUsed((used) => ({ ...used, [undoingPlayer]: true }))
  }, [history, localGame, mode, undoUsed])

  const lanError = lan.errorCode === "GAME_MISMATCH"
    ? GAME_MISMATCH[locale]
    : lan.errorCode
      ? lanCopy.errors[lan.errorCode]
      : ""

  const starPoints = [
    { row: 2, col: 2 },
    { row: 2, col: 6 },
    { row: 4, col: 4 },
    { row: 6, col: 2 },
    { row: 6, col: 6 },
  ]

  return (
    <div
      className="game-page"
      data-page="go"
      data-game-mode={mode}
      data-lan-phase={mode === "lan" ? lan.phase : undefined}
    >
      <GameHeader
        layout="centered"
        homeLabel={t("appName")}
        homeLabelMode="desktop"
        title={t("go")}
        className="mb-4"
        homeButtonClassName="text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
        titleClassName="text-base font-bold text-foreground sm:text-2xl"
      />

      <main
        className="game-content flex flex-1 flex-col items-center gap-4 py-2 sm:py-4"
        data-slot="game-content"
      >
        <div className="gomoku-mode-switch" role="tablist" aria-label={t("go")}>
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
            idPrefix="go"
            gameTitle={t("go")}
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
            error={lanError}
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
              className="game-summary surface-panel w-full max-w-lg border-white/10 bg-card/70 p-3"
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-5 w-5 rounded-full border-2 ${currentPlayer === "black" && status === "playing" ? "border-primary bg-slate-950" : "border-transparent bg-slate-800"}`} />
                    <span className={`text-sm ${currentPlayer === "black" && status === "playing" ? "text-foreground" : "text-muted-foreground"}`}>
                      {t("blackStone")} ({captures.black})
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <div className={`h-5 w-5 rounded-full border-2 ${currentPlayer === "white" && status === "playing" ? "border-primary bg-stone-50" : "border-transparent bg-stone-300"}`} />
                    <span className={`text-sm ${currentPlayer === "white" && status === "playing" ? "text-foreground" : "text-muted-foreground"}`}>
                      {t("whiteStone")} ({captures.white})
                    </span>
                  </div>
                </div>

                {result && (
                  <div className="game-message mt-2 text-center" data-slot="game-message">
                    <p className="text-sm text-muted-foreground">
                      {t("blackStone")}: {result.black.toFixed(1)} | {t("whiteStone")}: {result.white.toFixed(1)}
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {result.winner === "black" ? t("blackWinsGo") : t("whiteWinsGo")}
                    </p>
                  </div>
                )}

                {mode === "local" && (
                  <div
                    className="game-undo-status flex items-center justify-center gap-4 text-xs text-muted-foreground"
                    data-slot="undo-status"
                  >
                    <span>{undoUsed.black ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
                    <div className="h-3 w-px bg-border" />
                    <span>{undoUsed.white ? t("undoUsed") : `${t("undoRemaining")}: 1`}</span>
                  </div>
                )}
              </div>
            </Card>

            <div
              className={`game-stage relative aspect-square rounded-xl border-4 border-amber-800 bg-[#dcb35c] p-3 shadow-2xl shadow-black/30 ${mode === "lan" ? "w-[min(calc(100vw-1rem),calc(100svh-19rem),19.5rem)]" : "w-full max-w-[19.5rem]"}`}
              data-slot="game-stage"
            >
              <svg
                className="absolute"
                aria-hidden="true"
                focusable="false"
                style={{
                  left: "12px",
                  top: "12px",
                  width: "calc(100% - 24px)",
                  height: "calc(100% - 24px)",
                }}
                viewBox={`0 0 ${(GO_BOARD_SIZE - 1) * 32} ${(GO_BOARD_SIZE - 1) * 32}`}
              >
                {Array.from({ length: GO_BOARD_SIZE }).map((_, index) => (
                  <line
                    key={`h-${index}`}
                    x1={0}
                    y1={index * 32}
                    x2={(GO_BOARD_SIZE - 1) * 32}
                    y2={index * 32}
                    stroke="#5a4a2a"
                    strokeWidth="1"
                  />
                ))}
                {Array.from({ length: GO_BOARD_SIZE }).map((_, index) => (
                  <line
                    key={`v-${index}`}
                    x1={index * 32}
                    y1={0}
                    x2={index * 32}
                    y2={(GO_BOARD_SIZE - 1) * 32}
                    stroke="#5a4a2a"
                    strokeWidth="1"
                  />
                ))}
                {starPoints.map((point) => (
                  <circle
                    key={`${point.row}-${point.col}`}
                    cx={point.col * 32}
                    cy={point.row * 32}
                    r={4}
                    fill="#5a4a2a"
                  />
                ))}
              </svg>

              <div className="relative h-full w-full" role="group" aria-label={t("go")}>
                {board.map((row, rowIndex) =>
                  row.map((stone, colIndex) => {
                    const enabled = stone === null
                      && status === "playing"
                      && (mode === "local" || canPlayLan)
                    return (
                      <button
                        key={`${rowIndex}-${colIndex}`}
                        type="button"
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        disabled={!enabled}
                        aria-label={`${rowIndex + 1}, ${colIndex + 1}, ${stone === "black" ? t("blackStone") : stone === "white" ? t("whiteStone") : "empty"}`}
                        aria-current={lastMove?.row === rowIndex && lastMove?.col === colIndex ? "true" : undefined}
                        className="absolute flex aspect-square w-[11.111%] -translate-x-1/2 -translate-y-1/2 items-center justify-center touch-manipulation disabled:cursor-default"
                        style={{
                          left: `${(colIndex / (GO_BOARD_SIZE - 1)) * 100}%`,
                          top: `${(rowIndex / (GO_BOARD_SIZE - 1)) * 100}%`,
                        }}
                      >
                        {lastMove?.row === rowIndex && lastMove?.col === colIndex && (
                          <div className="absolute z-10 h-3 w-3 rounded-full bg-red-500/70" aria-hidden="true" />
                        )}
                        {stone && (
                          <div
                            aria-hidden="true"
                            className={`h-[87.5%] w-[87.5%] rounded-full shadow-lg ${stone === "black" ? "bg-gradient-to-br from-slate-700 to-slate-900" : "border border-amber-300 bg-gradient-to-br from-amber-50 to-amber-200"}`}
                          />
                        )}
                      </button>
                    )
                  }),
                )}
              </div>
            </div>

            <div className="game-actions flex flex-wrap justify-center gap-2" data-slot="game-actions">
              <Button
                onClick={handlePass}
                disabled={status === "ended" || (mode === "lan" && !canPlayLan)}
              >
                <Flag className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("pass")}
              </Button>
              {mode === "local" && (
                <>
                  <Button
                    onClick={handleUndo}
                    disabled={
                      history.length === 0
                      || status === "ended"
                      || undoUsed[oppositeGoPlayer(currentPlayer)]
                    }
                    variant="outline"
                  >
                    <Undo2 className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t("undo")}
                  </Button>
                  <Button onClick={resetGame} variant="outline">
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
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>{t("goRule1")}</p>
                  <p>{t("goRule2")}</p>
                  <p>{t("goRule3")}</p>
                  <p>{t("goRule4")}</p>
                  <p>{mode === "lan" ? LAN_RULE[locale] : t("goRule5")}</p>
                </div>
              </GameRulesDialog>
            </div>

            <p className="game-help max-w-md text-center text-xs text-muted-foreground" data-slot="game-help">
              {mode === "lan" ? LAN_INSTRUCTIONS[locale] : t("goInstructions")}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
