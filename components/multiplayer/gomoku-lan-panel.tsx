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

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { GomokuStone } from "@/features/gomoku/engine"
import type { LanGomokuErrorCode } from "@/features/gomoku/use-lan-gomoku"
import type { Locale } from "@/lib/i18n"

export type GomokuLanPhase =
  | "idle"
  | "creating"
  | "waiting"
  | "connecting"
  | "ready"
  | "dice"
  | "syncing"
  | "playing"
  | "reconnecting"
  | "error"

export interface GomokuDiceView {
  local: number | null
  remote: number | null
  round: number
  status: "committing" | "revealing" | "resolved" | "tied"
}

interface GomokuLanPanelProps {
  locale: Locale
  phase: GomokuLanPhase
  roomId: string
  role: "host" | "guest" | null
  connected: boolean
  localReady: boolean
  remoteReady: boolean
  localStone: GomokuStone | null
  currentPlayer: GomokuStone
  dice: GomokuDiceView | null
  error: string
  onCreateRoom: () => void
  onJoinRoom: (roomId: string) => void
  onReady: () => void
  onLeave: () => void
  onRetry: () => void
}

const COPY: Record<
  Locale,
  {
    localMode: string
    lanMode: string
    eyebrow: string
    title: string
    description: string
    create: string
    creating: string
    roomCode: string
    roomPlaceholder: string
    join: string
    share: string
    copied: string
    inviteQr: string
    qrDescription: string
    waiting: string
    connecting: string
    syncing: string
    connected: string
    reconnecting: string
    you: string
    opponent: string
    host: string
    guest: string
    ready: string
    readyDone: string
    opponentReady: string
    opponentWaiting: string
    leave: string
    retry: string
    diceTitle: string
    diceDescription: string
    diceCommit: string
    diceReveal: string
    diceTie: string
    diceRound: string
    verified: string
    black: string
    white: string
    yourSide: string
    yourTurn: string
    opponentTurn: string
    secure: string
    invalidRoom: string
    errors: Record<LanGomokuErrorCode, string>
  }
> = {
  zh: {
    localMode: "本机双人",
    lanMode: "局域网对战",
    eyebrow: "H5 双人联机",
    title: "和身边的朋友对弈",
    description: "一台手机创建房间，另一台输入房间码或扫码加入。",
    create: "创建房间",
    creating: "正在创建",
    roomCode: "房间码",
    roomPlaceholder: "输入 6 位房间码",
    join: "加入房间",
    share: "复制邀请链接",
    copied: "已复制",
    inviteQr: "扫码加入",
    qrDescription: "让另一台手机用系统相机扫描",
    waiting: "等待另一位玩家加入",
    connecting: "正在建立手机直连",
    syncing: "正在核对双方棋盘",
    connected: "已建立点对点连接",
    reconnecting: "连接中断，正在恢复",
    you: "你",
    opponent: "对手",
    host: "创建者",
    guest: "加入者",
    ready: "我准备好了",
    readyDone: "已准备",
    opponentReady: "对方已准备",
    opponentWaiting: "等待对方准备",
    leave: "退出房间",
    retry: "重新连接",
    diceTitle: "掷骰决定先手",
    diceDescription: "结果由双方随机数共同生成并验证",
    diceCommit: "双方正在锁定随机数",
    diceReveal: "正在共同验证点数",
    diceTie: "点数相同，使用新随机数重掷",
    diceRound: "第 {round} 轮",
    verified: "双方验证通过",
    black: "黑棋",
    white: "白棋",
    yourSide: "你执{stone}",
    yourTurn: "轮到你落子",
    opponentTurn: "等待对方落子",
    secure: "棋局通过加密通道直连",
    invalidRoom: "请输入完整的 6 位房间码",
    errors: {
      UNSUPPORTED_BROWSER: "当前浏览器不支持 H5 点对点连接，请升级 Safari 或 Chrome。",
      ROOM_NOT_FOUND: "房间不存在或已经失效，请重新输入房间码或创建新房间。",
      ROOM_FULL: "这个房间已经有两位玩家。",
      ROOM_EXPIRED: "房间已经失效，请创建新房间或重新输入房间码。",
      NETWORK_ERROR: "暂时无法连接信令服务，请检查网络后重试。",
      CONNECTION_FAILED: "两台手机未能建立直连，请确认连接同一 Wi-Fi 且未开启访客隔离。",
      ENGINE_MISMATCH: "双方游戏版本不一致，请刷新页面后重试。",
      INVALID_DICE: "骰子验证失败，本局已停止以避免错误先手。",
      DESYNC: "双方棋盘状态不一致，本局已暂停。",
      UNKNOWN: "连接出现异常，请重新尝试。",
    },
  },
  en: {
    localMode: "Local two-player",
    lanMode: "LAN match",
    eyebrow: "H5 two-player",
    title: "Play with someone nearby",
    description: "Create on one phone, then join by room code or QR on the other.",
    create: "Create room",
    creating: "Creating",
    roomCode: "Room code",
    roomPlaceholder: "Enter 6-digit code",
    join: "Join room",
    share: "Copy invite link",
    copied: "Copied",
    inviteQr: "Scan to join",
    qrDescription: "Scan with the other phone's camera",
    waiting: "Waiting for another player",
    connecting: "Connecting the two phones",
    syncing: "Checking both boards",
    connected: "Peer-to-peer connection ready",
    reconnecting: "Connection lost, restoring",
    you: "You",
    opponent: "Opponent",
    host: "Creator",
    guest: "Joiner",
    ready: "I'm ready",
    readyDone: "Ready",
    opponentReady: "Opponent is ready",
    opponentWaiting: "Waiting for opponent",
    leave: "Leave room",
    retry: "Reconnect",
    diceTitle: "Roll for first move",
    diceDescription: "Both devices contribute and verify the random result",
    diceCommit: "Locking both random values",
    diceReveal: "Verifying both rolls",
    diceTie: "Tie — rerolling with fresh randomness",
    diceRound: "Round {round}",
    verified: "Verified by both players",
    black: "black",
    white: "white",
    yourSide: "You are {stone}",
    yourTurn: "Your turn",
    opponentTurn: "Waiting for opponent",
    secure: "Game data uses an encrypted peer connection",
    invalidRoom: "Enter the complete 6-digit room code",
    errors: {
      UNSUPPORTED_BROWSER: "This browser does not support H5 peer connections. Update Safari or Chrome.",
      ROOM_NOT_FOUND: "This room no longer exists. Enter another code or create a new room.",
      ROOM_FULL: "This room already has two players.",
      ROOM_EXPIRED: "This room has expired. Create a new room or enter another code.",
      NETWORK_ERROR: "The signaling service is unavailable. Check your network and retry.",
      CONNECTION_FAILED: "The phones could not connect. Use the same Wi-Fi and disable guest isolation.",
      ENGINE_MISMATCH: "The game versions differ. Refresh both phones and retry.",
      INVALID_DICE: "Dice verification failed, so the match was stopped.",
      DESYNC: "The two boards no longer match. The match has been paused.",
      UNKNOWN: "Something went wrong while connecting. Please retry.",
    },
  },
  th: {
    localMode: "เล่นสองคนเครื่องเดียว",
    lanMode: "เล่นผ่าน LAN",
    eyebrow: "H5 สองผู้เล่น",
    title: "เล่นกับเพื่อนที่อยู่ใกล้กัน",
    description: "สร้างห้องบนมือถือหนึ่งเครื่อง แล้วเข้าด้วยรหัสหรือ QR",
    create: "สร้างห้อง",
    creating: "กำลังสร้าง",
    roomCode: "รหัสห้อง",
    roomPlaceholder: "กรอกรหัส 6 หลัก",
    join: "เข้าห้อง",
    share: "คัดลอกลิงก์เชิญ",
    copied: "คัดลอกแล้ว",
    inviteQr: "สแกนเพื่อเข้าร่วม",
    qrDescription: "ใช้กล้องของมือถืออีกเครื่องสแกน",
    waiting: "กำลังรอผู้เล่นอีกคน",
    connecting: "กำลังเชื่อมต่อมือถือโดยตรง",
    syncing: "กำลังตรวจสอบกระดานทั้งสองเครื่อง",
    connected: "เชื่อมต่อแบบเพียร์ทูเพียร์แล้ว",
    reconnecting: "การเชื่อมต่อขาด กำลังกู้คืน",
    you: "คุณ",
    opponent: "คู่แข่ง",
    host: "ผู้สร้าง",
    guest: "ผู้เข้าร่วม",
    ready: "ฉันพร้อมแล้ว",
    readyDone: "พร้อม",
    opponentReady: "คู่แข่งพร้อมแล้ว",
    opponentWaiting: "รอคู่แข่งพร้อม",
    leave: "ออกจากห้อง",
    retry: "เชื่อมต่อใหม่",
    diceTitle: "ทอยลูกเต๋าเลือกผู้เริ่ม",
    diceDescription: "ทั้งสองเครื่องร่วมสร้างและตรวจสอบผลสุ่ม",
    diceCommit: "กำลังล็อกค่าสุ่มของทั้งสองฝ่าย",
    diceReveal: "กำลังตรวจสอบแต้มร่วมกัน",
    diceTie: "แต้มเท่ากัน กำลังสุ่มใหม่และทอยอีกครั้ง",
    diceRound: "รอบที่ {round}",
    verified: "ตรวจสอบโดยผู้เล่นทั้งสองแล้ว",
    black: "หมากดำ",
    white: "หมากขาว",
    yourSide: "คุณเล่น{stone}",
    yourTurn: "ตาของคุณ",
    opponentTurn: "รอคู่แข่งเดิน",
    secure: "ข้อมูลเกมส่งผ่านการเชื่อมต่อเข้ารหัส",
    invalidRoom: "กรอกรหัสห้อง 6 หลักให้ครบ",
    errors: {
      UNSUPPORTED_BROWSER: "เบราว์เซอร์นี้ไม่รองรับการเชื่อมต่อ H5 โปรดอัปเดต Safari หรือ Chrome",
      ROOM_NOT_FOUND: "ห้องนี้ไม่มีอยู่แล้ว โปรดกรอกรหัสใหม่หรือสร้างห้องใหม่",
      ROOM_FULL: "ห้องนี้มีผู้เล่นสองคนแล้ว",
      ROOM_EXPIRED: "ห้องหมดอายุแล้ว โปรดสร้างห้องใหม่หรือกรอกรหัสอื่น",
      NETWORK_ERROR: "เชื่อมต่อบริการจับคู่ไม่ได้ โปรดตรวจสอบเครือข่าย",
      CONNECTION_FAILED: "มือถือเชื่อมต่อกันไม่ได้ โปรดใช้ Wi-Fi เดียวกันและปิด guest isolation",
      ENGINE_MISMATCH: "เวอร์ชันเกมไม่ตรงกัน โปรดรีเฟรชทั้งสองเครื่อง",
      INVALID_DICE: "ตรวจสอบลูกเต๋าไม่สำเร็จ จึงหยุดเกมนี้",
      DESYNC: "กระดานของทั้งสองฝ่ายไม่ตรงกัน เกมถูกพักไว้",
      UNKNOWN: "เกิดข้อผิดพลาดในการเชื่อมต่อ โปรดลองใหม่",
    },
  },
}

function format(copy: string, values: Record<string, string | number>) {
  return copy.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""))
}

function connectionText(
  phase: GomokuLanPhase,
  connected: boolean,
  copy: (typeof COPY)[Locale],
) {
  if (phase === "reconnecting") return copy.reconnecting
  if (phase === "syncing") return copy.syncing
  if (connected) return copy.connected
  if (phase === "connecting") return copy.connecting
  return copy.waiting
}

export function GomokuLanPanel({
  locale,
  phase,
  roomId,
  role,
  connected,
  localReady,
  remoteReady,
  localStone,
  currentPlayer,
  dice,
  error,
  onCreateRoom,
  onJoinRoom,
  onReady,
  onLeave,
  onRetry,
}: GomokuLanPanelProps) {
  const copy = COPY[locale]
  const [joinCode, setJoinCode] = useState("")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [inputError, setInputError] = useState("")

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
    const stoneLabel = localStone === "black" ? copy.black : copy.white
    const isMyTurn = localStone === currentPlayer

    return (
      <section className="gomoku-lan-status" data-slot="gomoku-lan-status" aria-live="polite">
        <div className="gomoku-lan-status__identity">
          <span className="gomoku-lan-status__signal" data-connected={connected}>
            {connected ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
          </span>
          <div>
            <strong>{format(copy.yourSide, { stone: stoneLabel })}</strong>
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
      <section className="gomoku-lan-panel" data-phase={phase} data-slot="gomoku-lan-panel">
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
                <label htmlFor="gomoku-room-code">{copy.roomCode}</label>
                <div>
                  <Input
                    id="gomoku-room-code"
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
                {connectionText(phase, connected, copy)}
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
        <div className="gomoku-dice-overlay" role="dialog" aria-modal="true" aria-labelledby="gomoku-dice-title">
          <div className="gomoku-dice-card">
            <span className="gomoku-dice-card__icon"><Dices aria-hidden="true" /></span>
            <p className="gomoku-dice-card__round">{format(copy.diceRound, { round: dice.round })}</p>
            <h2 id="gomoku-dice-title">{copy.diceTitle}</h2>
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

export { COPY as GOMOKU_LAN_COPY }

export function getGomokuLanError(locale: Locale, code: LanGomokuErrorCode | null): string {
  return code ? COPY[locale].errors[code] : ""
}
