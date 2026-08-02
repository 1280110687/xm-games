import { describe, expect, it, vi } from "vitest"
import { createInitialState, createPositionKey } from "../engine"
import type { XiangqiAiSearchRequest } from "../ai-protocol"
import type { XiangqiAiEngine } from "./search"
import { handleXiangqiAiSearchRequest } from "./worker-handler"

function request(): XiangqiAiSearchRequest {
  const state = createInitialState()
  return {
    type: "search",
    searchId: "search-1",
    gameRevision: 7,
    positionHash: createPositionKey(state.board, state.currentTurn),
    difficulty: "medium",
    state,
  }
}

describe("handleXiangqiAiSearchRequest", () => {
  it("preserves the request identity in a successful response", () => {
    const input = request()
    const move = { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } }
    const search = vi.fn(() => ({
      move,
      stats: {
        depth: 3,
        nodes: 123,
        elapsedMs: 45,
        completed: true,
        score: 18,
      },
    }))

    const response = handleXiangqiAiSearchRequest(input, { search })

    expect(response).toMatchObject({
      type: "result",
      searchId: input.searchId,
      gameRevision: input.gameRevision,
      positionHash: input.positionHash,
      difficulty: input.difficulty,
      move,
    })
    expect(search).toHaveBeenCalledWith(input.state, input.difficulty)
  })

  it("rejects a request whose position hash does not match its board", () => {
    const input = { ...request(), positionHash: "stale-position" }
    const search = vi.fn<XiangqiAiEngine["search"]>()

    const response = handleXiangqiAiSearchRequest(input, { search })

    expect(response).toMatchObject({
      type: "error",
      code: "POSITION_MISMATCH",
      searchId: input.searchId,
      gameRevision: input.gameRevision,
    })
    expect(search).not.toHaveBeenCalled()
  })

  it("ignores malformed messages", () => {
    const search = vi.fn<XiangqiAiEngine["search"]>()

    expect(handleXiangqiAiSearchRequest({ type: "search" }, { search })).toBeNull()
    expect(search).not.toHaveBeenCalled()
  })

  it("turns search failures into an identity-preserving error", () => {
    const input = request()
    const search = vi.fn<XiangqiAiEngine["search"]>(() => {
      throw new Error("search exploded")
    })

    const response = handleXiangqiAiSearchRequest(input, { search })

    expect(response).toMatchObject({
      type: "error",
      code: "SEARCH_FAILED",
      message: "search exploded",
      searchId: input.searchId,
      gameRevision: input.gameRevision,
      positionHash: input.positionHash,
    })
  })
})
