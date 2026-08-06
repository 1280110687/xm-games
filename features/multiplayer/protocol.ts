import type { JsonValue } from "./crypto"
import {
  isLanMatchAdvance,
  isLanMatchSeriesState,
  type LanMatchAdvance,
  type LanMatchSeriesState,
} from "./match-series"

export const MULTIPLAYER_PROTOCOL_VERSION = 2 as const
export const MAX_MULTIPLAYER_MESSAGE_BYTES = 32 * 1024

export const MULTIPLAYER_MESSAGE_TYPES = [
  "peer.hello",
  "peer.heartbeat",
  "peer.heartbeat-ack",
  "room.ready",
  "match.state",
  "match.rematch-request",
  "match.advance",
  "match.advance-ack",
  "dice.commit",
  "dice.reveal",
  "dice.result",
  "dice.result-ack",
  "action.propose",
  "action.ack",
  "action.reject",
  "sync.request",
  "sync.snapshot",
] as const

export type MultiplayerMessageType = (typeof MULTIPLAYER_MESSAGE_TYPES)[number]

type PayloadByType = {
  "peer.hello": { engineVersion: string }
  "peer.heartbeat": { nonce: string }
  "peer.heartbeat-ack": { nonce: string }
  "room.ready": { ready: boolean }
  "match.state": { series: LanMatchSeriesState }
  "match.rematch-request": {
    gameNumber: number
    terminalRevision: number
    terminalStateHash: string
  }
  "match.advance": { advance: LanMatchAdvance }
  "match.advance-ack": {
    advanceId: string
    fromGameNumber: number
    toGameNumber: number
  }
  "dice.commit": { gameNumber: number; round: number; commitment: string }
  "dice.reveal": { gameNumber: number; round: number; nonce: string }
  "dice.result": {
    gameNumber: number
    round: number
    rolls: Record<string, number>
    firstPlayerId: string | null
    tied: boolean
    proof: string
  }
  "dice.result-ack": { gameNumber: number; round: number; proof: string }
  "action.propose": {
    gameNumber: number
    actionId: string
    baseRevision: number
    action: JsonValue
  }
  "action.ack": {
    gameNumber: number
    actionId: string
    baseRevision: number
    nextRevision: number
    nextStateHash: string
  }
  "action.reject": {
    gameNumber: number
    actionId: string
    code: string
  }
  "sync.request": { gameNumber: number; revision: number; stateHash?: string }
  "sync.snapshot": {
    gameNumber: number
    revision: number
    stateHash: string
    state: JsonValue
  }
}

export type MultiplayerMessage<T extends MultiplayerMessageType = MultiplayerMessageType> = {
  [K in T]: {
    v: typeof MULTIPLAYER_PROTOCOL_VERSION
    type: K
    messageId: string
    roomId: string
    matchId: string
    senderId: string
    sentAt: number
    payload: PayloadByType[K]
  }
}[T]

export type ProtocolParseErrorCode =
  | "MESSAGE_TOO_LARGE"
  | "INVALID_ENCODING"
  | "INVALID_JSON"
  | "INVALID_ENVELOPE"
  | "UNSUPPORTED_VERSION"
  | "UNSUPPORTED_TYPE"
  | "INVALID_PAYLOAD"

export class ProtocolParseError extends Error {
  constructor(
    public readonly code: ProtocolParseErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "ProtocolParseError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isBoundedString(value: unknown, maxLength = 256): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength
}

function isRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value)
  return required.every((key) => Object.hasOwn(value, key))
    && keys.every((key) => required.includes(key) || optional.includes(key))
}

function isJsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > 24) return false
  if (value === null || typeof value === "string" || typeof value === "boolean") return true
  if (typeof value === "number") return Number.isFinite(value)
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item, depth + 1))
  if (!isRecord(value)) return false
  return Object.entries(value).every(
    ([key, child]) => key.length <= 128 && isJsonValue(child, depth + 1),
  )
}

function isHexDigest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{64}$/iu.test(value)
}

function validatePayload(type: MultiplayerMessageType, payload: unknown): boolean {
  if (!isRecord(payload)) return false

  switch (type) {
    case "peer.hello":
      return hasExactKeys(payload, ["engineVersion"])
        && isBoundedString(payload.engineVersion, 128)
    case "peer.heartbeat":
    case "peer.heartbeat-ack":
      return hasExactKeys(payload, ["nonce"])
        && isBoundedString(payload.nonce, 128)
    case "room.ready":
      return hasExactKeys(payload, ["ready"])
        && typeof payload.ready === "boolean"
    case "match.state":
      return hasExactKeys(payload, ["series"])
        && isLanMatchSeriesState(payload.series)
    case "match.rematch-request":
      return hasExactKeys(payload, [
        "gameNumber",
        "terminalRevision",
        "terminalStateHash",
      ])
        && isRevision(payload.gameNumber)
        && payload.gameNumber > 0
        && isRevision(payload.terminalRevision)
        && isHexDigest(payload.terminalStateHash)
    case "match.advance":
      return hasExactKeys(payload, ["advance"])
        && isLanMatchAdvance(payload.advance)
    case "match.advance-ack":
      return hasExactKeys(payload, ["advanceId", "fromGameNumber", "toGameNumber"])
        && isBoundedString(payload.advanceId, 128)
        && isRevision(payload.fromGameNumber)
        && payload.fromGameNumber > 0
        && payload.toGameNumber === Number(payload.fromGameNumber) + 1
    case "dice.commit":
      return hasExactKeys(payload, ["gameNumber", "round", "commitment"])
        && isRevision(payload.gameNumber) && payload.gameNumber > 0
        && isRevision(payload.round) && payload.round > 0 && isHexDigest(payload.commitment)
    case "dice.reveal":
      return hasExactKeys(payload, ["gameNumber", "round", "nonce"])
        && isRevision(payload.gameNumber) && payload.gameNumber > 0
        && isRevision(payload.round)
        && payload.round > 0
        && isBoundedString(payload.nonce, 128)
        && /^[A-Za-z\d_-]+$/u.test(payload.nonce)
    case "dice.result": {
      if (
        !hasExactKeys(payload, ["gameNumber", "round", "rolls", "firstPlayerId", "tied", "proof"])
        || !isRevision(payload.gameNumber)
        || payload.gameNumber <= 0
        || !isRevision(payload.round)
        || payload.round <= 0
        || !isRecord(payload.rolls)
        || typeof payload.tied !== "boolean"
        || !isHexDigest(payload.proof)
        || (payload.firstPlayerId !== null && !isBoundedString(payload.firstPlayerId))
      ) return false

      const rolls = Object.entries(payload.rolls)
      if (
        rolls.length !== 2
        || rolls.some(([playerId, roll]) => (
          !isBoundedString(playerId)
          || !Number.isInteger(roll)
          || Number(roll) < 1
          || Number(roll) > 6
        ))
      ) return false

      const [[firstId, firstRoll], [secondId, secondRoll]] = rolls
      if (payload.tied) {
        return payload.firstPlayerId === null && firstRoll === secondRoll
      }

      const expectedWinner = Number(firstRoll) > Number(secondRoll) ? firstId : secondId
      return firstRoll !== secondRoll && payload.firstPlayerId === expectedWinner
    }
    case "dice.result-ack":
      return hasExactKeys(payload, ["gameNumber", "round", "proof"])
        && isRevision(payload.gameNumber)
        && payload.gameNumber > 0
        && isRevision(payload.round)
        && payload.round > 0
        && isHexDigest(payload.proof)
    case "action.propose":
      return hasExactKeys(payload, ["gameNumber", "actionId", "baseRevision", "action"])
        && isRevision(payload.gameNumber) && payload.gameNumber > 0
        && isBoundedString(payload.actionId)
        && isRevision(payload.baseRevision)
        && isJsonValue(payload.action)
    case "action.ack":
      return hasExactKeys(payload, ["gameNumber", "actionId", "baseRevision", "nextRevision", "nextStateHash"])
        && isRevision(payload.gameNumber) && payload.gameNumber > 0
        && isBoundedString(payload.actionId)
        && isRevision(payload.baseRevision)
        && isRevision(payload.nextRevision)
        && payload.nextRevision === payload.baseRevision + 1
        && isHexDigest(payload.nextStateHash)
    case "action.reject":
      return hasExactKeys(payload, ["gameNumber", "actionId", "code"])
        && isRevision(payload.gameNumber) && payload.gameNumber > 0
        && isBoundedString(payload.actionId) && isBoundedString(payload.code, 64)
    case "sync.request":
      return hasExactKeys(payload, ["gameNumber", "revision"], ["stateHash"])
        && isRevision(payload.gameNumber) && payload.gameNumber > 0
        && isRevision(payload.revision)
        && (payload.stateHash === undefined || isHexDigest(payload.stateHash))
    case "sync.snapshot":
      return hasExactKeys(payload, ["gameNumber", "revision", "stateHash", "state"])
        && isRevision(payload.gameNumber) && payload.gameNumber > 0
        && isRevision(payload.revision)
        && isHexDigest(payload.stateHash)
        && isJsonValue(payload.state)
  }
}

function decodeInput(input: string | ArrayBuffer | ArrayBufferView): string {
  if (typeof input === "string") return input

  try {
    const bytes = input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    throw new ProtocolParseError("INVALID_ENCODING", "Message is not valid UTF-8")
  }
}

export function parseMultiplayerMessage(
  input: string | ArrayBuffer | ArrayBufferView,
  maxBytes = MAX_MULTIPLAYER_MESSAGE_BYTES,
): MultiplayerMessage {
  const byteLength = typeof input === "string"
    ? new TextEncoder().encode(input).byteLength
    : input.byteLength

  if (byteLength > maxBytes) {
    throw new ProtocolParseError(
      "MESSAGE_TOO_LARGE",
      `Message exceeds the ${maxBytes}-byte limit`,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(decodeInput(input))
  } catch (error) {
    if (error instanceof ProtocolParseError) throw error
    throw new ProtocolParseError("INVALID_JSON", "Message is not valid JSON")
  }

  if (!isRecord(parsed)) {
    throw new ProtocolParseError("INVALID_ENVELOPE", "Message envelope must be an object")
  }
  if (!hasExactKeys(parsed, [
    "v",
    "type",
    "messageId",
    "roomId",
    "matchId",
    "senderId",
    "sentAt",
    "payload",
  ])) {
    throw new ProtocolParseError("INVALID_ENVELOPE", "Message envelope contains invalid fields")
  }
  if (parsed.v !== MULTIPLAYER_PROTOCOL_VERSION) {
    throw new ProtocolParseError("UNSUPPORTED_VERSION", "Unsupported multiplayer protocol version")
  }
  if (!MULTIPLAYER_MESSAGE_TYPES.includes(parsed.type as MultiplayerMessageType)) {
    throw new ProtocolParseError("UNSUPPORTED_TYPE", "Unsupported multiplayer message type")
  }
  if (
    !isBoundedString(parsed.messageId)
    || !isBoundedString(parsed.roomId, 64)
    || !isBoundedString(parsed.matchId)
    || !isBoundedString(parsed.senderId)
    || !Number.isSafeInteger(parsed.sentAt)
    || Number(parsed.sentAt) < 0
  ) {
    throw new ProtocolParseError("INVALID_ENVELOPE", "Message envelope fields are invalid")
  }

  const type = parsed.type as MultiplayerMessageType
  if (!validatePayload(type, parsed.payload)) {
    throw new ProtocolParseError("INVALID_PAYLOAD", `Invalid payload for ${type}`)
  }

  return parsed as MultiplayerMessage
}

export function serializeMultiplayerMessage(
  message: MultiplayerMessage,
  maxBytes = MAX_MULTIPLAYER_MESSAGE_BYTES,
): string {
  const serialized = JSON.stringify(message)
  const size = new TextEncoder().encode(serialized).byteLength
  if (size > maxBytes) {
    throw new ProtocolParseError(
      "MESSAGE_TOO_LARGE",
      `Message exceeds the ${maxBytes}-byte limit`,
    )
  }
  return serialized
}
