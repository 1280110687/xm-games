import { describe, expect, it } from "vitest"

import {
  GO_BOARD_SIZE,
  GO_KOMI,
  GO_MAX_ACTIONS,
  applyGoAction,
  calculateGoScore,
  calculateTerritory,
  createEmptyBoard,
  createGoState,
  getAdjacentPositions,
  type GoAction,
  type GoPlayer,
  type GoState,
  type Stone,
} from "./engine"

function apply(
  state: GoState,
  action: GoAction,
  player: GoPlayer = state.currentPlayer,
): GoState {
  const result = applyGoAction(state, action, player)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error)
  return result.state
}

function place(state: GoState, row: number, col: number): GoState {
  return apply(state, { type: "place", row, col })
}

function pass(state: GoState): GoState {
  return apply(state, { type: "pass" })
}

describe("getAdjacentPositions", () => {
  it("uses the current board size at opposite boundary corners", () => {
    const board = createEmptyBoard(13)

    expect(getAdjacentPositions(board, 0, 0)).toEqual([
      { row: 1, col: 0 },
      { row: 0, col: 1 },
    ])
    expect(getAdjacentPositions(board, 12, 12)).toEqual([
      { row: 11, col: 12 },
      { row: 12, col: 11 },
    ])
  })
})

describe("calculateTerritory", () => {
  it("does not reuse visited boundary stones across separate empty regions", () => {
    const board: Stone[][] = [
      ["white", "white", "white"],
      [null, "black", null],
      ["white", "white", "white"],
    ]

    expect(calculateTerritory(board)).toEqual({ black: 0, white: 0 })
  })
})

describe("Go state machine", () => {
  it("creates a fixed 9x9 serializable state with black to move", () => {
    const state = createGoState()

    expect(GO_BOARD_SIZE).toBe(9)
    expect(state.board).toHaveLength(GO_BOARD_SIZE)
    expect(state.board.every((row) => row.length === GO_BOARD_SIZE)).toBe(true)
    expect(state.board.flat().every((cell) => cell === null)).toBe(true)
    expect(state.currentPlayer).toBe("black")
    expect(state.status).toBe("playing")
    expect(state.actionHistory).toEqual([])
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })

  it("places stones immutably and enforces turn, bounds, and occupancy", () => {
    const initial = createGoState()
    const afterBlack = place(initial, 4, 4)

    expect(initial.board[4][4]).toBeNull()
    expect(initial.actionHistory).toEqual([])
    expect(afterBlack.board[4][4]).toBe("black")
    expect(afterBlack.currentPlayer).toBe("white")
    expect(afterBlack.lastMove).toEqual({ row: 4, col: 4 })
    expect(afterBlack.actionHistory).toEqual([
      { type: "place", row: 4, col: 4, player: "black" },
    ])

    expect(applyGoAction(initial, { type: "place", row: 4, col: 4 }, "white"))
      .toMatchObject({ ok: false, error: "WRONG_PLAYER" })
    expect(applyGoAction(initial, { type: "place", row: -1, col: 0 }))
      .toMatchObject({ ok: false, error: "OUT_OF_BOUNDS" })
    expect(applyGoAction(afterBlack, { type: "place", row: 4, col: 4 }))
      .toMatchObject({ ok: false, error: "CELL_OCCUPIED" })
  })

  it("captures an opponent group and credits every removed stone once", () => {
    let state = createGoState()
    state = place(state, 0, 1)
    state = place(state, 1, 1)
    state = place(state, 1, 0)
    state = place(state, 8, 8)
    state = place(state, 2, 1)
    state = place(state, 8, 7)
    state = place(state, 1, 2)

    expect(state.board[1][1]).toBeNull()
    expect(state.captures).toEqual({ black: 1, white: 0 })

    let multiCapture = createGoState()
    multiCapture = place(multiCapture, 0, 0)
    multiCapture = place(multiCapture, 1, 0)
    multiCapture = place(multiCapture, 2, 0)
    multiCapture = place(multiCapture, 1, 2)
    multiCapture = place(multiCapture, 0, 2)
    multiCapture = place(multiCapture, 8, 8)
    multiCapture = place(multiCapture, 2, 2)
    multiCapture = place(multiCapture, 8, 7)
    multiCapture = place(multiCapture, 1, 3)
    multiCapture = place(multiCapture, 7, 8)
    multiCapture = place(multiCapture, 1, 1)

    expect(multiCapture.board[1][0]).toBeNull()
    expect(multiCapture.board[1][2]).toBeNull()
    expect(multiCapture.captures.black).toBe(2)
  })

  it("rejects suicide but permits a placement that first captures a liberty", () => {
    let suicide = createGoState()
    suicide = place(suicide, 8, 8)
    suicide = place(suicide, 0, 1)
    suicide = place(suicide, 8, 7)
    suicide = place(suicide, 1, 0)
    suicide = place(suicide, 7, 8)
    suicide = place(suicide, 2, 1)
    suicide = place(suicide, 7, 7)
    suicide = place(suicide, 1, 2)

    expect(applyGoAction(suicide, { type: "place", row: 1, col: 1 }))
      .toMatchObject({ ok: false, error: "SUICIDE" })

    let captureEscape = createGoState()
    captureEscape = place(captureEscape, 1, 0)
    captureEscape = place(captureEscape, 0, 0)
    captureEscape = place(captureEscape, 8, 8)
    captureEscape = place(captureEscape, 1, 1)
    captureEscape = place(captureEscape, 0, 1)

    expect(captureEscape.board[0][0]).toBeNull()
    expect(captureEscape.board[0][1]).toBe("black")
    expect(captureEscape.captures.black).toBe(1)
  })

  it("enforces simple ko and permits recapture after intervening actions", () => {
    let state = createGoState()
    state = place(state, 0, 1)
    state = place(state, 1, 1)
    state = place(state, 1, 0)
    state = place(state, 0, 2)
    state = place(state, 2, 1)
    state = place(state, 2, 2)
    state = place(state, 8, 8)
    state = place(state, 1, 3)
    state = place(state, 1, 2)

    expect(state.board[1][1]).toBeNull()
    expect(applyGoAction(state, { type: "place", row: 1, col: 1 }))
      .toMatchObject({ ok: false, error: "KO_VIOLATION" })

    state = pass(state)
    state = place(state, 8, 7)
    state = place(state, 1, 1)

    expect(state.board[1][1]).toBe("white")
    expect(state.board[1][2]).toBeNull()
    expect(state.captures.white).toBe(1)
  })

  it("resets the pass counter on a placement and ends after two consecutive passes", () => {
    let state = pass(createGoState())
    expect(state.consecutivePasses).toBe(1)
    expect(state.previousBoard).toEqual(state.board)

    state = place(state, 4, 4)
    expect(state.consecutivePasses).toBe(0)
    expect(state.status).toBe("playing")

    state = pass(state)
    state = pass(state)
    expect(state.status).toBe("ended")
    expect(state.endReason).toBe("two-passes")
    expect(state.result).not.toBeNull()
    expect(applyGoAction(state, { type: "place", row: 0, col: 0 }))
      .toMatchObject({ ok: false, error: "GAME_FINISHED" })
    expect(applyGoAction(state, { type: "pass" }))
      .toMatchObject({ ok: false, error: "GAME_FINISHED" })
  })

  it("scores territory, captures, komi, winner, and margin deterministically", () => {
    const board = Array.from({ length: GO_BOARD_SIZE }, () =>
      Array<Stone>(GO_BOARD_SIZE).fill("white"),
    )
    board[4][4] = null
    const score = calculateGoScore({
      board,
      captures: { black: 2, white: 3 },
    })

    expect(score).toEqual({
      territory: { black: 0, white: 1 },
      captures: { black: 2, white: 3 },
      komi: GO_KOMI,
      black: 2,
      white: 10.5,
      winner: "white",
      margin: 8.5,
    })
  })

  it("rejects malformed actions and enforces the replay safety limit", () => {
    const state = createGoState()
    expect(applyGoAction(
      state,
      { type: "pass", injected: true } as unknown as GoAction,
    )).toMatchObject({ ok: false, error: "INVALID_ACTION" })

    const atLimit: GoState = {
      ...state,
      actionHistory: Array.from({ length: GO_MAX_ACTIONS }, (_, index) => ({
        type: "pass" as const,
        player: index % 2 === 0 ? "black" as const : "white" as const,
      })),
    }
    expect(applyGoAction(atLimit, { type: "pass" }))
      .toMatchObject({ ok: false, error: "ACTION_LIMIT_REACHED" })
  })
})
