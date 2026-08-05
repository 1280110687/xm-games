"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import {
  Check,
  Dices,
  Link2,
  LoaderCircle,
  LogOut,
  QrCode,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react"
import QRCode from "qrcode"

import { Button } from "../ui/button"
import { Input } from "../ui/input"
import {
  findLanGameSide,
  formatLanGameCopy,
  getLanGameConnectionText,
  type LanGamePanelProps,
} from "./lan-game-panel-model"

export * from "./lan-game-panel-model"

export function LanGamePanel<Side extends string>({
  idPrefix,
  gameTitle,
  phase,
  roomId,
  role,
  connected,
  localReady,
  remoteReady,
  localSide,
  currentSide,
  sides,
  dice,
  error,
  copy,
  onCreateRoom,
  onJoinRoom,
  onReady,
  onLeave,
  onRetry,
}: LanGamePanelProps<Side>) {
  const [joinCode, setJoinCode] = useState("")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [inputError, setInputError] = useState("")
  const roomInputId = `${idPrefix}-room-code`
  const diceTitleId = `${idPrefix}-dice-title`

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invitedRoom = params.get("room")?.replace(/\D/g, "").slice(0, 6)
    if (invitedRoom) setJoinCode(invitedRoom)
  }, [])

  const inviteUrl = useMemo(() => {
    if (!roomId || typeof window === "undefined") return ""
    const url = new URL(window.location.href)
    url.search = ""
    url.hash = ""
    url.searchParams.set("room", roomId)
    return url.toString()
  }, [roomId])

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

  const submitJoin = () => {
    const normalized = joinCode.replace(/\D/g, "").slice(0, 6)
    if (normalized.length !== 6) {
      setInputError(copy.invalidRoom)
      return
    }
    setInputError("")
    onJoinRoom(normalized)
  }

  const copyInvite = async () => {
    if (!inviteUrl) return
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable")
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = inviteUrl
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      textarea.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (phase === "playing") {
    const side = findLanGameSide(sides, localSide)
    const isMyTurn = localSide !== null && localSide === currentSide

    return (
      <section
        className="lan-game-status gomoku-lan-status"
        data-slot="gomoku-lan-status"
        data-game={idPrefix}
        aria-label={gameTitle}
        aria-live="polite"
      >
        <div className="gomoku-lan-status__identity">
          <span className="gomoku-lan-status__signal" data-connected={connected}>
            {connected ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
          </span>
          <div>
            <strong className="inline-flex items-center gap-2">
              {side && (
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/30"
                  style={{ backgroundColor: side.color }}
                  aria-hidden="true"
                />
              )}
              {formatLanGameCopy(copy.yourSide, {
                side: side?.label ?? "",
                stone: side?.label ?? "",
              })}
            </strong>
            <span>{isMyTurn ? copy.yourTurn : copy.opponentTurn}</span>
          </div>
        </div>
        <div className="gomoku-lan-status__room">
          <span>{copy.roomCode}</span>
          <strong>{roomId}</strong>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onLeave} aria-label={copy.leave}>
          <LogOut aria-hidden="true" />
        </Button>
      </section>
    )
  }

  return (
    <>
      <section
        className="lan-game-panel gomoku-lan-panel"
        data-phase={phase}
        data-slot="gomoku-lan-panel"
        data-game={idPrefix}
        aria-label={gameTitle}
      >
        {phase === "idle" || phase === "creating" || phase === "error" ? (
          <div className="gomoku-lan-panel__intro">
            <div className="gomoku-lan-panel__heading">
              <span><Users aria-hidden="true" />{copy.eyebrow}</span>
              <h2>{copy.title}</h2>
              <p>{copy.description}</p>
            </div>

            <div className="gomoku-lan-panel__entry">
              <Button size="lg" onClick={onCreateRoom} disabled={phase === "creating"}>
                {phase === "creating" ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <Wifi aria-hidden="true" />
                )}
                {phase === "creating" ? copy.creating : copy.create}
              </Button>

              <div className="gomoku-lan-panel__divider" aria-hidden="true"><span /></div>

              <div className="gomoku-lan-panel__join">
                <label htmlFor={roomInputId}>{copy.roomCode}</label>
                <div>
                  <Input
                    id={roomInputId}
                    value={joinCode}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder={copy.roomPlaceholder}
                    onChange={(event) => {
                      setJoinCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      setInputError("")
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submitJoin()
                    }}
                  />
                  <Button variant="secondary" onClick={submitJoin}>{copy.join}</Button>
                </div>
                {inputError && <p role="alert">{inputError}</p>}
              </div>
            </div>

            {(error || phase === "error") && (
              <div className="gomoku-lan-panel__error" role="alert">
                <WifiOff aria-hidden="true" />
                <span>{error}</span>
                {roomId && (
                  <Button variant="outline" size="sm" onClick={onRetry}>{copy.retry}</Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="gomoku-lan-room">
            <div className="gomoku-lan-room__topline">
              <div>
                <span>{copy.roomCode}</span>
                <strong>{roomId}</strong>
              </div>
              <span className="gomoku-lan-room__connection" data-connected={connected}>
                {connected ? <Wifi aria-hidden="true" /> : <LoaderCircle className="animate-spin" aria-hidden="true" />}
                {getLanGameConnectionText(phase, connected, copy)}
              </span>
            </div>

            <div className="gomoku-lan-room__players">
              <div data-ready={localReady}>
                <span>{copy.you} · {role === "host" ? copy.host : copy.guest}</span>
                <strong>{localReady ? copy.readyDone : copy.ready}</strong>
              </div>
              <span className="gomoku-lan-room__versus">VS</span>
              <div data-ready={remoteReady}>
                <span>{copy.opponent}</span>
                <strong>{remoteReady ? copy.opponentReady : copy.opponentWaiting}</strong>
              </div>
            </div>

            {role === "host" && !connected && (
              <div className="gomoku-lan-room__invite">
                <div className="gomoku-lan-room__qr">
                  {qrDataUrl ? (
                    <Image src={qrDataUrl} alt={copy.inviteQr} width={116} height={116} unoptimized />
                  ) : (
                    <QrCode aria-hidden="true" />
                  )}
                </div>
                <div>
                  <strong>{copy.inviteQr}</strong>
                  <p>{copy.qrDescription}</p>
                  <Button variant="outline" size="sm" onClick={() => void copyInvite()}>
                    {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
                    {copied ? copy.copied : copy.share}
                  </Button>
                </div>
              </div>
            )}

            <div className="gomoku-lan-room__actions">
              <Button onClick={onReady} disabled={!connected || localReady}>
                {localReady ? <Check aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
                {localReady ? copy.readyDone : copy.ready}
              </Button>
              <Button variant="ghost" onClick={onLeave}>
                <LogOut aria-hidden="true" />{copy.leave}
              </Button>
            </div>

            <p className="gomoku-lan-room__secure"><ShieldCheck aria-hidden="true" />{copy.secure}</p>
          </div>
        )}
      </section>

      {phase === "dice" && dice && (
        <div
          className="lan-game-dice-overlay gomoku-dice-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={diceTitleId}
          data-game={idPrefix}
        >
          <div className="gomoku-dice-card">
            <span className="gomoku-dice-card__icon"><Dices aria-hidden="true" /></span>
            <p className="gomoku-dice-card__round">
              {formatLanGameCopy(copy.diceRound, { round: dice.round })}
            </p>
            <h2 id={diceTitleId}>{copy.diceTitle}</h2>
            <p>{copy.diceDescription}</p>
            <div className="gomoku-dice-card__rolls" data-rolling={dice.status !== "resolved"}>
              <div><span>{copy.you}</span><strong>{dice.local ?? "?"}</strong></div>
              <div><span>{copy.opponent}</span><strong>{dice.remote ?? "?"}</strong></div>
            </div>
            <p className="gomoku-dice-card__status" aria-live="assertive">
              {dice.status === "committing" && copy.diceCommit}
              {dice.status === "revealing" && copy.diceReveal}
              {dice.status === "tied" && copy.diceTie}
              {dice.status === "resolved" && <><Check aria-hidden="true" />{copy.verified}</>}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
