import type { DiceRoundResult } from "./dice"

export const PROCESSED_ROOM_MESSAGE_LIMIT = 512

export type RoomPhase =
  | "lobby"
  | "dice-commit"
  | "dice-reveal"
  | "playing"
  | "paused"
  | "finished"
  | "desynced"

export type RoomPlayerRole = "host" | "guest"

export type RoomPlayer = {
  id: string
  role: RoomPlayerRole
  ready: boolean
  connected: boolean
}

export type RoomDiceState = {
  round: number
  commitments: Record<string, string>
  reveals: Record<string, string>
  rolls: Record<string, number>
  firstPlayerId: string | null
}

export type MultiplayerRoomState = {
  roomId: string
  matchId: string
  gameId: string
  engineVersion: string
  phase: RoomPhase
  resumePhase: Exclude<RoomPhase, "paused"> | null
  coordinatorId: string
  coordinatorEpoch: number
  players: Record<string, RoomPlayer>
  dice: RoomDiceState
  revision: number
  gameStateHash: string
  processedMessageIds: string[]
}

type RoomEventBase = { messageId: string }

export type MultiplayerRoomEvent =
  | (RoomEventBase & { type: "PLAYER_JOINED"; player: RoomPlayer })
  | (RoomEventBase & { type: "PLAYER_CONNECTION_CHANGED"; playerId: string; connected: boolean })
  | (RoomEventBase & { type: "PLAYER_READY_CHANGED"; playerId: string; ready: boolean })
  | (RoomEventBase & { type: "ROOM_RESUMED" })
  | (RoomEventBase & { type: "COORDINATOR_CHANGED"; coordinatorId: string; epoch: number })
  | (RoomEventBase & { type: "DICE_COMMITTED"; playerId: string; round: number; commitment: string })
  | (RoomEventBase & { type: "DICE_REVEALED"; playerId: string; round: number; nonce: string })
  | (RoomEventBase & { type: "DICE_RESOLVED"; result: DiceRoundResult })
  | (RoomEventBase & {
      type: "ACTION_COMMITTED"
      baseRevision: number
      nextRevision: number
      nextStateHash: string
    })
  | (RoomEventBase & { type: "GAME_FINISHED" })
  | (RoomEventBase & { type: "DESYNC_DETECTED" })

export type RoomTransitionErrorCode =
  | "DUPLICATE_MESSAGE"
  | "INVALID_PHASE"
  | "UNKNOWN_PLAYER"
  | "ROOM_FULL"
  | "ROUND_MISMATCH"
  | "DICE_VALUE_CONFLICT"
  | "INVALID_DICE_RESULT"
  | "REVISION_MISMATCH"
  | "STALE_COORDINATOR_EPOCH"

export type RoomTransition = {
  state: MultiplayerRoomState
  accepted: boolean
  error?: RoomTransitionErrorCode
}

export type CreateRoomStateInput = {
  roomId: string
  matchId: string
  gameId: string
  engineVersion: string
  coordinatorId: string
  players?: readonly RoomPlayer[]
  gameStateHash?: string
}

export function createMultiplayerRoomState(
  input: CreateRoomStateInput,
): MultiplayerRoomState {
  const players = Object.fromEntries((input.players ?? []).map((player) => [player.id, player]))
  if (Object.keys(players).length > 2) throw new RangeError("A room supports two players")

  return {
    roomId: input.roomId,
    matchId: input.matchId,
    gameId: input.gameId,
    engineVersion: input.engineVersion,
    phase: "lobby",
    resumePhase: null,
    coordinatorId: input.coordinatorId,
    coordinatorEpoch: 0,
    players,
    dice: {
      round: 1,
      commitments: {},
      reveals: {},
      rolls: {},
      firstPlayerId: null,
    },
    revision: 0,
    gameStateHash: input.gameStateHash ?? "",
    processedMessageIds: [],
  }
}

function reject(
  state: MultiplayerRoomState,
  error: RoomTransitionErrorCode,
): RoomTransition {
  return { state, accepted: false, error }
}

function rememberMessage(state: MultiplayerRoomState, messageId: string): MultiplayerRoomState {
  const processedMessageIds = [...state.processedMessageIds, messageId]
  if (processedMessageIds.length > PROCESSED_ROOM_MESSAGE_LIMIT) {
    processedMessageIds.splice(0, processedMessageIds.length - PROCESSED_ROOM_MESSAGE_LIMIT)
  }
  return { ...state, processedMessageIds }
}

function accept(state: MultiplayerRoomState, event: MultiplayerRoomEvent): RoomTransition {
  return { state: rememberMessage(state, event.messageId), accepted: true }
}

function allPlayersReady(state: MultiplayerRoomState): boolean {
  const players = Object.values(state.players)
  return players.length === 2 && players.every((player) => player.ready && player.connected)
}

function bothPlayersRecorded(values: Record<string, string>, state: MultiplayerRoomState): boolean {
  const playerIds = Object.keys(state.players)
  return playerIds.length === 2 && playerIds.every((playerId) => Boolean(values[playerId]))
}

export function reduceMultiplayerRoom(
  state: MultiplayerRoomState,
  event: MultiplayerRoomEvent,
): RoomTransition {
  if (state.processedMessageIds.includes(event.messageId)) {
    return reject(state, "DUPLICATE_MESSAGE")
  }

  switch (event.type) {
    case "PLAYER_JOINED": {
      if (state.phase !== "lobby") return reject(state, "INVALID_PHASE")
      if (state.players[event.player.id]) return accept(state, event)
      if (Object.keys(state.players).length >= 2) return reject(state, "ROOM_FULL")
      return accept({ ...state, players: { ...state.players, [event.player.id]: event.player } }, event)
    }

    case "PLAYER_CONNECTION_CHANGED": {
      const player = state.players[event.playerId]
      if (!player) return reject(state, "UNKNOWN_PLAYER")

      const players = {
        ...state.players,
        [event.playerId]: { ...player, connected: event.connected },
      }
      if (!event.connected && state.phase !== "lobby" && state.phase !== "finished") {
        const resumePhase = state.phase === "paused" ? state.resumePhase : state.phase
        return accept({ ...state, players, phase: "paused", resumePhase }, event)
      }
      return accept({ ...state, players }, event)
    }

    case "PLAYER_READY_CHANGED": {
      if (state.phase !== "lobby") return reject(state, "INVALID_PHASE")
      const player = state.players[event.playerId]
      if (!player) return reject(state, "UNKNOWN_PLAYER")

      const nextState = {
        ...state,
        players: {
          ...state.players,
          [event.playerId]: { ...player, ready: event.ready },
        },
      }
      return accept(
        allPlayersReady(nextState) ? { ...nextState, phase: "dice-commit" } : nextState,
        event,
      )
    }

    case "ROOM_RESUMED": {
      if (state.phase !== "paused" || !state.resumePhase) return reject(state, "INVALID_PHASE")
      if (!Object.values(state.players).every((player) => player.connected)) {
        return reject(state, "INVALID_PHASE")
      }
      return accept({ ...state, phase: state.resumePhase, resumePhase: null }, event)
    }

    case "COORDINATOR_CHANGED": {
      if (!state.players[event.coordinatorId]) return reject(state, "UNKNOWN_PLAYER")
      if (event.epoch <= state.coordinatorEpoch) return reject(state, "STALE_COORDINATOR_EPOCH")
      return accept({
        ...state,
        coordinatorId: event.coordinatorId,
        coordinatorEpoch: event.epoch,
      }, event)
    }

    case "DICE_COMMITTED": {
      if (state.phase !== "dice-commit") return reject(state, "INVALID_PHASE")
      if (!state.players[event.playerId]) return reject(state, "UNKNOWN_PLAYER")
      if (event.round !== state.dice.round) return reject(state, "ROUND_MISMATCH")
      const existingCommitment = state.dice.commitments[event.playerId]
      if (existingCommitment && existingCommitment !== event.commitment) {
        return reject(state, "DICE_VALUE_CONFLICT")
      }

      const commitments = { ...state.dice.commitments, [event.playerId]: event.commitment }
      const nextState = {
        ...state,
        phase: bothPlayersRecorded(commitments, state) ? "dice-reveal" as const : state.phase,
        dice: { ...state.dice, commitments },
      }
      return accept(nextState, event)
    }

    case "DICE_REVEALED": {
      if (state.phase !== "dice-reveal") return reject(state, "INVALID_PHASE")
      if (!state.players[event.playerId]) return reject(state, "UNKNOWN_PLAYER")
      if (event.round !== state.dice.round) return reject(state, "ROUND_MISMATCH")
      const existingReveal = state.dice.reveals[event.playerId]
      if (existingReveal && existingReveal !== event.nonce) {
        return reject(state, "DICE_VALUE_CONFLICT")
      }
      return accept({
        ...state,
        dice: {
          ...state.dice,
          reveals: { ...state.dice.reveals, [event.playerId]: event.nonce },
        },
      }, event)
    }

    case "DICE_RESOLVED": {
      if (state.phase !== "dice-reveal") return reject(state, "INVALID_PHASE")
      if (event.result.round !== state.dice.round) return reject(state, "ROUND_MISMATCH")
      if (!bothPlayersRecorded(state.dice.reveals, state)) return reject(state, "INVALID_PHASE")

      const playerIds = Object.keys(state.players)
      const hasValidRolls = playerIds.every((playerId) => {
        const roll = event.result.rolls[playerId]
        return Number.isInteger(roll) && roll >= 1 && roll <= 6
      })
      const [firstRoll, secondRoll] = playerIds.map((playerId) => event.result.rolls[playerId])
      const isValidTie = event.result.tied
        && event.result.firstPlayerId === null
        && firstRoll === secondRoll
      const isValidWinner = !event.result.tied
        && event.result.firstPlayerId !== null
        && firstRoll !== secondRoll
        && event.result.firstPlayerId === (
          firstRoll > secondRoll ? playerIds[0] : playerIds[1]
        )
      if (!hasValidRolls || (!isValidTie && !isValidWinner)) {
        return reject(state, "INVALID_DICE_RESULT")
      }

      if (event.result.tied) {
        return accept({
          ...state,
          phase: "dice-commit",
          dice: {
            round: state.dice.round + 1,
            commitments: {},
            reveals: {},
            rolls: event.result.rolls,
            firstPlayerId: null,
          },
        }, event)
      }

      if (!event.result.firstPlayerId || !state.players[event.result.firstPlayerId]) {
        return reject(state, "UNKNOWN_PLAYER")
      }
      return accept({
        ...state,
        phase: "playing",
        dice: {
          ...state.dice,
          rolls: event.result.rolls,
          firstPlayerId: event.result.firstPlayerId,
        },
      }, event)
    }

    case "ACTION_COMMITTED": {
      if (state.phase !== "playing") return reject(state, "INVALID_PHASE")
      if (
        event.baseRevision !== state.revision
        || event.nextRevision !== state.revision + 1
      ) {
        return reject(state, "REVISION_MISMATCH")
      }
      return accept({
        ...state,
        revision: event.nextRevision,
        gameStateHash: event.nextStateHash,
      }, event)
    }

    case "GAME_FINISHED":
      if (state.phase !== "playing") return reject(state, "INVALID_PHASE")
      return accept({ ...state, phase: "finished" }, event)

    case "DESYNC_DETECTED":
      return accept({ ...state, phase: "desynced", resumePhase: null }, event)
  }
}
