import { describe, expect, it } from "vitest"

import {
  MEMORY_MATCH_DIFFICULTIES,
  createMemoryMatchDeck,
  createMemoryMatchState,
  restartMemoryMatch,
  selectMemoryMatchCard,
  settleMemoryMatchTurn,
  type MemoryMatchState,
} from "./engine"

function seededRandom(initialSeed: number) {
  let seed = initialSeed >>> 0
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0x1_0000_0000
  }
}

function findPair(state: MemoryMatchState, pairId = 0) {
  const pair = state.cards.filter((card) => card.pairId === pairId)
  expect(pair).toHaveLength(2)
  return pair
}

function completePair(state: MemoryMatchState, pairId: number) {
  const pair = findPair(state, pairId)
  const selectedFirst = selectMemoryMatchCard(state, pair[0].id)
  const selectedSecond = selectMemoryMatchCard(selectedFirst, pair[1].id)
  return settleMemoryMatchTurn(selectedSecond)
}

describe("createMemoryMatchDeck", () => {
  it("creates exactly two unique cards for every pair and uses the random source", () => {
    const first = createMemoryMatchDeck(8, seededRandom(7))
    const repeated = createMemoryMatchDeck(8, seededRandom(7))
    const different = createMemoryMatchDeck(8, seededRandom(8))

    expect(first).toEqual(repeated)
    expect(first.map((card) => card.id)).not.toEqual(
      different.map((card) => card.id),
    )
    expect(new Set(first.map((card) => card.id))).toHaveLength(16)
    expect(first.every((card) => card.status === "hidden")).toBe(true)

    for (let pairId = 0; pairId < 8; pairId++) {
      expect(first.filter((card) => card.pairId === pairId)).toHaveLength(2)
    }
  })

  it("rejects invalid pair counts", () => {
    expect(() => createMemoryMatchDeck(0)).toThrow(RangeError)
    expect(() => createMemoryMatchDeck(1.5)).toThrow(RangeError)
  })
})

describe("memory match turns", () => {
  it("ignores missing, repeated, already revealed, and locked selections", () => {
    const initial = createMemoryMatchState("easy", seededRandom(1))
    expect(selectMemoryMatchCard(initial, "missing-card")).toBe(initial)

    const pair = findPair(initial)
    const oneSelected = selectMemoryMatchCard(initial, pair[0].id)
    expect(selectMemoryMatchCard(oneSelected, pair[0].id)).toBe(oneSelected)

    const locked = selectMemoryMatchCard(oneSelected, pair[1].id)
    const thirdCard = locked.cards.find((card) => card.pairId !== pair[0].pairId)!

    expect(locked.isLocked).toBe(true)
    expect(selectMemoryMatchCard(locked, thirdCard.id)).toBe(locked)
    expect(settleMemoryMatchTurn(initial)).toBe(initial)
  })

  it("locks a matching pair, counts one move, and settles it as matched", () => {
    const initial = createMemoryMatchState("easy", seededRandom(2))
    const pair = findPair(initial)
    const oneSelected = selectMemoryMatchCard(initial, pair[0].id)
    const locked = selectMemoryMatchCard(oneSelected, pair[1].id)

    expect(oneSelected.moves).toBe(0)
    expect(locked.moves).toBe(1)
    expect(locked.pendingResult).toBe("match")
    expect(locked.selectedCardIds).toEqual([pair[0].id, pair[1].id])
    expect(locked.cards.filter((card) => card.status === "revealed")).toHaveLength(2)

    const settled = settleMemoryMatchTurn(locked)

    expect(settled.cards.filter((card) => card.status === "matched")).toHaveLength(2)
    expect(settled.matchedPairs).toBe(1)
    expect(settled.streak).toBe(1)
    expect(settled.bestStreak).toBe(1)
    expect(settled.isLocked).toBe(false)
    expect(settled.pendingResult).toBeNull()
  })

  it("turns a mismatch face down and resets the current streak", () => {
    let state = createMemoryMatchState("easy", seededRandom(3))
    state = completePair(state, 0)

    const first = state.cards.find((card) => card.pairId === 1)!
    const second = state.cards.find((card) => card.pairId === 2)!
    state = selectMemoryMatchCard(state, first.id)
    state = selectMemoryMatchCard(state, second.id)

    expect(state.pendingResult).toBe("mismatch")
    expect(state.moves).toBe(2)

    const settled = settleMemoryMatchTurn(state)

    expect(settled.cards.find((card) => card.id === first.id)?.status).toBe(
      "hidden",
    )
    expect(settled.cards.find((card) => card.id === second.id)?.status).toBe(
      "hidden",
    )
    expect(settled.streak).toBe(0)
    expect(settled.bestStreak).toBe(1)
    expect(settled.matchedPairs).toBe(1)
  })

  it("completes only after every pair has been settled", () => {
    let state = createMemoryMatchState("easy", seededRandom(4))

    for (let pairId = 0; pairId < state.totalPairs; pairId++) {
      state = completePair(state, pairId)
    }

    expect(state.phase).toBe("complete")
    expect(state.matchedPairs).toBe(state.totalPairs)
    expect(state.moves).toBe(state.totalPairs)
    expect(state.streak).toBe(state.totalPairs)
    expect(state.bestStreak).toBe(state.totalPairs)
    expect(state.cards.every((card) => card.status === "matched")).toBe(true)
    expect(selectMemoryMatchCard(state, state.cards[0].id)).toBe(state)
  })
})

describe("difficulty and restart", () => {
  it.each([
    ["easy", { rows: 3, columns: 4 }],
    ["medium", { rows: 4, columns: 4 }],
    ["hard", { rows: 4, columns: 5 }],
  ] as const)(
    "creates a %s board with the configured layout",
    (difficulty, layout) => {
      expect(MEMORY_MATCH_DIFFICULTIES[difficulty]).toEqual(layout)
      const state = createMemoryMatchState(difficulty, seededRandom(5))

      expect(state.rows).toBe(layout.rows)
      expect(state.columns).toBe(layout.columns)
      expect(state.cards).toHaveLength(layout.rows * layout.columns)
      expect(state.totalPairs).toBe((layout.rows * layout.columns) / 2)
    },
  )

  it("restarts with reset progress and can change difficulty and shuffle", () => {
    const initial = createMemoryMatchState("easy", seededRandom(6))
    const progressed = completePair(initial, 0)
    const restarted = restartMemoryMatch(progressed, {
      difficulty: "medium",
      random: seededRandom(9),
    })

    expect(restarted.difficulty).toBe("medium")
    expect(restarted.rows).toBe(4)
    expect(restarted.columns).toBe(4)
    expect(restarted.cards).toHaveLength(16)
    expect(restarted.moves).toBe(0)
    expect(restarted.streak).toBe(0)
    expect(restarted.bestStreak).toBe(0)
    expect(restarted.matchedPairs).toBe(0)
    expect(restarted.selectedCardIds).toEqual([])
    expect(restarted.isLocked).toBe(false)
    expect(restarted.phase).toBe("playing")
    expect(restarted.cards.every((card) => card.status === "hidden")).toBe(true)
  })
})
