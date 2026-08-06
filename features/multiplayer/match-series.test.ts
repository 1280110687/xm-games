import { describe, expect, it } from "vitest"

import {
  applyLanMatchAdvance,
  bothPlayersRequestedRematch,
  createLanMatchAdvance,
  createLanMatchSeries,
  isLanMatchSettlementAhead,
  isLanMatchSeriesState,
  mergeLanMatchRematchRequests,
  requestLanMatchRematch,
  sameLanMatchRematchRequests,
  settleLanMatchSeries,
  toLanMatchSeriesView,
  withPendingLanMatchAdvance,
} from "./match-series"

const HOST = "peer-host-0000001"
const GUEST = "peer-guest-000001"
const PLAYERS = [HOST, GUEST] as const

function settledHostWin() {
  return settleLanMatchSeries(
    createLanMatchSeries(PLAYERS),
    { status: "won" as const, winner: "black" as const },
    (side) => side === "black" ? HOST : GUEST,
  )
}

describe("LAN match series", () => {
  it("scores a finished game once by peer identity rather than board side", () => {
    const first = settledHostWin()
    const duplicate = settleLanMatchSeries(
      first,
      { status: "won", winner: "black" },
      () => HOST,
    )

    expect(first).toMatchObject({
      gameNumber: 1,
      settledGameNumber: 1,
      winsByPeerId: { [HOST]: 1, [GUEST]: 0 },
      draws: 0,
    })
    expect(duplicate).toBe(first)
    expect(isLanMatchSeriesState(first, PLAYERS)).toBe(true)
  })

  it("tracks draws and maps the same player after sides change", () => {
    const draw = settleLanMatchSeries(
      createLanMatchSeries(PLAYERS),
      { status: "draw" },
      () => null,
    )
    expect(draw.draws).toBe(1)

    const view = toLanMatchSeriesView(
      settledHostWin(),
      HOST,
      GUEST,
      { status: "won", winner: "white" },
      (side) => side === "white" ? HOST : GUEST,
    )
    expect(view).toMatchObject({
      localWins: 1,
      remoteWins: 0,
      outcome: "local-win",
    })
  })

  it("waits for both rematch requests before creating and applying an advance", () => {
    const settled = settledHostWin()
    const hostReady = requestLanMatchRematch(settled, HOST)
    expect(bothPlayersRequestedRematch(hostReady, PLAYERS)).toBe(false)

    const bothReady = requestLanMatchRematch(hostReady, GUEST)
    expect(bothPlayersRequestedRematch(bothReady, PLAYERS)).toBe(true)
    const advance = createLanMatchAdvance(
      bothReady,
      PLAYERS,
      9,
      "a".repeat(64),
      "advance-1",
    )
    expect(advance).not.toBeNull()
    if (!advance) return

    const pending = withPendingLanMatchAdvance(bothReady, advance)
    expect(pending?.pendingAdvance).toEqual(advance)
    const next = applyLanMatchAdvance(pending!, advance)
    expect(next).toMatchObject({
      gameNumber: 2,
      settledGameNumber: 1,
      winsByPeerId: { [HOST]: 1, [GUEST]: 0 },
      pendingAdvance: null,
      lastAdvance: advance,
    })
    expect(isLanMatchSeriesState(next, PLAYERS)).toBe(true)
    const secondFinished = settleLanMatchSeries(
      next!,
      { status: "won", winner: "white" },
      (side) => side === "white" ? GUEST : HOST,
    )
    expect(secondFinished.winsByPeerId).toEqual({ [HOST]: 1, [GUEST]: 1 })
    expect(isLanMatchSeriesState(secondFinished, PLAYERS)).toBe(true)
  })

  it("merges durable requests after reconnect without changing score", () => {
    const settled = settledHostWin()
    const hostState = requestLanMatchRematch(settled, HOST)
    const guestState = requestLanMatchRematch(settled, GUEST)
    const merged = mergeLanMatchRematchRequests(hostState, guestState)

    expect(merged).not.toBeNull()
    expect(bothPlayersRequestedRematch(merged!, PLAYERS)).toBe(true)
    expect(merged?.winsByPeerId).toEqual(settled.winsByPeerId)
  })

  it("recovers a host pending advance when the guest only stored its own request", () => {
    const settled = settledHostWin()
    const guestOnly = requestLanMatchRematch(settled, GUEST)
    const bothReady = requestLanMatchRematch(
      requestLanMatchRematch(settled, HOST),
      GUEST,
    )
    const advance = createLanMatchAdvance(
      bothReady,
      PLAYERS,
      9,
      "b".repeat(64),
      "advance-after-reconnect",
    )!
    const hostPending = withPendingLanMatchAdvance(bothReady, advance)!

    const recoveredGuest = mergeLanMatchRematchRequests(guestOnly, hostPending)
    expect(recoveredGuest).not.toBeNull()
    expect(applyLanMatchAdvance(recoveredGuest!, advance)?.gameNumber).toBe(2)
  })

  it("detects when a peer must echo its durable rematch request", () => {
    const settled = settledHostWin()
    const guestOnly = requestLanMatchRematch(settled, GUEST)
    const emptyRemote = { ...settled }
    const merged = mergeLanMatchRematchRequests(guestOnly, emptyRemote)!

    expect(merged).toBe(guestOnly)
    expect(sameLanMatchRematchRequests(merged, emptyRemote)).toBe(false)
  })

  it("recognizes the one-score gap caused by an unacknowledged terminal move", () => {
    const fresh = createLanMatchSeries(PLAYERS)
    const settled = settledHostWin()

    expect(isLanMatchSettlementAhead(settled, fresh)).toBe(true)
    expect(isLanMatchSettlementAhead(fresh, settled)).toBe(false)
    expect(isLanMatchSettlementAhead({
      ...settled,
      winsByPeerId: { [HOST]: 0, [GUEST]: 1 },
    }, fresh)).toBe(true)
    expect(isLanMatchSettlementAhead({
      ...settled,
      winsByPeerId: { [HOST]: 1, [GUEST]: 1 },
    }, fresh)).toBe(false)
  })

  it("rejects score inflation, unknown peers, and invalid round totals", () => {
    const valid = settledHostWin()
    expect(isLanMatchSeriesState({
      ...valid,
      winsByPeerId: { ...valid.winsByPeerId, [HOST]: 2 },
    }, PLAYERS)).toBe(false)
    expect(isLanMatchSeriesState({
      ...valid,
      rematchRequestedGameByPeerId: {
        [HOST]: 0,
        "peer-intruder-0001": 0,
      },
    }, PLAYERS)).toBe(false)
    expect(isLanMatchSeriesState({
      ...valid,
      gameNumber: 3,
    }, PLAYERS)).toBe(false)
  })
})
