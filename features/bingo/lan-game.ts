import { checkBingo } from "./card-rules"
import {
  cloneBingoCards,
  isBingoCard,
  type BingoCard,
} from "./cards"

export const BINGO_LAN_MAX_PLAYERS = 8
export const BINGO_LAN_MAX_CARDS = 4
export const BINGO_LAN_SETTLEMENT_MS = 3_000

export type BingoLanPhase = "lobby" | "playing" | "settling" | "finished"

export interface BingoLanPublicPlayer {
  playerId: string
  nickname: string
  ready: boolean
  connected: boolean
  cardCount: number
}

export interface BingoLanWinner {
  playerId: string
  nickname: string
  cardIds: string[]
}

export interface BingoLanPublicState {
  roomId: string
  phase: BingoLanPhase
  roundId: string
  drawRevision: number
  currentNumber: number | null
  drawnNumbers: number[]
  players: BingoLanPublicPlayer[]
  winners: BingoLanWinner[]
  settlementDeadline: number | null
}

export interface BingoLanHostPlayer extends BingoLanPublicPlayer {
  cards: BingoCard[]
}

export interface BingoLanHostState extends Omit<BingoLanPublicState, "players"> {
  players: BingoLanHostPlayer[]
}

export type BingoLanTransition =
  | { ok: true; state: BingoLanHostState }
  | {
      ok: false
      code:
        | "ROOM_LOCKED"
        | "ROOM_FULL"
        | "NICKNAME_TAKEN"
        | "PLAYER_NOT_FOUND"
        | "INVALID_CARDS"
        | "NOT_READY"
        | "INVALID_PHASE"
        | "INVALID_DRAW"
        | "INVALID_CLAIM"
      state: BingoLanHostState
    }

function accepted(state: BingoLanHostState): BingoLanTransition {
  return { ok: true, state }
}

function rejected(
  state: BingoLanHostState,
  code: Extract<BingoLanTransition, { ok: false }>["code"],
): BingoLanTransition {
  return { ok: false, code, state }
}

function normalizeNickname(nickname: string): string {
  return nickname.trim().replace(/\s+/gu, " ")
}

function nicknameKey(nickname: string): string {
  return normalizeNickname(nickname).toLocaleLowerCase()
}

function isValidNickname(nickname: string): boolean {
  const normalized = normalizeNickname(nickname)
  return normalized.length >= 1 && Array.from(normalized).length <= 16
}

function clonePlayer(player: BingoLanHostPlayer): BingoLanHostPlayer {
  return { ...player, cards: cloneBingoCards(player.cards) }
}

export function createBingoLanHostState(
  roomId: string,
  roundId: string,
): BingoLanHostState {
  return {
    roomId,
    phase: "lobby",
    roundId,
    drawRevision: 0,
    currentNumber: null,
    drawnNumbers: [],
    players: [],
    winners: [],
    settlementDeadline: null,
  }
}

export function connectBingoLanPlayer(
  state: BingoLanHostState,
  input: { playerId: string; nickname: string },
): BingoLanTransition {
  const nickname = normalizeNickname(input.nickname)
  if (!isValidNickname(nickname)) return rejected(state, "NICKNAME_TAKEN")

  const existingIndex = state.players.findIndex((player) => player.playerId === input.playerId)
  if (existingIndex >= 0) {
    const players = state.players.map((player, index) => (
      index === existingIndex ? { ...clonePlayer(player), connected: true } : clonePlayer(player)
    ))
    return accepted({ ...state, players })
  }

  if (state.phase !== "lobby") return rejected(state, "ROOM_LOCKED")
  if (state.players.length >= BINGO_LAN_MAX_PLAYERS) return rejected(state, "ROOM_FULL")
  if (state.players.some((player) => nicknameKey(player.nickname) === nicknameKey(nickname))) {
    return rejected(state, "NICKNAME_TAKEN")
  }

  return accepted({
    ...state,
    players: [
      ...state.players.map(clonePlayer),
      {
        playerId: input.playerId,
        nickname,
        connected: true,
        ready: false,
        cardCount: 0,
        cards: [],
      },
    ],
  })
}

export function disconnectBingoLanPlayer(
  state: BingoLanHostState,
  playerId: string,
  remove = false,
): BingoLanHostState {
  if (remove || state.phase === "lobby") {
    return {
      ...state,
      players: state.players.filter((player) => player.playerId !== playerId).map(clonePlayer),
    }
  }

  return {
    ...state,
    players: state.players.map((player) => (
      player.playerId === playerId
        ? { ...clonePlayer(player), connected: false }
        : clonePlayer(player)
    )),
  }
}

export function setBingoLanPlayerReady(
  state: BingoLanHostState,
  playerId: string,
  cards: readonly BingoCard[],
  ready: boolean,
): BingoLanTransition {
  if (state.phase !== "lobby") return rejected(state, "ROOM_LOCKED")
  const index = state.players.findIndex((player) => player.playerId === playerId)
  if (index < 0) return rejected(state, "PLAYER_NOT_FOUND")

  const uniqueIds = new Set(cards.map((card) => card.id))
  if (
    cards.length > BINGO_LAN_MAX_CARDS
    || uniqueIds.size !== cards.length
    || cards.some((card) => !isBingoCard(card))
    || (ready && cards.length === 0)
  ) {
    return rejected(state, "INVALID_CARDS")
  }

  const nextCards = cloneBingoCards(cards)
  return accepted({
    ...state,
    players: state.players.map((player, playerIndex) => (
      playerIndex === index
        ? {
            ...clonePlayer(player),
            cards: nextCards,
            cardCount: nextCards.length,
            ready,
          }
        : clonePlayer(player)
    )),
  })
}

export function canStartBingoLanGame(state: BingoLanHostState): boolean {
  return (
    state.phase === "lobby"
    && state.players.length > 0
    && state.players.length <= BINGO_LAN_MAX_PLAYERS
    && state.players.every((player) => (
      player.connected
      && player.ready
      && player.cards.length >= 1
      && player.cards.length <= BINGO_LAN_MAX_CARDS
    ))
  )
}

export function startBingoLanGame(state: BingoLanHostState): BingoLanTransition {
  if (state.phase !== "lobby") return rejected(state, "INVALID_PHASE")
  if (!canStartBingoLanGame(state)) return rejected(state, "NOT_READY")
  return accepted({ ...state, phase: "playing" })
}

export function drawBingoLanNumber(
  state: BingoLanHostState,
  number: number,
): BingoLanTransition {
  if (state.phase !== "playing") return rejected(state, "INVALID_PHASE")
  if (
    !Number.isInteger(number)
    || number < 1
    || number > 75
    || state.drawnNumbers.includes(number)
  ) {
    return rejected(state, "INVALID_DRAW")
  }

  return accepted({
    ...state,
    currentNumber: number,
    drawnNumbers: [...state.drawnNumbers, number],
    drawRevision: state.drawRevision + 1,
  })
}

export function submitBingoLanClaim(
  state: BingoLanHostState,
  claim: {
    playerId: string
    roundId: string
    drawRevision: number
    cardId: string
  },
  now = Date.now(),
): BingoLanTransition {
  if (state.phase !== "playing" && state.phase !== "settling") {
    return rejected(state, "INVALID_PHASE")
  }
  if (
    claim.roundId !== state.roundId
    || claim.drawRevision !== state.drawRevision
    || state.drawRevision <= 0
  ) {
    return rejected(state, "INVALID_CLAIM")
  }

  const player = state.players.find((candidate) => candidate.playerId === claim.playerId)
  const card = player?.cards.find((candidate) => candidate.id === claim.cardId)
  if (!player || !card || !checkBingo(card.numbers, new Set(state.drawnNumbers))) {
    return rejected(state, "INVALID_CLAIM")
  }

  const existingWinner = state.winners.find((winner) => winner.playerId === player.playerId)
  const winners = existingWinner
    ? state.winners.map((winner) => (
        winner.playerId === player.playerId && !winner.cardIds.includes(card.id)
          ? { ...winner, cardIds: [...winner.cardIds, card.id] }
          : { ...winner, cardIds: [...winner.cardIds] }
      ))
    : [
        ...state.winners.map((winner) => ({ ...winner, cardIds: [...winner.cardIds] })),
        { playerId: player.playerId, nickname: player.nickname, cardIds: [card.id] },
      ]

  return accepted({
    ...state,
    phase: "settling",
    settlementDeadline: state.settlementDeadline ?? now + BINGO_LAN_SETTLEMENT_MS,
    winners,
  })
}

export function finishBingoLanSettlement(
  state: BingoLanHostState,
  now = Date.now(),
): BingoLanTransition {
  if (state.phase !== "settling" || state.settlementDeadline === null) {
    return rejected(state, "INVALID_PHASE")
  }
  if (now < state.settlementDeadline) return rejected(state, "INVALID_PHASE")
  return accepted({ ...state, phase: "finished", settlementDeadline: null })
}

export function resetBingoLanRound(
  state: BingoLanHostState,
  roundId: string,
): BingoLanHostState {
  return {
    ...state,
    phase: "lobby",
    roundId,
    drawRevision: 0,
    currentNumber: null,
    drawnNumbers: [],
    winners: [],
    settlementDeadline: null,
    players: state.players.map((player) => ({
      ...clonePlayer(player),
      ready: false,
    })),
  }
}

export function toBingoLanPublicState(state: BingoLanHostState): BingoLanPublicState {
  return {
    roomId: state.roomId,
    phase: state.phase,
    roundId: state.roundId,
    drawRevision: state.drawRevision,
    currentNumber: state.currentNumber,
    drawnNumbers: [...state.drawnNumbers],
    players: state.players.map(({ playerId, nickname, ready, connected, cardCount }) => ({
      playerId,
      nickname,
      ready,
      connected,
      cardCount,
    })),
    winners: state.winners.map((winner) => ({ ...winner, cardIds: [...winner.cardIds] })),
    settlementDeadline: state.settlementDeadline,
  }
}
