"use client"

import { useEffect, useRef, useState } from "react"

import {
  createDiceCommit,
  resolveDiceRound,
  verifyDiceReveal,
  type DiceCommit,
  type DiceRoundResult,
  type DiceRoundContext,
} from "./dice"
import { canonicalizeJson, hashJson, type JsonValue } from "./crypto"
import {
  MULTIPLAYER_PROTOCOL_VERSION,
  type MultiplayerMessage,
} from "./protocol"
import {
  applyLanMatchAdvance,
  bothPlayersRequestedRematch,
  createLanMatchAdvance,
  createLanMatchSeries,
  isLanMatchSettlementAhead,
  isLanMatchSeriesState,
  mergeLanMatchRematchRequests,
  requestLanMatchRematch,
  sameLanMatchRematchRequests,
  settleLanMatchSeries,
  toLanMatchSeriesView,
  withPendingLanMatchAdvance,
  type LanMatchAdvance,
  type LanMatchSeriesState,
  type LanMatchSeriesView,
} from "./match-series"
import {
  ReliableRtcChannel,
  createReliableOrderedDataChannel,
} from "./rtc-channel"
import { RtcHeartbeatController } from "./connection"
import {
  LanSignalingClient,
  LanSignalingError,
  type LanRoomSession,
  type LanSignalMessage,
  type LanSignalPayloadByType,
  type LanSignalType,
} from "./signaling-client"
import type { LanTurnGameAdapter } from "./turn-game"
import {
  PendingRoomRequestStore,
  type PendingRoomRequest,
} from "../gomoku/pending-room-request"
import {
  classifyHistoricalDiceResult,
  classifyHistoricalDiceResultAcknowledgement,
  diceRoundResultsMatch,
  isValidImmediatePreviousDiceResult,
} from "./dice-recovery"

const SIGNAL_HEARTBEAT_MS = 12_000
const RECONNECT_DELAY_MS = 1_200
const ROOM_REQUEST_RETRY_DELAY_MS = 900
const SIGNAL_POLL_FAST_MS = 500
const SIGNAL_POLL_BACKOFF_MAX_MS = 2_000
const SIGNAL_POLL_CONNECTED_MS = 8_000
const SIGNAL_POLL_HIDDEN_MS = 15_000
const SIGNAL_POLL_JITTER_RATIO = 0.2
const GUEST_RENEGOTIATION_RETRY_BASE_MS = 1_000
const GUEST_RENEGOTIATION_RETRY_JITTER_RATIO = 0.2
export const GUEST_RENEGOTIATION_MAX_RETRIES = 4
const DICE_RESULT_HOLD_MS = 1_450
const PROCESSED_MESSAGE_LIMIT = 512
const STORED_ROOM_ID_PATTERN = /^\d{6}$/u
const STORED_PEER_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/u
const STORED_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u

export type LanTurnGamePhase =
  | "idle"
  | "creating"
  | "waiting"
  | "connecting"
  | "ready"
  | "dice"
  | "syncing"
  | "playing"
  | "reconnecting"
  | "error"

export type LanTurnGameErrorCode =
  | "UNSUPPORTED_BROWSER"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "ROOM_EXPIRED"
  | "NETWORK_ERROR"
  | "CONNECTION_FAILED"
  | "GAME_MISMATCH"
  | "ENGINE_MISMATCH"
  | "INVALID_DICE"
  | "DESYNC"
  | "UNKNOWN"

export interface LanTurnGameDiceView {
  local: number | null
  remote: number | null
  round: number
  status: "committing" | "revealing" | "resolved" | "tied"
}

interface PendingGameAction<State, Action> {
  actionId: string
  baseRevision: number
  action: Action
  state: State
  stateHash: string
}

interface CachedAcknowledgement<Action> {
  actionId: string
  action: Action
  baseRevision: number
  messageId: string
  nextRevision: number
  nextStateHash: string
}

export interface GuestRenegotiationOperation {
  negotiationId: string
  clientMessageId: string
  attempts: number
}

interface DiceRuntime {
  round: number
  previousFinalizedResult: DiceRoundResult | null
  localCommit: DiceCommit | null
  commitments: Record<string, string>
  reveals: Record<string, string>
  revealSent: boolean
  resolving: boolean
  resultSent: boolean
  localResult: DiceRoundResult | null
  remoteResult: DiceRoundResult | null
  commitInitializing: boolean
  finalized: boolean
  resultAcknowledgedByRemote: boolean
}

interface StoredPendingGameAction {
  actionId: string
  baseRevision: number
  action: JsonValue
  state: JsonValue
  stateHash: string
}

interface StoredCachedAcknowledgement {
  actionId: string
  action: JsonValue
  baseRevision: number
  messageId: string
  nextRevision: number
  nextStateHash: string
}

export interface StoredLanTurnGameSession {
  version: 3
  session: LanRoomSession
  matchId: string
  remotePeerId: string | null
  phase: LanTurnGamePhase
  localReady: boolean
  remoteReady: boolean
  game: JsonValue
  revision: number
  firstPeerId: string | null
  diceRuntime: DiceRuntime | null
  dice: LanTurnGameDiceView | null
  pendingAction: StoredPendingGameAction | null
  acknowledgements: StoredCachedAcknowledgement[]
  matchSeries: LanMatchSeriesState | null
}

interface RestoredLanTurnGameSession<State, Action> extends Omit<
  StoredLanTurnGameSession,
  "game" | "pendingAction" | "acknowledgements"
> {
  game: State
  pendingAction: PendingGameAction<State, Action> | null
  acknowledgements: CachedAcknowledgement<Action>[]
}

export interface UseLanTurnGameResult<State, Action, Side extends string> {
  phase: LanTurnGamePhase
  roomId: string
  role: "host" | "guest" | null
  connected: boolean
  localReady: boolean
  remoteReady: boolean
  localSide: Side | null
  currentSide: Side | null
  game: State
  dice: LanTurnGameDiceView | null
  series: LanMatchSeriesView
  errorCode: LanTurnGameErrorCode | null
  createRoom: () => Promise<void>
  joinRoom: (roomId: string) => Promise<void>
  markReady: () => void
  playAction: (action: Action) => Promise<boolean>
  requestRematch: () => Promise<boolean>
  leaveRoom: () => void
  retryConnection: () => void
}

function supportsLanMultiplayer(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    Boolean(globalThis.crypto?.subtle && globalThis.crypto?.randomUUID)
  )
}

function getIceServers(): RTCIceServer[] {
  const raw = process.env.NEXT_PUBLIC_LAN_ICE_SERVERS?.trim()
  if (!raw) return []

  const urls = raw.split(",").map((url) => url.trim()).filter(Boolean)
  return urls.length > 0 ? [{ urls }] : []
}

function toJsonValue(value: unknown): JsonValue {
  return value as JsonValue
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isDiceRoundResult(value: unknown): value is DiceRoundResult {
  if (
    !isRecord(value)
    || !Number.isSafeInteger(value.round)
    || Number(value.round) <= 0
    || !isRecord(value.rolls)
    || (value.firstPlayerId !== null && typeof value.firstPlayerId !== "string")
    || typeof value.tied !== "boolean"
    || typeof value.proof !== "string"
    || !/^[a-f\d]{64}$/iu.test(value.proof)
  ) return false

  const rolls = Object.values(value.rolls)
  return rolls.length === 2 && rolls.every(
    (roll) => Number.isInteger(roll) && Number(roll) >= 1 && Number(roll) <= 6,
  )
}

function isDiceRuntime(value: unknown): value is DiceRuntime {
  if (!isRecord(value)) return false
  if (
    !Number.isSafeInteger(value.round)
    || Number(value.round) <= 0
    || !isRecord(value.commitments)
    || !isRecord(value.reveals)
    || typeof value.revealSent !== "boolean"
    || typeof value.resolving !== "boolean"
    || typeof value.resultSent !== "boolean"
    || typeof value.commitInitializing !== "boolean"
    || typeof value.finalized !== "boolean"
    || typeof value.resultAcknowledgedByRemote !== "boolean"
    || (
      value.previousFinalizedResult !== null
      && !isDiceRoundResult(value.previousFinalizedResult)
    )
    || (value.localResult !== null && !isDiceRoundResult(value.localResult))
    || (value.remoteResult !== null && !isDiceRoundResult(value.remoteResult))
  ) return false

  if (
    !Object.values(value.commitments).every(
      (commitment) => typeof commitment === "string" && /^[a-f\d]{64}$/iu.test(commitment),
    )
    || !Object.values(value.reveals).every(
      (nonce) => typeof nonce === "string" && /^[A-Za-z\d_-]+$/u.test(nonce),
    )
  ) return false

  if (value.localCommit === null) return true
  if (value.commitInitializing) return false
  return isRecord(value.localCommit)
    && value.localCommit.round === value.round
    && typeof value.localCommit.playerId === "string"
    && typeof value.localCommit.nonce === "string"
    && typeof value.localCommit.commitment === "string"
    && /^[A-Za-z\d_-]+$/u.test(value.localCommit.nonce)
    && /^[a-f\d]{64}$/iu.test(value.localCommit.commitment)
}

function isDiceView(value: unknown): value is LanTurnGameDiceView {
  return isRecord(value)
    && (value.local === null || (Number.isInteger(value.local) && Number(value.local) >= 1 && Number(value.local) <= 6))
    && (value.remote === null || (Number.isInteger(value.remote) && Number(value.remote) >= 1 && Number(value.remote) <= 6))
    && Number.isSafeInteger(value.round)
    && Number(value.round) > 0
    && ["committing", "revealing", "resolved", "tied"].includes(String(value.status))
}

function isLanPhase(value: unknown): value is LanTurnGamePhase {
  return [
    "idle",
    "creating",
    "waiting",
    "connecting",
    "ready",
    "dice",
    "syncing",
    "playing",
    "reconnecting",
    "error",
  ].includes(String(value))
}

function parsePendingGameAction<State, Action, Side extends string>(
  value: unknown,
  adapter: LanTurnGameAdapter<State, Action, Side>,
): PendingGameAction<State, Action> | null {
  if (
    !isRecord(value)
    || typeof value.actionId !== "string"
    || !Number.isSafeInteger(value.baseRevision)
    || Number(value.baseRevision) < 0
    || typeof value.stateHash !== "string"
    || !/^[a-f\d]{64}$/iu.test(value.stateHash)
  ) return null

  const action = adapter.parseAction(value.action)
  if (!action) return null
  const validated = adapter.validateAndRebuildSnapshot(
    value.state,
    Number(value.baseRevision) + 1,
  )
  if (!validated.ok) return null

  return {
    actionId: value.actionId,
    baseRevision: Number(value.baseRevision),
    action,
    state: validated.state,
    stateHash: value.stateHash,
  }
}

function parseCachedAcknowledgement<State, Action, Side extends string>(
  value: unknown,
  adapter: LanTurnGameAdapter<State, Action, Side>,
): CachedAcknowledgement<Action> | null {
  if (
    !isRecord(value)
    || typeof value.actionId !== "string"
    || !Number.isSafeInteger(value.baseRevision)
    || Number(value.baseRevision) < 0
    || typeof value.messageId !== "string"
    || value.nextRevision !== Number(value.baseRevision) + 1
    || typeof value.nextStateHash !== "string"
    || !/^[a-f\d]{64}$/iu.test(value.nextStateHash)
  ) return null

  const action = adapter.parseAction(value.action)
  if (!action) return null
  return {
    actionId: value.actionId,
    action,
    baseRevision: Number(value.baseRevision),
    messageId: value.messageId,
    nextRevision: Number(value.nextRevision),
    nextStateHash: value.nextStateHash,
  }
}

export async function parseStoredLanTurnGameSession<State, Action, Side extends string>(
  value: string,
  adapter: LanTurnGameAdapter<State, Action, Side>,
): Promise<RestoredLanTurnGameSession<State, Action> | null> {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed) || parsed.version !== 3 || !isRecord(parsed.session)) return null
    if (
      parsed.session.gameId !== adapter.gameId
      || parsed.session.engineVersion !== adapter.engineVersion
      || typeof parsed.session.roomId !== "string"
      || !STORED_ROOM_ID_PATTERN.test(parsed.session.roomId)
      || typeof parsed.session.peerId !== "string"
      || !STORED_PEER_ID_PATTERN.test(parsed.session.peerId)
      || (parsed.session.role !== "host" && parsed.session.role !== "guest")
      || typeof parsed.session.token !== "string"
      || !STORED_TOKEN_PATTERN.test(parsed.session.token)
      || !Number.isSafeInteger(parsed.session.cursor)
      || Number(parsed.session.cursor) < 0
      || typeof parsed.session.expiresAt !== "string"
      || typeof parsed.matchId !== "string"
      || !isLanPhase(parsed.phase)
      || (
        parsed.remotePeerId !== null
        && (
          typeof parsed.remotePeerId !== "string"
          || !STORED_PEER_ID_PATTERN.test(parsed.remotePeerId)
        )
      )
      || !Number.isSafeInteger(parsed.revision)
      || Number(parsed.revision) < 0
      || (parsed.firstPeerId !== null && typeof parsed.firstPeerId !== "string")
      || typeof parsed.localReady !== "boolean"
      || typeof parsed.remoteReady !== "boolean"
      || !Number.isFinite(Date.parse(parsed.session.expiresAt))
    ) return null

    const revision = Number(parsed.revision)
    const validatedGame = adapter.validateAndRebuildSnapshot(parsed.game, revision)
    if (!validatedGame.ok || adapter.getRevision(validatedGame.state) !== revision) return null

    if (isRecord(parsed.diceRuntime)) {
      parsed.diceRuntime.commitInitializing = false
      if (!("previousFinalizedResult" in parsed.diceRuntime)) {
        parsed.diceRuntime.previousFinalizedResult = null
      }
      if (typeof parsed.diceRuntime.resultAcknowledgedByRemote !== "boolean") {
        parsed.diceRuntime.resultAcknowledgedByRemote = false
      }
      if (typeof parsed.diceRuntime.finalized !== "boolean") {
        const localResult = parsed.diceRuntime.localResult
        const remoteResult = parsed.diceRuntime.remoteResult
        parsed.diceRuntime.finalized = isRecord(localResult)
          && isRecord(remoteResult)
          && (
            (localResult.tied === true && remoteResult.tied === true)
            || parsed.firstPeerId !== null
          )
      }
    }

    if (
      (parsed.diceRuntime !== null && !isDiceRuntime(parsed.diceRuntime))
      || (parsed.dice !== null && !isDiceView(parsed.dice))
      || !Array.isArray(parsed.acknowledgements)
    ) return null

    let pendingAction = parsed.pendingAction === null
      ? null
      : parsePendingGameAction(parsed.pendingAction, adapter)
    if (parsed.pendingAction !== null && !pendingAction) return null
    if (pendingAction && pendingAction.baseRevision !== revision) return null

    const acknowledgements = parsed.acknowledgements.map((item) =>
      parseCachedAcknowledgement(item, adapter))
    if (acknowledgements.some((item) => item === null)) return null

    const session = parsed.session as unknown as LanRoomSession
    const remotePeerId = parsed.remotePeerId as string | null
    const firstPeerId = parsed.firstPeerId as string | null
    if (
      parsed.matchId !== session.roomId
      || remotePeerId === session.peerId
    ) return null
    const matchSeries = parsed.matchSeries
    if (
      (remotePeerId === null && matchSeries !== null)
      || (
        remotePeerId !== null
        && !isLanMatchSeriesState(matchSeries, [session.peerId, remotePeerId])
      )
    ) return null
    const validatedMatchSeries = matchSeries as LanMatchSeriesState | null
    if (validatedMatchSeries) {
      const outcome = adapter.getOutcome(validatedGame.state)
      if (
        (outcome.status === "playing" && validatedMatchSeries.settledGameNumber === validatedMatchSeries.gameNumber)
        || (validatedMatchSeries.pendingAdvance !== null && session.role !== "host")
      ) return null
      if (validatedMatchSeries.pendingAdvance) {
        if (
          outcome.status === "playing"
          || validatedMatchSeries.pendingAdvance.terminalRevision !== revision
        ) return null
        const terminalHash = await hashJson(adapter.encodeSnapshot(validatedGame.state))
        if (terminalHash !== validatedMatchSeries.pendingAdvance.terminalStateHash) return null
      }
    }
    if (
      firstPeerId !== null
      && firstPeerId !== session.peerId
      && firstPeerId !== remotePeerId
    ) return null

    const diceRuntime = parsed.diceRuntime as DiceRuntime | null
    if (diceRuntime !== null) {
      const players = [session.peerId, remotePeerId].filter(
        (peerId): peerId is string => Boolean(peerId),
      )
      if (players.length !== 2 || new Set(players).size !== 2) return null
      const storedIds = new Set([
        ...Object.keys(diceRuntime.commitments),
        ...Object.keys(diceRuntime.reveals),
      ])
      if ([...storedIds].some((peerId) => !players.includes(peerId))) return null
      for (const result of [diceRuntime.localResult, diceRuntime.remoteResult]) {
        if (!result) continue
        if (
          result.round !== diceRuntime.round
          || Object.keys(result.rolls).length !== 2
          || !players.every((peerId) => Object.hasOwn(result.rolls, peerId))
        ) return null
      }
      if (
        diceRuntime.previousFinalizedResult !== null
        && !isValidImmediatePreviousDiceResult(
          diceRuntime.round,
          diceRuntime.previousFinalizedResult,
          players as [string, string],
        )
      ) return null
      if (diceRuntime.resultAcknowledgedByRemote && !diceRuntime.localResult) return null
      if (diceRuntime.finalized) {
        const localResult = diceRuntime.localResult
        const remoteResult = diceRuntime.remoteResult
        if (
          !localResult
          || !remoteResult
          || !diceRoundResultsMatch(localResult, remoteResult, players)
        ) return null

        const [firstId, secondId] = players
        if (localResult.tied) {
          if (
            firstPeerId !== null
            || localResult.firstPlayerId !== null
            || localResult.rolls[firstId] !== localResult.rolls[secondId]
          ) return null
        } else {
          const resolvedFirstId = localResult.firstPlayerId
          if (
            !resolvedFirstId
            || !players.includes(resolvedFirstId)
            || (firstPeerId !== null && firstPeerId !== resolvedFirstId)
            || (
              diceRuntime.resultAcknowledgedByRemote
              && firstPeerId !== resolvedFirstId
            )
          ) return null
          const otherPeerId = resolvedFirstId === firstId ? secondId : firstId
          if (localResult.rolls[resolvedFirstId] <= localResult.rolls[otherPeerId]) return null
        }
      }
      if (
        diceRuntime.localCommit
        && (
          diceRuntime.localCommit.playerId !== session.peerId
          || diceRuntime.commitments[session.peerId] !== diceRuntime.localCommit.commitment
          || (
            diceRuntime.revealSent
            && diceRuntime.reveals[session.peerId] !== diceRuntime.localCommit.nonce
          )
        )
      ) return null
    }
    if (firstPeerId !== null && !diceRuntime?.finalized) return null

    if (pendingAction) {
      if (!firstPeerId) return null
      const localSide = firstPeerId === session.peerId
        ? adapter.firstSide
        : adapter.secondSide
      const rebuiltPending = adapter.applyAction(
        validatedGame.state,
        pendingAction.action,
        localSide,
      )
      if (
        !rebuiltPending.ok
        || adapter.getRevision(rebuiltPending.state) !== revision + 1
      ) return null

      const rebuiltSnapshot = adapter.encodeSnapshot(rebuiltPending.state)
      const storedPendingSnapshot = adapter.encodeSnapshot(pendingAction.state)
      if (canonicalizeJson(rebuiltSnapshot) !== canonicalizeJson(storedPendingSnapshot)) {
        return null
      }

      const rebuiltHash = await hashJson(rebuiltSnapshot)
      if (rebuiltHash !== pendingAction.stateHash.toLowerCase()) return null
      pendingAction = {
        ...pendingAction,
        state: rebuiltPending.state,
        stateHash: rebuiltHash,
      }
    }

    const stored = parsed as unknown as StoredLanTurnGameSession
    return {
      ...stored,
      session,
      remotePeerId,
      firstPeerId,
      game: validatedGame.state,
      pendingAction,
      acknowledgements: acknowledgements as CachedAcknowledgement<Action>[],
      diceRuntime,
      dice: parsed.dice as LanTurnGameDiceView | null,
      matchSeries: validatedMatchSeries,
    }
  } catch {
    return null
  }
}

function mapSignalingError(error: unknown): LanTurnGameErrorCode {
  if (error instanceof LanSignalingError) {
    if (error.code === "ROOM_NOT_FOUND") return "ROOM_NOT_FOUND"
    if (error.code === "ROOM_FULL") return "ROOM_FULL"
    if (error.code === "GAME_MISMATCH") return "GAME_MISMATCH"
    if (error.code === "ENGINE_MISMATCH") return "ENGINE_MISMATCH"
    if (error.code === "NETWORK_ERROR") return "NETWORK_ERROR"
    if (error.status === 401 || error.status === 404 || error.status === 410) return "ROOM_EXPIRED"
    if (error.retryable) return "NETWORK_ERROR"
  }
  return "UNKNOWN"
}

export function shouldRetainPendingRoomRequest(error: unknown): boolean {
  return error instanceof LanSignalingError && error.retryable
}

export async function openRoomWithSingleRetry<T>(
  openRoom: () => Promise<T>,
  isStillActive: () => boolean,
  waitForRetry: () => Promise<unknown> = () => new Promise(
    (resolve) => setTimeout(resolve, ROOM_REQUEST_RETRY_DELAY_MS),
  ),
): Promise<T> {
  try {
    return await openRoom()
  } catch (error) {
    if (!shouldRetainPendingRoomRequest(error) || !isStillActive()) throw error
    await waitForRetry()
    if (!isStillActive()) throw error
    return openRoom()
  }
}

export function shouldClearRoomSession(code: LanTurnGameErrorCode): boolean {
  return code === "ROOM_NOT_FOUND" || code === "ROOM_EXPIRED"
}

export function getSignalPollDelay(
  consecutiveEmptyPolls: number,
  options: {
    connected: boolean
    hidden: boolean
    random?: () => number
  },
): number {
  const random = options.random ?? Math.random
  const baseDelay = options.hidden
    ? SIGNAL_POLL_HIDDEN_MS
    : options.connected
      ? SIGNAL_POLL_CONNECTED_MS
      : Math.min(
          SIGNAL_POLL_FAST_MS * 2 ** Math.min(Math.max(consecutiveEmptyPolls, 0), 2),
          SIGNAL_POLL_BACKOFF_MAX_MS,
        )
  const jitter = Math.max(0, Math.min(1, random())) * SIGNAL_POLL_JITTER_RATIO
  return Math.round(baseDelay * (1 + jitter))
}

export function createGuestRenegotiationOperation(
  createId: () => string = () => crypto.randomUUID(),
): GuestRenegotiationOperation {
  return {
    negotiationId: createId(),
    clientMessageId: createId(),
    attempts: 0,
  }
}

export function recordGuestRenegotiationAttempt(
  operation: GuestRenegotiationOperation,
): GuestRenegotiationOperation {
  return { ...operation, attempts: operation.attempts + 1 }
}

export function shouldRetryGuestRenegotiation(failedAttempts: number): boolean {
  return Number.isSafeInteger(failedAttempts)
    && failedAttempts > 0
    && failedAttempts <= GUEST_RENEGOTIATION_MAX_RETRIES
}

export function getGuestRenegotiationRetryDelay(
  failedAttempts: number,
  random: () => number = Math.random,
): number {
  const retryNumber = Math.max(
    1,
    Math.min(GUEST_RENEGOTIATION_MAX_RETRIES, Math.floor(failedAttempts)),
  )
  const baseDelay = GUEST_RENEGOTIATION_RETRY_BASE_MS * 2 ** (retryNumber - 1)
  const jitter = Math.max(0, Math.min(1, random()))
    * GUEST_RENEGOTIATION_RETRY_JITTER_RATIO
  return Math.round(baseDelay * (1 + jitter))
}

function waitForSignalPollDelay(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()

  return new Promise((resolve) => {
    const timeout = setTimeout(finish, delayMs)
    function finish() {
      clearTimeout(timeout)
      signal.removeEventListener("abort", finish)
      resolve()
    }
    signal.addEventListener("abort", finish, { once: true })
  })
}

export function shouldHostNegotiate(
  role: LanRoomSession["role"],
  remotePeerId: string | null,
): boolean {
  return role === "host" && Boolean(remotePeerId)
}

function normalizeRoomCode(roomId: string): string {
  return roomId.replace(/\D/g, "").slice(0, 6)
}

export function useLanTurnGame<State, Action, Side extends string>(
  adapter: LanTurnGameAdapter<State, Action, Side>,
): UseLanTurnGameResult<State, Action, Side> {
  const signalingRef = useRef<LanSignalingClient | null>(null)
  if (signalingRef.current === null) {
    signalingRef.current = new LanSignalingClient({
      gameIdentity: {
        gameId: adapter.gameId,
        engineVersion: adapter.engineVersion,
      },
    })
  }

  const [phase, setPhaseState] = useState<LanTurnGamePhase>("idle")
  const [session, setSessionState] = useState<LanRoomSession | null>(null)
  const [connected, setConnectedState] = useState(false)
  const [localReady, setLocalReadyState] = useState(false)
  const [remoteReady, setRemoteReadyState] = useState(false)
  const [remotePeerId, setRemotePeerIdState] = useState<string | null>(null)
  const [firstPeerId, setFirstPeerIdState] = useState<string | null>(null)
  const [game, setGameState] = useState<State>(() => adapter.createInitialState())
  const [dice, setDice] = useState<LanTurnGameDiceView | null>(null)
  const [matchSeries, setMatchSeriesState] = useState<LanMatchSeriesState | null>(null)
  const [errorCode, setErrorCode] = useState<LanTurnGameErrorCode | null>(null)

  const phaseRef = useRef(phase)
  const sessionRef = useRef(session)
  const connectedRef = useRef(connected)
  const localReadyRef = useRef(localReady)
  const remoteReadyRef = useRef(remoteReady)
  const remotePeerIdRef = useRef(remotePeerId)
  const firstPeerIdRef = useRef(firstPeerId)
  const gameRef = useRef(game)
  const diceViewRef = useRef(dice)
  const matchSeriesRef = useRef(matchSeries)
  const revisionRef = useRef(0)
  const matchIdRef = useRef("")
  const diceRuntimeRef = useRef<DiceRuntime | null>(null)
  const pendingActionRef = useRef<PendingGameAction<State, Action> | null>(null)
  const acknowledgementCacheRef = useRef<CachedAcknowledgement<Action>[]>([])
  const processedMessagesRef = useRef<string[]>([])
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<ReliableRtcChannel | null>(null)
  const rawChannelRef = useRef<RTCDataChannel | null>(null)
  const channelOwnerRef = useRef<symbol | null>(null)
  const rtcHeartbeatRef = useRef<RtcHeartbeatController | null>(null)
  const iceSignalQueueRef = useRef<Promise<void>>(Promise.resolve())
  const activeNegotiationIdRef = useRef<string | null>(null)
  const queuedIceRef = useRef<Map<string, Array<RTCIceCandidateInit | null>>>(new Map())
  const inboundMessageQueueRef = useRef<Promise<void>>(Promise.resolve())
  const pollAbortRef = useRef<AbortController | null>(null)
  const pollRunningRef = useRef(false)
  const pollOwnerRef = useRef<symbol | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const diceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const negotiatingRef = useRef(false)
  const negotiationOwnerRef = useRef<symbol | null>(null)
  const pendingHostNegotiationRef = useRef<{
    reconnect: boolean
    negotiationId: string
  } | null>(null)
  const guestRenegotiationRef = useRef<GuestRenegotiationOperation | null>(null)
  const heartbeatRunningRef = useRef(false)
  const syncConfirmedRef = useRef(false)
  const actionPreparingRef = useRef(false)
  const advancePreparingRef = useRef(false)
  const sessionEpochRef = useRef(0)
  const disposedRef = useRef(false)
  const pendingRoomRequestStoreRef = useRef<PendingRoomRequestStore | null>(null)

  function setPhase(next: LanTurnGamePhase) {
    phaseRef.current = next
    setPhaseState(next)
  }

  function setCurrentSession(next: LanRoomSession | null) {
    sessionRef.current = next
    setSessionState(next)
  }

  function setConnected(next: boolean) {
    connectedRef.current = next
    setConnectedState(next)
  }

  function setLocalReady(next: boolean) {
    localReadyRef.current = next
    setLocalReadyState(next)
  }

  function setRemoteReady(next: boolean) {
    remoteReadyRef.current = next
    setRemoteReadyState(next)
  }

  function setRemotePeer(next: string | null) {
    remotePeerIdRef.current = next
    setRemotePeerIdState(next)
  }

  function setFirstPeer(next: string | null) {
    firstPeerIdRef.current = next
    setFirstPeerIdState(next)
  }

  function setCurrentGame(next: State) {
    gameRef.current = next
    setGameState(next)
  }

  function setDiceView(next: LanTurnGameDiceView | null) {
    diceViewRef.current = next
    setDice(next)
  }

  function setMatchSeries(next: LanMatchSeriesState | null) {
    matchSeriesRef.current = next
    setMatchSeriesState(next)
  }

  function isCurrentSession(expected: LanRoomSession, epoch: number): boolean {
    const activeSession = sessionRef.current
    return !disposedRef.current
      && epoch === sessionEpochRef.current
      && activeSession?.roomId === expected.roomId
      && activeSession.peerId === expected.peerId
      && activeSession.role === expected.role
      && activeSession.token === expected.token
  }

  function rememberMessage(messageId: string): boolean {
    if (processedMessagesRef.current.includes(messageId)) return false
    processedMessagesRef.current = [...processedMessagesRef.current, messageId].slice(
      -PROCESSED_MESSAGE_LIMIT,
    )
    return true
  }

  function persistSession() {
    const currentSession = sessionRef.current
    if (!currentSession || typeof sessionStorage === "undefined") return

    const pending = pendingActionRef.current
    const stored: StoredLanTurnGameSession = {
      version: 3,
      session: currentSession,
      matchId: matchIdRef.current,
      remotePeerId: remotePeerIdRef.current,
      phase: phaseRef.current,
      localReady: localReadyRef.current,
      remoteReady: remoteReadyRef.current,
      game: adapter.encodeSnapshot(gameRef.current),
      revision: revisionRef.current,
      firstPeerId: firstPeerIdRef.current,
      diceRuntime: diceRuntimeRef.current,
      dice: diceViewRef.current,
      pendingAction: pending
        ? {
            ...pending,
            action: adapter.encodeAction(pending.action),
            state: adapter.encodeSnapshot(pending.state),
          }
        : null,
      acknowledgements: acknowledgementCacheRef.current.map((acknowledgement) => ({
        ...acknowledgement,
        action: adapter.encodeAction(acknowledgement.action),
      })),
      matchSeries: matchSeriesRef.current,
    }

    try {
      sessionStorage.setItem(adapter.sessionStorageKey, JSON.stringify(stored))
    } catch {
      // A match remains usable when session storage is unavailable.
    }
  }

  function clearPersistedSession() {
    try {
      sessionStorage.removeItem(adapter.sessionStorageKey)
    } catch {
      // Ignore restricted storage contexts.
    }
  }

  function getPendingRoomRequestStore(): PendingRoomRequestStore {
    pendingRoomRequestStoreRef.current ??= new PendingRoomRequestStore(
      typeof sessionStorage === "undefined" ? null : sessionStorage,
      () => crypto.randomUUID(),
      () => Date.now(),
      undefined,
      adapter.pendingRequestStorageKey,
    )
    return pendingRoomRequestStoreRef.current
  }

  function clearPendingRoomRequest() {
    getPendingRoomRequestStore().clear()
  }

  function createFreshPendingRoomRequest(
    kind: PendingRoomRequest["kind"],
    roomId?: string,
  ): PendingRoomRequest {
    const store = getPendingRoomRequestStore()
    return kind === "create"
      ? store.replace("create")
      : store.replace("join", roomId ?? "")
  }

  function sendMessage(
    type: MultiplayerMessage["type"],
    payload: JsonValue,
    stableMessageId?: string,
  ): string {
    const currentSession = sessionRef.current
    const channel = channelRef.current
    if (!currentSession || !channel || channel.readyState !== "open") {
      throw new Error("Peer data channel is not open")
    }

    const messageId = stableMessageId ?? crypto.randomUUID()
    channel.send({
      v: MULTIPLAYER_PROTOCOL_VERSION,
      type,
      messageId,
      roomId: currentSession.roomId,
      matchId: matchIdRef.current,
      senderId: currentSession.peerId,
      sentAt: Date.now(),
      payload,
    } as MultiplayerMessage)
    return messageId
  }

  function setFailure(code: LanTurnGameErrorCode) {
    if (diceTimerRef.current) clearTimeout(diceTimerRef.current)
    diceTimerRef.current = null
    syncConfirmedRef.current = false
    negotiatingRef.current = false
    setConnected(false)
    stopBackgroundWork()
    closePeerConnection()
    if (shouldClearRoomSession(code)) {
      clearPersistedSession()
      clearPendingRoomRequest()
      setCurrentSession(null)
      resetMatchState()
    }
    setErrorCode(code)
    setPhase("error")
  }

  function closePeerConnection(preserveQueuedIce = false) {
    channelOwnerRef.current = null
    rtcHeartbeatRef.current?.stop()
    rtcHeartbeatRef.current = null
    channelRef.current?.dispose()
    channelRef.current = null
    const rawChannel = rawChannelRef.current
    rawChannelRef.current = null
    if (rawChannel && rawChannel.readyState !== "closed") rawChannel.close()
    const peerConnection = peerConnectionRef.current
    peerConnectionRef.current = null
    if (peerConnection && peerConnection.connectionState !== "closed") peerConnection.close()
    activeNegotiationIdRef.current = null
    if (!preserveQueuedIce) queuedIceRef.current.clear()
  }

  function stopBackgroundWork() {
    sessionEpochRef.current += 1
    negotiationOwnerRef.current = null
    negotiatingRef.current = false
    pendingHostNegotiationRef.current = null
    guestRenegotiationRef.current = null
    pollAbortRef.current?.abort()
    pollAbortRef.current = null
    pollOwnerRef.current = null
    pollRunningRef.current = false
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
    heartbeatTimerRef.current = null
    heartbeatRunningRef.current = false
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = null
    if (diceTimerRef.current) clearTimeout(diceTimerRef.current)
    diceTimerRef.current = null
  }

  function resetMatchState() {
    setConnected(false)
    setLocalReady(false)
    setRemoteReady(false)
    setRemotePeer(null)
    setFirstPeer(null)
    setCurrentGame(adapter.createInitialState())
    setMatchSeries(null)
    revisionRef.current = 0
    matchIdRef.current = ""
    diceRuntimeRef.current = null
    pendingActionRef.current = null
    acknowledgementCacheRef.current = []
    processedMessagesRef.current = []
    activeNegotiationIdRef.current = null
    queuedIceRef.current.clear()
    inboundMessageQueueRef.current = Promise.resolve()
    negotiatingRef.current = false
    negotiationOwnerRef.current = null
    pendingHostNegotiationRef.current = null
    guestRenegotiationRef.current = null
    syncConfirmedRef.current = false
    actionPreparingRef.current = false
    advancePreparingRef.current = false
    setDiceView(null)
    setErrorCode(null)
  }

  function leaveRoom(preservePendingRoomRequest = false) {
    const departingSession = sessionRef.current
    if (departingSession) {
      void signalingRef.current!.leaveRoom(departingSession).catch(() => {
        // The room will still expire server-side if a best-effort leave fails.
      })
    }
    stopBackgroundWork()
    closePeerConnection()
    clearPersistedSession()
    if (!preservePendingRoomRequest) clearPendingRoomRequest()
    setCurrentSession(null)
    resetMatchState()
    setPhase("idle")
  }

  async function sendSignal<T extends LanSignalType>(
    type: T,
    payload: LanSignalPayloadByType[T],
    negotiationId: string,
    clientMessageId?: string,
  ) {
    const currentSession = sessionRef.current
    if (!currentSession) return
    await signalingRef.current!.sendSignal(
      currentSession,
      type,
      payload,
      negotiationId,
      clientMessageId,
    )
  }

  function guestRenegotiationIsCurrent(
    operation: GuestRenegotiationOperation,
  ): boolean {
    const active = guestRenegotiationRef.current
    return active?.negotiationId === operation.negotiationId
      && active.clientMessageId === operation.clientMessageId
  }

  async function attemptGuestRenegotiation(
    operation: GuestRenegotiationOperation,
  ) {
    const currentSession = sessionRef.current
    const epoch = sessionEpochRef.current
    if (
      !currentSession
      || currentSession.role !== "guest"
      || !guestRenegotiationIsCurrent(operation)
      || phaseRef.current === "error"
    ) return

    const attempted = recordGuestRenegotiationAttempt(operation)
    guestRenegotiationRef.current = attempted
    try {
      await sendSignal(
        "renegotiate",
        {},
        attempted.negotiationId,
        attempted.clientMessageId,
      )
      if (
        isCurrentSession(currentSession, epoch)
        && guestRenegotiationIsCurrent(attempted)
      ) guestRenegotiationRef.current = null
    } catch (error) {
      if (
        !isCurrentSession(currentSession, epoch)
        || !guestRenegotiationIsCurrent(attempted)
      ) return

      const code = mapSignalingError(error)
      if (code === "ROOM_EXPIRED" || code === "ROOM_NOT_FOUND") {
        guestRenegotiationRef.current = null
        setFailure(code)
        return
      }
      if (
        error instanceof LanSignalingError
        && !error.retryable
      ) {
        guestRenegotiationRef.current = null
        setFailure(code)
        persistSession()
        return
      }
      if (shouldRetryGuestRenegotiation(attempted.attempts)) {
        scheduleReconnect()
        return
      }

      guestRenegotiationRef.current = null
      setFailure("NETWORK_ERROR")
      persistSession()
    }
  }

  function startGuestRenegotiation() {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = null
    const operation = createGuestRenegotiationOperation()
    guestRenegotiationRef.current = operation
    void attemptGuestRenegotiation(operation)
  }

  function queueRemoteIce(
    negotiationId: string,
    candidate: RTCIceCandidateInit | null,
  ) {
    const queued = queuedIceRef.current.get(negotiationId) ?? []
    queued.push(candidate)
    queuedIceRef.current.set(negotiationId, queued.slice(-128))
    if (queuedIceRef.current.size > 8) {
      const oldest = queuedIceRef.current.keys().next().value
      if (oldest) queuedIceRef.current.delete(oldest)
    }
  }

  async function flushQueuedIce(
    peerConnection: RTCPeerConnection,
    negotiationId: string,
  ) {
    if (!peerConnection.remoteDescription) return
    const candidates = queuedIceRef.current.get(negotiationId) ?? []
    for (let index = 0; index < candidates.length; index += 1) {
      try {
        await peerConnection.addIceCandidate(candidates[index])
      } catch {
        if (
          peerConnectionRef.current !== peerConnection
          || activeNegotiationIdRef.current !== negotiationId
        ) {
          queuedIceRef.current.delete(negotiationId)
          return
        }
        // A malformed or browser-incompatible candidate must not poison every retry.
        queuedIceRef.current.set(negotiationId, candidates.slice(index + 1))
      }
    }
    queuedIceRef.current.delete(negotiationId)
  }

  function scheduleReconnect() {
    const currentSession = sessionRef.current
    const epoch = sessionEpochRef.current
    if (
      !currentSession
      || reconnectTimerRef.current
      || disposedRef.current
      || phaseRef.current === "error"
    ) return
    if (diceTimerRef.current) clearTimeout(diceTimerRef.current)
    diceTimerRef.current = null
    channelOwnerRef.current = null
    rtcHeartbeatRef.current?.stop()
    syncConfirmedRef.current = false
    setConnected(false)
    setPhase("reconnecting")

    const guestOperation = currentSession.role === "guest"
      ? (guestRenegotiationRef.current ?? createGuestRenegotiationOperation())
      : null
    if (guestOperation) guestRenegotiationRef.current = guestOperation
    const delayMs = guestOperation
      ? guestOperation.attempts > 0
        ? getGuestRenegotiationRetryDelay(guestOperation.attempts)
        : RECONNECT_DELAY_MS
      : RECONNECT_DELAY_MS

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null
      if (!isCurrentSession(currentSession, epoch)) return
      if (currentSession.role === "host") {
        void beginHostNegotiation(true)
        return
      }

      if (guestOperation && guestRenegotiationIsCurrent(guestOperation)) {
        void attemptGuestRenegotiation(guestOperation)
      }
    }, delayMs)
  }

  function attachDataChannel(rawChannel: RTCDataChannel) {
    const channelOwner = Symbol("lan-data-channel")
    const epoch = sessionEpochRef.current
    channelOwnerRef.current = channelOwner
    channelRef.current?.dispose()
    rawChannelRef.current = rawChannel
    const channel = new ReliableRtcChannel(rawChannel)
    channelRef.current = channel

    const currentSession = sessionRef.current
    if (currentSession) {
      const heartbeat = new RtcHeartbeatController(channel, {
        roomId: currentSession.roomId,
        matchId: matchIdRef.current,
        senderId: currentSession.peerId,
      }, { onTimeout: scheduleReconnect })
      rtcHeartbeatRef.current = heartbeat
    }

    channel.onMessage((message) => {
      inboundMessageQueueRef.current = inboundMessageQueueRef.current
        .then(() => {
          if (
            channelOwnerRef.current !== channelOwner
            || channelRef.current !== channel
            || epoch !== sessionEpochRef.current
          ) return
          return handlePeerMessage(message)
        })
        .catch(() => {
          if (
            channelOwnerRef.current === channelOwner
            && channelRef.current === channel
            && epoch === sessionEpochRef.current
          ) setFailure("DESYNC")
        })
    })
    channel.onError(() => scheduleReconnect())
    channel.onStateChange((state) => {
      if (state === "open") handleChannelOpen()
      if (state === "closing" || state === "closed") scheduleReconnect()
    })

    if (rawChannel.readyState === "open") handleChannelOpen()
  }

  function createPeerConnection(negotiationId: string): RTCPeerConnection {
    closePeerConnection(true)
    const currentSession = sessionRef.current
    const epoch = sessionEpochRef.current
    const peerConnection = new RTCPeerConnection({ iceServers: getIceServers() })
    peerConnectionRef.current = peerConnection
    activeNegotiationIdRef.current = negotiationId
    iceSignalQueueRef.current = Promise.resolve()

    const connectionIsCurrent = () => Boolean(
      currentSession
      && isCurrentSession(currentSession, epoch)
      && peerConnectionRef.current === peerConnection
      && activeNegotiationIdRef.current === negotiationId,
    )

    peerConnection.addEventListener("icecandidate", (event) => {
      if (!connectionIsCurrent()) return

      if (event.candidate?.candidate) {
        const candidate = event.candidate.toJSON()
        const candidateLine = event.candidate.candidate
        iceSignalQueueRef.current = iceSignalQueueRef.current
          .then(async () => {
            if (!connectionIsCurrent()) return
            await sendSignal("ice", {
              candidate: candidateLine,
              sdpMid: candidate.sdpMid ?? null,
              sdpMLineIndex: candidate.sdpMLineIndex ?? null,
              ...(candidate.usernameFragment === undefined
                ? {}
                : { usernameFragment: candidate.usernameFragment }),
            }, negotiationId)
          })
          .catch(() => {
            if (connectionIsCurrent()) scheduleReconnect()
          })
      } else {
        iceSignalQueueRef.current = iceSignalQueueRef.current
          .then(async () => {
            if (!connectionIsCurrent()) return
            await sendSignal("ice-complete", {}, negotiationId)
          })
          .catch(() => {
            if (connectionIsCurrent()) scheduleReconnect()
          })
      }
    })
    peerConnection.addEventListener("datachannel", (event) => {
      if (connectionIsCurrent()) attachDataChannel(event.channel)
    })
    peerConnection.addEventListener("connectionstatechange", () => {
      if (!connectionIsCurrent()) return
      if (peerConnection.connectionState === "failed" || peerConnection.connectionState === "disconnected") {
        scheduleReconnect()
      }
    })
    return peerConnection
  }

  async function beginHostNegotiation(
    reconnect = false,
    negotiationId = crypto.randomUUID(),
  ) {
    const currentSession = sessionRef.current
    if (
      !currentSession
      || currentSession.role !== "host"
      || phaseRef.current === "error"
    ) return
    if (negotiatingRef.current) {
      pendingHostNegotiationRef.current = { reconnect, negotiationId }
      return
    }
    const epoch = sessionEpochRef.current
    const owner = Symbol("lan-host-negotiation")
    negotiatingRef.current = true
    negotiationOwnerRef.current = owner
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = null
    syncConfirmedRef.current = false
    if (reconnect) setPhase("reconnecting")
    else setPhase("waiting")

    try {
      const peerConnection = createPeerConnection(negotiationId)
      const rawChannel = createReliableOrderedDataChannel(peerConnection)
      attachDataChannel(rawChannel)
      const offer = await peerConnection.createOffer({ iceRestart: reconnect })
      if (
        negotiationOwnerRef.current !== owner
        || !isCurrentSession(currentSession, epoch)
        || peerConnectionRef.current !== peerConnection
      ) return
      await peerConnection.setLocalDescription(offer)
      if (
        negotiationOwnerRef.current !== owner
        || !isCurrentSession(currentSession, epoch)
        || peerConnectionRef.current !== peerConnection
      ) return
      await sendSignal("offer", { sdp: offer.sdp ?? "" }, negotiationId)
    } catch {
      if (
        negotiationOwnerRef.current === owner
        && isCurrentSession(currentSession, epoch)
      ) scheduleReconnect()
    } finally {
      if (negotiationOwnerRef.current === owner) {
        negotiationOwnerRef.current = null
        negotiatingRef.current = false
        const pending = pendingHostNegotiationRef.current
        pendingHostNegotiationRef.current = null
        if (pending && isCurrentSession(currentSession, epoch)) {
          void beginHostNegotiation(pending.reconnect, pending.negotiationId)
        }
      }
    }
  }

  async function handleOffer(message: LanSignalMessage) {
    const currentSession = sessionRef.current
    if (
      !currentSession
      || currentSession.role !== "guest"
      || message.type !== "offer"
      || message.fromRole !== "host"
      || !isRecord(message.payload)
      || typeof message.payload.sdp !== "string"
    ) return
    if (!bindRemoteSignalPeer(message)) return
    const epoch = sessionEpochRef.current

    // A host offer proves that the guest's renegotiation request arrived even
    // if its HTTP response was lost. Cancel any scheduled retry before it can
    // start a second negotiation and replace this peer connection.
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = null
    guestRenegotiationRef.current = null

    const peerConnection = createPeerConnection(message.negotiationId)
    setPhase(firstPeerIdRef.current ? "reconnecting" : "connecting")
    await peerConnection.setRemoteDescription({ type: "offer", sdp: message.payload.sdp })
    if (
      !isCurrentSession(currentSession, epoch)
      || peerConnectionRef.current !== peerConnection
      || activeNegotiationIdRef.current !== message.negotiationId
    ) return
    await flushQueuedIce(peerConnection, message.negotiationId)
    const answer = await peerConnection.createAnswer()
    if (
      !isCurrentSession(currentSession, epoch)
      || peerConnectionRef.current !== peerConnection
      || activeNegotiationIdRef.current !== message.negotiationId
    ) return
    await peerConnection.setLocalDescription(answer)
    if (
      !isCurrentSession(currentSession, epoch)
      || peerConnectionRef.current !== peerConnection
      || activeNegotiationIdRef.current !== message.negotiationId
    ) return
    await sendSignal("answer", { sdp: answer.sdp ?? "" }, message.negotiationId)
  }

  function bindRemoteSignalPeer(message: LanSignalMessage): boolean {
    const existing = remotePeerIdRef.current
    if (existing && existing !== message.fromPeerId) {
      const currentSession = sessionRef.current
      const canReplaceGuest = currentSession?.role === "host"
        && message.fromRole === "guest"
        && phaseRef.current !== "error"

      if (!canReplaceGuest) {
        setFailure("CONNECTION_FAILED")
        return false
      }

      setRemotePeer(message.fromPeerId)
      setMatchSeries(createLanMatchSeries([
        currentSession.peerId,
        message.fromPeerId,
      ]))
      setConnected(false)
      closePeerConnection()
      setLocalReady(false)
      setRemoteReady(false)
      setFirstPeer(null)
      setCurrentGame(adapter.createInitialState())
      revisionRef.current = 0
      matchIdRef.current = currentSession.roomId
      diceRuntimeRef.current = null
      pendingActionRef.current = null
      acknowledgementCacheRef.current = []
      processedMessagesRef.current = []
      inboundMessageQueueRef.current = Promise.resolve()
      syncConfirmedRef.current = false
      actionPreparingRef.current = false
      setDiceView(null)
      setErrorCode(null)
      persistSession()
      return true
    }
    if (!existing) {
      const currentSession = sessionRef.current
      if (!currentSession) return false
      setRemotePeer(message.fromPeerId)
      setMatchSeries(createLanMatchSeries([
        currentSession.peerId,
        message.fromPeerId,
      ]))
    }
    return true
  }

  async function handleSignal(message: LanSignalMessage) {
    const currentSession = sessionRef.current
    if (!currentSession) return
    if (message.fromRole === currentSession.role) {
      setFailure("CONNECTION_FAILED")
      return
    }

    if (message.type === "renegotiate") {
      if (
        currentSession.role !== "host"
        || message.fromRole !== "guest"
        || !bindRemoteSignalPeer(message)
      ) return
      if (activeNegotiationIdRef.current !== message.negotiationId) {
        await beginHostNegotiation(true, message.negotiationId)
      }
      return
    }

    if (message.type === "offer") {
      await handleOffer(message)
      return
    }

    const peerConnection = peerConnectionRef.current
    if (message.type === "answer") {
      const epoch = sessionEpochRef.current
      if (
        currentSession.role !== "host"
        || message.fromRole !== "guest"
        || !bindRemoteSignalPeer(message)
        || activeNegotiationIdRef.current !== message.negotiationId
        || !peerConnection
        || !isRecord(message.payload)
        || typeof message.payload.sdp !== "string"
      ) return
      if (peerConnection.remoteDescription?.sdp === message.payload.sdp) return
      await peerConnection.setRemoteDescription({ type: "answer", sdp: message.payload.sdp })
      if (
        !isCurrentSession(currentSession, epoch)
        || peerConnectionRef.current !== peerConnection
        || activeNegotiationIdRef.current !== message.negotiationId
      ) return
      await flushQueuedIce(peerConnection, message.negotiationId)
      return
    }

    if (!bindRemoteSignalPeer(message)) return
    if (message.type === "ice") {
      const candidate = message.payload as RTCIceCandidateInit
      if (
        !peerConnection
        || activeNegotiationIdRef.current !== message.negotiationId
        || !peerConnection.remoteDescription
      ) {
        if (currentSession.role === "guest" || activeNegotiationIdRef.current === message.negotiationId) {
          queueRemoteIce(message.negotiationId, candidate)
        }
      } else {
        try {
          await peerConnection.addIceCandidate(candidate)
        } catch {
          // One browser-incompatible candidate is non-fatal; later candidates may work.
        }
      }
      return
    }
    if (message.type === "ice-complete") {
      if (
        !peerConnection
        || activeNegotiationIdRef.current !== message.negotiationId
        || !peerConnection.remoteDescription
      ) {
        if (currentSession.role === "guest" || activeNegotiationIdRef.current === message.negotiationId) {
          queueRemoteIce(message.negotiationId, null)
        }
      } else {
        try {
          await peerConnection.addIceCandidate(null)
        } catch {
          // Some browsers reject an explicit end-of-candidates marker.
        }
      }
    }
  }

  async function pollSignals() {
    if (pollRunningRef.current || !sessionRef.current) return
    const owner = Symbol("lan-signal-poll")
    const epoch = sessionEpochRef.current
    pollRunningRef.current = true
    pollOwnerRef.current = owner
    const abortController = new AbortController()
    pollAbortRef.current = abortController
    let consecutiveEmptyPolls = 0

    try {
      while (
        pollOwnerRef.current === owner
        && epoch === sessionEpochRef.current
        && !abortController.signal.aborted
        && sessionRef.current
        && !disposedRef.current
        && phaseRef.current !== "error"
      ) {
        const currentSession: LanRoomSession | null = sessionRef.current
        if (!currentSession) break
        try {
          const response = await signalingRef.current!.pollSignals(
            currentSession,
            currentSession.cursor,
            0,
            abortController.signal,
          )
          if (
            pollOwnerRef.current !== owner
            || epoch !== sessionEpochRef.current
            || sessionRef.current?.roomId !== currentSession.roomId
            || sessionRef.current.peerId !== currentSession.peerId
          ) break
          let processedCursor = currentSession.cursor
          for (const message of response.messages) {
            await handleSignal(message)
            if (
              pollOwnerRef.current !== owner
              || epoch !== sessionEpochRef.current
            ) break
            processedCursor = Math.max(processedCursor, message.cursor)
            const activeSession = sessionRef.current
            if (
              !activeSession
              || activeSession.roomId !== currentSession.roomId
              || activeSession.peerId !== currentSession.peerId
            ) break
            setCurrentSession({
              ...activeSession,
              cursor: processedCursor,
              expiresAt: response.expiresAt,
            })
            persistSession()
          }

          const activeSession = sessionRef.current
          if (
            pollOwnerRef.current === owner
            && epoch === sessionEpochRef.current
            && activeSession?.roomId === currentSession.roomId
            && activeSession.peerId === currentSession.peerId
          ) {
            setCurrentSession({
              ...activeSession,
              cursor: Math.max(processedCursor, response.cursor),
              expiresAt: response.expiresAt,
            })
          }
          persistSession()
          if (response.messages.length === 0) {
            const delayMs = getSignalPollDelay(consecutiveEmptyPolls, {
              connected: connectedRef.current,
              hidden: typeof document !== "undefined" && document.hidden,
            })
            consecutiveEmptyPolls += 1
            await waitForSignalPollDelay(delayMs, abortController.signal)
          } else {
            consecutiveEmptyPolls = 0
          }
        } catch (error) {
          if (
            abortController.signal.aborted
            || pollOwnerRef.current !== owner
            || epoch !== sessionEpochRef.current
          ) break
          const code = mapSignalingError(error)
          if (code === "ROOM_EXPIRED" || code === "ROOM_NOT_FOUND") {
            setFailure(code)
            break
          }
          setErrorCode(code)
          const delayMs = getSignalPollDelay(consecutiveEmptyPolls, {
            connected: connectedRef.current,
            hidden: typeof document !== "undefined" && document.hidden,
          })
          consecutiveEmptyPolls += 1
          await waitForSignalPollDelay(delayMs, abortController.signal)
        }
      }
    } finally {
      if (pollOwnerRef.current === owner) {
        pollOwnerRef.current = null
        pollRunningRef.current = false
      }
      if (pollAbortRef.current === abortController) pollAbortRef.current = null
    }
  }

  function startSignalHeartbeat() {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
    const epoch = sessionEpochRef.current
    heartbeatTimerRef.current = setInterval(() => {
      const currentSession = sessionRef.current
      if (
        !currentSession
        || epoch !== sessionEpochRef.current
        || heartbeatRunningRef.current
        || phaseRef.current === "error"
      ) return
      heartbeatRunningRef.current = true
      void signalingRef.current!.heartbeat(currentSession).then((response) => {
        const activeSession = sessionRef.current
        if (
          epoch === sessionEpochRef.current
          && activeSession?.roomId === currentSession.roomId
          && activeSession.peerId === currentSession.peerId
        ) {
          setCurrentSession({ ...activeSession, expiresAt: response.expiresAt })
          persistSession()
        }
      }).catch((error) => {
        const activeSession = sessionRef.current
        if (
          epoch !== sessionEpochRef.current
          || activeSession?.roomId !== currentSession.roomId
          || activeSession.peerId !== currentSession.peerId
        ) return
        const code = mapSignalingError(error)
        if (code === "ROOM_EXPIRED" || code === "ROOM_NOT_FOUND") setFailure(code)
      }).finally(() => {
        if (epoch === sessionEpochRef.current) heartbeatRunningRef.current = false
      })
    }, SIGNAL_HEARTBEAT_MS)
  }

  function activateSession(nextSession: LanRoomSession, restored = false) {
    sessionEpochRef.current += 1
    setCurrentSession(nextSession)
    if (!restored) {
      matchIdRef.current = nextSession.roomId
      setLocalReady(false)
      setRemoteReady(false)
      setRemotePeer(null)
      setFirstPeer(null)
      setCurrentGame(adapter.createInitialState())
      setMatchSeries(null)
      revisionRef.current = 0
      diceRuntimeRef.current = null
      pendingActionRef.current = null
      processedMessagesRef.current = []
    }
    setErrorCode(null)
    setPhase(nextSession.role === "host" ? "waiting" : "connecting")
    startSignalHeartbeat()
    void pollSignals()
    if (nextSession.role === "host") {
      if (
        restored
        && shouldHostNegotiate(nextSession.role, remotePeerIdRef.current)
      ) void beginHostNegotiation(true)
    } else {
      startGuestRenegotiation()
    }
    persistSession()
  }

  async function createRoom() {
    if (!supportsLanMultiplayer()) {
      setFailure("UNSUPPORTED_BROWSER")
      return
    }
    leaveRoom()
    const pendingRequest = createFreshPendingRoomRequest("create")
    setPhase("creating")
    const requestEpoch = sessionEpochRef.current
    try {
      const nextSession = await openRoomWithSingleRetry(
        () => signalingRef.current!.createRoom(pendingRequest.requestId),
        () => !disposedRef.current && requestEpoch === sessionEpochRef.current,
      )
      if (disposedRef.current || requestEpoch !== sessionEpochRef.current) {
        void signalingRef.current!.leaveRoom(nextSession).catch(() => {})
        return
      }
      activateSession(nextSession)
      clearPendingRoomRequest()
    } catch (error) {
      if (!disposedRef.current && requestEpoch === sessionEpochRef.current) {
        if (!shouldRetainPendingRoomRequest(error)) clearPendingRoomRequest()
        setFailure(mapSignalingError(error))
      }
    }
  }

  async function joinRoom(roomId: string) {
    if (!supportsLanMultiplayer()) {
      setFailure("UNSUPPORTED_BROWSER")
      return
    }
    const normalized = normalizeRoomCode(roomId)
    if (normalized.length !== 6) return
    leaveRoom()
    const pendingRequest = createFreshPendingRoomRequest("join", normalized)
    setPhase("connecting")
    const requestEpoch = sessionEpochRef.current
    try {
      const nextSession = await openRoomWithSingleRetry(
        () => signalingRef.current!.joinRoom(normalized, pendingRequest.requestId),
        () => !disposedRef.current && requestEpoch === sessionEpochRef.current,
      )
      if (disposedRef.current || requestEpoch !== sessionEpochRef.current) {
        void signalingRef.current!.leaveRoom(nextSession).catch(() => {})
        return
      }
      activateSession(nextSession)
      clearPendingRoomRequest()
    } catch (error) {
      if (!disposedRef.current && requestEpoch === sessionEpochRef.current) {
        if (!shouldRetainPendingRoomRequest(error)) clearPendingRoomRequest()
        setFailure(mapSignalingError(error))
      }
    }
  }

  function handleChannelOpen() {
    const currentSession = sessionRef.current
    if (!currentSession || phaseRef.current === "error") return
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    reconnectTimerRef.current = null
    guestRenegotiationRef.current = null
    rtcHeartbeatRef.current?.start()
    setConnected(true)
    setErrorCode(null)
    if (firstPeerIdRef.current) {
      syncConfirmedRef.current = false
      setPhase("syncing")
    }
    else if (diceRuntimeRef.current) setPhase("dice")
    else setPhase("ready")

    try {
      sendMessage("peer.hello", { engineVersion: adapter.engineVersion })
      sendMessage("room.ready", { ready: localReadyRef.current })
      sendMatchState()
      const series = matchSeriesRef.current
      if (currentSession.role === "host" && series?.pendingAdvance) {
        sendMatchAdvance(series.pendingAdvance)
        persistSession()
        return
      }
      if (currentSession.role === "guest" && series?.lastAdvance) {
        sendMatchAdvanceAcknowledgement(series.lastAdvance)
      }
      if (diceRuntimeRef.current && !resendDiceState()) {
        persistSession()
        return
      }
      if (firstPeerIdRef.current) {
        void sendSyncRequest().catch(() => scheduleReconnect())
      } else if (diceRuntimeRef.current) {
        const runtime = diceRuntimeRef.current
        const round = runtime.finalized
          && runtime.resultAcknowledgedByRemote
          && runtime.localResult?.tied
          && runtime.remoteResult?.tied
          ? runtime.round + 1
          : runtime.round
        void beginDiceRound(round)
          .then(() => maybeRevealDice())
          .then(() => maybeResolveDice())
          .then(() => finalizeConfirmedDice())
          .catch(() => setFailure("INVALID_DICE"))
      } else {
        maybeStartDice()
      }
    } catch {
      scheduleReconnect()
    }
    persistSession()
  }

  function getDiceContext(round: number): DiceRoundContext | null {
    const currentSession = sessionRef.current
    const remoteId = remotePeerIdRef.current
    const series = matchSeriesRef.current
    if (!currentSession || !remoteId || !series) return null
    return {
      roomId: currentSession.roomId,
      matchId: `${matchIdRef.current}:game:${series.gameNumber}`,
      round,
      playerIds: [currentSession.peerId, remoteId],
    }
  }

  async function initializeLocalDiceCommit(runtime: DiceRuntime) {
    if (runtime.localCommit) {
      resendDiceState()
      return
    }
    if (runtime.commitInitializing) return

    const currentSession = sessionRef.current
    const context = getDiceContext(runtime.round)
    const epoch = sessionEpochRef.current
    if (!currentSession || !context || diceRuntimeRef.current !== runtime) return

    runtime.commitInitializing = true
    persistSession()

    let localCommit: DiceCommit
    try {
      localCommit = await createDiceCommit(context, currentSession.peerId)
    } catch {
      if (
        diceRuntimeRef.current === runtime
        && epoch === sessionEpochRef.current
      ) {
        runtime.commitInitializing = false
        persistSession()
        setFailure("INVALID_DICE")
      }
      return
    }

    if (
      diceRuntimeRef.current !== runtime
      || epoch !== sessionEpochRef.current
      || sessionRef.current?.roomId !== currentSession.roomId
      || sessionRef.current.peerId !== currentSession.peerId
    ) return

    runtime.localCommit = localCommit
    runtime.commitments[currentSession.peerId] = localCommit.commitment
    runtime.commitInitializing = false
    persistSession()

    if (!connectedRef.current) return
    try {
      sendMessage("dice.commit", {
        gameNumber: matchSeriesRef.current!.gameNumber,
        round: runtime.round,
        commitment: localCommit.commitment,
      })
      await maybeRevealDice()
      persistSession()
    } catch {
      persistSession()
      scheduleReconnect()
    }
  }

  async function beginDiceRound(round: number) {
    const currentSession = sessionRef.current
    const context = getDiceContext(round)
    if (!currentSession || !context || phaseRef.current === "error") return

    const existing = diceRuntimeRef.current
    if (existing?.round === round) {
      await initializeLocalDiceCommit(existing)
      return
    }
    let previousFinalizedResult: DiceRoundResult | null = null
    if (existing) {
      const existingContext = getDiceContext(existing.round)
      if (
        round !== existing.round + 1
        || !existingContext
        || !existing.finalized
        || !existing.resultAcknowledgedByRemote
        || !existing.localResult?.tied
        || !existing.remoteResult?.tied
        || !diceRoundResultsMatch(
          existing.localResult,
          existing.remoteResult,
          existingContext.playerIds,
        )
      ) {
        setFailure("INVALID_DICE")
        return
      }
      previousFinalizedResult = existing.localResult
    }

    if (diceTimerRef.current) clearTimeout(diceTimerRef.current)
    diceTimerRef.current = null

    const runtime: DiceRuntime = {
      round,
      previousFinalizedResult,
      localCommit: null,
      commitments: {},
      reveals: {},
      revealSent: false,
      resolving: false,
      resultSent: false,
      localResult: null,
      remoteResult: null,
      commitInitializing: false,
      finalized: false,
      resultAcknowledgedByRemote: false,
    }
    diceRuntimeRef.current = runtime
    setPhase("dice")
    setDiceView({ local: null, remote: null, round, status: "committing" })
    persistSession()
    await initializeLocalDiceCommit(runtime)
  }

  function resendDiceState(): boolean {
    const runtime = diceRuntimeRef.current
    if (!runtime) return true
    if (!connectedRef.current) return false

    try {
      if (runtime.previousFinalizedResult) {
        sendMessage("dice.result", toJsonValue({
          ...runtime.previousFinalizedResult,
          gameNumber: matchSeriesRef.current!.gameNumber,
        }))
        sendMessage("dice.result-ack", {
          gameNumber: matchSeriesRef.current!.gameNumber,
          round: runtime.previousFinalizedResult.round,
          proof: runtime.previousFinalizedResult.proof,
        })
      }
      if (runtime.localCommit) {
        sendMessage("dice.commit", {
          gameNumber: matchSeriesRef.current!.gameNumber,
          round: runtime.round,
          commitment: runtime.localCommit.commitment,
        })
        if (runtime.revealSent) {
          sendMessage("dice.reveal", {
            gameNumber: matchSeriesRef.current!.gameNumber,
            round: runtime.round,
            nonce: runtime.localCommit.nonce,
          })
        }
        if (runtime.localResult) {
          sendMessage("dice.result", toJsonValue({
            ...runtime.localResult,
            gameNumber: matchSeriesRef.current!.gameNumber,
          }))
          runtime.resultSent = true
        }
      }
      const context = getDiceContext(runtime.round)
      if (
        context
        && runtime.localResult
        && runtime.remoteResult
        && diceRoundResultsMatch(
          runtime.localResult,
          runtime.remoteResult,
          context.playerIds,
        )
      ) {
        sendMessage("dice.result-ack", {
          gameNumber: matchSeriesRef.current!.gameNumber,
          round: runtime.round,
          proof: runtime.localResult.proof,
        })
      }
      return true
    } catch {
      scheduleReconnect()
      return false
    }
  }

  function finalizeConfirmedDice() {
    const currentSession = sessionRef.current
    const remoteId = remotePeerIdRef.current
    const runtime = diceRuntimeRef.current
    const localResult = runtime?.localResult
    const remoteResult = runtime?.remoteResult
    if (!currentSession || !remoteId || !runtime || !localResult || !remoteResult) return
    const context = getDiceContext(runtime.round)
    if (!context || !diceRoundResultsMatch(localResult, remoteResult, context.playerIds)) {
      setFailure("INVALID_DICE")
      return
    }
    if (!runtime.finalized) {
      runtime.finalized = true
      setDiceView({
        local: localResult.rolls[currentSession.peerId],
        remote: localResult.rolls[remoteId],
        round: runtime.round,
        status: localResult.tied ? "tied" : "resolved",
      })
    }

    // The peer may advance as soon as it receives this acknowledgement.
    // Persist the canonical result first so a local reload can still recover it.
    persistSession()
    if (connectedRef.current) {
      try {
        sendMessage("dice.result-ack", {
          gameNumber: matchSeriesRef.current!.gameNumber,
          round: runtime.round,
          proof: localResult.proof,
        })
      } catch {
        scheduleReconnect()
      }
    }

    if (!runtime.resultAcknowledgedByRemote) {
      persistSession()
      return
    }

    if (diceTimerRef.current) return
    if (localResult.tied) {
      diceTimerRef.current = setTimeout(() => {
        diceTimerRef.current = null
        if (
          diceRuntimeRef.current !== runtime
          || !runtime.resultAcknowledgedByRemote
          || phaseRef.current === "error"
        ) return
        void beginDiceRound(runtime.round + 1)
      }, DICE_RESULT_HOLD_MS)
    } else {
      if (
        firstPeerIdRef.current
        && firstPeerIdRef.current !== localResult.firstPlayerId
      ) {
        setFailure("INVALID_DICE")
        return
      }
      if (!firstPeerIdRef.current) {
        setFirstPeer(localResult.firstPlayerId)
        setCurrentGame(adapter.createInitialState())
        revisionRef.current = 0
        pendingActionRef.current = null
      }
      syncConfirmedRef.current = true
      diceTimerRef.current = setTimeout(() => {
        diceTimerRef.current = null
        if (connectedRef.current && phaseRef.current !== "error") setPhase("playing")
        persistSession()
      }, DICE_RESULT_HOLD_MS)
    }
    persistSession()
  }

  async function maybeRevealDice() {
    const currentSession = sessionRef.current
    const remoteId = remotePeerIdRef.current
    const runtime = diceRuntimeRef.current
    if (!currentSession || !remoteId || !runtime?.localCommit || runtime.revealSent) return
    if (!runtime.commitments[currentSession.peerId] || !runtime.commitments[remoteId]) return

    runtime.revealSent = true
    runtime.reveals[currentSession.peerId] = runtime.localCommit.nonce
    const currentView = diceViewRef.current
    if (currentView) setDiceView({ ...currentView, status: "revealing" })
    try {
      sendMessage("dice.reveal", {
        gameNumber: matchSeriesRef.current!.gameNumber,
        round: runtime.round,
        nonce: runtime.localCommit.nonce,
      })
    } catch {
      persistSession()
      scheduleReconnect()
      return
    }
    await maybeResolveDice()
    persistSession()
  }

  async function maybeResolveDice() {
    const currentSession = sessionRef.current
    const remoteId = remotePeerIdRef.current
    const runtime = diceRuntimeRef.current
    const epoch = sessionEpochRef.current
    if (
      !currentSession
      || !remoteId
      || !runtime
      || runtime.resolving
      || runtime.finalized
    ) return
    if (!runtime.reveals[currentSession.peerId] || !runtime.reveals[remoteId]) return
    if (runtime.localResult) {
      finalizeConfirmedDice()
      return
    }

    runtime.resolving = true
    const context = getDiceContext(runtime.round)
    if (!context) {
      runtime.resolving = false
      return
    }

    let result: DiceRoundResult
    try {
      result = await resolveDiceRound(context, runtime.reveals)
    } catch {
      runtime.resolving = false
      if (
        diceRuntimeRef.current === runtime
        && isCurrentSession(currentSession, epoch)
      ) setFailure("INVALID_DICE")
      return
    }

    if (
      diceRuntimeRef.current !== runtime
      || !isCurrentSession(currentSession, epoch)
    ) return

    runtime.localResult = result
    const nextView: LanTurnGameDiceView = {
      local: result.rolls[currentSession.peerId],
      remote: result.rolls[remoteId],
      round: runtime.round,
      status: "revealing",
    }
    setDiceView(nextView)
    try {
      sendMessage("dice.result", toJsonValue({
        ...result,
        gameNumber: matchSeriesRef.current!.gameNumber,
      }))
      runtime.resultSent = true
      runtime.resolving = false
      finalizeConfirmedDice()
      persistSession()
    } catch {
      runtime.resultSent = false
      runtime.resolving = false
      persistSession()
      scheduleReconnect()
    }
  }

  function maybeStartDice() {
    const currentSession = sessionRef.current
    const series = matchSeriesRef.current
    if (
      currentSession?.role === "host" &&
      series &&
      series.settledGameNumber === series.gameNumber - 1 &&
      !series.pendingAdvance &&
      connectedRef.current &&
      localReadyRef.current &&
      remoteReadyRef.current &&
      remotePeerIdRef.current &&
      !diceRuntimeRef.current &&
      !firstPeerIdRef.current
    ) {
      void beginDiceRound(1)
    }
  }

  function markReady() {
    if (!connectedRef.current || localReadyRef.current) return
    setLocalReady(true)
    try {
      sendMessage("room.ready", { ready: true })
      maybeStartDice()
      persistSession()
    } catch {
      scheduleReconnect()
    }
  }

  function sideForPeerId(peerId: string): Side | null {
    const currentSession = sessionRef.current
    const remoteId = remotePeerIdRef.current
    const firstId = firstPeerIdRef.current
    if (!currentSession || !remoteId || !firstId) return null
    if (peerId === firstId) return adapter.firstSide
    if (peerId === currentSession.peerId || peerId === remoteId) {
      return adapter.secondSide
    }
    return null
  }

  function currentPlayers(): [string, string] | null {
    const currentSession = sessionRef.current
    const remoteId = remotePeerIdRef.current
    if (!currentSession || !remoteId) return null
    return [currentSession.peerId, remoteId]
  }

  function peerIdForSide(side: Side): string | null {
    const players = currentPlayers()
    if (!players) return null
    return players.find((peerId) => sideForPeerId(peerId) === side) ?? null
  }

  function settleCommittedGame(state: State): boolean {
    const series = matchSeriesRef.current
    if (!series) return false
    const next = settleLanMatchSeries(series, adapter.getOutcome(state), peerIdForSide)
    if (next !== series) setMatchSeries(next)
    return next !== series
  }

  function sendMatchState(): void {
    const series = matchSeriesRef.current
    if (!series || !connectedRef.current) return
    sendMessage("match.state", { series: toJsonValue(series) })
  }

  function sendMatchAdvance(advance: LanMatchAdvance): void {
    sendMessage("match.advance", { advance: toJsonValue(advance) })
  }

  function sendMatchAdvanceAcknowledgement(advance: LanMatchAdvance): void {
    sendMessage("match.advance-ack", {
      advanceId: advance.advanceId,
      fromGameNumber: advance.fromGameNumber,
      toGameNumber: advance.toGameNumber,
    })
  }

  function resetForNextGame(nextSeries: LanMatchSeriesState): void {
    if (diceTimerRef.current) clearTimeout(diceTimerRef.current)
    diceTimerRef.current = null
    setMatchSeries(nextSeries)
    setFirstPeer(null)
    setCurrentGame(adapter.createInitialState())
    revisionRef.current = 0
    diceRuntimeRef.current = null
    pendingActionRef.current = null
    acknowledgementCacheRef.current = []
    syncConfirmedRef.current = false
    actionPreparingRef.current = false
    advancePreparingRef.current = false
    setDiceView(null)
    setPhase("syncing")
    persistSession()
  }

  async function terminalStateHash(): Promise<string | null> {
    const series = matchSeriesRef.current
    if (
      !series
      || series.settledGameNumber !== series.gameNumber
      || adapter.getOutcome(gameRef.current).status === "playing"
    ) return null
    return hashJson(adapter.encodeSnapshot(gameRef.current))
  }

  async function maybePrepareHostAdvance(): Promise<void> {
    const currentSession = sessionRef.current
    const series = matchSeriesRef.current
    const players = currentPlayers()
    if (
      !currentSession
      || currentSession.role !== "host"
      || !series
      || !players
      || series.pendingAdvance
      || !bothPlayersRequestedRematch(series, players)
      || advancePreparingRef.current
    ) return

    advancePreparingRef.current = true
    const expectedGameNumber = series.gameNumber
    const expectedRevision = revisionRef.current
    try {
      const stateHash = await terminalStateHash()
      if (
        !stateHash
        || matchSeriesRef.current !== series
        || revisionRef.current !== expectedRevision
        || series.gameNumber !== expectedGameNumber
      ) return
      const advance = createLanMatchAdvance(
        series,
        players,
        expectedRevision,
        stateHash,
        crypto.randomUUID(),
      )
      if (!advance) return
      const pendingSeries = withPendingLanMatchAdvance(series, advance)
      if (!pendingSeries) {
        setFailure("DESYNC")
        return
      }
      setMatchSeries(pendingSeries)
      persistSession()
      if (connectedRef.current) sendMatchAdvance(advance)
    } catch {
      scheduleReconnect()
    } finally {
      advancePreparingRef.current = false
    }
  }

  async function applyGuestAdvance(advance: LanMatchAdvance): Promise<void> {
    const currentSession = sessionRef.current
    const series = matchSeriesRef.current
    if (!currentSession || currentSession.role !== "guest" || !series) return

    if (
      series.gameNumber === advance.toGameNumber
      && series.lastAdvance?.advanceId === advance.advanceId
    ) {
      try {
        sendMatchAdvanceAcknowledgement(advance)
        sendMatchState()
      } catch {
        scheduleReconnect()
      }
      return
    }
    if (
      advance.fromGameNumber < series.gameNumber
      || advance.toGameNumber <= series.gameNumber
    ) return
    if (
      advance.fromGameNumber !== series.gameNumber
      || advance.terminalRevision !== revisionRef.current
    ) {
      setFailure("DESYNC")
      return
    }

    const stateHash = await terminalStateHash()
    if (!stateHash || stateHash !== advance.terminalStateHash) {
      setFailure("DESYNC")
      return
    }
    const nextSeries = applyLanMatchAdvance(series, advance)
    if (!nextSeries) {
      setFailure("DESYNC")
      return
    }
    resetForNextGame(nextSeries)
    try {
      sendMatchAdvanceAcknowledgement(advance)
      sendMatchState()
    } catch {
      scheduleReconnect()
    }
  }

  function completeHostAdvance(advance: LanMatchAdvance): void {
    const currentSession = sessionRef.current
    const series = matchSeriesRef.current
    if (
      !currentSession
      || currentSession.role !== "host"
      || !series?.pendingAdvance
      || series.pendingAdvance.advanceId !== advance.advanceId
    ) return
    const nextSeries = applyLanMatchAdvance(series, advance)
    if (!nextSeries) {
      setFailure("DESYNC")
      return
    }
    resetForNextGame(nextSeries)
    try {
      sendMatchState()
      if (connectedRef.current) void beginDiceRound(1)
    } catch {
      scheduleReconnect()
    }
  }

  async function requestRematch(): Promise<boolean> {
    const currentSession = sessionRef.current
    const series = matchSeriesRef.current
    const epoch = sessionEpochRef.current
    const expectedGameNumber = series?.gameNumber
    const expectedRevision = revisionRef.current
    if (
      !currentSession
      || !remotePeerIdRef.current
      || !series
      || !connectedRef.current
      || series.settledGameNumber !== series.gameNumber
    ) return false

    const stateHash = await terminalStateHash()
    const latest = matchSeriesRef.current
    if (
      !stateHash
      || !isCurrentSession(currentSession, epoch)
      || !latest
      || latest.gameNumber !== expectedGameNumber
      || latest.settledGameNumber !== latest.gameNumber
      || revisionRef.current !== expectedRevision
    ) return false
    const next = requestLanMatchRematch(latest, currentSession.peerId)
    if (next !== latest) {
      setMatchSeries(next)
      persistSession()
    }
    try {
      sendMessage("match.rematch-request", {
        gameNumber: next.gameNumber,
        terminalRevision: revisionRef.current,
        terminalStateHash: stateHash,
      })
      sendMatchState()
      await maybePrepareHostAdvance()
      return true
    } catch {
      persistSession()
      scheduleReconnect()
      return false
    }
  }

  async function handleRematchRequest(
    message: Extract<MultiplayerMessage, { type: "match.rematch-request" }>,
  ): Promise<void> {
    const series = matchSeriesRef.current
    const currentSession = sessionRef.current
    const epoch = sessionEpochRef.current
    if (!series || message.payload.gameNumber < series.gameNumber) return
    if (
      message.payload.gameNumber > series.gameNumber
      || message.payload.terminalRevision !== revisionRef.current
    ) {
      setFailure("DESYNC")
      return
    }
    const stateHash = await terminalStateHash()
    if (!stateHash || stateHash !== message.payload.terminalStateHash) {
      setFailure("DESYNC")
      return
    }
    const latest = matchSeriesRef.current
    if (!currentSession || !isCurrentSession(currentSession, epoch) || !latest) return
    if (message.payload.gameNumber < latest.gameNumber) return
    if (
      message.payload.gameNumber > latest.gameNumber
      || message.payload.terminalRevision !== revisionRef.current
      || latest.settledGameNumber !== latest.gameNumber
    ) {
      setFailure("DESYNC")
      return
    }
    const next = requestLanMatchRematch(latest, message.senderId)
    if (next !== latest) setMatchSeries(next)
    persistSession()
    await maybePrepareHostAdvance()
  }

  async function handleMatchState(
    message: Extract<MultiplayerMessage, { type: "match.state" }>,
  ): Promise<void> {
    const currentSession = sessionRef.current
    const local = matchSeriesRef.current
    const players = currentPlayers()
    const remote = message.payload.series
    if (!currentSession || !local || !players || !isLanMatchSeriesState(remote, players)) {
      setFailure("DESYNC")
      return
    }

    if (remote.gameNumber === local.gameNumber) {
      if (currentSession.role === "guest" && remote.pendingAdvance) {
        const merged = mergeLanMatchRematchRequests(local, remote)
        if (!merged) {
          setFailure("DESYNC")
          return
        }
        if (merged !== local) {
          setMatchSeries(merged)
          persistSession()
        }
        await applyGuestAdvance(remote.pendingAdvance)
        return
      }
      if (currentSession.role === "host" && remote.pendingAdvance) {
        setFailure("DESYNC")
        return
      }
      const merged = mergeLanMatchRematchRequests(local, remote)
      if (!merged) {
        const settlementCanBeRecoveredByBoardSync = (
          isLanMatchSettlementAhead(local, remote)
          || isLanMatchSettlementAhead(remote, local)
        ) && (!syncConfirmedRef.current || pendingActionRef.current !== null)
        if (settlementCanBeRecoveredByBoardSync) return
        setFailure("DESYNC")
        return
      }
      if (merged !== local) setMatchSeries(merged)
      persistSession()
      if (!sameLanMatchRematchRequests(merged, remote)) {
        try {
          sendMatchState()
        } catch {
          scheduleReconnect()
        }
      }
      await maybePrepareHostAdvance()
      return
    }

    if (remote.gameNumber === local.gameNumber + 1) {
      const advance = remote.lastAdvance
      if (!advance) {
        setFailure("DESYNC")
        return
      }
      if (currentSession.role === "host") {
        if (local.pendingAdvance?.advanceId !== advance.advanceId) {
          setFailure("DESYNC")
          return
        }
        completeHostAdvance(advance)
      } else {
        await applyGuestAdvance(advance)
      }
      return
    }

    if (remote.gameNumber < local.gameNumber) {
      try {
        sendMatchState()
        if (currentSession.role === "host" && local.lastAdvance) {
          sendMatchAdvance(local.lastAdvance)
        } else if (currentSession.role === "guest" && local.lastAdvance) {
          sendMatchAdvanceAcknowledgement(local.lastAdvance)
        }
      } catch {
        scheduleReconnect()
      }
      return
    }

    setFailure("DESYNC")
  }

  function actionsMatch(left: Action, right: Action): boolean {
    return JSON.stringify(adapter.encodeAction(left))
      === JSON.stringify(adapter.encodeAction(right))
  }

  async function handleActionProposal(
    message: Extract<MultiplayerMessage, { type: "action.propose" }>,
  ) {
    const currentSession = sessionRef.current
    const epoch = sessionEpochRef.current
    const expectedRemotePeerId = remotePeerIdRef.current
    const action = adapter.parseAction(message.payload.action)
    if (!action) {
      sendMessage("action.reject", {
        gameNumber: matchSeriesRef.current!.gameNumber,
        actionId: message.payload.actionId,
        code: "INVALID_ACTION",
      })
      return
    }

    const cached = acknowledgementCacheRef.current.find(
      (acknowledgement) => acknowledgement.actionId === message.payload.actionId,
    )
    if (cached) {
      if (
        !actionsMatch(cached.action, action)
        || cached.baseRevision !== message.payload.baseRevision
      ) {
        setFailure("DESYNC")
        return
      }
      try {
        sendMessage("action.ack", {
          gameNumber: matchSeriesRef.current!.gameNumber,
          actionId: cached.actionId,
          baseRevision: cached.baseRevision,
          nextRevision: cached.nextRevision,
          nextStateHash: cached.nextStateHash,
        }, cached.messageId)
      } catch {
        scheduleReconnect()
      }
      return
    }

    if (phaseRef.current !== "playing" || !connectedRef.current) {
      sendMessage("action.reject", {
        gameNumber: matchSeriesRef.current!.gameNumber,
        actionId: message.payload.actionId,
        code: "NOT_PLAYING",
      })
      return
    }
    if (
      message.payload.baseRevision !== revisionRef.current
      || pendingActionRef.current
    ) {
      sendMessage("action.reject", {
        gameNumber: matchSeriesRef.current!.gameNumber,
        actionId: message.payload.actionId,
        code: "REVISION_MISMATCH",
      })
      return
    }

    const side = sideForPeerId(message.senderId)
    if (!side) return
    const result = adapter.applyAction(gameRef.current, action, side)
    if (!result.ok) {
      sendMessage("action.reject", {
        gameNumber: matchSeriesRef.current!.gameNumber,
        actionId: message.payload.actionId,
        code: result.code,
      })
      return
    }
    if (adapter.getRevision(result.state) !== message.payload.baseRevision + 1) {
      setFailure("DESYNC")
      return
    }

    const nextStateHash = await hashJson(adapter.encodeSnapshot(result.state))
    if (
      !currentSession
      || !isCurrentSession(currentSession, epoch)
      || remotePeerIdRef.current !== expectedRemotePeerId
      || phaseRef.current !== "playing"
      || revisionRef.current !== message.payload.baseRevision
      || adapter.getRevision(gameRef.current) !== message.payload.baseRevision
    ) return

    const acknowledgementMessageId = crypto.randomUUID()
    const acknowledgement: CachedAcknowledgement<Action> = {
      actionId: message.payload.actionId,
      action,
      baseRevision: revisionRef.current,
      messageId: acknowledgementMessageId,
      nextRevision: revisionRef.current + 1,
      nextStateHash,
    }
    acknowledgementCacheRef.current = [
      ...acknowledgementCacheRef.current,
      acknowledgement,
    ].slice(-128)
    setCurrentGame(result.state)
    revisionRef.current = acknowledgement.nextRevision
    settleCommittedGame(result.state)
    persistSession()
    try {
      sendMessage("action.ack", {
        gameNumber: matchSeriesRef.current!.gameNumber,
        actionId: acknowledgement.actionId,
        baseRevision: acknowledgement.baseRevision,
        nextRevision: acknowledgement.nextRevision,
        nextStateHash: acknowledgement.nextStateHash,
      }, acknowledgement.messageId)
    } catch {
      scheduleReconnect()
    }
  }

  async function handleActionAcknowledgement(message: Extract<MultiplayerMessage, { type: "action.ack" }>) {
    const currentSession = sessionRef.current
    const epoch = sessionEpochRef.current
    const pending = pendingActionRef.current
    if (!pending) {
      if (message.payload.nextRevision === revisionRef.current) {
        const currentHash = await hashJson(adapter.encodeSnapshot(gameRef.current))
        if (!currentSession || !isCurrentSession(currentSession, epoch)) return
        if (message.payload.nextStateHash === currentHash) return
      }
      setFailure("DESYNC")
      return
    }
    if (
      pending.actionId !== message.payload.actionId ||
      pending.baseRevision !== revisionRef.current ||
      message.payload.nextRevision !== revisionRef.current + 1 ||
      message.payload.nextStateHash !== pending.stateHash
    ) {
      setFailure("DESYNC")
      return
    }
    pendingActionRef.current = null
    setCurrentGame(pending.state)
    revisionRef.current = message.payload.nextRevision
    settleCommittedGame(pending.state)
    persistSession()
  }

  async function sendSnapshot(
    snapshot = gameRef.current,
    revision = revisionRef.current,
    expectedSession = sessionRef.current,
    expectedEpoch = sessionEpochRef.current,
    expectedGameNumber = matchSeriesRef.current?.gameNumber,
  ): Promise<boolean> {
    if (!expectedSession || !expectedGameNumber || !isCurrentSession(expectedSession, expectedEpoch)) return false
    const stateHash = await hashJson(adapter.encodeSnapshot(snapshot))
    if (
      !isCurrentSession(expectedSession, expectedEpoch)
      || matchSeriesRef.current?.gameNumber !== expectedGameNumber
    ) return false
    sendMessage("sync.snapshot", {
      gameNumber: expectedGameNumber,
      revision,
      stateHash,
      state: adapter.encodeSnapshot(snapshot),
    })
    return true
  }

  async function sendSyncRequest(): Promise<boolean> {
    const currentSession = sessionRef.current
    const epoch = sessionEpochRef.current
    if (!currentSession) return false
    const snapshot = gameRef.current
    const revision = revisionRef.current
    const gameNumber = matchSeriesRef.current?.gameNumber
    if (!gameNumber) return false
    const stateHash = await hashJson(adapter.encodeSnapshot(snapshot))
    if (
      !isCurrentSession(currentSession, epoch)
      || matchSeriesRef.current?.gameNumber !== gameNumber
    ) return false
    sendMessage("sync.request", {
      gameNumber,
      revision,
      stateHash,
    })
    return true
  }

  function completeSync() {
    if (
      syncConfirmedRef.current
      && connectedRef.current
      && firstPeerIdRef.current
      && phaseRef.current !== "error"
    ) {
      setPhase("playing")
      persistSession()
    }
  }

  async function handleSyncRequest(
    message: Extract<MultiplayerMessage, { type: "sync.request" }>,
  ) {
    const currentSession = sessionRef.current
    const epoch = sessionEpochRef.current
    if (!currentSession) return
    const snapshot = gameRef.current
    const revision = revisionRef.current
    const gameNumber = matchSeriesRef.current?.gameNumber
    if (!gameNumber) return
    syncConfirmedRef.current = false
    if (firstPeerIdRef.current) setPhase("syncing")
    const localHash = await hashJson(adapter.encodeSnapshot(snapshot))
    if (
      !isCurrentSession(currentSession, epoch)
      || matchSeriesRef.current?.gameNumber !== gameNumber
    ) return
    const matchesLocalState = (
      message.payload.revision === revision
      && message.payload.stateHash === localHash
    )
    if (!await sendSnapshot(snapshot, revision, currentSession, epoch, gameNumber)) return
    if (matchesLocalState) {
      syncConfirmedRef.current = true
      completeSync()
    }
  }

  async function handleSnapshot(message: Extract<MultiplayerMessage, { type: "sync.snapshot" }>) {
    const currentSession = sessionRef.current
    const epoch = sessionEpochRef.current
    const gameNumber = matchSeriesRef.current?.gameNumber
    if (!currentSession) return
    const validated = adapter.validateAndRebuildSnapshot(
      message.payload.state,
      message.payload.revision,
    )
    if (!validated.ok) {
      setFailure("DESYNC")
      return
    }
    const stateHash = await hashJson(adapter.encodeSnapshot(validated.state))
    if (
      !isCurrentSession(currentSession, epoch)
      || matchSeriesRef.current?.gameNumber !== gameNumber
    ) return
    if (stateHash !== message.payload.stateHash) {
      setFailure("DESYNC")
      return
    }
    if (message.payload.revision < revisionRef.current) return
    if (message.payload.revision === revisionRef.current) {
      const localHash = await hashJson(adapter.encodeSnapshot(gameRef.current))
      if (
        !isCurrentSession(currentSession, epoch)
        || matchSeriesRef.current?.gameNumber !== gameNumber
      ) return
      if (localHash !== stateHash) {
        setFailure("DESYNC")
        return
      }
      pendingActionRef.current = null
      const scoreChanged = settleCommittedGame(gameRef.current)
      syncConfirmedRef.current = true
      completeSync()
      persistSession()
      if (scoreChanged) {
        try {
          sendMatchState()
        } catch {
          scheduleReconnect()
        }
      }
      return
    }

    const pending = pendingActionRef.current
    if (
      !pending
      || message.payload.revision !== pending.baseRevision + 1
      || message.payload.revision !== revisionRef.current + 1
      || stateHash !== pending.stateHash
    ) {
      setFailure("DESYNC")
      return
    }

    pendingActionRef.current = null
    revisionRef.current = message.payload.revision
    setCurrentGame(validated.state)
    const scoreChanged = settleCommittedGame(validated.state)
    syncConfirmedRef.current = true
    persistSession()
    if (scoreChanged) {
      try {
        sendMatchState()
      } catch {
        scheduleReconnect()
      }
    }
    await sendSyncRequest()
    if (
      !isCurrentSession(currentSession, epoch)
      || matchSeriesRef.current?.gameNumber !== gameNumber
    ) return
    completeSync()
  }

  async function handlePeerMessage(message: MultiplayerMessage) {
    const currentSession = sessionRef.current
    const expectedRemotePeerId = remotePeerIdRef.current
    const epoch = sessionEpochRef.current
    const messageContextIsCurrent = () => Boolean(
      currentSession
      && isCurrentSession(currentSession, epoch)
      && remotePeerIdRef.current === expectedRemotePeerId,
    )
    if (
      !currentSession ||
      !expectedRemotePeerId ||
      message.roomId !== currentSession.roomId ||
      message.matchId !== matchIdRef.current ||
      message.senderId === currentSession.peerId ||
      message.senderId !== expectedRemotePeerId
    ) return

    if (!rememberMessage(message.messageId)) return

    if ([
      "dice.commit",
      "dice.reveal",
      "dice.result",
      "dice.result-ack",
      "action.propose",
      "action.ack",
      "action.reject",
      "sync.request",
      "sync.snapshot",
    ].includes(message.type)) {
      const currentGameNumber = matchSeriesRef.current?.gameNumber
      const messageGameNumber = (message.payload as { gameNumber?: unknown }).gameNumber
      if (!currentGameNumber || typeof messageGameNumber !== "number") {
        setFailure("DESYNC")
        return
      }
      if (messageGameNumber < currentGameNumber) return
      if (messageGameNumber > currentGameNumber) {
        setFailure("DESYNC")
        return
      }
    }

    switch (message.type) {
      case "peer.hello":
        if (message.payload.engineVersion !== adapter.engineVersion) {
          setFailure("ENGINE_MISMATCH")
          return
        }
        maybeStartDice()
        return

      case "match.state":
        await handleMatchState(message)
        return

      case "match.rematch-request":
        await handleRematchRequest(message)
        return

      case "match.advance":
        if (currentSession.role !== "guest") {
          setFailure("DESYNC")
          return
        }
        await applyGuestAdvance(message.payload.advance)
        return

      case "match.advance-ack": {
        const pending = matchSeriesRef.current?.pendingAdvance
        if (
          currentSession.role !== "host"
          || !pending
          || pending.advanceId !== message.payload.advanceId
          || pending.fromGameNumber !== message.payload.fromGameNumber
          || pending.toGameNumber !== message.payload.toGameNumber
        ) {
          const last = matchSeriesRef.current?.lastAdvance
          if (last?.advanceId === message.payload.advanceId) return
          setFailure("DESYNC")
          return
        }
        completeHostAdvance(pending)
        return
      }

      case "room.ready":
        setRemoteReady(message.payload.ready)
        maybeStartDice()
        persistSession()
        return

      case "dice.commit": {
        let runtime = diceRuntimeRef.current
        if (!runtime) {
          if (
            message.payload.round !== 1
            || !localReadyRef.current
            || !remoteReadyRef.current
          ) {
            setFailure("INVALID_DICE")
            return
          }
          await beginDiceRound(1)
          if (!messageContextIsCurrent()) return
          runtime = diceRuntimeRef.current
        } else if (message.payload.round < runtime.round) {
          return
        } else if (message.payload.round === runtime.round + 1) {
          if (
            !runtime.finalized
            || !runtime.resultAcknowledgedByRemote
            || !runtime.localResult?.tied
            || !runtime.remoteResult?.tied
          ) {
            setFailure("INVALID_DICE")
            return
          }
          await beginDiceRound(message.payload.round)
          if (!messageContextIsCurrent()) return
          runtime = diceRuntimeRef.current
        }
        if (!runtime || runtime.round !== message.payload.round) {
          setFailure("INVALID_DICE")
          return
        }
        const existingCommitment = runtime.commitments[message.senderId]
        if (existingCommitment && existingCommitment !== message.payload.commitment) {
          setFailure("INVALID_DICE")
          return
        }
        if (!existingCommitment) {
          runtime.commitments[message.senderId] = message.payload.commitment
        }
        if (runtime.finalized) {
          persistSession()
          return
        }
        await maybeRevealDice()
        persistSession()
        return
      }

      case "dice.reveal": {
        const runtime = diceRuntimeRef.current
        if (runtime && message.payload.round < runtime.round) return
        if (runtime && message.payload.round > runtime.round) {
          setFailure("INVALID_DICE")
          return
        }
        const context = runtime ? getDiceContext(runtime.round) : null
        if (!runtime || !context || runtime.round !== message.payload.round) return
        const existingReveal = runtime.reveals[message.senderId]
        if (existingReveal && existingReveal !== message.payload.nonce) {
          setFailure("INVALID_DICE")
          return
        }
        const commitment = runtime.commitments[message.senderId]
        if (!commitment) {
          setFailure("INVALID_DICE")
          return
        }
        const revealIsValid = await verifyDiceReveal(
          context,
          message.senderId,
          message.payload.nonce,
          commitment,
        )
        if (!messageContextIsCurrent() || diceRuntimeRef.current !== runtime) return
        if (!revealIsValid) {
          setFailure("INVALID_DICE")
          return
        }
        if (!existingReveal) runtime.reveals[message.senderId] = message.payload.nonce
        if (runtime.finalized) {
          persistSession()
          return
        }
        await maybeResolveDice()
        if (!messageContextIsCurrent() || diceRuntimeRef.current !== runtime) return
        persistSession()
        return
      }

      case "dice.result": {
        const runtime = diceRuntimeRef.current
        const result = message.payload as DiceRoundResult
        if (runtime && result.round < runtime.round) {
          const context = getDiceContext(runtime.round)
          if (!context) {
            setFailure("INVALID_DICE")
            return
          }
          const disposition = classifyHistoricalDiceResult(
            runtime.round,
            runtime.previousFinalizedResult,
            result,
            context.playerIds,
          )
          if (disposition === "conflict") {
            setFailure("INVALID_DICE")
            return
          }
          if (disposition === "match") {
            try {
              sendMessage("dice.result-ack", {
                gameNumber: matchSeriesRef.current!.gameNumber,
                round: result.round,
                proof: result.proof,
              })
            } catch {
              scheduleReconnect()
            }
          }
          return
        }
        if (runtime && result.round > runtime.round) {
          setFailure("INVALID_DICE")
          return
        }
        const context = runtime ? getDiceContext(runtime.round) : null
        if (
          !runtime
          || !context
          || result.round !== runtime.round
          || !context.playerIds.every((peerId) => Object.hasOwn(result.rolls, peerId))
          || Object.keys(result.rolls).length !== 2
        ) {
          setFailure("INVALID_DICE")
          return
        }
        if (
          runtime.remoteResult
          && !diceRoundResultsMatch(runtime.remoteResult, result, context.playerIds)
        ) {
          setFailure("INVALID_DICE")
          return
        }
        runtime.remoteResult = result
        await maybeResolveDice()
        if (!messageContextIsCurrent() || diceRuntimeRef.current !== runtime) return
        finalizeConfirmedDice()
        persistSession()
        return
      }

      case "dice.result-ack": {
        const runtime = diceRuntimeRef.current
        if (!runtime) {
          setFailure("INVALID_DICE")
          return
        }
        if (message.payload.round < runtime.round) {
          const context = getDiceContext(runtime.round)
          if (!context) {
            setFailure("INVALID_DICE")
            return
          }
          const disposition = classifyHistoricalDiceResultAcknowledgement(
            runtime.round,
            runtime.previousFinalizedResult,
            message.payload,
            context.playerIds,
          )
          if (disposition === "conflict") setFailure("INVALID_DICE")
          return
        }
        if (
          message.payload.round > runtime.round
          || !runtime.localResult
          || message.payload.proof !== runtime.localResult.proof
        ) {
          setFailure("INVALID_DICE")
          return
        }
        runtime.resultAcknowledgedByRemote = true
        finalizeConfirmedDice()
        persistSession()
        return
      }

      case "action.propose":
        await handleActionProposal(message)
        return

      case "action.ack":
        await handleActionAcknowledgement(message)
        return

      case "action.reject":
        if (pendingActionRef.current?.actionId === message.payload.actionId) {
          pendingActionRef.current = null
          syncConfirmedRef.current = false
          setPhase("syncing")
          await sendSyncRequest()
          persistSession()
        }
        return

      case "sync.request":
        await handleSyncRequest(message)
        return

      case "sync.snapshot":
        await handleSnapshot(message)
        return

      case "peer.heartbeat":
      case "peer.heartbeat-ack":
        return
    }
  }

  async function playAction(actionInput: Action): Promise<boolean> {
    const currentSession = sessionRef.current
    if (
      !currentSession
      || phaseRef.current !== "playing"
      || !connectedRef.current
      || pendingActionRef.current
      || actionPreparingRef.current
    ) return false

    const side = sideForPeerId(currentSession.peerId)
    if (!side || adapter.getCurrentSide(gameRef.current) !== side) return false

    let action: Action
    try {
      const parsed = adapter.parseAction(adapter.encodeAction(actionInput))
      if (!parsed) return false
      action = parsed
    } catch {
      return false
    }

    const initialGame = gameRef.current
    const baseRevision = revisionRef.current
    if (adapter.getRevision(initialGame) !== baseRevision) {
      setFailure("DESYNC")
      return false
    }
    const expectedRemotePeerId = remotePeerIdRef.current
    const epoch = sessionEpochRef.current
    const result = adapter.applyAction(initialGame, action, side)
    if (!result.ok) return false
    if (adapter.getRevision(result.state) !== baseRevision + 1) {
      setFailure("DESYNC")
      return false
    }

    actionPreparingRef.current = true
    try {
      const stateHash = await hashJson(adapter.encodeSnapshot(result.state))
      if (
        !isCurrentSession(currentSession, epoch)
        || phaseRef.current !== "playing"
        || !connectedRef.current
        || pendingActionRef.current
        || revisionRef.current !== baseRevision
        || gameRef.current !== initialGame
        || remotePeerIdRef.current !== expectedRemotePeerId
      ) return false

      const actionId = crypto.randomUUID()
      pendingActionRef.current = {
        actionId,
        baseRevision,
        action,
        state: result.state,
        stateHash,
      }
      persistSession()
      sendMessage("action.propose", {
        gameNumber: matchSeriesRef.current!.gameNumber,
        actionId,
        baseRevision,
        action: adapter.encodeAction(action),
      })
      persistSession()
      return true
    } catch {
      pendingActionRef.current = null
      persistSession()
      scheduleReconnect()
      return false
    } finally {
      actionPreparingRef.current = false
    }
  }

  function retryConnection() {
    const currentSession = sessionRef.current
    if (!currentSession) {
      setErrorCode(null)
      setPhase("idle")
      return
    }
    setErrorCode(null)
    setPhase("reconnecting")
    startSignalHeartbeat()
    void pollSignals()
    if (currentSession.role === "host") {
      if (shouldHostNegotiate(currentSession.role, remotePeerIdRef.current)) {
        void beginHostNegotiation(true)
      }
      else setPhase("waiting")
    } else startGuestRenegotiation()
  }

  function restartSignalPolling() {
    const expectedEpoch = sessionEpochRef.current
    pollAbortRef.current?.abort()
    window.setTimeout(() => {
      if (
        disposedRef.current
        || expectedEpoch !== sessionEpochRef.current
        || !sessionRef.current
        || phaseRef.current === "error"
      ) return
      void pollSignals()
    }, 0)
  }

  useEffect(() => {
    disposedRef.current = false
    const handleOnline = () => restartSignalPolling()
    const handleVisibilityChange = () => {
      if (!document.hidden) restartSignalPolling()
    }
    window.addEventListener("online", handleOnline)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    const restoreEpoch = sessionEpochRef.current
    const restoreTimer = window.setTimeout(() => {
      void (async () => {
        if (disposedRef.current || !supportsLanMultiplayer()) return

        let stored: RestoredLanTurnGameSession<State, Action> | null = null
        try {
          const raw = sessionStorage.getItem(adapter.sessionStorageKey)
          if (raw) stored = await parseStoredLanTurnGameSession(raw, adapter)
        } catch {
          stored = null
        }

        if (
          disposedRef.current
          || restoreEpoch !== sessionEpochRef.current
          || sessionRef.current
        ) return

        if (stored) {
          sessionEpochRef.current += 1
          matchIdRef.current = stored.matchId
          setCurrentSession(stored.session)
          setRemotePeer(stored.remotePeerId)
          setMatchSeries(stored.matchSeries)
          setLocalReady(stored.localReady)
          setRemoteReady(stored.remoteReady)
          setCurrentGame(stored.game)
          revisionRef.current = stored.revision
          setFirstPeer(stored.firstPeerId)
          settleCommittedGame(stored.game)
          diceRuntimeRef.current = stored.diceRuntime
            ? {
                ...stored.diceRuntime,
                resolving: false,
                commitInitializing: false,
              }
            : null
          setDiceView(stored.dice)
          pendingActionRef.current = stored.pendingAction
          acknowledgementCacheRef.current = stored.acknowledgements.slice(-128)
          syncConfirmedRef.current = false
          setPhase("reconnecting")
          startSignalHeartbeat()
          void pollSignals()
          clearPendingRoomRequest()
          if (stored.session.role === "host") {
            if (shouldHostNegotiate(stored.session.role, stored.remotePeerId)) {
              void beginHostNegotiation(true)
            }
            else setPhase("waiting")
          } else scheduleReconnect()
          persistSession()
        } else {
          clearPersistedSession()
        }
      })()
    }, 0)

    return () => {
      window.clearTimeout(restoreTimer)
      window.removeEventListener("online", handleOnline)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      disposedRef.current = true
      negotiatingRef.current = false
      negotiationOwnerRef.current = null
      stopBackgroundWork()
      closePeerConnection()
    }
    // The transport owns its lifecycle; refs keep callbacks current without rerunning this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const localSide = session && firstPeerId
    ? (session.peerId === firstPeerId ? adapter.firstSide : adapter.secondSide)
    : null
  const currentSide = adapter.getCurrentSide(game)
  const series = toLanMatchSeriesView(
    matchSeries,
    session?.peerId ?? null,
    remotePeerId,
    adapter.getOutcome(game),
    peerIdForSide,
  )

  return {
    phase,
    roomId: session?.roomId ?? "",
    role: session?.role ?? null,
    connected,
    localReady,
    remoteReady,
    localSide,
    currentSide,
    game,
    dice,
    series,
    errorCode,
    createRoom,
    joinRoom,
    markReady,
    playAction,
    requestRematch,
    leaveRoom,
    retryConnection,
  }
}
