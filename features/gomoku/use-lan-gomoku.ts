"use client"

import {
  GUEST_RENEGOTIATION_MAX_RETRIES,
  createGuestRenegotiationOperation,
  getGuestRenegotiationRetryDelay,
  getSignalPollDelay,
  openRoomWithSingleRetry,
  parseStoredLanTurnGameSession,
  recordGuestRenegotiationAttempt,
  shouldClearRoomSession,
  shouldHostNegotiate,
  shouldRetryGuestRenegotiation,
  shouldRetainPendingRoomRequest,
  useLanTurnGame,
  type GuestRenegotiationOperation,
  type LanTurnGameDiceView,
  type LanTurnGameErrorCode,
  type LanTurnGamePhase,
  type StoredLanTurnGameSession,
} from "../multiplayer/use-lan-turn-game"
import type { LanMatchSeriesView } from "../multiplayer/match-series"
import type { GomokuState, GomokuStone } from "./engine"
import {
  gomokuLanAdapter,
  type LanGomokuAction,
} from "./lan"

export {
  GUEST_RENEGOTIATION_MAX_RETRIES,
  createGuestRenegotiationOperation,
  getGuestRenegotiationRetryDelay,
  getSignalPollDelay,
  openRoomWithSingleRetry,
  recordGuestRenegotiationAttempt,
  shouldClearRoomSession,
  shouldHostNegotiate,
  shouldRetryGuestRenegotiation,
  shouldRetainPendingRoomRequest,
}

export type LanGomokuPhase = LanTurnGamePhase
export type LanGomokuErrorCode = LanTurnGameErrorCode
export type LanGomokuDiceView = LanTurnGameDiceView
export type StoredLanSession = StoredLanTurnGameSession
export type { GuestRenegotiationOperation }

export function parseStoredSession(value: string) {
  return parseStoredLanTurnGameSession(value, gomokuLanAdapter)
}

export interface UseLanGomokuResult {
  phase: LanGomokuPhase
  roomId: string
  role: "host" | "guest" | null
  connected: boolean
  localReady: boolean
  remoteReady: boolean
  localStone: GomokuStone | null
  game: GomokuState
  dice: LanGomokuDiceView | null
  series: LanMatchSeriesView
  errorCode: LanGomokuErrorCode | null
  createRoom: () => Promise<void>
  joinRoom: (roomId: string) => Promise<void>
  markReady: () => void
  placeStone: (row: number, col: number) => Promise<boolean>
  requestRematch: () => Promise<boolean>
  leaveRoom: () => void
  retryConnection: () => void
}

export function useLanGomoku(): UseLanGomokuResult {
  const lan = useLanTurnGame(gomokuLanAdapter)
  return {
    phase: lan.phase,
    roomId: lan.roomId,
    role: lan.role,
    connected: lan.connected,
    localReady: lan.localReady,
    remoteReady: lan.remoteReady,
    localStone: lan.localSide,
    game: lan.game,
    dice: lan.dice,
    series: lan.series,
    errorCode: lan.errorCode,
    createRoom: lan.createRoom,
    joinRoom: lan.joinRoom,
    markReady: lan.markReady,
    placeStone: (row, col) => lan.playAction({
      type: "place",
      row,
      col,
    } satisfies LanGomokuAction),
    requestRematch: lan.requestRematch,
    leaveRoom: lan.leaveRoom,
    retryConnection: lan.retryConnection,
  }
}
