import type { JsonValue } from "./crypto"

export const DEFAULT_LAN_SIGNALING_BASE_URL = "/api/lan"
export const MAX_SIGNAL_WAIT_MS = 25_000
export const DEFAULT_LAN_REQUEST_TIMEOUT_MS = 10_000
export const DEFAULT_LAN_GAME_ID = "gomoku"
export const DEFAULT_LAN_ENGINE_VERSION = "gomoku-free-v2"

export type LanGameIdentity = {
  gameId: string
  engineVersion: string
}

export type LanRoomRole = "host" | "guest"

export type LanRoomSession = {
  gameId: string
  engineVersion: string
  roomId: string
  peerId: string
  role: LanRoomRole
  token: string
  cursor: number
  expiresAt: string
}

export type LanSignalType = "offer" | "answer" | "ice" | "ice-complete" | "renegotiate"

export type LanIceCandidatePayload = {
  candidate: string
  sdpMid: string | null
  sdpMLineIndex: number | null
  usernameFragment?: string | null
}

export type LanSignalPayloadByType = {
  offer: { sdp: string }
  answer: { sdp: string }
  ice: LanIceCandidatePayload
  "ice-complete": Record<string, never>
  renegotiate: Record<string, never>
}

export type LanSignalMessage = {
  cursor: number
  id: string
  negotiationId: string
  fromPeerId: string
  fromRole: LanRoomRole
  type: LanSignalType
  payload: JsonValue
  createdAt: string
}

export type LanSignalPollResponse = {
  messages: LanSignalMessage[]
  cursor: number
  expiresAt: string
}

export type LanHeartbeatResponse = {
  roomId: string
  peerId: string
  expiresAt: string
}

export type LanLeaveRoomResponse = {
  roomId: string
  peerId: string
  role: LanRoomRole
  roomDeleted: boolean
}

export type LanSignalingClientOptions = {
  baseUrl?: string
  fetch?: typeof fetch
  createId?: () => string
  requestTimeoutMs?: number
  gameIdentity?: LanGameIdentity
}

export class LanSignalingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = "LanSignalingError"
  }

  get retryable(): boolean {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500
  }
}

function defaultCreateId(): string {
  if (!globalThis.crypto?.randomUUID) throw new Error("crypto.randomUUID is unavailable")
  return globalThis.crypto.randomUUID()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSafeCursor(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
}

function validateRoomSession(value: unknown): LanRoomSession {
  if (
    !isRecord(value)
    || typeof value.gameId !== "string"
    || typeof value.engineVersion !== "string"
    || typeof value.roomId !== "string"
    || typeof value.peerId !== "string"
    || (value.role !== "host" && value.role !== "guest")
    || typeof value.token !== "string"
    || !isSafeCursor(value.cursor)
    || typeof value.expiresAt !== "string"
  ) {
    throw new LanSignalingError("Invalid room session response", 502, "INVALID_RESPONSE")
  }
  return value as LanRoomSession
}

function validateSignalType(value: unknown): value is LanSignalType {
  return value === "offer"
    || value === "answer"
    || value === "ice"
    || value === "ice-complete"
    || value === "renegotiate"
}

function validateSignalPayload(type: LanSignalType, value: unknown): value is JsonValue {
  if (!isRecord(value)) return false
  if (type === "offer" || type === "answer") {
    return Object.keys(value).length === 1 && typeof value.sdp === "string"
  }
  if (type === "ice-complete" || type === "renegotiate") {
    return Object.keys(value).length === 0
  }

  const keys = Object.keys(value)
  return keys.every((key) => (
    key === "candidate"
    || key === "sdpMid"
    || key === "sdpMLineIndex"
    || key === "usernameFragment"
  ))
    && Object.hasOwn(value, "candidate")
    && Object.hasOwn(value, "sdpMid")
    && Object.hasOwn(value, "sdpMLineIndex")
    && typeof value.candidate === "string"
    && (value.sdpMid === null || typeof value.sdpMid === "string")
    && (value.sdpMLineIndex === null || Number.isSafeInteger(value.sdpMLineIndex))
    && (
      value.usernameFragment === undefined
      || value.usernameFragment === null
      || typeof value.usernameFragment === "string"
    )
}

function validateSignalMessage(message: unknown): LanSignalMessage {
  if (
    !isRecord(message)
    || !isSafeCursor(message.cursor)
    || typeof message.id !== "string"
    || typeof message.negotiationId !== "string"
    || !isUuid(message.negotiationId)
    || typeof message.fromPeerId !== "string"
    || (message.fromRole !== "host" && message.fromRole !== "guest")
    || !validateSignalType(message.type)
    || !validateSignalPayload(message.type, message.payload)
    || typeof message.createdAt !== "string"
  ) {
    throw new LanSignalingError("Invalid signal message response", 502, "INVALID_RESPONSE")
  }
  return message as LanSignalMessage
}

function validatePollResponse(value: unknown): LanSignalPollResponse {
  if (
    !isRecord(value)
    || !Array.isArray(value.messages)
    || !isSafeCursor(value.cursor)
    || typeof value.expiresAt !== "string"
  ) {
    throw new LanSignalingError("Invalid signal poll response", 502, "INVALID_RESPONSE")
  }

  const messages = value.messages.map(validateSignalMessage)

  return { messages, cursor: value.cursor, expiresAt: value.expiresAt }
}

export class LanSignalingClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch
  private readonly createId: () => string
  private readonly requestTimeoutMs: number
  private readonly gameIdentity: LanGameIdentity

  constructor(options: LanSignalingClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_LAN_SIGNALING_BASE_URL).replace(/\/$/u, "")
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.createId = options.createId ?? defaultCreateId
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_LAN_REQUEST_TIMEOUT_MS
    this.gameIdentity = options.gameIdentity ?? {
      gameId: DEFAULT_LAN_GAME_ID,
      engineVersion: DEFAULT_LAN_ENGINE_VERSION,
    }
    if (!this.gameIdentity.gameId || !this.gameIdentity.engineVersion) {
      throw new TypeError("gameIdentity must include gameId and engineVersion")
    }
    if (!Number.isSafeInteger(this.requestTimeoutMs) || this.requestTimeoutMs <= 0) {
      throw new RangeError("requestTimeoutMs must be a positive safe integer")
    }
  }

  createRoom(requestId = this.createId()): Promise<LanRoomSession> {
    return this.openRoom(`${this.baseUrl}/rooms`, requestId)
  }

  joinRoom(roomId: string, requestId = this.createId()): Promise<LanRoomSession> {
    if (!roomId) throw new TypeError("roomId is required")
    return this.openRoom(`${this.baseUrl}/rooms/${encodeURIComponent(roomId)}/join`, requestId)
  }

  async pollSignals(
    session: Pick<LanRoomSession, "roomId" | "peerId" | "token">,
    cursor: number,
    waitMs = MAX_SIGNAL_WAIT_MS,
    signal?: AbortSignal,
  ): Promise<LanSignalPollResponse> {
    if (!isSafeCursor(cursor)) throw new RangeError("cursor must be a non-negative safe integer")
    if (!Number.isInteger(waitMs) || waitMs < 0 || waitMs > MAX_SIGNAL_WAIT_MS) {
      throw new RangeError(`waitMs must be between 0 and ${MAX_SIGNAL_WAIT_MS}`)
    }

    const query = new URLSearchParams({
      peerId: session.peerId,
      cursor: String(cursor),
      waitMs: String(waitMs),
    })
    const response = await this.request(
      `${this.roomUrl(session.roomId)}/signals?${query}`,
      { method: "GET", signal },
      session.token,
    )
    return validatePollResponse(await response.json())
  }

  async sendSignal<T extends LanSignalType>(
    session: Pick<LanRoomSession, "roomId" | "peerId" | "token">,
    type: T,
    payload: LanSignalPayloadByType[T],
    negotiationId: string,
    clientMessageId = this.createId(),
  ): Promise<LanSignalMessage> {
    this.assertRequestId(negotiationId)
    this.assertRequestId(clientMessageId)
    const response = await this.request(`${this.roomUrl(session.roomId)}/signals`, {
      method: "POST",
      body: JSON.stringify({
        peerId: session.peerId,
        clientMessageId,
        negotiationId,
        type,
        payload,
      }),
    }, session.token, this.requestTimeoutMs)
    const body: unknown = await response.json()
    if (!isRecord(body)) {
      throw new LanSignalingError("Invalid signal publish response", 502, "INVALID_RESPONSE")
    }
    return validateSignalMessage(body.message)
  }

  async heartbeat(
    session: Pick<LanRoomSession, "roomId" | "peerId" | "token">,
  ): Promise<LanHeartbeatResponse> {
    const response = await this.request(`${this.roomUrl(session.roomId)}/heartbeat`, {
      method: "POST",
      body: JSON.stringify({ peerId: session.peerId }),
    }, session.token, this.requestTimeoutMs)
    const body: unknown = await response.json()
    if (
      !isRecord(body)
      || body.roomId !== session.roomId
      || body.peerId !== session.peerId
      || typeof body.expiresAt !== "string"
    ) {
      throw new LanSignalingError("Invalid heartbeat response", 502, "INVALID_RESPONSE")
    }
    return body as LanHeartbeatResponse
  }

  async leaveRoom(
    session: Pick<LanRoomSession, "roomId" | "peerId" | "role" | "token">,
  ): Promise<LanLeaveRoomResponse> {
    const response = await this.request(this.roomUrl(session.roomId), {
      method: "DELETE",
      body: JSON.stringify({ peerId: session.peerId }),
      keepalive: true,
    }, session.token, this.requestTimeoutMs)
    const body: unknown = await response.json()
    if (
      !isRecord(body)
      || body.roomId !== session.roomId
      || body.peerId !== session.peerId
      || body.role !== session.role
      || typeof body.roomDeleted !== "boolean"
      || body.roomDeleted !== (session.role === "host")
    ) {
      throw new LanSignalingError("Invalid leave room response", 502, "INVALID_RESPONSE")
    }
    return body as LanLeaveRoomResponse
  }

  private async openRoom(url: string, requestId: string): Promise<LanRoomSession> {
    this.assertRequestId(requestId)
    const response = await this.request(url, {
      method: "POST",
      body: JSON.stringify({ requestId, ...this.gameIdentity }),
    }, undefined, this.requestTimeoutMs)
    const session = validateRoomSession(await response.json())
    if (
      session.gameId !== this.gameIdentity.gameId
      || session.engineVersion !== this.gameIdentity.engineVersion
    ) {
      throw new LanSignalingError(
        "Room session identity does not match the requested game",
        502,
        "INVALID_RESPONSE",
      )
    }
    return session
  }

  private assertRequestId(requestId: string): void {
    if (!isUuid(requestId)) throw new TypeError("requestId must be a UUID")
  }

  private roomUrl(roomId: string): string {
    return `${this.baseUrl}/rooms/${encodeURIComponent(roomId)}`
  }

  private async request(
    url: string,
    init: RequestInit,
    token?: string,
    timeoutMs?: number,
  ): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set("Accept", "application/json")
    if (init.body !== undefined) headers.set("Content-Type", "application/json")
    if (token) headers.set("Authorization", `Bearer ${token}`)

    const sourceSignal = init.signal
    let requestSignal = sourceSignal
    let timedOut = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let removeSourceAbortListener: (() => void) | undefined

    if (timeoutMs !== undefined) {
      const timeoutController = new AbortController()
      requestSignal = timeoutController.signal

      if (sourceSignal?.aborted) {
        timeoutController.abort(sourceSignal.reason)
      } else if (sourceSignal) {
        const abortFromSource = () => timeoutController.abort(sourceSignal.reason)
        sourceSignal.addEventListener("abort", abortFromSource, { once: true })
        removeSourceAbortListener = () => sourceSignal.removeEventListener("abort", abortFromSource)
      }

      timeoutId = setTimeout(() => {
        timedOut = true
        timeoutController.abort()
      }, timeoutMs)
    }

    let response: Response
    try {
      response = await this.fetcher(url, {
        ...init,
        headers,
        cache: "no-store",
        signal: requestSignal,
      })
    } catch (error) {
      if (timedOut) {
        throw new LanSignalingError(
          `Signaling request timed out after ${timeoutMs}ms`,
          408,
          "REQUEST_TIMEOUT",
        )
      }
      throw new LanSignalingError(
        error instanceof Error ? error.message : "Signaling request failed",
        0,
        "NETWORK_ERROR",
      )
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      removeSourceAbortListener?.()
    }

    if (response.ok) return response

    let message = `Signaling request failed with HTTP ${response.status}`
    let code: string | undefined
    try {
      const body: unknown = await response.json()
      if (isRecord(body)) {
        const detail = isRecord(body.error) ? body.error : body
        if (typeof detail.message === "string") message = detail.message
        if (typeof detail.code === "string") code = detail.code
      }
    } catch {
      // The status remains sufficient when the response is not JSON.
    }
    throw new LanSignalingError(message, response.status, code)
  }
}
