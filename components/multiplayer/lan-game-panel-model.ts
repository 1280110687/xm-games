export type LanGamePhase =
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

export interface LanGameDiceView {
  local: number | null
  remote: number | null
  round: number
  status: "committing" | "revealing" | "resolved" | "tied"
}

export interface LanGameSide<Side extends string> {
  value: Side
  label: string
  color: string
}

export interface LanGamePanelCopy {
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
  yourSide: string
  yourTurn: string
  opponentTurn: string
  secure: string
  invalidRoom: string
}

export interface LanGamePanelProps<Side extends string> {
  idPrefix: string
  gameTitle: string
  phase: LanGamePhase
  roomId: string
  role: "host" | "guest" | null
  connected: boolean
  localReady: boolean
  remoteReady: boolean
  localSide: Side | null
  currentSide: Side | null
  sides: readonly [LanGameSide<Side>, LanGameSide<Side>]
  dice: LanGameDiceView | null
  error: string
  copy: LanGamePanelCopy
  onCreateRoom: () => void
  onJoinRoom: (roomId: string) => void
  onReady: () => void
  onLeave: () => void
  onRetry: () => void
}

export function formatLanGameCopy(
  copy: string,
  values: Record<string, string | number>,
): string {
  return copy.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""))
}

export function getLanGameConnectionText(
  phase: LanGamePhase,
  connected: boolean,
  copy: Pick<
    LanGamePanelCopy,
    "reconnecting" | "syncing" | "connected" | "connecting" | "waiting"
  >,
): string {
  if (phase === "reconnecting") return copy.reconnecting
  if (phase === "syncing") return copy.syncing
  if (connected) return copy.connected
  if (phase === "connecting") return copy.connecting
  return copy.waiting
}

export function findLanGameSide<Side extends string>(
  sides: readonly LanGameSide<Side>[],
  side: Side | null,
): LanGameSide<Side> | null {
  if (side === null) return null
  return sides.find((candidate) => candidate.value === side) ?? null
}
