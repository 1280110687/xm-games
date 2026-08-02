import { describe, expect, it } from "vitest"
import { createInitialState, createPositionKey } from "./engine"
import {
  XiangqiAiCancelledError,
  XiangqiAiClient,
} from "./ai-client"
import type {
  XiangqiAiSearchRequest,
  XiangqiAiWorkerResponse,
} from "./ai-protocol"

class FakeWorker {
  readonly postedMessages: unknown[] = []
  terminated = false
  private readonly messageListeners = new Set<(event: MessageEvent<unknown>) => void>()
  private readonly errorListeners = new Set<(event: ErrorEvent) => void>()

  addEventListener(type: string, listener: EventListener): void {
    if (type === "message") {
      this.messageListeners.add(listener as (event: MessageEvent<unknown>) => void)
    } else if (type === "error") {
      this.errorListeners.add(listener as (event: ErrorEvent) => void)
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === "message") {
      this.messageListeners.delete(listener as (event: MessageEvent<unknown>) => void)
    } else if (type === "error") {
      this.errorListeners.delete(listener as (event: ErrorEvent) => void)
    }
  }

  postMessage(message: unknown): void {
    this.postedMessages.push(message)
  }

  terminate(): void {
    this.terminated = true
  }

  emitMessage(message: XiangqiAiWorkerResponse): void {
    const event = { data: message } as MessageEvent<unknown>
    for (const listener of this.messageListeners) listener(event)
  }

  emitError(message: string): void {
    const event = { message } as ErrorEvent
    for (const listener of this.errorListeners) listener(event)
  }
}

function createInput(searchId = "search-1", gameRevision = 1) {
  const state = createInitialState()
  return {
    searchId,
    gameRevision,
    positionHash: createPositionKey(state.board, state.currentTurn),
    difficulty: "easy" as const,
    state,
  }
}

function resultFor(
  request: XiangqiAiSearchRequest,
  overrides: Partial<XiangqiAiWorkerResponse> = {},
): XiangqiAiWorkerResponse {
  return {
    type: "result",
    searchId: request.searchId,
    gameRevision: request.gameRevision,
    positionHash: request.positionHash,
    difficulty: request.difficulty,
    move: { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } },
    stats: {
      depth: 1,
      nodes: 10,
      elapsedMs: 5,
      completed: true,
      score: 0,
    },
    ...overrides,
  } as XiangqiAiWorkerResponse
}

describe("XiangqiAiClient", () => {
  it("ignores stale responses and resolves only the matching search identity", async () => {
    const worker = new FakeWorker()
    const client = new XiangqiAiClient(() => worker as unknown as Worker)
    const pending = client.search(createInput())
    const request = worker.postedMessages[0] as XiangqiAiSearchRequest

    worker.emitMessage(resultFor(request, { gameRevision: request.gameRevision - 1 }))
    worker.emitMessage(resultFor(request))

    await expect(pending).resolves.toMatchObject({
      type: "result",
      searchId: request.searchId,
      gameRevision: request.gameRevision,
    })
    expect(worker.terminated).toBe(false)
  })

  it("terminates the worker and rejects the active search when cancelled", async () => {
    const worker = new FakeWorker()
    const client = new XiangqiAiClient(() => worker as unknown as Worker)
    const pending = client.search(createInput())

    client.cancel()

    await expect(pending).rejects.toBeInstanceOf(XiangqiAiCancelledError)
    expect(worker.terminated).toBe(true)
  })

  it("recreates the worker after cancelling an older search", async () => {
    const workers: FakeWorker[] = []
    const client = new XiangqiAiClient(() => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker as unknown as Worker
    })
    const first = client.search(createInput("first", 1))
    const second = client.search(createInput("second", 2))
    const secondRequest = workers[1].postedMessages[0] as XiangqiAiSearchRequest
    workers[1].emitMessage(resultFor(secondRequest))

    await expect(first).rejects.toBeInstanceOf(XiangqiAiCancelledError)
    await expect(second).resolves.toMatchObject({ searchId: "second", gameRevision: 2 })
    expect(workers).toHaveLength(2)
    expect(workers[0].terminated).toBe(true)
  })

  it("rejects a matching structured worker error", async () => {
    const worker = new FakeWorker()
    const client = new XiangqiAiClient(() => worker as unknown as Worker)
    const pending = client.search(createInput())
    const request = worker.postedMessages[0] as XiangqiAiSearchRequest

    worker.emitMessage({
      type: "error",
      searchId: request.searchId,
      gameRevision: request.gameRevision,
      positionHash: request.positionHash,
      code: "SEARCH_FAILED",
      message: "unable to search",
    })

    await expect(pending).rejects.toMatchObject({
      code: "SEARCH_FAILED",
      message: "unable to search",
    })
  })

  it("rejects worker failures and allows a later search to use a fresh worker", async () => {
    const workers: FakeWorker[] = []
    const client = new XiangqiAiClient(() => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker as unknown as Worker
    })
    const pending = client.search(createInput())

    workers[0].emitError("worker crashed")

    await expect(pending).rejects.toMatchObject({
      code: "WORKER_ERROR",
      message: "worker crashed",
    })
    expect(workers[0].terminated).toBe(true)

    const retry = client.search(createInput("retry", 2))
    const retryRequest = workers[1].postedMessages[0] as XiangqiAiSearchRequest
    workers[1].emitMessage(resultFor(retryRequest))
    await expect(retry).resolves.toMatchObject({ searchId: "retry" })
  })
})
