import { describe, expect, it } from "vitest"
import { bytesToBase64Url, webMultiplayerCrypto, type MultiplayerCrypto } from "./crypto"
import {
  createDiceCommit,
  nextDiceRound,
  resolveDiceRound,
  verifyDiceReveal,
  type DiceRoundContext,
} from "./dice"

const context: DiceRoundContext = {
  roomId: "ROOM01",
  matchId: "match-1",
  round: 1,
  playerIds: ["peer-a", "peer-b"],
}

function cryptoWithNonce(byte: number): MultiplayerCrypto {
  return {
    randomBytes: (length) => new Uint8Array(length).fill(byte),
    sha256: webMultiplayerCrypto.sha256,
  }
}

describe("commit-reveal dice", () => {
  it("creates and verifies a commitment without exposing a reusable roll", async () => {
    const commit = await createDiceCommit(context, "peer-a", cryptoWithNonce(7))

    expect(commit.nonce).toBe(bytesToBase64Url(new Uint8Array(32).fill(7)))
    expect(commit.commitment).toMatch(/^[a-f\d]{64}$/u)
    await expect(verifyDiceReveal(
      context,
      "peer-a",
      commit.nonce,
      commit.commitment,
    )).resolves.toBe(true)
    await expect(verifyDiceReveal(
      context,
      "peer-a",
      bytesToBase64Url(new Uint8Array(32).fill(8)),
      commit.commitment,
    )).resolves.toBe(false)
  })

  it("derives the same result regardless of player input order", async () => {
    const nonceA = bytesToBase64Url(new Uint8Array(32).fill(1))
    const nonceB = bytesToBase64Url(new Uint8Array(32).fill(2))

    const result = await resolveDiceRound(context, {
      "peer-b": nonceB,
      "peer-a": nonceA,
    })
    const reversedContext = { ...context, playerIds: ["peer-b", "peer-a"] as const }
    const reversed = await resolveDiceRound(reversedContext, {
      "peer-a": nonceA,
      "peer-b": nonceB,
    })

    expect(reversed).toEqual(result)
    expect(Object.values(result.rolls).every((roll) => roll >= 1 && roll <= 6)).toBe(true)
  })

  it("marks ties and requires a fresh incremented round", async () => {
    const tieCrypto: Pick<MultiplayerCrypto, "sha256"> = {
      sha256: async () => new Uint8Array(32),
    }
    const nonce = bytesToBase64Url(new Uint8Array(32).fill(4))
    const result = await resolveDiceRound(context, {
      "peer-a": nonce,
      "peer-b": nonce,
    }, tieCrypto)

    expect(result.tied).toBe(true)
    expect(result.firstPlayerId).toBeNull()
    expect(nextDiceRound(context)).toEqual({ ...context, round: 2 })
  })
})
