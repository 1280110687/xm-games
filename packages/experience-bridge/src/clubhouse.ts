/** Physical rooms, shared by the host menu and the WebGL world. */
export const CLUBHOUSE_ROOMS = ["gallery", "contact", "elemental", "treasure"] as const
export type ClubhouseRoom = typeof CLUBHOUSE_ROOMS[number]
export type ClubhousePlace = "entrance" | "corridor" | ClubhouseRoom
export const CLUBHOUSE_SESSION_KEY = "xm-games:clubhouse:v1"
export const CLUBHOUSE_ROOM_NAMES = {
  zh: { gallery: "游戏房", contact: "工具工坊", elemental: "元素训练室", treasure: "夜间博物馆" },
  en: { gallery: "Game room", contact: "Tool workshop", elemental: "Elemental studio", treasure: "Night museum" },
  th: { gallery: "ห้องเกม", contact: "ห้องเครื่องมือ", elemental: "ห้องฝึกธาตุ", treasure: "พิพิธภัณฑ์กลางคืน" },
} as const

export type ClubhousePose = { x: number; y: number; z: number; yaw: number; pitch: number }
export type ClubhouseSnapshot = {
  version: 1
  place: ClubhousePlace
  pose: ClubhousePose
  returnPose: ClubhousePose
}
export type ClubhouseCommand =
  | { action: "visit"; room: ClubhouseRoom }
  | { action: "back" | "entrance" }
  | { action: "pause"; paused: boolean }

export function isClubhousePlace(value: unknown): value is ClubhousePlace {
  return value === "entrance" || value === "corridor" || CLUBHOUSE_ROOMS.some((id) => id === value)
}

export function isClubhouseCommand(value: unknown): value is ClubhouseCommand {
  if (!value || typeof value !== "object") return false
  const command = value as Record<string, unknown>
  if (command.action === "visit") return CLUBHOUSE_ROOMS.some((id) => id === command.room)
  if (command.action === "pause") return typeof command.paused === "boolean"
  return command.action === "back" || command.action === "entrance"
}

function validPose(value: unknown): value is ClubhousePose {
  if (!value || typeof value !== "object") return false
  const pose = value as Record<string, unknown>
  return ["x", "y", "z", "yaw", "pitch"].every((key) => typeof pose[key] === "number" && Number.isFinite(pose[key])) &&
    Math.abs(pose.x as number) <= 12 && (pose.y as number) >= 0.5 && (pose.y as number) <= 4 &&
    (pose.z as number) >= -15 && (pose.z as number) <= 13 &&
    Math.abs(pose.yaw as number) <= Math.PI * 2 && Math.abs(pose.pitch as number) <= 1
}

export function isClubhouseSnapshot(value: unknown): value is ClubhouseSnapshot {
  if (!value || typeof value !== "object") return false
  const state = value as Record<string, unknown>
  return state.version === 1 && isClubhousePlace(state.place) && validPose(state.pose) && validPose(state.returnPose)
}
