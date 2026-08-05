import type {
  LanTurnGameErrorCode,
  LanTurnGamePhase,
} from "../multiplayer/use-lan-turn-game"
import type { ReversiStone } from "./engine"

export type ReversiGameMode = "local" | "lan"

export function shouldShowReversiBoard(
  mode: ReversiGameMode,
  phase: LanTurnGamePhase,
): boolean {
  return mode === "local" || phase === "playing"
}

export function canPlaceLanReversiStone({
  connected,
  localSide,
  currentPlayer,
  gameOver,
}: {
  connected: boolean
  localSide: ReversiStone | null
  currentPlayer: ReversiStone
  gameOver: boolean
}): boolean {
  return connected && localSide === currentPlayer && !gameOver
}

const GAME_MISMATCH_COPY = {
  zh: "这个房间属于其他棋类，请核对邀请链接或重新创建黑白棋房间。",
  en: "This room belongs to another board game. Check the invite or create a new Reversi room.",
  th: "ห้องนี้เป็นของเกมกระดานชนิดอื่น โปรดตรวจสอบลิงก์เชิญหรือสร้างห้องรีเวอร์ซีใหม่",
} as const

export function getReversiLanError(
  locale: keyof typeof GAME_MISMATCH_COPY,
  code: LanTurnGameErrorCode | null,
  genericErrors: Record<Exclude<LanTurnGameErrorCode, "GAME_MISMATCH">, string>,
): string {
  if (!code) return ""
  if (code === "GAME_MISMATCH") return GAME_MISMATCH_COPY[locale]
  return genericErrors[code]
}
