import type { JsonValue } from "../multiplayer/crypto"
import type {
  LanTurnGameAdapter,
  LanTurnGameApplication,
} from "../multiplayer/turn-game"
import {
  GO_MAX_ACTIONS,
  applyGoAction,
  createGoState,
  isGoPosition,
  type GoAction,
  type GoActionError,
  type GoActionRecord,
  type GoPlayer,
  type GoState,
} from "./engine"

export const GO_LAN_ENGINE_VERSION = "go-9x9-simple-ko-territory-v1"
export const GO_LAN_SESSION_STORAGE_KEY = "xm-games:go:lan-session:v1"
export const GO_LAN_PENDING_REQUEST_STORAGE_KEY =
  "xm-games:go:pending-room-request:v1"
export const GO_LAN_SNAPSHOT_VERSION = 1 as const

type CompactGoAction =
  | [player: 0 | 1]
  | [player: 0 | 1, row: number, col: number]

type GoLanSnapshot = {
  v: typeof GO_LAN_SNAPSHOT_VERSION
  actions: CompactGoAction[]
}

export type GoLanSnapshotError =
  | "INVALID_REVISION"
  | "ACTION_LIMIT_EXCEEDED"
  | "INVALID_SNAPSHOT"
  | "REVISION_MISMATCH"
  | "INVALID_ACTION"

export type GoLanSnapshotValidationResult =
  | { ok: true; state: GoState }
  | {
      ok: false
      code: GoLanSnapshotError
      actionIndex?: number
      actionError?: GoActionError
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value)
  return keys.length === expected.length
    && expected.every((key) => Object.hasOwn(value, key))
}

export function parseGoLanAction(value: unknown): GoAction | null {
  if (!isRecord(value) || typeof value.type !== "string") return null

  if (value.type === "pass") {
    return hasExactKeys(value, ["type"]) ? { type: "pass" } : null
  }

  if (
    value.type !== "place"
    || !hasExactKeys(value, ["type", "row", "col"])
    || typeof value.row !== "number"
    || typeof value.col !== "number"
    || !isGoPosition(value.row, value.col)
  ) return null

  return { type: "place", row: value.row, col: value.col }
}

export function encodeGoLanAction(action: GoAction): JsonValue {
  return action.type === "pass"
    ? { type: "pass" }
    : { type: "place", row: action.row, col: action.col }
}

function playerToCompact(player: GoPlayer): 0 | 1 {
  return player === "black" ? 0 : 1
}

function compactToPlayer(player: unknown): GoPlayer | null {
  if (player === 0) return "black"
  if (player === 1) return "white"
  return null
}

function encodeCompactAction(action: GoActionRecord): CompactGoAction {
  const player = playerToCompact(action.player)
  return action.type === "pass"
    ? [player]
    : [player, action.row, action.col]
}

function parseCompactAction(
  value: unknown,
): { action: GoAction; player: GoPlayer } | null {
  if (!Array.isArray(value) || (value.length !== 1 && value.length !== 3)) {
    return null
  }

  const player = compactToPlayer(value[0])
  if (!player) return null

  if (value.length === 1) {
    return { action: { type: "pass" }, player }
  }

  if (
    typeof value[1] !== "number"
    || typeof value[2] !== "number"
    || !isGoPosition(value[1], value[2])
  ) return null

  return {
    action: { type: "place", row: value[1], col: value[2] },
    player,
  }
}

function parseSnapshotShape(value: unknown): GoLanSnapshot | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ["v", "actions"])
    || value.v !== GO_LAN_SNAPSHOT_VERSION
    || !Array.isArray(value.actions)
  ) return null

  return {
    v: GO_LAN_SNAPSHOT_VERSION,
    actions: value.actions as CompactGoAction[],
  }
}

export function encodeGoLanSnapshot(state: GoState): JsonValue {
  return {
    v: GO_LAN_SNAPSHOT_VERSION,
    actions: state.actionHistory.map(encodeCompactAction),
  }
}

export function validateAndRebuildGoLanSnapshot(
  value: unknown,
  revision: number,
): GoLanSnapshotValidationResult {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return { ok: false, code: "INVALID_REVISION" }
  }
  if (revision > GO_MAX_ACTIONS) {
    return { ok: false, code: "ACTION_LIMIT_EXCEEDED" }
  }

  const snapshot = parseSnapshotShape(value)
  if (!snapshot) return { ok: false, code: "INVALID_SNAPSHOT" }
  if (snapshot.actions.length > GO_MAX_ACTIONS) {
    return { ok: false, code: "ACTION_LIMIT_EXCEEDED" }
  }
  if (snapshot.actions.length !== revision) {
    return { ok: false, code: "REVISION_MISMATCH" }
  }

  let state = createGoState()
  for (let actionIndex = 0; actionIndex < snapshot.actions.length; actionIndex += 1) {
    const compactAction = parseCompactAction(snapshot.actions[actionIndex])
    if (!compactAction) return { ok: false, code: "INVALID_SNAPSHOT" }

    const applied = applyGoAction(
      state,
      compactAction.action,
      compactAction.player,
    )
    if (!applied.ok) {
      return {
        ok: false,
        code: "INVALID_ACTION",
        actionIndex,
        actionError: applied.error,
      }
    }
    state = applied.state
  }

  return { ok: true, state }
}

export function applyGoLanAction(
  state: GoState,
  action: GoAction,
  authorSide: GoPlayer,
): LanTurnGameApplication<GoState> {
  const parsedAction = parseGoLanAction(action)
  if (!parsedAction) return { ok: false, code: "INVALID_ACTION" }

  const applied = applyGoAction(state, parsedAction, authorSide)
  return applied.ok
    ? { ok: true, state: applied.state }
    : { ok: false, code: applied.error }
}

export const goLanAdapter: LanTurnGameAdapter<GoState, GoAction, GoPlayer> = {
  gameId: "go",
  engineVersion: GO_LAN_ENGINE_VERSION,
  sessionStorageKey: GO_LAN_SESSION_STORAGE_KEY,
  pendingRequestStorageKey: GO_LAN_PENDING_REQUEST_STORAGE_KEY,
  firstSide: "black",
  secondSide: "white",
  createInitialState: createGoState,
  parseAction: parseGoLanAction,
  encodeAction: encodeGoLanAction,
  applyAction: applyGoLanAction,
  encodeSnapshot: encodeGoLanSnapshot,
  validateAndRebuildSnapshot: validateAndRebuildGoLanSnapshot,
  getRevision: (state) => state.actionHistory.length,
  getCurrentSide: (state) => state.status === "ended" ? null : state.currentPlayer,
}
