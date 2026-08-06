"use client"

import {
  LanGamePanel,
  type LanGameDiceView,
  type LanGamePanelCopy,
  type LanGamePhase,
  type LanGameSeriesView,
} from "@/components/multiplayer/lan-game-panel"
import type { GomokuStone } from "@/features/gomoku/engine"
import type { LanGomokuErrorCode } from "@/features/gomoku/use-lan-gomoku"
import type { Locale } from "@/lib/i18n"

export type GomokuLanPhase = LanGamePhase
export type GomokuDiceView = LanGameDiceView

export interface GomokuLanPanelProps {
  locale: Locale
  phase: GomokuLanPhase
  roomId: string
  role: "host" | "guest" | null
  connected: boolean
  localReady: boolean
  remoteReady: boolean
  localStone: GomokuStone | null
  currentPlayer: GomokuStone | null
  dice: GomokuDiceView | null
  series: LanGameSeriesView
  error: string
  onCreateRoom: () => void
  onJoinRoom: (roomId: string) => void
  onReady: () => void
  onLeave: () => void
  onRetry: () => void
  onRematch: () => void
}

type GomokuLanCopy = LanGamePanelCopy & {
  localMode: string
  lanMode: string
  black: string
  white: string
  errors: Record<LanGomokuErrorCode, string>
}

const COPY: Record<Locale, GomokuLanCopy> = {
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
    matchRound: "第 {round} 局",
    draws: "和",
    youWon: "本局你获胜",
    opponentWon: "本局对手获胜",
    drawGame: "本局和棋",
    rematch: "再来一局",
    rematchRequested: "等待对手",
    opponentRequested: "对手想再来一局",
    errors: {
      UNSUPPORTED_BROWSER: "当前浏览器不支持 H5 点对点连接，请升级 Safari 或 Chrome。",
      ROOM_NOT_FOUND: "房间不存在或已经失效，请重新输入房间码或创建新房间。",
      ROOM_FULL: "这个房间已经有两位玩家。",
      ROOM_EXPIRED: "房间已经失效，请创建新房间或重新输入房间码。",
      NETWORK_ERROR: "暂时无法连接信令服务，请检查网络后重试。",
      CONNECTION_FAILED: "两台手机未能建立直连，请确认连接同一 Wi-Fi 且未开启访客隔离。",
      GAME_MISMATCH: "这个房间属于其他棋类，请打开对应游戏或创建新的五子棋房间。",
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
    matchRound: "Game {round}",
    draws: "Draws",
    youWon: "You won this game",
    opponentWon: "Opponent won this game",
    drawGame: "This game is a draw",
    rematch: "Play again",
    rematchRequested: "Waiting for opponent",
    opponentRequested: "Opponent wants a rematch",
    errors: {
      UNSUPPORTED_BROWSER: "This browser does not support H5 peer connections. Update Safari or Chrome.",
      ROOM_NOT_FOUND: "This room no longer exists. Enter another code or create a new room.",
      ROOM_FULL: "This room already has two players.",
      ROOM_EXPIRED: "This room has expired. Create a new room or enter another code.",
      NETWORK_ERROR: "The signaling service is unavailable. Check your network and retry.",
      CONNECTION_FAILED: "The phones could not connect. Use the same Wi-Fi and disable guest isolation.",
      GAME_MISMATCH: "This room belongs to another game. Open it there or create a new Gomoku room.",
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
    matchRound: "เกมที่ {round}",
    draws: "เสมอ",
    youWon: "คุณชนะเกมนี้",
    opponentWon: "คู่แข่งชนะเกมนี้",
    drawGame: "เกมนี้เสมอ",
    rematch: "เล่นอีกครั้ง",
    rematchRequested: "กำลังรอคู่แข่ง",
    opponentRequested: "คู่แข่งต้องการเล่นอีกครั้ง",
    errors: {
      UNSUPPORTED_BROWSER: "เบราว์เซอร์นี้ไม่รองรับการเชื่อมต่อ H5 โปรดอัปเดต Safari หรือ Chrome",
      ROOM_NOT_FOUND: "ห้องนี้ไม่มีอยู่แล้ว โปรดกรอกรหัสใหม่หรือสร้างห้องใหม่",
      ROOM_FULL: "ห้องนี้มีผู้เล่นสองคนแล้ว",
      ROOM_EXPIRED: "ห้องหมดอายุแล้ว โปรดสร้างห้องใหม่หรือกรอกรหัสอื่น",
      NETWORK_ERROR: "เชื่อมต่อบริการจับคู่ไม่ได้ โปรดตรวจสอบเครือข่าย",
      CONNECTION_FAILED: "มือถือเชื่อมต่อกันไม่ได้ โปรดใช้ Wi-Fi เดียวกันและปิด guest isolation",
      GAME_MISMATCH: "ห้องนี้เป็นเกมอื่น โปรดเปิดเกมนั้นหรือสร้างห้องโกะโมกุใหม่",
      ENGINE_MISMATCH: "เวอร์ชันเกมไม่ตรงกัน โปรดรีเฟรชทั้งสองเครื่อง",
      INVALID_DICE: "ตรวจสอบลูกเต๋าไม่สำเร็จ จึงหยุดเกมนี้",
      DESYNC: "กระดานของทั้งสองฝ่ายไม่ตรงกัน เกมถูกพักไว้",
      UNKNOWN: "เกิดข้อผิดพลาดในการเชื่อมต่อ โปรดลองใหม่",
    },
  },
}

const GOMOKU_GAME_TITLES: Record<Locale, string> = {
  zh: "五子棋",
  en: "Gomoku",
  th: "โกะโมกุ",
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
  series,
  error,
  onCreateRoom,
  onJoinRoom,
  onReady,
  onLeave,
  onRetry,
  onRematch,
}: GomokuLanPanelProps) {
  const copy = COPY[locale]

  return (
    <LanGamePanel<GomokuStone>
      idPrefix="gomoku"
      gameTitle={GOMOKU_GAME_TITLES[locale]}
      phase={phase}
      roomId={roomId}
      role={role}
      connected={connected}
      localReady={localReady}
      remoteReady={remoteReady}
      localSide={localStone}
      currentSide={currentPlayer}
      sides={[
        { value: "black", label: copy.black, color: "#111827" },
        { value: "white", label: copy.white, color: "#f8fafc" },
      ]}
      dice={dice}
      series={series}
      error={error}
      copy={copy}
      onCreateRoom={onCreateRoom}
      onJoinRoom={onJoinRoom}
      onReady={onReady}
      onLeave={onLeave}
      onRetry={onRetry}
      onRematch={onRematch}
    />
  )
}

export { COPY as GOMOKU_LAN_COPY }

export function getGomokuLanError(locale: Locale, code: LanGomokuErrorCode | null): string {
  return code ? COPY[locale].errors[code] : ""
}
