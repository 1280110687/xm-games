import { isBingoCard, type BingoCard } from "./cards"
import type { BingoLanPublicState } from "./lan-game"

export const BINGO_LAN_PROTOCOL_VERSION = 1 as const
export const BINGO_LAN_MAX_MESSAGE_BYTES = 48 * 1024

export type BingoLanRejectCode =
  | "ROOM_FULL"
  | "ROOM_LOCKED"
  | "ROOM_CLOSED"
  | "NICKNAME_TAKEN"
  | "INVALID_CARDS"
  | "INVALID_MESSAGE"

export type BingoLanPayloadByType = {
  "guest.hello": { playerId: string; nickname: string }
  "guest.lobby": { cards: BingoCard[]; ready: boolean }
  "guest.claim": { roundId: string; drawRevision: number; cardId: string }
  "guest.leave": Record<string, never>
  "host.accept": { state: BingoLanPublicState }
  "host.reject": { code: BingoLanRejectCode; message: string }
  "host.state": { state: BingoLanPublicState }
  "peer.ping": { nonce: string }
  "peer.pong": { nonce: string }
}

export type BingoLanMessageType = keyof BingoLanPayloadByType

export type BingoLanMessage<T extends BingoLanMessageType = BingoLanMessageType> = {
  [Type in T]: {
    v: typeof BINGO_LAN_PROTOCOL_VERSION
    type: Type
    messageId: string
    senderId: string
    sentAt: number
    payload: BingoLanPayloadByType[Type]
  }
}[T]

export class BingoLanProtocolError extends Error {
  constructor(
    public readonly code:
      | "MESSAGE_TOO_LARGE"
      | "INVALID_JSON"
      | "INVALID_MESSAGE"
      | "UNSUPPORTED_VERSION",
    message: string,
  ) {
    super(message)
    this.name = "BingoLanProtocolError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
): boolean {
  const keys = Object.keys(value)
  return keys.length === required.length && required.every((key) => Object.hasOwn(value, key))
}

function isBoundedString(value: unknown, maxLength = 128): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= maxLength
}

function isRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isNumberList(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length > 75) return false
  const numbers = value.filter((item): item is number => (
    Number.isInteger(item) && Number(item) >= 1 && Number(item) <= 75
  ))
  return numbers.length === value.length && new Set(numbers).size === numbers.length
}

function isPublicState(value: unknown): value is BingoLanPublicState {
  if (!isRecord(value)) return false
  if (!hasExactKeys(value, [
    "roomId",
    "phase",
    "roundId",
    "drawRevision",
    "currentNumber",
    "drawnNumbers",
    "players",
    "winners",
    "settlementDeadline",
  ])) return false
  if (
    !isBoundedString(value.roomId, 64)
    || !["lobby", "playing", "settling", "finished"].includes(String(value.phase))
    || !isBoundedString(value.roundId)
    || !isRevision(value.drawRevision)
    || (
      value.currentNumber !== null
      && (!Number.isInteger(value.currentNumber) || Number(value.currentNumber) < 1 || Number(value.currentNumber) > 75)
    )
    || !isNumberList(value.drawnNumbers)
    || !Array.isArray(value.players)
    || value.players.length > 8
    || !Array.isArray(value.winners)
    || (value.settlementDeadline !== null && !isRevision(value.settlementDeadline))
  ) return false

  const playersValid = value.players.every((player) => (
    isRecord(player)
    && hasExactKeys(player, ["playerId", "nickname", "ready", "connected", "cardCount"])
    && isBoundedString(player.playerId)
    && isBoundedString(player.nickname, 32)
    && typeof player.ready === "boolean"
    && typeof player.connected === "boolean"
    && Number.isInteger(player.cardCount)
    && Number(player.cardCount) >= 0
    && Number(player.cardCount) <= 4
  ))
  const winnersValid = value.winners.every((winner) => (
    isRecord(winner)
    && hasExactKeys(winner, ["playerId", "nickname", "cardIds"])
    && isBoundedString(winner.playerId)
    && isBoundedString(winner.nickname, 32)
    && Array.isArray(winner.cardIds)
    && winner.cardIds.length >= 1
    && winner.cardIds.length <= 4
    && winner.cardIds.every((cardId) => isBoundedString(cardId))
  ))
  return playersValid && winnersValid
}

function validatePayload(type: BingoLanMessageType, payload: unknown): boolean {
  if (!isRecord(payload)) return false

  switch (type) {
    case "guest.hello":
      return hasExactKeys(payload, ["playerId", "nickname"])
        && isBoundedString(payload.playerId)
        && isBoundedString(payload.nickname, 32)
    case "guest.lobby":
      return hasExactKeys(payload, ["cards", "ready"])
        && Array.isArray(payload.cards)
        && payload.cards.length <= 4
        && payload.cards.every(isBingoCard)
        && typeof payload.ready === "boolean"
    case "guest.claim":
      return hasExactKeys(payload, ["roundId", "drawRevision", "cardId"])
        && isBoundedString(payload.roundId)
        && isRevision(payload.drawRevision)
        && isBoundedString(payload.cardId)
    case "guest.leave":
      return Object.keys(payload).length === 0
    case "host.accept":
    case "host.state":
      return hasExactKeys(payload, ["state"]) && isPublicState(payload.state)
    case "host.reject":
      return hasExactKeys(payload, ["code", "message"])
        && [
          "ROOM_FULL",
          "ROOM_LOCKED",
          "ROOM_CLOSED",
          "NICKNAME_TAKEN",
          "INVALID_CARDS",
          "INVALID_MESSAGE",
        ].includes(String(payload.code))
        && isBoundedString(payload.message, 256)
    case "peer.ping":
    case "peer.pong":
      return hasExactKeys(payload, ["nonce"]) && isBoundedString(payload.nonce)
  }
}

function messageType(value: unknown): value is BingoLanMessageType {
  return (
    value === "guest.hello"
    || value === "guest.lobby"
    || value === "guest.claim"
    || value === "guest.leave"
    || value === "host.accept"
    || value === "host.reject"
    || value === "host.state"
    || value === "peer.ping"
    || value === "peer.pong"
  )
}

export function createBingoLanMessage<T extends BingoLanMessageType>(
  type: T,
  senderId: string,
  payload: BingoLanPayloadByType[T],
): BingoLanMessage<T> {
  if (!globalThis.crypto?.randomUUID) throw new Error("crypto.randomUUID is unavailable")
  return {
    v: BINGO_LAN_PROTOCOL_VERSION,
    type,
    messageId: globalThis.crypto.randomUUID(),
    senderId,
    sentAt: Date.now(),
    payload,
  } as BingoLanMessage<T>
}

export function serializeBingoLanMessage<Type extends BingoLanMessageType>(
  message: BingoLanMessage<Type>,
): string {
  const serialized = JSON.stringify(message)
  if (new TextEncoder().encode(serialized).byteLength > BINGO_LAN_MAX_MESSAGE_BYTES) {
    throw new BingoLanProtocolError("MESSAGE_TOO_LARGE", "Bingo LAN message is too large")
  }
  return serialized
}

export function parseBingoLanMessage(input: unknown): BingoLanMessage {
  if (typeof input !== "string") {
    throw new BingoLanProtocolError("INVALID_MESSAGE", "Bingo LAN message must be text")
  }
  if (new TextEncoder().encode(input).byteLength > BINGO_LAN_MAX_MESSAGE_BYTES) {
    throw new BingoLanProtocolError("MESSAGE_TOO_LARGE", "Bingo LAN message is too large")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    throw new BingoLanProtocolError("INVALID_JSON", "Bingo LAN message is not valid JSON")
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, [
    "v",
    "type",
    "messageId",
    "senderId",
    "sentAt",
    "payload",
  ])) {
    throw new BingoLanProtocolError("INVALID_MESSAGE", "Bingo LAN envelope is invalid")
  }
  if (parsed.v !== BINGO_LAN_PROTOCOL_VERSION) {
    throw new BingoLanProtocolError("UNSUPPORTED_VERSION", "Unsupported Bingo LAN version")
  }
  if (
    !messageType(parsed.type)
    || !isBoundedString(parsed.messageId)
    || !isBoundedString(parsed.senderId)
    || !isRevision(parsed.sentAt)
    || !validatePayload(parsed.type, parsed.payload)
  ) {
    throw new BingoLanProtocolError("INVALID_MESSAGE", "Bingo LAN message fields are invalid")
  }
  return parsed as BingoLanMessage
}
