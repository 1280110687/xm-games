export const LAN_ROOM_CODE_PATTERN = /^\d{6}$/u
export const LAN_PEER_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/u
export const LAN_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u
export const LAN_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/u
export const LAN_GAME_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,31}$/u
export const LAN_ENGINE_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{1,127}$/u
export const DEFAULT_LAN_GAME_ID = "gomoku"
export const DEFAULT_LAN_ENGINE_VERSION = "gomoku-free-v2"
export const LAN_NEGOTIATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export type LanRole = "host" | "guest"

export type LanSignalType =
  | "offer"
  | "answer"
  | "ice"
  | "ice-complete"
  | "renegotiate"

export interface LanSessionDescriptionPayload {
  sdp: string
}

export interface LanIceCandidatePayload {
  candidate: string
  sdpMid: string | null
  sdpMLineIndex: number | null
  usernameFragment?: string | null
}

export interface LanSignalPayloadByType {
  offer: LanSessionDescriptionPayload
  answer: LanSessionDescriptionPayload
  ice: LanIceCandidatePayload
  "ice-complete": Record<string, never>
  renegotiate: Record<string, never>
}

export type LanSignalInput = {
  [Type in LanSignalType]: {
    negotiationId: string
    type: Type
    payload: LanSignalPayloadByType[Type]
  }
}[LanSignalType]

interface LanSignalMessageMetadata {
  cursor: number
  id: string
  fromPeerId: string
  fromRole: LanRole
  createdAt: string
}

export type LanSignalMessage = LanSignalInput & LanSignalMessageMetadata

export interface LanPeerSession {
  gameId: string
  engineVersion: string
  roomId: string
  peerId: string
  role: LanRole
  token: string
  cursor: number
  expiresAt: string
}

export interface LanIdempotentResult<T> {
  value: T
  deduplicated: boolean
}

export interface LanCreateRoomInput {
  requestId: string
  gameId?: string
  engineVersion?: string
}

export interface LanJoinRoomInput {
  roomId: string
  requestId: string
  gameId?: string
  engineVersion?: string
}

export function normalizeLanGameIdentity(
  input: Pick<LanCreateRoomInput, "gameId" | "engineVersion">,
): { gameId: string; engineVersion: string } {
  return {
    gameId: input.gameId ?? DEFAULT_LAN_GAME_ID,
    engineVersion: input.engineVersion ?? DEFAULT_LAN_ENGINE_VERSION,
  }
}

export interface LanAuthenticatedInput {
  roomId: string
  peerId: string
  token: string
}

export interface LanPublishSignalInput extends LanAuthenticatedInput {
  clientMessageId: string
  signal: LanSignalInput
}

export interface LanPollSignalsInput extends LanAuthenticatedInput {
  cursor: number
  waitMs: number
  signal?: AbortSignal
}

export interface LanPollSignalsResult {
  messages: LanSignalMessage[]
  cursor: number
  expiresAt: string
}

export interface LanHeartbeatResult {
  roomId: string
  peerId: string
  expiresAt: string
}

export interface LanLeaveRoomResult {
  roomId: string
  peerId: string
  role: LanRole
  roomDeleted: boolean
}

/**
 * The interface is intentionally storage-agnostic. A shared Redis/database
 * implementation can replace the in-memory store without changing routes.
 */
export interface LanSignalStore {
  createRoom(
    input: LanCreateRoomInput,
  ): Promise<LanIdempotentResult<LanPeerSession>>
  joinRoom(
    input: LanJoinRoomInput,
  ): Promise<LanIdempotentResult<LanPeerSession>>
  publishSignal(
    input: LanPublishSignalInput,
  ): Promise<LanIdempotentResult<LanSignalMessage>>
  pollSignals(input: LanPollSignalsInput): Promise<LanPollSignalsResult>
  heartbeat(input: LanAuthenticatedInput): Promise<LanHeartbeatResult>
  leaveRoom(input: LanAuthenticatedInput): Promise<LanLeaveRoomResult>
  cleanupExpired(): number | Promise<number>
}

export type LanErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_AUTHORIZATION"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "ROOM_LIMIT_REACHED"
  | "ROOM_CODE_EXHAUSTED"
  | "GAME_MISMATCH"
  | "ENGINE_MISMATCH"
  | "SERVICE_UNAVAILABLE"
  | "IDEMPOTENCY_CONFLICT"
  | "SIGNAL_LIMIT_REACHED"
  | "POLL_LIMIT_REACHED"
  | "CURSOR_AHEAD"
  | "CURSOR_EXPIRED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL_ERROR"

export class LanSignalError extends Error {
  readonly code: LanErrorCode
  readonly status: number

  constructor(code: LanErrorCode, status: number, message: string) {
    super(message)
    this.name = "LanSignalError"
    this.code = code
    this.status = status
  }
}
