import { createPositionKey } from "../engine"
import {
  isXiangqiAiSearchRequest,
  type XiangqiAiErrorResponse,
  type XiangqiAiSearchRequest,
  type XiangqiAiWorkerResponse,
} from "../ai-protocol"
import { XiangqiAiEngine } from "./search"

function errorResponse(
  request: Pick<XiangqiAiSearchRequest, "searchId" | "gameRevision" | "positionHash">,
  code: XiangqiAiErrorResponse["code"],
  message: string,
): XiangqiAiErrorResponse {
  return {
    type: "error",
    ...request,
    code,
    message,
  }
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "The Xiangqi AI search failed"
}

export function handleXiangqiAiSearchRequest(
  value: unknown,
  engine: Pick<XiangqiAiEngine, "search">,
): XiangqiAiWorkerResponse | null {
  if (!isXiangqiAiSearchRequest(value)) return null

  const identity = {
    searchId: value.searchId,
    gameRevision: value.gameRevision,
    positionHash: value.positionHash,
  }

  try {
    const actualPositionHash = createPositionKey(value.state.board, value.state.currentTurn)
    if (actualPositionHash !== value.positionHash) {
      return errorResponse(
        identity,
        "POSITION_MISMATCH",
        "The requested position no longer matches the Xiangqi board",
      )
    }

    const result = engine.search(value.state, value.difficulty)
    return {
      type: "result",
      ...identity,
      difficulty: value.difficulty,
      move: result.move,
      stats: result.stats,
    }
  } catch (error) {
    return errorResponse(identity, "SEARCH_FAILED", safeErrorMessage(error))
  }
}
