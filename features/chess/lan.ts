import type { JsonValue } from "../multiplayer"
import { base64UrlToBytes, bytesToBase64Url } from "../multiplayer/crypto"
import type { LanTurnGameAdapter } from "../multiplayer/turn-game"
import {
  INITIAL_CASTLING_RIGHTS,
  applyMove,
  createInitialBoard,
  getValidMoves,
  hasLegalMoves,
  isInCheck,
  type CastlingRights,
  type ChessBoard,
  type Color,
  type Position,
} from "./engine"

export const CHESS_LAN_ENGINE_VERSION = "chess-free-v3"
export const CHESS_LAN_SESSION_STORAGE_KEY = "xm-games:chess:lan-session:v3"
export const CHESS_LAN_PENDING_REQUEST_STORAGE_KEY =
  "xm-games:chess:pending-room-request:v2"

/**
 * The LAN protocol limits one DataChannel message to 32 KiB. Two bytes per
 * move plus this explicit ceiling keep even a recovery snapshot comfortably
 * below that limit while allowing 1,024 full turns (2,048 half-moves).
 */
export const CHESS_LAN_MAX_HALF_MOVES = 2_048

const CHESS_LAN_SNAPSHOT_VERSION = 2 as const

export type LanChessStatus = "playing" | "check" | "checkmate" | "stalemate"

export type LanChessAction = {
  type: "move"
  from: Position
  to: Position
}

export type LanChessMove = {
  from: Position
  to: Position
  side: Color
}

export type LanChessState = {
  board: ChessBoard
  currentTurn: Color
  castlingRights: CastlingRights
  enPassantTarget: Position | null
  status: LanChessStatus
  winner: Color | null
  moveHistory: LanChessMove[]
}

export type LanChessMoveError =
  | "GAME_FINISHED"
  | "WRONG_PLAYER"
  | "INVALID_ACTION"
  | "ILLEGAL_MOVE"

export type LanChessSnapshotError =
  | "INVALID_REVISION"
  | "INVALID_STATE_SHAPE"
  | "REVISION_MISMATCH"
  | "INVALID_MOVE"

export type LanChessSnapshotValidationResult =
  | { ok: true; state: LanChessState }
  | {
      ok: false
      code: LanChessSnapshotError
      moveIndex?: number
      moveError?: LanChessMoveError
    }

type CompactChessSnapshot = {
  v: typeof CHESS_LAN_SNAPSHOT_VERSION
  moves: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value)
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key))
}

function isChessPosition(value: unknown): value is Position {
  return isRecord(value)
    && hasExactKeys(value, ["row", "col"])
    && Number.isInteger(value.row)
    && Number(value.row) >= 0
    && Number(value.row) < 8
    && Number.isInteger(value.col)
    && Number(value.col) >= 0
    && Number(value.col) < 8
}

function positionsMatch(left: Position, right: Position): boolean {
  return left.row === right.row && left.col === right.col
}

function isFinished(status: LanChessStatus): boolean {
  return status === "checkmate" || status === "stalemate"
}

function nextStatus(
  board: ChessBoard,
  castlingRights: CastlingRights,
  enPassantTarget: Position | null,
  nextTurn: Color,
  movingSide: Color,
): Pick<LanChessState, "status" | "winner"> {
  const inCheck = isInCheck(board, nextTurn)
  const canMove = hasLegalMoves({ board, castlingRights, enPassantTarget }, nextTurn)

  if (!canMove) {
    return inCheck
      ? { status: "checkmate", winner: movingSide }
      : { status: "stalemate", winner: null }
  }

  return {
    status: inCheck ? "check" : "playing",
    winner: null,
  }
}

export function createLanChessState(): LanChessState {
  return {
    board: createInitialBoard(),
    currentTurn: "white",
    castlingRights: { ...INITIAL_CASTLING_RIGHTS },
    enPassantTarget: null,
    status: "playing",
    winner: null,
    moveHistory: [],
  }
}

export function parseLanChessAction(value: unknown): LanChessAction | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ["type", "from", "to"])
    || value.type !== "move"
    || !isChessPosition(value.from)
    || !isChessPosition(value.to)
  ) return null

  return {
    type: "move",
    from: { row: value.from.row, col: value.from.col },
    to: { row: value.to.row, col: value.to.col },
  }
}

export function applyLanChessAction(
  state: LanChessState,
  action: LanChessAction,
  authorSide: Color,
): { ok: true; state: LanChessState } | { ok: false; code: LanChessMoveError } {
  if (isFinished(state.status)) return { ok: false, code: "GAME_FINISHED" }
  if (authorSide !== state.currentTurn) return { ok: false, code: "WRONG_PLAYER" }
  if (!parseLanChessAction(action)) return { ok: false, code: "INVALID_ACTION" }

  const movingPiece = state.board[action.from.row][action.from.col]
  if (!movingPiece || movingPiece.color !== authorSide) {
    return { ok: false, code: "ILLEGAL_MOVE" }
  }

  const validMoves = getValidMoves({
    board: state.board,
    castlingRights: state.castlingRights,
    enPassantTarget: state.enPassantTarget,
  }, action.from)
  if (!validMoves.some((position) => positionsMatch(position, action.to))) {
    return { ok: false, code: "ILLEGAL_MOVE" }
  }

  const nextPosition = applyMove({
    board: state.board,
    castlingRights: state.castlingRights,
    enPassantTarget: state.enPassantTarget,
  }, action.from, action.to)
  const nextTurn = authorSide === "white" ? "black" : "white"
  const outcome = nextStatus(
    nextPosition.board,
    nextPosition.castlingRights,
    nextPosition.enPassantTarget,
    nextTurn,
    authorSide,
  )
  const moveHistory = [
    ...state.moveHistory,
    {
      from: { ...action.from },
      to: { ...action.to },
      side: authorSide,
    },
  ]
  const reachedLanMoveLimit = moveHistory.length >= CHESS_LAN_MAX_HALF_MOVES
    && (outcome.status === "playing" || outcome.status === "check")

  return {
    ok: true,
    state: {
      ...nextPosition,
      currentTurn: nextTurn,
      ...(reachedLanMoveLimit
        ? { status: "stalemate" as const, winner: null }
        : outcome),
      moveHistory,
    },
  }
}

export function encodeLanChessSnapshot(state: LanChessState): JsonValue {
  if (state.moveHistory.length > CHESS_LAN_MAX_HALF_MOVES) {
    throw new RangeError("LAN chess move limit exceeded")
  }

  const packedMoves = new Uint8Array(state.moveHistory.length * 2)
  state.moveHistory.forEach((move, index) => {
    const from = move.from.row * 8 + move.from.col
    const to = move.to.row * 8 + move.to.col
    const packed = (from << 6) | to
    packedMoves[index * 2] = packed >>> 8
    packedMoves[index * 2 + 1] = packed & 0xff
  })

  const snapshot: CompactChessSnapshot = {
    v: CHESS_LAN_SNAPSHOT_VERSION,
    moves: packedMoves.length === 0 ? "" : bytesToBase64Url(packedMoves),
  }
  return snapshot as JsonValue
}

function parseCompactSnapshot(value: unknown): CompactChessSnapshot | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ["v", "moves"])
    || value.v !== CHESS_LAN_SNAPSHOT_VERSION
    || typeof value.moves !== "string"
  ) {
    return null
  }

  return { v: CHESS_LAN_SNAPSHOT_VERSION, moves: value.moves }
}

function decodeCompactMoves(value: string): Uint8Array | null {
  if (value === "") return new Uint8Array()

  try {
    const bytes = base64UrlToBytes(value)
    if (
      bytes.length % 2 !== 0
      || bytes.length / 2 > CHESS_LAN_MAX_HALF_MOVES
      || bytesToBase64Url(bytes) !== value
    ) return null
    return bytes
  } catch {
    return null
  }
}

export function validateAndRebuildLanChessSnapshot(
  value: unknown,
  revision: number,
): LanChessSnapshotValidationResult {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return { ok: false, code: "INVALID_REVISION" }
  }

  const snapshot = parseCompactSnapshot(value)
  if (!snapshot) return { ok: false, code: "INVALID_STATE_SHAPE" }
  if (revision > CHESS_LAN_MAX_HALF_MOVES) {
    return { ok: false, code: "INVALID_REVISION" }
  }

  const moves = decodeCompactMoves(snapshot.moves)
  if (!moves) return { ok: false, code: "INVALID_STATE_SHAPE" }
  if (moves.length / 2 !== revision) {
    return { ok: false, code: "REVISION_MISMATCH" }
  }

  let state = createLanChessState()
  for (let moveIndex = 0; moveIndex < moves.length / 2; moveIndex += 1) {
    const packed = (moves[moveIndex * 2] << 8) | moves[moveIndex * 2 + 1]
    const from = packed >>> 6
    const to = packed & 0x3f
    const side = state.currentTurn
    const result = applyLanChessAction(state, {
      type: "move",
      from: { row: Math.floor(from / 8), col: from % 8 },
      to: { row: Math.floor(to / 8), col: to % 8 },
    }, side)
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

export const chessLanAdapter: LanTurnGameAdapter<
  LanChessState,
  LanChessAction,
  Color
> = {
  gameId: "chess",
  engineVersion: CHESS_LAN_ENGINE_VERSION,
  sessionStorageKey: CHESS_LAN_SESSION_STORAGE_KEY,
  pendingRequestStorageKey: CHESS_LAN_PENDING_REQUEST_STORAGE_KEY,
  firstSide: "white",
  secondSide: "black",
  createInitialState: createLanChessState,
  parseAction: parseLanChessAction,
  encodeAction: (action) => action as JsonValue,
  applyAction: applyLanChessAction,
  encodeSnapshot: encodeLanChessSnapshot,
  validateAndRebuildSnapshot: validateAndRebuildLanChessSnapshot,
  getRevision: (state) => state.moveHistory.length,
  getCurrentSide: (state) => isFinished(state.status) ? null : state.currentTurn,
  getOutcome: (state) => {
    if (state.status === "stalemate") return { status: "draw" }
    if (state.status === "checkmate" && state.winner) {
      return { status: "won", winner: state.winner }
    }
    return { status: "playing" }
  },
}
