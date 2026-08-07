import { describe, expect, it } from "vitest"

import {
  DEFAULT_WRONG_TAP_PENALTY_MS,
  SCHULTE_LEVELS,
  SCHULTE_RECENT_RECORD_LIMIT,
  createEmptySchulteRecords,
  createSchulteGridState,
  getSchulteActiveElapsedMs,
  getSchulteElapsedMs,
  getSchulteFinalResult,
  parseSchulteRecords,
  restartSchulteRound,
  selectSchulteNumber,
  shuffleSchulteNumbers,
  startSchulteRound,
  stopSchulteRound,
  updateSchulteRecords,
  type SchulteFinalResult,
  type SchulteGridState,
} from "./engine"

function seededRandom(initialSeed: number) {
  let seed = initialSeed >>> 0
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0x1_0000_0000
  }
}

function runningState(
  level: keyof typeof SCHULTE_LEVELS = "easy",
  startedAtMs = 1_000,
) {
  return startSchulteRound(createSchulteGridState(level), {
    random: seededRandom(7),
    now: () => startedAtMs,
  })
}

function solveState(
  state: SchulteGridState,
  completedAtMs: number,
): SchulteGridState {
  let current = state

  for (let number = 1; number <= state.cellCount; number += 1) {
    current = selectSchulteNumber(current, number, {
      now: () => completedAtMs,
    })
  }

  return current
}

function result(overrides: Partial<SchulteFinalResult> = {}): SchulteFinalResult {
  const activeElapsedMs = overrides.activeElapsedMs ?? 2_000
  const penaltyMs = overrides.penaltyMs ?? 0
  const outcome = overrides.outcome ?? "solved"
  const level = overrides.level ?? "easy"
  const cellCount = SCHULTE_LEVELS[level].cellCount
  const solved = outcome === "solved"

  return {
    level,
    cellCount,
    outcome,
    solved,
    progress: solved ? cellCount : 7,
    total: cellCount,
    wrongCount: 0,
    activeElapsedMs,
    penaltyMs,
    elapsedMs: activeElapsedMs + penaltyMs,
    ...overrides,
  }
}

describe("Schulte grid setup", () => {
  it.each([
    ["easy", 25, 5],
    ["medium", 36, 6],
    ["hard", 49, 7],
  ] as const)("supports the %s level", (level, cellCount, gridSize) => {
    const state = createSchulteGridState(level)

    expect(state.phase).toBe("idle")
    expect(state.cellCount).toBe(cellCount)
    expect(state.gridSize).toBe(gridSize)
    expect(state.numbers).toEqual(
      Array.from({ length: cellCount }, (_, index) => index + 1),
    )
  })

  it("creates deterministic permutations from an injected random source", () => {
    const first = shuffleSchulteNumbers(49, seededRandom(9))
    const repeated = shuffleSchulteNumbers(49, seededRandom(9))
    const different = shuffleSchulteNumbers(49, seededRandom(10))

    expect(first).toEqual(repeated)
    expect(first).not.toEqual(different)
    expect([...first].sort((left, right) => left - right)).toEqual(
      Array.from({ length: 49 }, (_, index) => index + 1),
    )
  })

  it("starts with injected time and a shuffled board", () => {
    const idle = createSchulteGridState("medium")
    const started = startSchulteRound(idle, {
      random: seededRandom(12),
      now: () => 125.25,
    })

    expect(started.phase).toBe("running")
    expect(started.startedAtMs).toBe(125.25)
    expect(started.numbers).not.toEqual(idle.numbers)
    expect(startSchulteRound(started)).toBe(started)
  })
})

describe("Schulte number selection", () => {
  it("advances only in order without changing the displayed numbers", () => {
    const started = runningState()
    const board = started.numbers
    const wrong = selectSchulteNumber(started, 3)

    expect(wrong.expectedNumber).toBe(1)
    expect(wrong.correctCount).toBe(0)
    expect(wrong.wrongCount).toBe(1)
    expect(wrong.penaltyMs).toBe(DEFAULT_WRONG_TAP_PENALTY_MS)
    expect(wrong.numbers).toBe(board)

    const correct = selectSchulteNumber(wrong, 1)
    expect(correct.expectedNumber).toBe(2)
    expect(correct.correctCount).toBe(1)
    expect(correct.numbers).toBe(board)

    const repeated = selectSchulteNumber(correct, 1)
    expect(repeated.expectedNumber).toBe(2)
    expect(repeated.wrongCount).toBe(2)
    expect(repeated.numbers).toBe(board)
  })

  it("ignores selections outside the board and outside a running round", () => {
    const idle = createSchulteGridState()
    const running = runningState()

    expect(selectSchulteNumber(idle, 1)).toBe(idle)
    expect(selectSchulteNumber(running, 0)).toBe(running)
    expect(selectSchulteNumber(running, 26)).toBe(running)
    expect(selectSchulteNumber(running, 1.5)).toBe(running)
  })

  it("accepts a configurable non-negative wrong-tap penalty", () => {
    const started = runningState()
    const penalized = selectSchulteNumber(started, 2, {
      wrongTapPenaltyMs: 250.5,
    })

    expect(penalized.penaltyMs).toBe(250.5)
    expect(() => selectSchulteNumber(started, 2, {
      wrongTapPenaltyMs: -1,
    })).toThrow(RangeError)
  })

  it("finishes automatically after the last correct number", () => {
    let state = runningState("easy", 100)
    const board = state.numbers
    state = selectSchulteNumber(state, 2)
    state = solveState(state, 1_600)

    expect(state.phase).toBe("completed")
    expect(state.completionReason).toBe("solved")
    expect(state.correctCount).toBe(25)
    expect(state.expectedNumber).toBe(26)
    expect(state.numbers).toBe(board)
    expect(state.accumulatedMs).toBe(1_500)
    expect(state.penaltyMs).toBe(1_000)

    expect(getSchulteFinalResult(state)).toEqual({
      level: "easy",
      cellCount: 25,
      outcome: "solved",
      solved: true,
      progress: 25,
      total: 25,
      wrongCount: 1,
      activeElapsedMs: 1_500,
      penaltyMs: 1_000,
      elapsedMs: 2_500,
    })
    expect(selectSchulteNumber(state, 1)).toBe(state)
  })
})

describe("Schulte timer and controls", () => {
  it("derives precise elapsed time from timestamps instead of interval ticks", () => {
    const started = runningState("easy", 1_000.25)

    expect(getSchulteActiveElapsedMs(started, () => 1_123.75)).toBe(123.5)
    expect(getSchulteElapsedMs(started, () => 1_123.75)).toBe(123.5)

    const penalized = selectSchulteNumber(started, 2)
    expect(getSchulteElapsedMs(penalized, () => 1_123.75)).toBe(1_123.5)
  })

  it("clamps a non-monotonic timestamp instead of producing negative time", () => {
    const started = runningState("easy", 1_000)
    expect(getSchulteActiveElapsedMs(started, () => 900)).toBe(0)

    const stopped = stopSchulteRound(started, () => 900)
    expect(stopped.accumulatedMs).toBe(0)
  })

  it("stops directly with a frozen incomplete result", () => {
    let state = runningState("medium", 500)
    state = selectSchulteNumber(state, 1)
    state = selectSchulteNumber(state, 4)
    state = stopSchulteRound(state, () => 825.75)

    expect(state.phase).toBe("completed")
    expect(state.completionReason).toBe("stopped")
    expect(getSchulteActiveElapsedMs(state, () => 9_999)).toBe(325.75)
    expect(getSchulteFinalResult(state)).toEqual({
      level: "medium",
      cellCount: 36,
      outcome: "stopped",
      solved: false,
      progress: 1,
      total: 36,
      wrongCount: 1,
      activeElapsedMs: 325.75,
      penaltyMs: 1_000,
      elapsedMs: 1_325.75,
    })
    expect(stopSchulteRound(state)).toBe(state)
  })

  it("restarts immediately with a fresh running round", () => {
    let state = runningState()
    state = selectSchulteNumber(state, 1)
    state = selectSchulteNumber(state, 4)
    const previousNumbers = state.numbers

    const restarted = restartSchulteRound(state, {
      level: "hard",
      random: seededRandom(42),
      now: () => 4_000,
    })

    expect(restarted.phase).toBe("running")
    expect(restarted.level).toBe("hard")
    expect(restarted.cellCount).toBe(49)
    expect(restarted.numbers).not.toBe(previousNumbers)
    expect(restarted.correctCount).toBe(0)
    expect(restarted.wrongCount).toBe(0)
    expect(restarted.penaltyMs).toBe(0)
    expect(restarted.startedAtMs).toBe(4_000)
  })
})

describe("Schulte records", () => {
  it("keeps both outcomes in recent history but only solved rounds as best", () => {
    let records = createEmptySchulteRecords()
    const stopped = result({ outcome: "stopped", solved: false, progress: 8 })
    records = updateSchulteRecords(records, stopped, { now: () => 10 })

    expect(records.recent.easy).toHaveLength(1)
    expect(records.recent.easy?.[0].outcome).toBe("stopped")
    expect(records.best.easy).toBeUndefined()

    const solved = result({ activeElapsedMs: 3_000 })
    records = updateSchulteRecords(records, solved, { now: () => 20 })

    expect(records.recent.easy?.map((record) => record.outcome)).toEqual([
      "solved",
      "stopped",
    ])
    expect(records.best.easy?.elapsedMs).toBe(3_000)
  })

  it("keeps the fastest solved result for each level", () => {
    let records = createEmptySchulteRecords()
    records = updateSchulteRecords(
      records,
      result({ activeElapsedMs: 3_000 }),
      { now: () => 1 },
    )
    records = updateSchulteRecords(
      records,
      result({ activeElapsedMs: 3_500 }),
      { now: () => 2 },
    )

    expect(records.best.easy?.elapsedMs).toBe(3_000)

    records = updateSchulteRecords(
      records,
      result({ activeElapsedMs: 2_500, wrongCount: 1 }),
      { now: () => 3 },
    )
    records = updateSchulteRecords(
      records,
      result({
        level: "hard",
        cellCount: 49,
        progress: 49,
        total: 49,
        activeElapsedMs: 7_000,
      }),
      { now: () => 4 },
    )

    expect(records.best.easy?.elapsedMs).toBe(2_500)
    expect(records.best.hard?.elapsedMs).toBe(7_000)
  })

  it("caps recent history at ten records with the newest first", () => {
    let records = createEmptySchulteRecords()

    for (let index = 0; index < SCHULTE_RECENT_RECORD_LIMIT + 3; index += 1) {
      const outcome = index % 2 === 0 ? "solved" : "stopped"
      records = updateSchulteRecords(
        records,
        result({
          outcome,
          solved: outcome === "solved",
          progress: outcome === "solved" ? 25 : index,
          activeElapsedMs: 1_000 + index,
        }),
        { now: () => index },
      )
    }

    expect(records.recent.easy).toHaveLength(SCHULTE_RECENT_RECORD_LIMIT)
    expect(records.recent.easy?.[0].recordedAtMs).toBe(12)
    expect(records.recent.easy?.at(-1)?.recordedAtMs).toBe(3)
  })

  it("parses valid stored records and discards corrupt data", () => {
    let records = createEmptySchulteRecords()
    records = updateSchulteRecords(records, result(), { now: () => 100 })
    records = updateSchulteRecords(
      records,
      result({ outcome: "stopped", solved: false, progress: 3 }),
      { now: () => 200 },
    )

    expect(parseSchulteRecords(JSON.stringify(records))).toEqual(records)
    expect(parseSchulteRecords("not-json")).toEqual(createEmptySchulteRecords())
    expect(parseSchulteRecords({ version: 999 })).toEqual(createEmptySchulteRecords())

    const partiallyCorrupt = {
      ...records,
      recent: {
        easy: [...(records.recent.easy ?? []), { level: "easy", elapsedMs: -1 }],
      },
      best: { easy: { ...records.best.easy, elapsedMs: -1 } },
    }
    const recovered = parseSchulteRecords(partiallyCorrupt)

    expect(recovered.recent.easy).toHaveLength(2)
    expect(recovered.best.easy?.elapsedMs).toBe(2_000)
  })
})
