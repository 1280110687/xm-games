import {
  isXiangqiAiCancelRequest,
  type XiangqiAiWorkerRequest,
  type XiangqiAiWorkerResponse,
} from "./ai-protocol"
import { XiangqiAiEngine } from "./ai/search"
import { handleXiangqiAiSearchRequest } from "./ai/worker-handler"

type WorkerScope = {
  onmessage: ((event: MessageEvent<XiangqiAiWorkerRequest>) => void) | null
  postMessage: (message: XiangqiAiWorkerResponse) => void
}

const workerScope = self as unknown as WorkerScope
const engine = new XiangqiAiEngine()

workerScope.onmessage = (event) => {
  if (isXiangqiAiCancelRequest(event.data)) return

  const response = handleXiangqiAiSearchRequest(event.data, engine)
  if (response) workerScope.postMessage(response)
}

export {}
