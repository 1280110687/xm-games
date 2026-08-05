import type {
  LanTurnGameErrorCode,
} from "../multiplayer/use-lan-turn-game"

const GAME_MISMATCH_COPY = {
  zh: "这个房间属于其他游戏，请确认邀请链接或房间码。",
  en: "This room belongs to another game. Check the invite link or room code.",
  th: "ห้องนี้เป็นของเกมอื่น โปรดตรวจสอบลิงก์เชิญหรือรหัสห้อง",
} as const

export function getChessLanError(
  locale: keyof typeof GAME_MISMATCH_COPY,
  code: LanTurnGameErrorCode | null,
  genericErrors: Record<Exclude<LanTurnGameErrorCode, "GAME_MISMATCH">, string>,
): string {
  if (!code) return ""
  if (code === "GAME_MISMATCH") return GAME_MISMATCH_COPY[locale]
  return genericErrors[code]
}
