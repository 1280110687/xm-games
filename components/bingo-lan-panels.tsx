"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import {
  Check,
  CircleUserRound,
  Copy,
  LoaderCircle,
  LogOut,
  Play,
  QrCode,
  Radio,
  RotateCcw,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"
import QRCode from "qrcode"

import type { BingoLanGuestProfile, BingoLanGuestStatus } from "@/features/bingo/lan-controller"
import type { BingoLanHostState, BingoLanPublicState } from "@/features/bingo/lan-game"
import { copyTextToClipboard } from "@/lib/client-clipboard"
import { useLocale } from "@/lib/locale-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type BingoPlayMode = "local" | "lan"

export function BingoModeSwitch({
  mode,
  disabled = false,
  onChange,
}: {
  mode: BingoPlayMode
  disabled?: boolean
  onChange: (mode: BingoPlayMode) => void
}) {
  const { t } = useLocale()
  return (
    <div
      className="bingo-mode-switch mb-4 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-card/70 p-1"
      role="group"
      aria-label={t("bingoLanMode")}
    >
      <Button
        type="button"
        variant={mode === "local" ? "secondary" : "ghost"}
        aria-pressed={mode === "local"}
        disabled={disabled}
        onClick={() => onChange("local")}
      >
        {t("bingoLocalMode")}
      </Button>
      <Button
        type="button"
        variant={mode === "lan" ? "secondary" : "ghost"}
        aria-pressed={mode === "lan"}
        disabled={disabled}
        onClick={() => onChange("lan")}
      >
        <Wifi className="size-4" aria-hidden="true" />
        {t("bingoLanMode")}
      </Button>
    </div>
  )
}

export function BingoLanHostPanel({
  state,
  status,
  error,
  canStart,
  onCreate,
  onStart,
  onResetRound,
  onClose,
}: {
  state: BingoLanHostState | null
  status: string
  error: string
  canStart: boolean
  onCreate: () => void
  onStart: () => void
  onResetRound: () => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const inviteUrl = useMemo(() => {
    if (!state || typeof window === "undefined") return ""
    const url = new URL("/bingo-cards", window.location.origin)
    url.searchParams.set("mode", "lan")
    url.searchParams.set("room", state.roomId)
    return url.toString()
  }, [state])

  useEffect(() => {
    let active = true
    if (!inviteUrl) {
      setQrDataUrl("")
      return
    }
    void QRCode.toDataURL(inviteUrl, {
      type: "image/png",
      width: 232,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#101421ff", light: "#ffffffff" },
    }).then((value) => {
      if (active) setQrDataUrl(value)
    }).catch(() => {
      if (active) setQrDataUrl("")
    })
    return () => {
      active = false
    }
  }, [inviteUrl])

  const copyInvite = async () => {
    if (!inviteUrl) return
    try {
      await copyTextToClipboard(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_800)
    } catch {
      setCopied(false)
    }
  }

  if (!state) {
    return (
      <Card className="bingo-lan-panel mb-4 border-white/10 bg-card/75">
        <CardHeader>
          <span className="bingo-lan-eyebrow"><Radio aria-hidden="true" />{t("bingoLanMode")}</span>
          <CardTitle>{t("bingoLanCallerTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("bingoLanCallerDescription")}</p>
          {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}
          <Button onClick={onCreate} disabled={status === "creating"}>
            {status === "creating"
              ? <LoaderCircle className="animate-spin" aria-hidden="true" />
              : <Wifi aria-hidden="true" />}
            {status === "creating" ? t("bingoLanCreatingRoom") : t("bingoLanCreateRoom")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bingo-lan-panel mb-4 gap-0 overflow-hidden border-white/10 bg-card/75 py-0" data-phase={state.phase}>
      <CardHeader className="border-b border-white/[0.08] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="bingo-lan-eyebrow"><Radio aria-hidden="true" />{t("bingoLanMode")}</span>
            <CardTitle className="mt-1">{t("bingoLanCallerTitle")}</CardTitle>
          </div>
          <Badge variant={state.phase === "playing" ? "default" : "outline"}>
            {state.phase === "lobby" && t("bingoLanWaitingPlayers")}
            {state.phase === "playing" && t("bingoLanGameInProgress")}
            {state.phase === "settling" && t("bingoLanSettling")}
            {state.phase === "finished" && t("gameOver")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="bingo-lan-invite flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 p-3">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
            {qrDataUrl
              ? <Image src={qrDataUrl} alt={t("bingoLanShareInvite")} width={88} height={88} unoptimized />
              : <QrCode className="size-10 text-slate-900" aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("bingoLanRoomCode")}</span>
            <strong className="block text-3xl tracking-[0.2em] text-foreground">{state.roomId}</strong>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void copyInvite()}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? t("bingoLanCopied") : t("bingoLanShareInvite")}
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <strong className="inline-flex items-center gap-2"><Users className="size-4" aria-hidden="true" />{t("bingoLanPlayers")}</strong>
            <span className="text-sm tabular-nums text-muted-foreground">{state.players.length} / 8</span>
          </div>
          {state.players.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-muted-foreground">{t("bingoLanNoPlayers")}</p>
          ) : (
            <ul className="bingo-lan-player-list grid gap-2 sm:grid-cols-2" role="list">
              {state.players.map((player) => (
                <li key={player.playerId} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-foreground">{player.nickname}</strong>
                    <small className="text-muted-foreground">{player.cardCount} {t("bingoCards")}</small>
                  </span>
                  <Badge variant={player.ready ? "default" : "outline"}>
                    {player.connected ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
                    {player.ready ? t("bingoLanPlayerReady") : t("bingoLanPlayerWaiting")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {state.phase === "finished" && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3" role="status">
              <strong className="text-amber-300">{t("bingoLanWinners")}</strong>
              <p className="mt-1 text-sm text-foreground">{state.winners.map((winner) => winner.nickname).join("、")}</p>
            </div>
          )}
          {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {state.phase === "lobby" && (
              <Button onClick={onStart} disabled={!canStart}>
                <Play aria-hidden="true" />{t("bingoLanStartGame")}
              </Button>
            )}
            {state.phase === "finished" && (
              <Button onClick={onResetRound}>
                <RotateCcw aria-hidden="true" />{t("bingoLanNewRound")}
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              <LogOut aria-hidden="true" />{t("bingoLanCloseRoom")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function guestStatusText(status: BingoLanGuestStatus, t: ReturnType<typeof useLocale>["t"]): string {
  if (status === "joining") return t("bingoLanJoining")
  if (status === "waiting") return t("bingoLanWaitingSignal")
  if (status === "connecting") return t("bingoLanConnecting")
  if (status === "connected") return t("bingoLanConnected")
  if (status === "reconnecting") return t("bingoLanReconnecting")
  if (status === "closed") return t("bingoLanRoomClosed")
  return ""
}

function guestErrorText(error: string, t: ReturnType<typeof useLocale>["t"]): string {
  if (error === "ROOM_CLOSED") return t("bingoLanRoomClosed")
  if (error === "ROOM_LOCKED") return t("bingoLanRoomLocked")
  if (error === "ROOM_FULL") return t("bingoLanRoomFull")
  if (error === "NICKNAME_TAKEN") return t("bingoLanNicknameTaken")
  if (error === "INVALID_CARDS") return t("bingoLanInvalidCards")
  if (error === "INVALID_MESSAGE") return t("bingoLanInvalidMessage")
  return error
}

export function BingoLanGuestPanel({
  invitedRoomId,
  profile,
  room,
  status,
  error,
  cardCount,
  onJoin,
  onReady,
  onLeave,
  onRetry,
}: {
  invitedRoomId: string
  profile: BingoLanGuestProfile | null
  room: BingoLanPublicState | null
  status: BingoLanGuestStatus
  error: string
  cardCount: number
  onJoin: (roomId: string, nickname: string) => void
  onReady: (ready: boolean) => void
  onLeave: () => void
  onRetry: () => void
}) {
  const { t } = useLocale()
  const [roomId, setRoomId] = useState(invitedRoomId)
  const [nickname, setNickname] = useState("")

  useEffect(() => {
    if (invitedRoomId) setRoomId(invitedRoomId)
  }, [invitedRoomId])

  if (!profile) {
    return (
      <Card className="bingo-lan-panel mb-4 border-white/10 bg-card/75">
        <CardHeader>
          <span className="bingo-lan-eyebrow"><Users aria-hidden="true" />{t("bingoLanMode")}</span>
          <CardTitle>{t("bingoLanJoinTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bingo-lan-room">{t("bingoLanRoomCode")}</Label>
            <Input
              id="bingo-lan-room"
              inputMode="numeric"
              maxLength={6}
              value={roomId}
              onChange={(event) => setRoomId(event.target.value.replace(/\D/gu, "").slice(0, 6))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bingo-lan-nickname">{t("bingoLanNickname")}</Label>
            <Input
              id="bingo-lan-nickname"
              maxLength={32}
              value={nickname}
              placeholder={t("bingoLanNicknamePlaceholder")}
              onChange={(event) => setNickname(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onJoin(roomId, nickname)
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              onClick={() => onJoin(roomId, nickname)}
              disabled={roomId.length !== 6 || nickname.trim().length === 0}
            >
              <Wifi aria-hidden="true" />{t("bingoLanJoinRoom")}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const player = room?.players.find((candidate) => candidate.playerId === profile.playerId)
  const locked = Boolean(room && room.phase !== "lobby")
  const ready = player?.ready ?? profile.ready
  const statusText = guestStatusText(status, t)

  return (
    <Card className="bingo-lan-panel mb-4 gap-0 overflow-hidden border-white/10 bg-card/75 py-0" data-phase={room?.phase ?? "connecting"}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><CircleUserRound aria-hidden="true" /></span>
            <div className="min-w-0">
              <strong className="block truncate text-foreground">{profile.nickname}</strong>
              <span className="text-sm text-muted-foreground">{t("bingoLanRoomCode")} · {profile.roomId}</span>
            </div>
          </div>
          <Badge variant={status === "connected" ? "default" : "outline"}>
            {status === "connected" ? <Wifi aria-hidden="true" /> : <LoaderCircle className={status === "closed" || status === "error" ? "" : "animate-spin"} aria-hidden="true" />}
            {statusText}
          </Badge>
        </div>

        {locked && <p className="mt-3 rounded-xl bg-primary/10 p-3 text-sm text-primary">{t("bingoLanCardsLocked")}</p>}
        {!locked && cardCount === 0 && <p className="mt-3 text-sm text-amber-400">{t("bingoLanNeedCard")}</p>}
        {error && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{guestErrorText(error, t)}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {room?.phase === "lobby" && (
            <Button
              onClick={() => onReady(!ready)}
              variant={ready ? "outline" : "default"}
              disabled={status !== "connected" || (!ready && cardCount === 0)}
            >
              <Check aria-hidden="true" />{ready ? t("bingoLanCancelReady") : t("bingoLanReady")}
            </Button>
          )}
          {(status === "closed" || status === "error") && (
            <Button variant="outline" onClick={onRetry}>{t("bingoLanJoinRoom")}</Button>
          )}
          <Button variant="ghost" onClick={onLeave}>
            <LogOut aria-hidden="true" />{t("bingoLanLeaveRoom")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
