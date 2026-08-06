export type LanMatchOutcome<Side extends string> =
  | { status: "playing" }
  | { status: "draw" }
  | { status: "won"; winner: Side }

export interface LanMatchAdvance {
  advanceId: string
  fromGameNumber: number
  toGameNumber: number
  terminalRevision: number
  terminalStateHash: string
  winsByPeerId: Record<string, number>
  draws: number
  requestedBy: [string, string]
}

export interface LanMatchSeriesState {
  gameNumber: number
  settledGameNumber: number
  winsByPeerId: Record<string, number>
  draws: number
  rematchRequestedGameByPeerId: Record<string, number>
  pendingAdvance: LanMatchAdvance | null
  lastAdvance: LanMatchAdvance | null
}

export interface LanMatchSeriesView {
  gameNumber: number
  localWins: number
  remoteWins: number
  draws: number
  outcome: "playing" | "local-win" | "remote-win" | "draw"
  localRematchReady: boolean
  remoteRematchReady: boolean
  canRequestRematch: boolean
}

const PEER_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/u
const DIGEST_PATTERN = /^[a-f\d]{64}$/iu
const ADVANCE_ID_MAX_LENGTH = 128
const MAX_SERIES_GAMES = 100_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value)
    && Number(value) >= 0
    && Number(value) <= MAX_SERIES_GAMES
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
): boolean {
  const keys = Object.keys(value)
  return keys.length === required.length
    && required.every((key) => Object.hasOwn(value, key))
}

function sortedPlayers(players: readonly [string, string]): [string, string] {
  return [...players].sort((left, right) => left.localeCompare(right)) as [string, string]
}

function samePlayers(
  candidate: readonly string[],
  players: readonly [string, string],
): boolean {
  if (candidate.length !== 2 || new Set(candidate).size !== 2) return false
  const expected = sortedPlayers(players)
  const actual = [...candidate].sort((left, right) => left.localeCompare(right))
  return actual[0] === expected[0] && actual[1] === expected[1]
}

function isPeerCountRecord(
  value: unknown,
  players?: readonly [string, string],
): value is Record<string, number> {
  if (!isRecord(value)) return false
  const entries = Object.entries(value)
  if (entries.length !== 2) return false
  if (entries.some(([peerId, count]) => !PEER_ID_PATTERN.test(peerId) || !isCount(count))) {
    return false
  }
  return !players || samePlayers(entries.map(([peerId]) => peerId), players)
}

export function isLanMatchAdvance(
  value: unknown,
  players?: readonly [string, string],
): value is LanMatchAdvance {
  if (!isRecord(value) || !hasExactKeys(value, [
    "advanceId",
    "fromGameNumber",
    "toGameNumber",
    "terminalRevision",
    "terminalStateHash",
    "winsByPeerId",
    "draws",
    "requestedBy",
  ])) return false

  if (
    typeof value.advanceId !== "string"
    || value.advanceId.length === 0
    || value.advanceId.length > ADVANCE_ID_MAX_LENGTH
    || !isCount(value.fromGameNumber)
    || Number(value.fromGameNumber) < 1
    || value.toGameNumber !== Number(value.fromGameNumber) + 1
    || !isCount(value.terminalRevision)
    || typeof value.terminalStateHash !== "string"
    || !DIGEST_PATTERN.test(value.terminalStateHash)
    || !isPeerCountRecord(value.winsByPeerId, players)
    || !isCount(value.draws)
    || !Array.isArray(value.requestedBy)
    || !value.requestedBy.every((peerId) => typeof peerId === "string")
  ) return false

  const advancePlayers = Object.keys(value.winsByPeerId) as [string, string]
  const settledGames = Object.values(value.winsByPeerId)
    .reduce((total, count) => total + count, 0) + Number(value.draws)
  return settledGames === Number(value.fromGameNumber)
    && samePlayers(value.requestedBy, players ?? advancePlayers)
}

export function isLanMatchSeriesState(
  value: unknown,
  players?: readonly [string, string],
): value is LanMatchSeriesState {
  if (!isRecord(value) || !hasExactKeys(value, [
    "gameNumber",
    "settledGameNumber",
    "winsByPeerId",
    "draws",
    "rematchRequestedGameByPeerId",
    "pendingAdvance",
    "lastAdvance",
  ])) return false
  if (
    !isCount(value.gameNumber)
    || Number(value.gameNumber) < 1
    || !isCount(value.settledGameNumber)
    || (
      Number(value.settledGameNumber) !== Number(value.gameNumber) - 1
      && Number(value.settledGameNumber) !== Number(value.gameNumber)
    )
    || !isPeerCountRecord(value.winsByPeerId, players)
    || !isCount(value.draws)
    || !isPeerCountRecord(value.rematchRequestedGameByPeerId, players)
  ) return false

  const state = value as unknown as LanMatchSeriesState
  const inferredPlayers = Object.keys(state.winsByPeerId) as [string, string]
  const activePlayers = players ?? inferredPlayers
  if (!samePlayers(Object.keys(state.rematchRequestedGameByPeerId), activePlayers)) return false

  const wins = Object.values(state.winsByPeerId).reduce((total, count) => total + count, 0)
  if (wins + state.draws !== state.settledGameNumber) return false
  if (Object.values(state.rematchRequestedGameByPeerId).some(
    (gameNumber) => gameNumber > state.settledGameNumber,
  )) return false

  if (state.pendingAdvance !== null) {
    if (!isLanMatchAdvance(state.pendingAdvance, activePlayers)) return false
    if (
      state.pendingAdvance.fromGameNumber !== state.gameNumber
      || state.pendingAdvance.toGameNumber !== state.gameNumber + 1
      || state.settledGameNumber !== state.gameNumber
      || !sameScore(state, state.pendingAdvance)
      || activePlayers.some(
        (peerId) => state.rematchRequestedGameByPeerId[peerId] < state.gameNumber,
      )
    ) return false
  }

  if (state.lastAdvance !== null) {
    if (!isLanMatchAdvance(state.lastAdvance, activePlayers)) return false
    if (
      state.lastAdvance.toGameNumber !== state.gameNumber
      || state.lastAdvance.fromGameNumber !== state.gameNumber - 1
      || state.settledGameNumber < state.lastAdvance.fromGameNumber
      || (
        state.settledGameNumber === state.gameNumber - 1
          ? !sameScore(state, state.lastAdvance)
          : !scoreAddsExactlyOneResult(state, state.lastAdvance)
      )
    ) return false
  } else if (state.gameNumber !== 1) {
    return false
  }

  return state.pendingAdvance === null || state.lastAdvance === null
    || state.pendingAdvance.advanceId !== state.lastAdvance.advanceId
}

export function createLanMatchSeries(
  players: readonly [string, string],
): LanMatchSeriesState {
  const [first, second] = players
  return {
    gameNumber: 1,
    settledGameNumber: 0,
    winsByPeerId: { [first]: 0, [second]: 0 },
    draws: 0,
    rematchRequestedGameByPeerId: { [first]: 0, [second]: 0 },
    pendingAdvance: null,
    lastAdvance: null,
  }
}

export function settleLanMatchSeries<Side extends string>(
  series: LanMatchSeriesState,
  outcome: LanMatchOutcome<Side>,
  peerForSide: (side: Side) => string | null,
): LanMatchSeriesState {
  if (outcome.status === "playing" || series.settledGameNumber === series.gameNumber) {
    return series
  }
  if (series.settledGameNumber !== series.gameNumber - 1) return series

  if (outcome.status === "draw") {
    return {
      ...series,
      settledGameNumber: series.gameNumber,
      draws: series.draws + 1,
    }
  }

  const winnerPeerId = peerForSide(outcome.winner)
  if (!winnerPeerId || !Object.hasOwn(series.winsByPeerId, winnerPeerId)) return series
  return {
    ...series,
    settledGameNumber: series.gameNumber,
    winsByPeerId: {
      ...series.winsByPeerId,
      [winnerPeerId]: series.winsByPeerId[winnerPeerId] + 1,
    },
  }
}

export function requestLanMatchRematch(
  series: LanMatchSeriesState,
  peerId: string,
): LanMatchSeriesState {
  if (
    series.settledGameNumber !== series.gameNumber
    || !Object.hasOwn(series.rematchRequestedGameByPeerId, peerId)
    || series.rematchRequestedGameByPeerId[peerId] >= series.gameNumber
  ) return series

  return {
    ...series,
    rematchRequestedGameByPeerId: {
      ...series.rematchRequestedGameByPeerId,
      [peerId]: series.gameNumber,
    },
  }
}

export function bothPlayersRequestedRematch(
  series: LanMatchSeriesState,
  players: readonly [string, string],
): boolean {
  return series.settledGameNumber === series.gameNumber
    && players.every(
      (peerId) => series.rematchRequestedGameByPeerId[peerId] >= series.gameNumber,
    )
}

export function createLanMatchAdvance(
  series: LanMatchSeriesState,
  players: readonly [string, string],
  terminalRevision: number,
  terminalStateHash: string,
  advanceId: string,
): LanMatchAdvance | null {
  if (
    series.pendingAdvance
    || !bothPlayersRequestedRematch(series, players)
    || !Number.isSafeInteger(terminalRevision)
    || terminalRevision < 0
    || !DIGEST_PATTERN.test(terminalStateHash)
  ) return null

  return {
    advanceId,
    fromGameNumber: series.gameNumber,
    toGameNumber: series.gameNumber + 1,
    terminalRevision,
    terminalStateHash: terminalStateHash.toLowerCase(),
    winsByPeerId: { ...series.winsByPeerId },
    draws: series.draws,
    requestedBy: sortedPlayers(players),
  }
}

export function withPendingLanMatchAdvance(
  series: LanMatchSeriesState,
  advance: LanMatchAdvance,
): LanMatchSeriesState | null {
  const players = Object.keys(series.winsByPeerId) as [string, string]
  if (!isLanMatchAdvance(advance, players)) return null
  if (
    advance.fromGameNumber !== series.gameNumber
    || advance.toGameNumber !== series.gameNumber + 1
    || !sameScore(series, advance)
    || !bothPlayersRequestedRematch(series, players)
  ) return null
  return { ...series, pendingAdvance: advance }
}

export function applyLanMatchAdvance(
  series: LanMatchSeriesState,
  advance: LanMatchAdvance,
): LanMatchSeriesState | null {
  const players = Object.keys(series.winsByPeerId) as [string, string]
  if (!isLanMatchAdvance(advance, players)) return null
  if (
    advance.fromGameNumber !== series.gameNumber
    || advance.toGameNumber !== series.gameNumber + 1
    || series.settledGameNumber !== series.gameNumber
    || !sameScore(series, advance)
    || !bothPlayersRequestedRematch(series, players)
  ) return null

  return {
    ...series,
    gameNumber: advance.toGameNumber,
    pendingAdvance: null,
    lastAdvance: advance,
  }
}

export function mergeLanMatchRematchRequests(
  local: LanMatchSeriesState,
  remote: LanMatchSeriesState,
): LanMatchSeriesState | null {
  if (
    local.gameNumber !== remote.gameNumber
    || local.settledGameNumber !== remote.settledGameNumber
    || !sameScore(local, remote)
    || !sameAdvance(local.lastAdvance, remote.lastAdvance)
  ) return null

  const players = Object.keys(local.winsByPeerId)
  if (!samePlayers(Object.keys(remote.winsByPeerId), players as [string, string])) return null
  const requests = Object.fromEntries(players.map((peerId) => [
    peerId,
    Math.max(
      local.rematchRequestedGameByPeerId[peerId] ?? 0,
      remote.rematchRequestedGameByPeerId[peerId] ?? 0,
    ),
  ]))

  if (sameLanMatchRematchRequests(local, { rematchRequestedGameByPeerId: requests })) {
    return local
  }

  return {
    ...local,
    rematchRequestedGameByPeerId: requests,
  }
}

export function sameLanMatchRematchRequests(
  left: Pick<LanMatchSeriesState, "rematchRequestedGameByPeerId">,
  right: Pick<LanMatchSeriesState, "rematchRequestedGameByPeerId">,
): boolean {
  const leftPlayers = Object.keys(left.rematchRequestedGameByPeerId)
  const rightPlayers = Object.keys(right.rematchRequestedGameByPeerId)
  return leftPlayers.length === rightPlayers.length
    && leftPlayers.every(
      (peerId) => left.rematchRequestedGameByPeerId[peerId]
        === right.rematchRequestedGameByPeerId[peerId],
    )
}

export function isLanMatchSettlementAhead(
  settled: LanMatchSeriesState,
  unsettled: LanMatchSeriesState,
): boolean {
  if (
    settled.gameNumber !== unsettled.gameNumber
    || settled.settledGameNumber !== settled.gameNumber
    || unsettled.settledGameNumber !== unsettled.gameNumber - 1
    || !sameAdvance(settled.lastAdvance, unsettled.lastAdvance)
  ) return false

  const settledPlayers = Object.keys(settled.winsByPeerId)
  if (!samePlayers(
    Object.keys(unsettled.winsByPeerId),
    settledPlayers as [string, string],
  )) return false

  return scoreAddsExactlyOneResult(settled, unsettled)
}

export function toLanMatchSeriesView<Side extends string>(
  series: LanMatchSeriesState | null,
  localPeerId: string | null,
  remotePeerId: string | null,
  outcome: LanMatchOutcome<Side>,
  peerForSide: (side: Side) => string | null,
): LanMatchSeriesView {
  const localWins = localPeerId && series?.winsByPeerId[localPeerId] || 0
  const remoteWins = remotePeerId && series?.winsByPeerId[remotePeerId] || 0
  let result: LanMatchSeriesView["outcome"] = "playing"
  if (outcome.status === "draw") result = "draw"
  if (outcome.status === "won") {
    result = peerForSide(outcome.winner) === localPeerId ? "local-win" : "remote-win"
  }

  const gameNumber = series?.gameNumber ?? 1
  const isFinished = series?.settledGameNumber === gameNumber
  return {
    gameNumber,
    localWins,
    remoteWins,
    draws: series?.draws ?? 0,
    outcome: result,
    localRematchReady: Boolean(
      localPeerId && series
      && series.rematchRequestedGameByPeerId[localPeerId] >= gameNumber,
    ),
    remoteRematchReady: Boolean(
      remotePeerId && series
      && series.rematchRequestedGameByPeerId[remotePeerId] >= gameNumber,
    ),
    canRequestRematch: Boolean(isFinished && localPeerId && remotePeerId),
  }
}

export function sameScore(
  left: Pick<LanMatchSeriesState, "winsByPeerId" | "draws">,
  right: Pick<LanMatchSeriesState, "winsByPeerId" | "draws">,
): boolean {
  const leftPlayers = Object.keys(left.winsByPeerId)
  const rightPlayers = Object.keys(right.winsByPeerId)
  return left.draws === right.draws
    && leftPlayers.length === rightPlayers.length
    && leftPlayers.every(
      (peerId) => left.winsByPeerId[peerId] === right.winsByPeerId[peerId],
    )
}

function sameAdvance(
  left: LanMatchAdvance | null,
  right: LanMatchAdvance | null,
): boolean {
  if (!left || !right) return left === right
  return JSON.stringify(left) === JSON.stringify(right)
}

function scoreAddsExactlyOneResult(
  current: Pick<LanMatchSeriesState, "winsByPeerId" | "draws">,
  previous: Pick<LanMatchAdvance, "winsByPeerId" | "draws">,
): boolean {
  const players = Object.keys(previous.winsByPeerId)
  if (
    current.draws < previous.draws
    || players.some(
      (peerId) => (current.winsByPeerId[peerId] ?? -1) < previous.winsByPeerId[peerId],
    )
  ) return false
  const currentTotal = Object.values(current.winsByPeerId)
    .reduce((total, wins) => total + wins, 0) + current.draws
  const previousTotal = Object.values(previous.winsByPeerId)
    .reduce((total, wins) => total + wins, 0) + previous.draws
  return currentTotal === previousTotal + 1
}
