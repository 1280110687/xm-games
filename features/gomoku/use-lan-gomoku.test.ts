import { describe, expect, it } from "vitest"

import { createGomokuState } from "./engine"
import { LanSignalingError } from "../multiplayer/signaling-client"
import {
  parseStoredSession,
  shouldHostNegotiate,
  shouldRetainPendingRoomRequest,
  type StoredLanSession,
} from "./use-lan-gomoku"

function createStoredSession(expiresAt: string): StoredLanSession {
  return {
    version: 2,
    session: {
      roomId: "123456",
      peerId: "peer-host-0000001",
      role: "host",
      token: "a".repeat(43),
      cursor: 0,
      expiresAt,
    },
    matchId: "123456",
    remotePeerId: null,
    phase: "waiting",
    localReady: false,
    remoteReady: false,
    game: createGomokuState(),
    revision: 0,
    blackPeerId: null,
    diceRuntime: null,
    dice: null,
    pendingMove: null,
    acknowledgements: [],
  }
}

describe("parseStoredSession", () => {
  it("keeps structurally valid credentials even when the cached room lease is stale", () => {
    const stored = createStoredSession("2020-01-01T00:00:00.000Z")

    expect(parseStoredSession(JSON.stringify(stored))).toEqual(stored)
  })

  it("still rejects an invalid expiration timestamp", () => {
    expect(parseStoredSession(JSON.stringify(createStoredSession("not-a-date")))).toBeNull()
  })
})

describe("pending room request retry policy", () => {
  it("retains network failures and clears definitive client errors", () => {
    expect(shouldRetainPendingRoomRequest(
      new LanSignalingError("offline", 0, "NETWORK_ERROR"),
    )).toBe(true)
    expect(shouldRetainPendingRoomRequest(
      new LanSignalingError("rooms busy", 503, "ROOM_LIMIT_REACHED"),
    )).toBe(true)
    expect(shouldRetainPendingRoomRequest(
      new LanSignalingError("polls busy", 429, "POLL_LIMIT_REACHED"),
    )).toBe(true)
    expect(shouldRetainPendingRoomRequest(
      new LanSignalingError("full", 409, "ROOM_FULL"),
    )).toBe(false)
  })
})

describe("host negotiation gating", () => {
  it("waits for a guest signal until the host knows the remote peer", () => {
    expect(shouldHostNegotiate("host", null)).toBe(false)
    expect(shouldHostNegotiate("host", "peer-guest-00001")).toBe(true)
    expect(shouldHostNegotiate("guest", "peer-host-000001")).toBe(false)
  })
})
