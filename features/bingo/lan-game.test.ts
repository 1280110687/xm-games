import { describe, expect, it } from "vitest"

import { createBingoCard, type BingoCard } from "./cards"
import {
  BINGO_LAN_MAX_PLAYERS,
  BINGO_LAN_SETTLEMENT_MS,
  canStartBingoLanGame,
  connectBingoLanPlayer,
  createBingoLanHostState,
  drawBingoLanNumber,
  finishBingoLanSettlement,
  resetBingoLanRound,
  setBingoLanPlayerReady,
  startBingoLanGame,
  submitBingoLanClaim,
} from "./lan-game"

function connectPlayer(
  state: ReturnType<typeof createBingoLanHostState>,
  playerId: string,
  nickname = playerId,
) {
  const result = connectBingoLanPlayer(state, { playerId, nickname })
  if (!result.ok) throw new Error(result.code)
  return result.state
}

function readyPlayer(
  state: ReturnType<typeof createBingoLanHostState>,
  playerId: string,
  cards: BingoCard[] = [createBingoCard(`${playerId} card`)],
) {
  const result = setBingoLanPlayerReady(state, playerId, cards, true)
  if (!result.ok) throw new Error(result.code)
  return result.state
}

describe("Bingo LAN lobby", () => {
  it("requires every connected player to own a card and be ready", () => {
    let state = createBingoLanHostState("123456", "round-1")
    state = connectPlayer(state, "player-1", "Alice")

    expect(canStartBingoLanGame(state)).toBe(false)
    expect(setBingoLanPlayerReady(state, "player-1", [], true)).toMatchObject({
      ok: false,
      code: "INVALID_CARDS",
    })

    state = readyPlayer(state, "player-1")
    expect(canStartBingoLanGame(state)).toBe(true)
  })

  it("enforces unique nicknames and the eight-player limit", () => {
    let state = createBingoLanHostState("123456", "round-1")
    state = connectPlayer(state, "player-1", "Alice")

    expect(connectBingoLanPlayer(state, {
      playerId: "player-2",
      nickname: " alice ",
    })).toMatchObject({ ok: false, code: "NICKNAME_TAKEN" })

    for (let index = 2; index <= BINGO_LAN_MAX_PLAYERS; index++) {
      state = connectPlayer(state, `player-${index}`)
    }

    expect(connectBingoLanPlayer(state, {
      playerId: "player-9",
      nickname: "Player 9",
    })).toMatchObject({ ok: false, code: "ROOM_FULL" })
  })

  it("locks new players and card changes after the caller starts", () => {
    let state = createBingoLanHostState("123456", "round-1")
    state = readyPlayer(connectPlayer(state, "player-1"), "player-1")
    const started = startBingoLanGame(state)
    if (!started.ok) throw new Error(started.code)

    expect(connectBingoLanPlayer(started.state, {
      playerId: "player-2",
      nickname: "Player 2",
    })).toMatchObject({ ok: false, code: "ROOM_LOCKED" })
    expect(setBingoLanPlayerReady(
      started.state,
      "player-1",
      [createBingoCard("replacement")],
      false,
    )).toMatchObject({ ok: false, code: "ROOM_LOCKED" })
  })
})

describe("Bingo LAN settlement", () => {
  const winningGrid = [
    [1, 16, 31, 46, 61],
    [2, 17, 32, 47, 62],
    [3, 18, null, 48, 63],
    [4, 19, 34, 49, 64],
    [5, 20, 35, 50, 65],
  ] as const

  function winningCard(id: string): BingoCard {
    return { id, name: id, numbers: winningGrid }
  }

  it("verifies claims against locked cards and collects co-winners for one draw", () => {
    let state = createBingoLanHostState("123456", "round-1")
    state = connectPlayer(state, "player-1", "Alice")
    state = connectPlayer(state, "player-2", "Bob")
    state = readyPlayer(state, "player-1", [winningCard("alice-card")])
    state = readyPlayer(state, "player-2", [winningCard("bob-card")])
    const started = startBingoLanGame(state)
    if (!started.ok) throw new Error(started.code)
    state = started.state

    for (const number of [1, 16, 31, 46, 61]) {
      const drawn = drawBingoLanNumber(state, number)
      if (!drawn.ok) throw new Error(drawn.code)
      state = drawn.state
    }

    const first = submitBingoLanClaim(state, {
      playerId: "player-1",
      roundId: "round-1",
      drawRevision: 5,
      cardId: "alice-card",
    }, 1_000)
    if (!first.ok) throw new Error(first.code)
    expect(first.state.phase).toBe("settling")
    expect(first.state.settlementDeadline).toBe(1_000 + BINGO_LAN_SETTLEMENT_MS)

    const second = submitBingoLanClaim(first.state, {
      playerId: "player-2",
      roundId: "round-1",
      drawRevision: 5,
      cardId: "bob-card",
    }, 2_000)
    if (!second.ok) throw new Error(second.code)
    expect(second.state.winners.map((winner) => winner.nickname)).toEqual(["Alice", "Bob"])
    expect(second.state.settlementDeadline).toBe(1_000 + BINGO_LAN_SETTLEMENT_MS)

    expect(finishBingoLanSettlement(second.state, 3_999)).toMatchObject({
      ok: false,
      code: "INVALID_PHASE",
    })
    expect(finishBingoLanSettlement(second.state, 4_000)).toMatchObject({
      ok: true,
      state: { phase: "finished" },
    })
  })

  it("keeps cards but unlocks them for a new round", () => {
    let state = createBingoLanHostState("123456", "round-1")
    state = readyPlayer(connectPlayer(state, "player-1"), "player-1")
    const started = startBingoLanGame(state)
    if (!started.ok) throw new Error(started.code)

    const reset = resetBingoLanRound(started.state, "round-2")
    expect(reset.phase).toBe("lobby")
    expect(reset.players[0].ready).toBe(false)
    expect(reset.players[0].cards).toHaveLength(1)
  })
})
