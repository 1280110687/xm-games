import type { JsonValue } from "../multiplayer"
import type { LanTurnGameAdapter } from "../multiplayer/turn-game"
import {
  REVERSI_BOARD_SIZE,
  createReversiState,
  isReversiPosition,
  placeReversiStone,
  type ReversiMoveError,
  type ReversiState,
  type ReversiStone,
} from "./engine"

export const REVERSI_LAN_ENGINE_VERSION = "reversi-free-v2"
export const REVERSI_LAN_SESSION_STORAGE_KEY = "xm-games:reversi:lan-session:v2"
export const REVERSI_LAN_PENDING_REQUEST_STORAGE_KEY =
  "xm-games:reversi:pending-room-request:v1"

export type LanReversiAction = {
  type: "place"
  row: number
  col: number
}

export type LanReversiActionError = ReversiMoveError | "INVALID_ACTION"

export type LanReversiSnapshotError =
  | "INVALID_REVISION"
  | "INVALID_STATE_SHAPE"
  | "REVISION_MISMATCH"
  | "INVALID_MOVE"

export type LanReversiSnapshotValidationResult =
  | { ok: true; state: ReversiState }
  | {
      ok: false
      code: LanReversiSnapshotError
      moveIndex?: number
      moveError?: LanReversiActionError
    }

type CompactReversiMove = [row: number, col: number, stone: ReversiStone]
type CompactReversiSnapshot = { moves: CompactReversiMove[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value)
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key))
}

export function parseLanReversiAction(value: unknown): LanReversiAction | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ["type", "row", "col"])
    || value.type !== "place"
    || typeof value.row !== "number"
    || typeof value.col !== "number"
    || !isReversiPosition(value.row, value.col)
  ) return null

  return { type: "place", row: value.row, col: value.col }
}

export function applyLanReversiAction(
  state: ReversiState,
  action: LanReversiAction,
  authorSide: ReversiStone,
): { ok: true; state: ReversiState } | { ok: false; code: LanReversiActionError } {
  if (!parseLanReversiAction(action)) return { ok: false, code: "INVALID_ACTION" }
  const result = placeReversiStone(state, action.row, action.col, authorSide)
  return result.ok
    ? { ok: true, state: result.state }
    : { ok: false, code: result.error }
}

export function encodeLanReversiSnapshot(state: ReversiState): JsonValue {
  const snapshot: CompactReversiSnapshot = {
    moves: state.moveHistory.map((move) => [move.row, move.col, move.stone]),
  }
  return snapshot as JsonValue
}

function parseCompactSnapshot(value: unknown): CompactReversiSnapshot | null {
  if (!isRecord(value) || !hasExactKeys(value, ["moves"]) || !Array.isArray(value.moves)) {
    return null
  }

  const moves: CompactReversiMove[] = []
  for (const move of value.moves) {
    if (
      !Array.isArray(move)
      || move.length !== 3
      || typeof move[0] !== "number"
      || typeof move[1] !== "number"
      || !isReversiPosition(move[0], move[1])
      || (move[2] !== "black" && move[2] !== "white")
    ) return null
    moves.push([move[0], move[1], move[2]])
  }

  return { moves }
}

export function validateAndRebuildLanReversiSnapshot(
  value: unknown,
  revision: number,
): LanReversiSnapshotValidationResult {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return { ok: false, code: "INVALID_REVISION" }
  }

  const snapshot = parseCompactSnapshot(value)
  if (!snapshot) return { ok: false, code: "INVALID_STATE_SHAPE" }
  if (snapshot.moves.length !== revision) {
    return { ok: false, code: "REVISION_MISMATCH" }
  }

  let state = createReversiState()
  for (let moveIndex = 0; moveIndex < snapshot.moves.length; moveIndex += 1) {
    const [row, col, side] = snapshot.moves[moveIndex]
    const result = applyLanReversiAction(state, { type: "place", row, col }, side)
    if (!result.ok) {
      return {
        ok: false,
        code: "INVALID_MOVE",
        moveIndex,
        moveError: result.code,
      }
    }
    state = result.state
  }

  return { ok: true, state }
}

export const reversiLanAdapter: LanTurnGameAdapter<
  ReversiState,
  LanReversiAction,
  ReversiStone
> = {
  gameId: "reversi",
  engineVersion: REVERSI_LAN_ENGINE_VERSION,
  sessionStorageKey: REVERSI_LAN_SESSION_STORAGE_KEY,
  pendingRequestStorageKey: REVERSI_LAN_PENDING_REQUEST_STORAGE_KEY,
  firstSide: "black",
  secondSide: "white",
  createInitialState: createReversiState,
  parseAction: parseLanReversiAction,
  encodeAction: (action) => action as JsonValue,
  applyAction: applyLanReversiAction,
  encodeSnapshot: encodeLanReversiSnapshot,
  validateAndRebuildSnapshot: validateAndRebuildLanReversiSnapshot,
  getRevision: (state) => state.moveHistory.length,
  getCurrentSide: (state) => state.gameOver ? null : state.currentPlayer,
  getOutcome: (state) => {
    if (!state.gameOver || state.winner === null) return { status: "playing" }
    return state.winner === "tie"
      ? { status: "draw" }
      : { status: "won", winner: state.winner }
  },
}

export { REVERSI_BOARD_SIZE }
