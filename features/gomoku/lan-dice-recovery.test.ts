import { describe, expect, it } from "vitest"

import type { DiceRoundResult } from "@/features/multiplayer"
import {
  classifyHistoricalDiceResult,
  classifyHistoricalDiceResultAcknowledgement,
  diceRoundResultsMatch,
  isValidImmediatePreviousDiceResult,
} from "./lan-dice-recovery"

const playerIds = ["peer-a", "peer-b"] as const
const previousResult: DiceRoundResult = {
  round: 2,
  rolls: { "peer-a": 4, "peer-b": 4 },
  firstPlayerId: null,
  tied: true,
  proof: "a".repeat(64),
}

describe("LAN dice recovery", () => {
  it("accepts only an identical immediate previous finalized tie", () => {
    expect(isValidImmediatePreviousDiceResult(3, previousResult, playerIds)).toBe(true)
    expect(diceRoundResultsMatch(previousResult, { ...previousResult }, playerIds)).toBe(true)
    expect(classifyHistoricalDiceResult(
      3,
      previousResult,
      { ...previousResult },
      playerIds,
    )).toBe("match")

    expect(classifyHistoricalDiceResult(
      3,
      previousResult,
      { ...previousResult, proof: "b".repeat(64) },
      playerIds,
    )).toBe("conflict")
    expect(classifyHistoricalDiceResult(
      3,
      previousResult,
      { ...previousResult, rolls: { "peer-a": 3, "peer-b": 3 } },
      playerIds,
    )).toBe("conflict")
    expect(classifyHistoricalDiceResult(3, null, previousResult, playerIds)).toBe("conflict")
    expect(diceRoundResultsMatch(previousResult, {
      ...previousResult,
      rolls: { "peer-c": 4, "peer-d": 4 },
    }, playerIds)).toBe(false)
  })

  it("ignores ancient results but rejects an unproved immediate previous result", () => {
    const ancientResult = { ...previousResult, round: 1 }
    expect(classifyHistoricalDiceResult(3, previousResult, ancientResult, playerIds)).toBe("stale")

    const nonTie = {
      ...previousResult,
      rolls: { "peer-a": 6, "peer-b": 1 },
      tied: false,
      firstPlayerId: "peer-a",
    }
    expect(isValidImmediatePreviousDiceResult(3, nonTie, playerIds)).toBe(false)
  })

  it("matches previous acknowledgements by both round and proof", () => {
    expect(classifyHistoricalDiceResultAcknowledgement(
      3,
      previousResult,
      { round: 2, proof: previousResult.proof },
      playerIds,
    )).toBe("match")
    expect(classifyHistoricalDiceResultAcknowledgement(
      3,
      previousResult,
      { round: 2, proof: "b".repeat(64) },
      playerIds,
    )).toBe("conflict")
    expect(classifyHistoricalDiceResultAcknowledgement(
      3,
      null,
      { round: 2, proof: previousResult.proof },
      playerIds,
    )).toBe("conflict")
    expect(classifyHistoricalDiceResultAcknowledgement(
      3,
      previousResult,
      { round: 1, proof: previousResult.proof },
      playerIds,
    )).toBe("stale")
  })
})
