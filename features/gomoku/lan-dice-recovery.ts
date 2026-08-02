import type { DiceRoundResult } from "@/features/multiplayer"

export type HistoricalDiceMessageDisposition = "match" | "stale" | "conflict"

export function diceRoundResultsMatch(
  first: DiceRoundResult,
  second: DiceRoundResult,
  playerIds: readonly string[],
): boolean {
  return first.round === second.round
    && first.proof === second.proof
    && first.tied === second.tied
    && first.firstPlayerId === second.firstPlayerId
    && Object.keys(first.rolls).length === playerIds.length
    && Object.keys(second.rolls).length === playerIds.length
    && playerIds.every((peerId) => (
      Object.hasOwn(first.rolls, peerId)
      && Object.hasOwn(second.rolls, peerId)
      && first.rolls[peerId] === second.rolls[peerId]
    ))
}

export function isValidImmediatePreviousDiceResult(
  currentRound: number,
  result: DiceRoundResult | null,
  playerIds: readonly [string, string],
): boolean {
  if (
    !result
    || result.round !== currentRound - 1
    || !result.tied
    || result.firstPlayerId !== null
    || Object.keys(result.rolls).length !== playerIds.length
    || !playerIds.every((peerId) => Object.hasOwn(result.rolls, peerId))
  ) return false

  return result.rolls[playerIds[0]] === result.rolls[playerIds[1]]
}

export function classifyHistoricalDiceResult(
  currentRound: number,
  previousResult: DiceRoundResult | null,
  candidate: DiceRoundResult,
  playerIds: readonly [string, string],
): HistoricalDiceMessageDisposition {
  if (candidate.round < currentRound - 1) return "stale"
  if (
    candidate.round !== currentRound - 1
    || !isValidImmediatePreviousDiceResult(currentRound, previousResult, playerIds)
    || !previousResult
  ) return "conflict"

  return diceRoundResultsMatch(previousResult, candidate, playerIds)
    ? "match"
    : "conflict"
}

export function classifyHistoricalDiceResultAcknowledgement(
  currentRound: number,
  previousResult: DiceRoundResult | null,
  acknowledgement: { round: number; proof: string },
  playerIds: readonly [string, string],
): HistoricalDiceMessageDisposition {
  if (acknowledgement.round < currentRound - 1) return "stale"
  if (
    acknowledgement.round !== currentRound - 1
    || !isValidImmediatePreviousDiceResult(currentRound, previousResult, playerIds)
    || acknowledgement.proof !== previousResult?.proof
  ) return "conflict"

  return "match"
}
