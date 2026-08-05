import { describe, expect, it } from "vitest"

import { applyGoAction, createGoState } from "../go/engine"
import { goLanAdapter } from "../go/lan"
import { hashJson } from "./crypto"
import {
  parseStoredLanTurnGameSession,
  type StoredLanTurnGameSession,
} from "./use-lan-turn-game"

const HOST_PEER_ID = "peer-host-0000001"
const GUEST_PEER_ID = "peer-guest-000001"

function createStoredSession(): StoredLanTurnGameSession {
  const game = createGoState()
  return {
    version: 2,
    session: {
      gameId: goLanAdapter.gameId,
      engineVersion: goLanAdapter.engineVersion,
      roomId: "123456",
      peerId: HOST_PEER_ID,
      role: "host",
      token: "a".repeat(43),
      cursor: 0,
      expiresAt: "2030-01-01T00:00:00.000Z",
    },
    matchId: "123456",
    remotePeerId: null,
    phase: "waiting",
    localReady: false,
    remoteReady: false,
    game: goLanAdapter.encodeSnapshot(game),
    revision: 0,
    firstPeerId: null,
    diceRuntime: null,
    dice: null,
    pendingAction: null,
    acknowledgements: [],
  }
}

function preparePlayingSession(stored: StoredLanTurnGameSession): void {
  const result = {
    round: 1,
    rolls: {
      [HOST_PEER_ID]: 6,
      [GUEST_PEER_ID]: 1,
    },
    firstPlayerId: HOST_PEER_ID,
    tied: false,
    proof: "b".repeat(64),
  }
  stored.remotePeerId = GUEST_PEER_ID
  stored.phase = "playing"
  stored.localReady = true
  stored.remoteReady = true
  stored.firstPeerId = HOST_PEER_ID
  stored.diceRuntime = {
    round: 1,
    previousFinalizedResult: null,
    localCommit: null,
    commitments: {},
    reveals: {},
    revealSent: false,
    resolving: false,
    resultSent: true,
    localResult: result,
    remoteResult: {
      ...result,
      rolls: { ...result.rolls },
    },
    commitInitializing: false,
    finalized: true,
    resultAcknowledgedByRemote: true,
  }
  stored.dice = {
    local: 6,
    remote: 1,
    round: 1,
    status: "resolved",
  }
}

describe("parseStoredLanTurnGameSession", () => {
  it("rebuilds adapter state from its compact snapshot", async () => {
    const stored = createStoredSession()

    expect(await parseStoredLanTurnGameSession(
      JSON.stringify(stored),
      goLanAdapter,
    )).toMatchObject({
      revision: 0,
      game: createGoState(),
      session: {
        gameId: "go",
        engineVersion: goLanAdapter.engineVersion,
      },
    })
  })

  it("rejects cached credentials from another game or engine", async () => {
    const wrongGame = createStoredSession()
    wrongGame.session.gameId = "chess"
    expect(await parseStoredLanTurnGameSession(
      JSON.stringify(wrongGame),
      goLanAdapter,
    )).toBeNull()

    const wrongEngine = createStoredSession()
    wrongEngine.session.engineVersion = "go-legacy-v0"
    expect(await parseStoredLanTurnGameSession(
      JSON.stringify(wrongEngine),
      goLanAdapter,
    )).toBeNull()
  })

  it("rebuilds and verifies a pending action, state, and hash as one unit", async () => {
    const stored = createStoredSession()
    preparePlayingSession(stored)
    const initial = createGoState()
    const applied = applyGoAction(initial, { type: "pass" }, "black")
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    const pendingSnapshot = goLanAdapter.encodeSnapshot(applied.state)

    stored.pendingAction = {
      actionId: "pending-action-1",
      baseRevision: 0,
      action: { type: "pass" },
      state: pendingSnapshot,
      stateHash: await hashJson(pendingSnapshot),
    }
    expect((await parseStoredLanTurnGameSession(
      JSON.stringify(stored),
      goLanAdapter,
    ))?.pendingAction).toMatchObject({
      action: { type: "pass" },
      baseRevision: 0,
      state: { actionHistory: [{ type: "pass", player: "black" }] },
    })
  })

  it("rejects a pending state produced by another legal action", async () => {
    const stored = createStoredSession()
    preparePlayingSession(stored)
    const initial = createGoState()
    const placed = applyGoAction(initial, { type: "place", row: 0, col: 0 }, "black")
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    const placedSnapshot = goLanAdapter.encodeSnapshot(placed.state)

    stored.pendingAction = {
      actionId: "pending-action-1",
      baseRevision: 0,
      action: { type: "pass" },
      state: placedSnapshot,
      stateHash: await hashJson(placedSnapshot),
    }
    expect(await parseStoredLanTurnGameSession(
      JSON.stringify(stored),
      goLanAdapter,
    )).toBeNull()
  })

  it("rejects a pending action whose persisted hash does not match its state", async () => {
    const stored = createStoredSession()
    preparePlayingSession(stored)
    const initial = createGoState()
    const applied = applyGoAction(initial, { type: "pass" }, "black")
    expect(applied.ok).toBe(true)
    if (!applied.ok) return

    stored.pendingAction = {
      actionId: "pending-action-1",
      baseRevision: 0,
      action: { type: "pass" },
      state: goLanAdapter.encodeSnapshot(applied.state),
      stateHash: "a".repeat(64),
    }
    expect(await parseStoredLanTurnGameSession(
      JSON.stringify(stored),
      goLanAdapter,
    )).toBeNull()
  })

  it("rejects invalid cursor, match, and peer identity cross-fields", async () => {
    const negativeCursor = createStoredSession()
    negativeCursor.session.cursor = -1
    expect(await parseStoredLanTurnGameSession(
      JSON.stringify(negativeCursor),
      goLanAdapter,
    )).toBeNull()

    const mismatchedMatch = createStoredSession()
    mismatchedMatch.matchId = "654321"
    expect(await parseStoredLanTurnGameSession(
      JSON.stringify(mismatchedMatch),
      goLanAdapter,
    )).toBeNull()

    const duplicatePeer = createStoredSession()
    duplicatePeer.remotePeerId = HOST_PEER_ID
    expect(await parseStoredLanTurnGameSession(
      JSON.stringify(duplicatePeer),
      goLanAdapter,
    )).toBeNull()

    const malformedPeer = createStoredSession()
    malformedPeer.session.peerId = "short-peer"
    expect(await parseStoredLanTurnGameSession(
      JSON.stringify(malformedPeer),
      goLanAdapter,
    )).toBeNull()
  })
})
