import type { Move, XiangqiState } from "./engine"

export type XiangqiAiDifficulty = "easy" | "medium" | "hard"

export type XiangqiAiLimits = {
  maxDepth: number
  nodeLimit: number
  timeLimitMs: number
}

export const XIANGQI_AI_LIMITS: Readonly<Record<XiangqiAiDifficulty, XiangqiAiLimits>> = {
  easy: {
    maxDepth: 1,
    nodeLimit: 2_000,
    timeLimitMs: 150,
  },
  medium: {
    maxDepth: 2,
    nodeLimit: 12_000,
    timeLimitMs: 500,
  },
  hard: {
    maxDepth: 3,
    nodeLimit: 40_000,
    timeLimitMs: 1_800,
  },
}

type SearchIdentity = {
  searchId: string
  gameRevision: number
  positionHash: string
}

export type XiangqiAiSearchRequest = SearchIdentity & {
  type: "search"
  difficulty: XiangqiAiDifficulty
  state: XiangqiState
}

export type XiangqiAiCancelRequest = {
  type: "cancel"
  searchId: string
}

export type XiangqiAiWorkerRequest =
  | XiangqiAiSearchRequest
  | XiangqiAiCancelRequest

export type XiangqiAiSearchStats = {
  depth: number
  nodes: number
  elapsedMs: number
  completed: boolean
  score: number
}

export type XiangqiAiSearchResponse = SearchIdentity & {
  type: "result"
  difficulty: XiangqiAiDifficulty
  move: Move | null
  stats: XiangqiAiSearchStats
}

export type XiangqiAiErrorCode =
  | "INVALID_REQUEST"
  | "POSITION_MISMATCH"
  | "SEARCH_FAILED"

export type XiangqiAiErrorResponse = SearchIdentity & {
  type: "error"
  code: XiangqiAiErrorCode
  message: string
}

export type XiangqiAiWorkerResponse =
  | XiangqiAiSearchResponse
  | XiangqiAiErrorResponse

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function hasSearchIdentity(value: Record<string, unknown>): boolean {
  return typeof value.searchId === "string"
    && Number.isSafeInteger(value.gameRevision)
    && typeof value.positionHash === "string"
}

export function isXiangqiAiDifficulty(value: unknown): value is XiangqiAiDifficulty {
  return value === "easy" || value === "medium" || value === "hard"
}

export function isXiangqiAiSearchRequest(value: unknown): value is XiangqiAiSearchRequest {
  return isRecord(value)
    && value.type === "search"
    && hasSearchIdentity(value)
    && isXiangqiAiDifficulty(value.difficulty)
    && isRecord(value.state)
    && Array.isArray(value.state.board)
    && typeof value.state.currentTurn === "string"
    && Array.isArray(value.state.moveHistory)
    && Array.isArray(value.state.positionHistory)
}

export function isXiangqiAiCancelRequest(value: unknown): value is XiangqiAiCancelRequest {
  return isRecord(value)
    && value.type === "cancel"
    && typeof value.searchId === "string"
}

export function isXiangqiAiWorkerResponse(value: unknown): value is XiangqiAiWorkerResponse {
  if (!isRecord(value) || !hasSearchIdentity(value)) return false

  if (value.type === "result") {
    return isXiangqiAiDifficulty(value.difficulty)
      && (value.move === null || isRecord(value.move))
      && isRecord(value.stats)
      && Number.isFinite(value.stats.depth)
      && Number.isFinite(value.stats.nodes)
      && Number.isFinite(value.stats.elapsedMs)
      && typeof value.stats.completed === "boolean"
      && Number.isFinite(value.stats.score)
  }

  return value.type === "error"
    && typeof value.code === "string"
    && typeof value.message === "string"
}
