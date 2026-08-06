import type { JsonValue } from "../multiplayer/crypto"
import { base64UrlToBytes, bytesToBase64Url } from "../multiplayer/crypto"
import type { LanTurnGameAdapter, LanTurnGameApplication } from "../multiplayer/turn-game"
import {
  applyMove,
  createInitialState,
  evaluateGameResult,
  isPositionInside,
  type PieceColor,
  type Position,
  type XiangqiMove,
  type XiangqiState,
} from "./engine"

export const CHINESE_CHESS_LAN_ENGINE_VERSION = "xiangqi-free-v3"
export const CHINESE_CHESS_LAN_SESSION_STORAGE_KEY =
  "xm-games:chinese-chess:lan-session:v3"
export const CHINESE_CHESS_LAN_PENDING_REQUEST_STORAGE_KEY =
  "xm-games:chinese-chess:pending-room-request:v2"

/**
 * A LAN match may use at most 2,048 half-moves. At two packed bytes per move,
 * a complete replay-validated snapshot remains far below the 32 KiB protocol
 * ceiling even after the JSON/DataChannel envelope is included.
 */
export const CHINESE_CHESS_LAN_MAX_HALF_MOVES = 2_048

const CHINESE_CHESS_LAN_SNAPSHOT_VERSION = 2 as const

export interface ChineseChessLanMoveAction extends XiangqiMove {
  readonly type: "move"
}

type ChineseChessLanSnapshot = {
  v: typeof CHINESE_CHESS_LAN_SNAPSHOT_VERSION
  moves: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value)
  return keys.length === expected.length
    && expected.every((key) => Object.hasOwn(value, key))
}

function parsePosition(value: unknown): Position | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ["row", "col"])
    || typeof value.row !== "number"
    || typeof value.col !== "number"
  ) return null

  const position = { row: value.row, col: value.col }
  return isPositionInside(position) ? position : null
}

export function parseChineseChessLanAction(
  value: unknown,
): ChineseChessLanMoveAction | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ["type", "from", "to"])
    || value.type !== "move"
  ) return null

  const from = parsePosition(value.from)
  const to = parsePosition(value.to)
  if (!from || !to) return null

  return { type: "move", from, to }
}

export function encodeChineseChessLanAction(
  action: ChineseChessLanMoveAction,
): JsonValue {
  return {
    type: "move",
    from: { row: action.from.row, col: action.from.col },
    to: { row: action.to.row, col: action.to.col },
  }
}

function parseSnapshot(value: unknown): ChineseChessLanSnapshot | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ["v", "moves"])
    || value.v !== CHINESE_CHESS_LAN_SNAPSHOT_VERSION
    || typeof value.moves !== "string"
  ) return null

  return { v: CHINESE_CHESS_LAN_SNAPSHOT_VERSION, moves: value.moves }
}

function decodeCompactMoves(value: string): Uint8Array | null {
  if (value === "") return new Uint8Array()

  try {
    const bytes = base64UrlToBytes(value)
    if (
      bytes.length % 2 !== 0
      || bytes.length / 2 > CHINESE_CHESS_LAN_MAX_HALF_MOVES
      || bytesToBase64Url(bytes) !== value
    ) return null
    return bytes
  } catch {
    return null
  }
}

export function encodeChineseChessLanSnapshot(state: XiangqiState): JsonValue {
  if (state.moveHistory.length > CHINESE_CHESS_LAN_MAX_HALF_MOVES) {
    throw new RangeError("Chinese chess LAN move limit exceeded")
  }

  const packedMoves = new Uint8Array(state.moveHistory.length * 2)
  state.moveHistory.forEach((move, index) => {
    const from = move.from.row * 9 + move.from.col
    const to = move.to.row * 9 + move.to.col
    const packed = from * 90 + to
    packedMoves[index * 2] = packed >>> 8
    packedMoves[index * 2 + 1] = packed & 0xff
  })

  return {
    v: CHINESE_CHESS_LAN_SNAPSHOT_VERSION,
    moves: packedMoves.length === 0 ? "" : bytesToBase64Url(packedMoves),
  }
}

export function validateAndRebuildChineseChessLanSnapshot(
  value: unknown,
  revision: number,
): LanTurnGameApplication<XiangqiState> {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return { ok: false, code: "INVALID_REVISION" }
  }

  const snapshot = parseSnapshot(value)
  if (!snapshot) return { ok: false, code: "INVALID_SNAPSHOT" }
  if (revision > CHINESE_CHESS_LAN_MAX_HALF_MOVES) {
    return { ok: false, code: "INVALID_REVISION" }
  }

  const moves = decodeCompactMoves(snapshot.moves)
  if (!moves) return { ok: false, code: "INVALID_SNAPSHOT" }
  if (moves.length / 2 !== revision) {
    return { ok: false, code: "REVISION_MISMATCH" }
  }

  let state = createInitialState()
  for (let index = 0; index < moves.length / 2; index += 1) {
    const packed = (moves[index * 2] << 8) | moves[index * 2 + 1]
    if (packed >= 90 * 90) return { ok: false, code: "INVALID_SNAPSHOT" }

    const from = Math.floor(packed / 90)
    const to = packed % 90
    const applied = applyChineseChessLanAction(state, {
      type: "move",
      from: { row: Math.floor(from / 9), col: from % 9 },
      to: { row: Math.floor(to / 9), col: to % 9 },
    }, state.currentTurn)
    if (!applied.ok) return { ok: false, code: "INVALID_MOVE" }
    state = applied.state
  }

  return { ok: true, state }
}

export function applyChineseChessLanAction(
  state: XiangqiState,
  action: ChineseChessLanMoveAction,
  authorSide: PieceColor,
): LanTurnGameApplication<XiangqiState> {
  const parsedAction = parseChineseChessLanAction(action)
  if (!parsedAction) return { ok: false, code: "INVALID_ACTION" }
  if (evaluateGameResult(state).over) return { ok: false, code: "GAME_OVER" }
  if (state.currentTurn !== authorSide) return { ok: false, code: "WRONG_SIDE" }

  const applied = applyMove(state, parsedAction)
  if (!applied.ok) return { ok: false, code: applied.error }

  if (
    !applied.result.over
    && applied.state.moveHistory.length >= CHINESE_CHESS_LAN_MAX_HALF_MOVES
  ) {
    return {
      ok: true,
      state: { ...applied.state, termination: "move-limit" },
    }
  }

  return { ok: true, state: applied.state }
}

export const chineseChessLanAdapter: LanTurnGameAdapter<
  XiangqiState,
  ChineseChessLanMoveAction,
  PieceColor
> = {
  gameId: "chinese-chess",
  engineVersion: CHINESE_CHESS_LAN_ENGINE_VERSION,
  sessionStorageKey: CHINESE_CHESS_LAN_SESSION_STORAGE_KEY,
  pendingRequestStorageKey: CHINESE_CHESS_LAN_PENDING_REQUEST_STORAGE_KEY,
  firstSide: "red",
  secondSide: "black",
  createInitialState,
  parseAction: parseChineseChessLanAction,
  encodeAction: encodeChineseChessLanAction,
  applyAction: applyChineseChessLanAction,
  encodeSnapshot: encodeChineseChessLanSnapshot,
  validateAndRebuildSnapshot: validateAndRebuildChineseChessLanSnapshot,
  getRevision: (state) => state.moveHistory.length,
  getCurrentSide: (state) => evaluateGameResult(state).over ? null : state.currentTurn,
  getOutcome: (state) => {
    const result = evaluateGameResult(state)
    if (!result.over) return { status: "playing" }
    return result.winner
      ? { status: "won", winner: result.winner }
      : { status: "draw" }
  },
}
