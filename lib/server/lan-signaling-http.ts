import {
  LanSignalError,
  type LanSignalInput,
  type LanSignalStore,
} from "./lan-signaling-types"
import {
  LAN_SIGNAL_BODY_LIMIT_BYTES,
  LAN_SMALL_BODY_LIMIT_BYTES,
  parseBearerToken,
  parseCreateOrJoinBody,
  parsePeerBody,
  parsePollSignalsQuery,
  parsePublishSignalBody,
  parseRoomId,
} from "./lan-signaling-validation"

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  Expires: "0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: NO_STORE_HEADERS,
  })
}

function errorResponse(error: unknown): Response {
  const normalized =
    error instanceof LanSignalError
      ? error
      : new LanSignalError(
          "INTERNAL_ERROR",
          500,
          "The signaling service could not complete the request.",
        )
  const headers = new Headers(NO_STORE_HEADERS)

  if (normalized.status === 401) {
    headers.set("WWW-Authenticate", "Bearer")
  }

  return new Response(
    JSON.stringify({
      error: {
        code: normalized.code,
        message: normalized.message,
      },
    }),
    { status: normalized.status, headers },
  )
}

async function runHandler(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action()
  } catch (error) {
    return errorResponse(error)
  }
}

export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase()

  if (mediaType !== "application/json") {
    throw new LanSignalError(
      "UNSUPPORTED_MEDIA_TYPE",
      415,
      "Content-Type must be application/json.",
    )
  }

  const contentLength = request.headers.get("content-length")
  if (contentLength !== null) {
    if (!/^\d+$/u.test(contentLength)) {
      throw new LanSignalError(
        "INVALID_REQUEST",
        400,
        "Invalid Content-Length header.",
      )
    }

    if (Number(contentLength) > maxBytes) {
      throw new LanSignalError(
        "PAYLOAD_TOO_LARGE",
        413,
        "Request body is too large.",
      )
    }
  }

  if (!request.body) {
    throw new LanSignalError(
      "INVALID_REQUEST",
      400,
      "A JSON request body is required.",
    )
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        throw new LanSignalError(
          "PAYLOAD_TOO_LARGE",
          413,
          "Request body is too large.",
        )
      }

      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    return JSON.parse(text) as unknown
  } catch {
    throw new LanSignalError(
      "INVALID_REQUEST",
      400,
      "Request body must contain valid UTF-8 JSON.",
    )
  }
}

export async function handleCreateRoom(
  request: Request,
  store: LanSignalStore,
): Promise<Response> {
  return runHandler(async () => {
    const body = parseCreateOrJoinBody(
      await readJsonBody(request, LAN_SMALL_BODY_LIMIT_BYTES),
    )
    const result = await store.createRoom(body)
    return jsonResponse(result.value, result.deduplicated ? 200 : 201)
  })
}

export async function handleJoinRoom(
  request: Request,
  roomIdValue: string,
  store: LanSignalStore,
): Promise<Response> {
  return runHandler(async () => {
    const roomId = parseRoomId(roomIdValue)
    const body = parseCreateOrJoinBody(
      await readJsonBody(request, LAN_SMALL_BODY_LIMIT_BYTES),
    )
    const result = await store.joinRoom({ roomId, ...body })
    return jsonResponse(result.value, result.deduplicated ? 200 : 201)
  })
}

export async function handlePublishSignal(
  request: Request,
  roomIdValue: string,
  store: LanSignalStore,
): Promise<Response> {
  return runHandler(async () => {
    const roomId = parseRoomId(roomIdValue)
    const token = parseBearerToken(request)
    const body = parsePublishSignalBody(
      await readJsonBody(request, LAN_SIGNAL_BODY_LIMIT_BYTES),
    )
    const result = await store.publishSignal({
      roomId,
      token,
      peerId: body.peerId,
      clientMessageId: body.clientMessageId,
      signal: {
        negotiationId: body.negotiationId,
        type: body.type,
        payload: body.payload,
      } as LanSignalInput,
    })

    return jsonResponse(
      { message: result.value },
      result.deduplicated ? 200 : 201,
    )
  })
}

export async function handlePollSignals(
  request: Request,
  roomIdValue: string,
  store: LanSignalStore,
): Promise<Response> {
  return runHandler(async () => {
    const roomId = parseRoomId(roomIdValue)
    const token = parseBearerToken(request)
    const query = parsePollSignalsQuery(new URL(request.url))
    const result = await store.pollSignals({
      roomId,
      token,
      ...query,
      signal: request.signal,
    })
    return jsonResponse(result)
  })
}

export async function handleHeartbeat(
  request: Request,
  roomIdValue: string,
  store: LanSignalStore,
): Promise<Response> {
  return runHandler(async () => {
    const roomId = parseRoomId(roomIdValue)
    const token = parseBearerToken(request)
    const body = parsePeerBody(
      await readJsonBody(request, LAN_SMALL_BODY_LIMIT_BYTES),
    )
    const result = await store.heartbeat({ roomId, token, ...body })
    return jsonResponse(result)
  })
}

export async function handleLeaveRoom(
  request: Request,
  roomIdValue: string,
  store: LanSignalStore,
): Promise<Response> {
  return runHandler(async () => {
    const roomId = parseRoomId(roomIdValue)
    const token = parseBearerToken(request)
    const body = parsePeerBody(
      await readJsonBody(request, LAN_SMALL_BODY_LIMIT_BYTES),
    )
    const result = await store.leaveRoom({ roomId, token, ...body })
    return jsonResponse(result)
  })
}
