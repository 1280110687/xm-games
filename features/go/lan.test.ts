import { describe, expect, it } from "vitest"

import {
  GO_MAX_ACTIONS,
  applyGoAction,
  createGoState,
  type GoAction,
  type GoState,
} from "./engine"
import {
  GO_LAN_ENGINE_VERSION,
  applyGoLanAction,
  encodeGoLanAction,
  encodeGoLanSnapshot,
  goLanAdapter,
  parseGoLanAction,
  validateAndRebuildGoLanSnapshot,
} from "./lan"

function apply(state: GoState, action: GoAction): GoState {
  const result = applyGoAction(state, action)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error)
  return result.state
}

describe("Go LAN adapter", () => {
  it("binds the fixed 9x9 engine and assigns the dice winner to black", () => {
    const state = goLanAdapter.createInitialState()

    expect(goLanAdapter.gameId).toBe("go")
    expect(goLanAdapter.engineVersion).toBe(GO_LAN_ENGINE_VERSION)
    expect(GO_LAN_ENGINE_VERSION).toContain("9x9-simple-ko-territory")
    expect(goLanAdapter.firstSide).toBe("black")
    expect(goLanAdapter.secondSide).toBe("white")
    expect(goLanAdapter.getRevision(state)).toBe(0)
    expect(goLanAdapter.getCurrentSide(state)).toBe("black")
  })

  it("parses and encodes only exact place and pass action shapes", () => {
    expect(parseGoLanAction({ type: "place", row: 2, col: 6 })).toEqual({
      type: "place",
      row: 2,
      col: 6,
    })
    expect(parseGoLanAction({ type: "pass" })).toEqual({ type: "pass" })
    expect(encodeGoLanAction({ type: "place", row: 2, col: 6 })).toEqual({
      type: "place",
      row: 2,
      col: 6,
    })
    expect(encodeGoLanAction({ type: "pass" })).toEqual({ type: "pass" })

    expect(parseGoLanAction({ type: "place", row: 9, col: 0 })).toBeNull()
    expect(parseGoLanAction({ type: "place", row: 1.5, col: 0 })).toBeNull()
    expect(parseGoLanAction({ type: "pass", injected: true })).toBeNull()
    expect(parseGoLanAction({ type: "resign" })).toBeNull()
  })

  it("rejects actions from the wrong side and all actions after terminal state", () => {
    const initial = createGoState()
    expect(applyGoLanAction(initial, { type: "place", row: 4, col: 4 }, "white"))
      .toEqual({ ok: false, code: "WRONG_PLAYER" })
    expect(applyGoLanAction(
      initial,
      { type: "pass", injected: true } as unknown as GoAction,
      "black",
    )).toEqual({ ok: false, code: "INVALID_ACTION" })

    let ended = apply(initial, { type: "pass" })
    ended = apply(ended, { type: "pass" })
    expect(goLanAdapter.getCurrentSide(ended)).toBeNull()
    expect(applyGoLanAction(ended, { type: "place", row: 0, col: 0 }, "black"))
      .toEqual({ ok: false, code: "GAME_FINISHED" })
  })

  it("encodes a compact player-bound action history and rebuilds all derived state", () => {
    let state = createGoState()
    state = apply(state, { type: "place", row: 4, col: 4 })
    state = apply(state, { type: "place", row: 0, col: 0 })
    state = apply(state, { type: "pass" })

    const snapshot = encodeGoLanSnapshot(state)
    expect(snapshot).toEqual({
      v: 1,
      actions: [
        [0, 4, 4],
        [1, 0, 0],
        [0],
      ],
    })
    expect(JSON.stringify(snapshot)).not.toContain("board")
    expect(JSON.stringify(snapshot)).not.toContain("captures")
    expect(validateAndRebuildGoLanSnapshot(snapshot, 3)).toEqual({
      ok: true,
      state,
    })
  })

  it("strictly validates revision, exact snapshot keys, version, and action limit", () => {
    const emptySnapshot = { v: 1, actions: [] }

    expect(validateAndRebuildGoLanSnapshot(emptySnapshot, -1)).toEqual({
      ok: false,
      code: "INVALID_REVISION",
    })
    expect(validateAndRebuildGoLanSnapshot(emptySnapshot, 0.5)).toEqual({
      ok: false,
      code: "INVALID_REVISION",
    })
    expect(validateAndRebuildGoLanSnapshot(emptySnapshot, 1)).toEqual({
      ok: false,
      code: "REVISION_MISMATCH",
    })
    expect(validateAndRebuildGoLanSnapshot({ ...emptySnapshot, board: [] }, 0))
      .toEqual({ ok: false, code: "INVALID_SNAPSHOT" })
    expect(validateAndRebuildGoLanSnapshot({ v: 2, actions: [] }, 0))
      .toEqual({ ok: false, code: "INVALID_SNAPSHOT" })

    expect(validateAndRebuildGoLanSnapshot(
      { v: 1, actions: Array.from({ length: GO_MAX_ACTIONS + 1 }, () => [0]) },
      GO_MAX_ACTIONS,
    )).toEqual({ ok: false, code: "ACTION_LIMIT_EXCEEDED" })
    expect(validateAndRebuildGoLanSnapshot(emptySnapshot, GO_MAX_ACTIONS + 1))
      .toEqual({ ok: false, code: "ACTION_LIMIT_EXCEEDED" })
  })

  it("rejects malformed compact records before replay", () => {
    for (const action of [
      [0, 4],
      [2],
      [0, 9, 0],
      [0, 1.5, 0],
      [0, 1, 2, 3],
      "pass",
    ]) {
      expect(validateAndRebuildGoLanSnapshot({ v: 1, actions: [action] }, 1))
        .toEqual({ ok: false, code: "INVALID_SNAPSHOT" })
    }
  })

  it("rejects out-of-turn, occupied, and post-terminal replay tampering", () => {
    expect(validateAndRebuildGoLanSnapshot({
      v: 1,
      actions: [[1, 4, 4]],
    }, 1)).toEqual({
      ok: false,
      code: "INVALID_ACTION",
      actionIndex: 0,
      actionError: "WRONG_PLAYER",
    })

    expect(validateAndRebuildGoLanSnapshot({
      v: 1,
      actions: [[0, 4, 4], [1, 4, 4]],
    }, 2)).toEqual({
      ok: false,
      code: "INVALID_ACTION",
      actionIndex: 1,
      actionError: "CELL_OCCUPIED",
    })

    expect(validateAndRebuildGoLanSnapshot({
      v: 1,
      actions: [[0], [1], [0, 0, 0]],
    }, 3)).toEqual({
      ok: false,
      code: "INVALID_ACTION",
      actionIndex: 2,
      actionError: "GAME_FINISHED",
    })
  })

  it("replays capture, suicide, and simple-ko branches instead of trusting a peer", () => {
    const capture = {
      v: 1,
      actions: [
        [0, 0, 1], [1, 1, 1], [0, 1, 0], [1, 8, 8],
        [0, 2, 1], [1, 8, 7], [0, 1, 2],
      ],
    }
    const captureResult = validateAndRebuildGoLanSnapshot(capture, 7)
    expect(captureResult.ok).toBe(true)
    if (captureResult.ok) {
      expect(captureResult.state.board[1][1]).toBeNull()
      expect(captureResult.state.captures.black).toBe(1)
    }

    const suicide = {
      v: 1,
      actions: [
        [0, 8, 8], [1, 0, 1], [0, 8, 7], [1, 1, 0],
        [0, 7, 8], [1, 2, 1], [0, 7, 7], [1, 1, 2], [0, 1, 1],
      ],
    }
    expect(validateAndRebuildGoLanSnapshot(suicide, 9)).toEqual({
      ok: false,
      code: "INVALID_ACTION",
      actionIndex: 8,
      actionError: "SUICIDE",
    })

    const ko = {
      v: 1,
      actions: [
        [0, 0, 1], [1, 1, 1], [0, 1, 0], [1, 0, 2],
        [0, 2, 1], [1, 2, 2], [0, 8, 8], [1, 1, 3],
        [0, 1, 2], [1, 1, 1],
      ],
    }
    expect(validateAndRebuildGoLanSnapshot(ko, 10)).toEqual({
      ok: false,
      code: "INVALID_ACTION",
      actionIndex: 9,
      actionError: "KO_VIOLATION",
    })
  })
})
