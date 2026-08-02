import {
  isXiangqiAiWorkerResponse,
  type XiangqiAiDifficulty,
  type XiangqiAiSearchRequest,
  type XiangqiAiSearchResponse,
  type XiangqiAiWorkerResponse,
} from "./ai-protocol"
import type { XiangqiState } from "./engine"

export type { XiangqiAiSearchResponse } from "./ai-protocol"

export type XiangqiAiSearchInput = {
  searchId: string
  gameRevision: number
  positionHash: string
  difficulty: XiangqiAiDifficulty
  state: XiangqiState
}

type ActiveSearch = {
  identity: Pick<XiangqiAiSearchInput, "searchId" | "gameRevision" | "positionHash">
  resolve: (response: XiangqiAiSearchResponse) => void
  reject: (error: Error) => void
}

export type XiangqiAiWorkerFactory = () => Worker

export class XiangqiAiCancelledError extends Error {
  constructor(message = "Xiangqi AI search was cancelled") {
    super(message)
    this.name = "XiangqiAiCancelledError"
  }
}

export class XiangqiAiWorkerError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "XiangqiAiWorkerError"
    this.code = code
  }
}

function defaultWorkerFactory(): Worker {
  return new Worker(new URL("./ai.worker.ts", import.meta.url), {
    type: "module",
    name: "xm-games-xiangqi-ai",
  })
}

function isSameSearch(
  active: ActiveSearch,
  response: XiangqiAiWorkerResponse,
): boolean {
  return active.identity.searchId === response.searchId
    && active.identity.gameRevision === response.gameRevision
    && active.identity.positionHash === response.positionHash
}

export class XiangqiAiClient {
  private worker: Worker | null = null
  private activeSearch: ActiveSearch | null = null

  constructor(private readonly workerFactory: XiangqiAiWorkerFactory = defaultWorkerFactory) {}

  search(input: XiangqiAiSearchInput): Promise<XiangqiAiSearchResponse> {
    if (this.activeSearch) this.cancel()

    const worker = this.ensureWorker()
    const request: XiangqiAiSearchRequest = {
      type: "search",
      ...input,
    }

    return new Promise((resolve, reject) => {
      this.activeSearch = {
        identity: {
          searchId: input.searchId,
          gameRevision: input.gameRevision,
          positionHash: input.positionHash,
        },
        resolve,
        reject,
      }
      worker.postMessage(request)
    })
  }

  cancel(): void {
    const activeSearch = this.activeSearch
    if (!activeSearch) return

    this.activeSearch = null
    activeSearch.reject(new XiangqiAiCancelledError())
    this.terminateWorker()
  }

  terminate(): void {
    const activeSearch = this.activeSearch
    this.activeSearch = null
    activeSearch?.reject(new XiangqiAiCancelledError("Xiangqi AI worker was terminated"))
    this.terminateWorker()
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker

    const worker = this.workerFactory()
    worker.addEventListener("message", this.handleMessage)
    worker.addEventListener("error", this.handleWorkerError)
    this.worker = worker
    return worker
  }

  private terminateWorker(): void {
    if (!this.worker) return
    this.worker.removeEventListener("message", this.handleMessage)
    this.worker.removeEventListener("error", this.handleWorkerError)
    this.worker.terminate()
    this.worker = null
  }

  private readonly handleMessage = (event: MessageEvent<unknown>): void => {
    if (!isXiangqiAiWorkerResponse(event.data)) return

    const activeSearch = this.activeSearch
    if (!activeSearch || !isSameSearch(activeSearch, event.data)) return

    this.activeSearch = null
    if (event.data.type === "error") {
      activeSearch.reject(new XiangqiAiWorkerError(event.data.code, event.data.message))
      return
    }

    activeSearch.resolve(event.data)
  }

  private readonly handleWorkerError = (event: ErrorEvent): void => {
    const activeSearch = this.activeSearch
    this.activeSearch = null
    activeSearch?.reject(new XiangqiAiWorkerError("WORKER_ERROR", event.message || "Xiangqi AI worker failed"))
    this.terminateWorker()
  }
}
