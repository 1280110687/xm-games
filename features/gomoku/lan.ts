import type { JsonValue } from "../multiplayer/crypto"
import type { LanTurnGameAdapter } from "../multiplayer/turn-game"
import { PENDING_ROOM_REQUEST_STORAGE_KEY } from "./pending-room-request"
import {
  createGomokuState,
  placeGomokuStone,
  validateAndRebuildLanGomokuSnapshot,
  type GomokuState,
  type GomokuStone,
} from "./engine"

export const GOMOKU_LAN_ENGINE_VERSION = "gomoku-free-v3"
export const GOMOKU_LAN_SESSION_STORAGE_KEY = "xm-games:gomoku:lan-session:v3"

export type LanGomokuAction = {
  type: "place"
  row: number
  col: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseLanGomokuAction(value: unknown): LanGomokuAction | null {
  if (
    !isRecord(value)
    || Object.keys(value).length !== 3
    || value.type !== "place"
    || !Number.isInteger(value.row)
    || !Number.isInteger(value.col)
  ) return null
  return { type: "place", row: Number(value.row), col: Number(value.col) }
}

export const gomokuLanAdapter: LanTurnGameAdapter<
  GomokuState,
  LanGomokuAction,
  GomokuStone
> = {
  gameId: "gomoku",
  engineVersion: GOMOKU_LAN_ENGINE_VERSION,
  sessionStorageKey: GOMOKU_LAN_SESSION_STORAGE_KEY,
  pendingRequestStorageKey: PENDING_ROOM_REQUEST_STORAGE_KEY,
  firstSide: "black",
  secondSide: "white",
  createInitialState: createGomokuState,
  parseAction: parseLanGomokuAction,
  encodeAction: (action) => action as JsonValue,
  applyAction: (state, action, authorSide) => {
    const parsed = parseLanGomokuAction(action)
    if (!parsed) return { ok: false, code: "INVALID_ACTION" }
    const result = placeGomokuStone(state, parsed.row, parsed.col, authorSide)
    return result.ok
      ? { ok: true, state: result.state }
      : { ok: false, code: result.error }
  },
  encodeSnapshot: (state) => state as unknown as JsonValue,
  validateAndRebuildSnapshot: (value, revision) => {
    const result = validateAndRebuildLanGomokuSnapshot(value, revision)
    return result.ok
      ? result
      : { ok: false, code: result.error }
  },
  getRevision: (state) => state.moveHistory.length,
  getCurrentSide: (state) => state.winner || state.isDraw ? null : state.currentPlayer,
  getOutcome: (state) => {
    if (state.winner) return { status: "won", winner: state.winner }
    if (state.isDraw) return { status: "draw" }
    return { status: "playing" }
  },
}
