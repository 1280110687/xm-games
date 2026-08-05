import {
  DEFAULT_LAN_ENGINE_VERSION,
  DEFAULT_LAN_GAME_ID,
  LAN_ENGINE_VERSION_PATTERN,
  LAN_GAME_ID_PATTERN,
  LAN_NEGOTIATION_ID_PATTERN,
  LAN_PEER_ID_PATTERN,
  LAN_REQUEST_ID_PATTERN,
  LAN_ROOM_CODE_PATTERN,
  LAN_TOKEN_PATTERN,
  LanSignalError,
  type LanSignalInput,
  type LanSignalPayloadByType,
  type LanSignalType,
} from "./lan-signaling-types"

export const LAN_SMALL_BODY_LIMIT_BYTES = 1_024
export const LAN_SIGNAL_BODY_LIMIT_BYTES = 72 * 1_024
export const LAN_SDP_LIMIT_BYTES = 64 * 1_024
export const LAN_ICE_CANDIDATE_LIMIT_BYTES = 8 * 1_024
export const LAN_MAX_LONG_POLL_MS = 25_000

interface CreateOrJoinBody {
  requestId: string
  gameId: string
  engineVersion: string
}

interface PeerBody {
  peerId: string
}

type PublishSignalBody = {
  [Type in LanSignalType]: PeerBody & {
    clientMessageId: string
    negotiationId: string
    type: Type
    payload: LanSignalPayloadByType[Type]
  }
}[LanSignalType]

interface PollSignalsQuery extends PeerBody {
  cursor: number
  waitMs: number
}

const textEncoder = new TextEncoder()

function invalid(message: string): never {
  throw new LanSignalError("INVALID_REQUEST", 400, message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function assertRecord(value: unknown, name: string): Record<string, unknown> {
  if (!isRecord(value)) {
    return invalid(`${name} must be a JSON object.`)
  }

  return value
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[] = allowedKeys,
): void {
  const allowed = new Set(allowedKeys)

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      invalid(`Unexpected field: ${key}.`)
    }
  }

  for (const key of requiredKeys) {
    if (!Object.hasOwn(value, key)) {
      invalid(`Missing field: ${key}.`)
    }
  }
}

function assertPattern(
  value: unknown,
  pattern: RegExp,
  field: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    return invalid(`Invalid ${field}.`)
  }

  return value
}

function assertStringBytes(
  value: unknown,
  field: string,
  minBytes: number,
  maxBytes: number,
): string {
  if (typeof value !== "string") {
    return invalid(`${field} must be a string.`)
  }

  const size = textEncoder.encode(value).byteLength
  if (size < minBytes || size > maxBytes) {
    return invalid(`${field} has an invalid size.`)
  }

  return value
}

function assertNullableString(
  value: unknown,
  field: string,
  maxBytes: number,
  allowEmpty: boolean,
): string | null {
  if (value === null) {
    return null
  }

  return assertStringBytes(value, field, allowEmpty ? 0 : 1, maxBytes)
}

function parseDescriptionPayload(value: unknown): LanSignalPayloadByType["offer"] {
  const payload = assertRecord(value, "payload")
  assertExactKeys(payload, ["sdp"])

  return {
    sdp: assertStringBytes(payload.sdp, "payload.sdp", 1, LAN_SDP_LIMIT_BYTES),
  }
}

function parseIcePayload(value: unknown): LanSignalPayloadByType["ice"] {
  const payload = assertRecord(value, "payload")
  assertExactKeys(
    payload,
    ["candidate", "sdpMid", "sdpMLineIndex", "usernameFragment"],
    ["candidate", "sdpMid", "sdpMLineIndex"],
  )

  const sdpMLineIndex = payload.sdpMLineIndex
  if (
    sdpMLineIndex !== null &&
    (!Number.isSafeInteger(sdpMLineIndex) ||
      (sdpMLineIndex as number) < 0 ||
      (sdpMLineIndex as number) > 65_535)
  ) {
    invalid("payload.sdpMLineIndex must be null or an unsigned integer.")
  }

  const normalized: {
    candidate: string
    sdpMid: string | null
    sdpMLineIndex: number | null
    usernameFragment?: string | null
  } = {
    candidate: assertStringBytes(
      payload.candidate,
      "payload.candidate",
      1,
      LAN_ICE_CANDIDATE_LIMIT_BYTES,
    ),
    sdpMid: assertNullableString(payload.sdpMid, "payload.sdpMid", 256, true),
    sdpMLineIndex: sdpMLineIndex as number | null,
  }

  if (Object.hasOwn(payload, "usernameFragment")) {
    normalized.usernameFragment = assertNullableString(
      payload.usernameFragment,
      "payload.usernameFragment",
      256,
      false,
    )
  }

  return normalized
}

function parseEmptyPayload(value: unknown): Record<string, never> {
  const payload = assertRecord(value, "payload")
  assertExactKeys(payload, [], [])
  return {}
}

export function parseCreateOrJoinBody(value: unknown): CreateOrJoinBody {
  const body = assertRecord(value, "request body")
  assertExactKeys(
    body,
    ["requestId", "gameId", "engineVersion"],
    ["requestId"],
  )

  const hasGameId = Object.hasOwn(body, "gameId")
  const hasEngineVersion = Object.hasOwn(body, "engineVersion")
  if (hasGameId !== hasEngineVersion) {
    invalid("gameId and engineVersion must be provided together.")
  }

  return {
    requestId: assertPattern(
      body.requestId,
      LAN_REQUEST_ID_PATTERN,
      "requestId",
    ),
    gameId: hasGameId
      ? assertPattern(body.gameId, LAN_GAME_ID_PATTERN, "gameId")
      : DEFAULT_LAN_GAME_ID,
    engineVersion: hasEngineVersion
      ? assertPattern(
          body.engineVersion,
          LAN_ENGINE_VERSION_PATTERN,
          "engineVersion",
        )
      : DEFAULT_LAN_ENGINE_VERSION,
  }
}

export function parsePeerBody(value: unknown): PeerBody {
  const body = assertRecord(value, "request body")
  assertExactKeys(body, ["peerId"])

  return {
    peerId: assertPattern(body.peerId, LAN_PEER_ID_PATTERN, "peerId"),
  }
}

export function parsePublishSignalBody(value: unknown): PublishSignalBody {
  const body = assertRecord(value, "request body")
  assertExactKeys(body, [
    "peerId",
    "clientMessageId",
    "negotiationId",
    "type",
    "payload",
  ])

  const type = body.type
  if (
    type !== "offer" &&
    type !== "answer" &&
    type !== "ice" &&
    type !== "ice-complete" &&
    type !== "renegotiate"
  ) {
    invalid("Unsupported signal type.")
  }

  let payload: LanSignalInput["payload"]
  if (type === "offer" || type === "answer") {
    payload = parseDescriptionPayload(body.payload)
  } else if (type === "ice") {
    payload = parseIcePayload(body.payload)
  } else {
    payload = parseEmptyPayload(body.payload)
  }

  return {
    peerId: assertPattern(body.peerId, LAN_PEER_ID_PATTERN, "peerId"),
    clientMessageId: assertPattern(
      body.clientMessageId,
      LAN_REQUEST_ID_PATTERN,
      "clientMessageId",
    ),
    negotiationId: assertPattern(
      body.negotiationId,
      LAN_NEGOTIATION_ID_PATTERN,
      "negotiationId",
    ),
    type,
    payload,
  } as PublishSignalBody
}

export function parsePollSignalsQuery(url: URL): PollSignalsQuery {
  const allowedKeys = new Set(["peerId", "cursor", "waitMs"])
  for (const key of url.searchParams.keys()) {
    if (!allowedKeys.has(key)) {
      invalid(`Unexpected query parameter: ${key}.`)
    }
  }

  const peerId = assertPattern(
    url.searchParams.get("peerId"),
    LAN_PEER_ID_PATTERN,
    "peerId",
  )

  const cursorText = url.searchParams.get("cursor")
  if (cursorText === null || !/^(0|[1-9]\d*)$/u.test(cursorText)) {
    invalid("cursor must be a non-negative integer.")
  }

  const cursor = Number(cursorText)
  if (!Number.isSafeInteger(cursor)) {
    invalid("cursor must be a safe integer.")
  }

  const waitText = url.searchParams.get("waitMs") ?? "0"
  if (!/^(0|[1-9]\d*)$/u.test(waitText)) {
    invalid("waitMs must be a non-negative integer.")
  }

  const waitMs = Number(waitText)
  if (!Number.isSafeInteger(waitMs) || waitMs > LAN_MAX_LONG_POLL_MS) {
    invalid(`waitMs must not exceed ${LAN_MAX_LONG_POLL_MS}.`)
  }

  return { peerId, cursor, waitMs }
}

export function parseRoomId(value: string): string {
  return assertPattern(value, LAN_ROOM_CODE_PATTERN, "roomId")
}

export function parseBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization")
  const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/u)

  if (!match || !LAN_TOKEN_PATTERN.test(match[1])) {
    throw new LanSignalError(
      "INVALID_AUTHORIZATION",
      401,
      "A valid bearer token is required.",
    )
  }

  return match[1]
}
